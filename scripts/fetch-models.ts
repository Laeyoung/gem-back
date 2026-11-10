#!/usr/bin/env tsx

/**
 * Fetch available Gemini models from the API
 * Usage: tsx scripts/fetch-models.ts [--all]
 * Requires: GEMINI_API_KEY environment variable
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeminiModelsApiResponse, ModelMetadata } from './types';
import { detectLatestVersion, selectLibraryModels } from './model-filters';

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OUTPUT_FILE = path.join(__dirname, 'models-data.json');
const CACHE_FILE = path.join(__dirname, '.models-cache.json');
const LIBRARY_TYPES_FILE = path.join(__dirname, '../src/types/models.ts');

/**
 * Fetch models from Gemini API with retry logic
 */
async function fetchModelsFromAPI(apiKey: string): Promise<ModelMetadata[]> {
  const url = `${API_ENDPOINT}?key=${apiKey}`;

  console.log('🔍 Fetching models from Gemini API...');

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${response.statusText}. Check your GEMINI_API_KEY.`);
        }
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️  Rate limited. Retrying in ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GeminiModelsApiResponse = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid API response: missing models array');
      }

      // Filter for generative models only (exclude embeddings)
      const models: ModelMetadata[] = data.models
        .filter((m) => {
          const hasGenerateContent = m.supportedGenerationMethods?.includes('generateContent');
          const isNotEmbedding = !m.name.includes('embedding');
          return hasGenerateContent && isNotEmbedding;
        })
        .map((m) => ({
          name: m.name.replace('models/', ''),
          displayName: m.displayName,
          description: m.description,
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportedMethods: m.supportedGenerationMethods,
          version: m.version,
        }));

      console.log(`✅ Successfully fetched ${models.length} models`);
      return models;

    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️  Attempt ${attempt} failed: ${lastError.message}. Retrying in ${waitTime / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Failed to fetch models after multiple attempts');
}

/**
 * Model IDs the library currently ships, read from the generated
 * src/types/models.ts. Used to keep already-shipped previews while the API
 * still serves them and to report shipped models the API dropped.
 */
function loadLibraryModels(): Set<string> {
  try {
    const source = fs.readFileSync(LIBRARY_TYPES_FILE, 'utf-8');
    return new Set(Array.from(source.matchAll(/'(gemini-[a-z0-9.-]+)'/g), (m) => m[1]));
  } catch (error) {
    console.warn('⚠️  Could not read current library models:', (error as Error).message);
    return new Set();
  }
}

/**
 * Load cached models from previous fetch
 */
function loadCachedModels(): ModelMetadata[] | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      console.log(`📦 Loaded ${parsed.models.length} models from cache`);
      return parsed.models;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load cache:', (error as Error).message);
  }
  return null;
}

/**
 * Save models to cache
 */
function saveCachedModels(models: ModelMetadata[]): void {
  try {
    const cacheData = {
      timestamp: new Date().toISOString(),
      models,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log('💾 Cached models for future use');
  } catch (error) {
    console.warn('⚠️  Failed to save cache:', (error as Error).message);
  }
}

/**
 * Save models to output file
 */
function saveModels(models: ModelMetadata[]): void {
  const output = {
    timestamp: new Date().toISOString(),
    count: models.length,
    models,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`📝 Saved ${models.length} models to ${OUTPUT_FILE}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ Error: GEMINI_API_KEY environment variable is required');
      console.log('\n💡 Usage:');
      console.log('   export GEMINI_API_KEY=your-key-here');
      console.log('   tsx scripts/fetch-models.ts');
      process.exit(1);
    }

    let models: ModelMetadata[];

    // Parse command line arguments
    const args = process.argv.slice(2);
    const fetchAll = args.includes('--all');

    try {
      models = await fetchModelsFromAPI(apiKey);
      saveCachedModels(models);
    } catch (error) {
      console.error('❌ API fetch failed:', (error as Error).message);

      // Try to use cached data as fallback
      const cachedModels = loadCachedModels();
      if (cachedModels) {
        console.log('🔄 Using cached data as fallback');
        models = cachedModels;
      } else {
        throw new Error('No cached data available. Cannot proceed.');
      }
    }

    // Filter models unless --all flag is provided
    if (!fetchAll) {
      console.log('\n🔍 Filtering models (use --all to fetch everything)...');
      const initialCount = models.length;
      const names = models.map((m) => m.name);
      const knownModels = loadLibraryModels();

      const [maxMajor, maxMinor] = detectLatestVersion(names);
      if (maxMajor > 0) {
        console.log(
          `   Latest version detected: Gemini ${maxMajor}.${maxMinor} ` +
            '(new previews allowed for this major; already-shipped previews are kept while the API serves them)'
        );
      }

      const selected = new Set(selectLibraryModels(names, knownModels));
      models = models.filter((m) => selected.has(m.name));

      console.log(`   Filtered out ${initialCount - models.length} models`);

      // Models the library ships that the API no longer lists at all.
      const served = new Set(names);
      const missing = [...knownModels].filter((m) => !served.has(m));
      if (missing.length > 0) {
        console.warn(
          `\n⚠️  Shipped models no longer listed by the API: ${missing.join(', ')}\n` +
            '   Add them to REMOVED_MODELS in src/config/deprecated.ts.'
        );
      }
    } else {
      console.log('\n🔍 Fetching ALL models (--all flag detected)');
    }

    // Sort models by name for consistency
    models.sort((a, b) => a.name.localeCompare(b.name));

    saveModels(models);

    console.log('\n✨ Model fetch complete!');
    console.log(`   Found ${models.length} generative models:`);
    models.forEach(m => {
      console.log(`   - ${m.name} (${m.displayName})`);
    });

  } catch (error) {
    console.error('\n❌ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

main();
