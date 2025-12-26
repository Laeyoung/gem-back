#!/usr/bin/env tsx

/**
 * Fetch available Gemini models from the API
 * Usage: tsx scripts/fetch-models.ts [--all]
 * Requires: GEMINI_API_KEY environment variable
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeminiModelsApiResponse, ModelMetadata } from './types';

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OUTPUT_FILE = path.join(__dirname, 'models-data.json');
const CACHE_FILE = path.join(__dirname, '.models-cache.json');

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

      // Determine the latest version to allow previews/experimental for it
      let maxMajor = 0;
      let maxMinor = 0;
      
      models.forEach(m => {
        const name = m.name.toLowerCase();
        if (!name.startsWith('gemini')) return;
        
        // Extract version (e.g., 2.5 from gemini-2.5-flash or 3 from gemini-3-pro)
        const match = name.match(/gemini-(\d+)(?:\.(\d+))?/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = match[2] ? parseInt(match[2]) : 0;
          if (major > maxMajor) {
            maxMajor = major;
            maxMinor = minor;
          } else if (major === maxMajor && minor > maxMinor) {
            maxMinor = minor;
          }
        }
      });
      
      if (maxMajor > 0) {
        console.log(`   Latest version detected: Gemini ${maxMajor}.${maxMinor} (Previews allowed for this version)`);
      }
      
      models = models.filter(m => {
        const name = m.name.toLowerCase();
        // Criteria 1: Must be a Gemini model
        const isGemini = name.startsWith('gemini');
        if (!isGemini) return false;

        // Criteria 2: No image models
        const noImage = !name.includes('image');
        if (!noImage) return false;

        // Criteria 3: No '-latest' aliases or fixed versions (numeric/date suffixes)
        const isLatestAlias = name.endsWith('-latest');
        const isFixedVersion = name.match(/-\d{3,}$/) || name.match(/-\d{2}-\d{4}$/);
        if (isLatestAlias || isFixedVersion) return false;

        // Criteria 4: Version check
        const match = name.match(/gemini-(\d+)(?:\.(\d+))?/);
        let isLatest = false;
        if (match) {
          const major = parseInt(match[1]);
          const minor = match[2] ? parseInt(match[2]) : 0;
          isLatest = (major === maxMajor && minor === maxMinor);
        }

        // Criteria 5: Stability
        const isStable = !name.includes('preview') && 
                        !name.includes('experimental') && 
                        !name.includes('-exp');
        
        // Allow if stable OR if it's the latest version (to include its previews/experimental)
        return isStable || isLatest;
      });

      console.log(`   Filtered out ${initialCount - models.length} models`);
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
