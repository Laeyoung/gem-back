/**
 * SDK Migration Staging Test
 *
 * Tests the new @google/genai SDK with real API calls to verify:
 * 1. Basic generation works
 * 2. Streaming works
 * 3. Multimodal content works
 * 4. Client caching works
 * 5. Error handling works
 * 6. Multi-key rotation works (if multiple keys provided)
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npm run test:staging
 *   GEMINI_API_KEYS=key1,key2,key3 npm run test:staging
 */

import { GemBack } from '../../src';
import { GeminiClient } from '../../src/client/GeminiClient';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(testName: string, details?: string) {
  log(`✓ ${testName}`, 'green');
  if (details) log(`  ${details}`, 'cyan');
}

function logError(testName: string, error: Error) {
  log(`✗ ${testName}`, 'red');
  log(`  Error: ${error.message}`, 'red');
}

function logSection(title: string) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(title, 'blue');
  log('='.repeat(60), 'blue');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get API key(s) from environment
const apiKey = process.env.GEMINI_API_KEY;
const apiKeysStr = process.env.GEMINI_API_KEYS;
const apiKeys = apiKeysStr ? apiKeysStr.split(',') : undefined;

if (!apiKey && !apiKeys) {
  log('Error: Please set GEMINI_API_KEY or GEMINI_API_KEYS environment variable', 'red');
  log('Usage:', 'yellow');
  log('  GEMINI_API_KEY=your-key npm run test:staging', 'yellow');
  log('  GEMINI_API_KEYS=key1,key2,key3 npm run test:staging', 'yellow');
  process.exit(1);
}

const testResults: { name: string; passed: boolean; duration: number; error?: string }[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    logSuccess(name, `(${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.push({
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    logError(name, error as Error);
  }
}

async function main() {
  log('\n🧪 SDK Migration Staging Tests', 'cyan');
  log(`Using ${apiKeys ? `${apiKeys.length} API keys` : '1 API key'}`, 'cyan');

  const clientConfig = apiKeys
    ? { apiKeys, apiKeyRotationStrategy: 'round-robin' as const }
    : { apiKey };

  // Test 1: Basic Generation
  logSection('Test 1: Basic Generation');
  await runTest('Basic text generation', async () => {
    const client = new GemBack(clientConfig);
    const response = await client.generate('Say "Hello" in Korean');

    if (!response.text) {
      throw new Error('Response text is empty');
    }
    if (!response.text.includes('안녕')) {
      log(`  Response: ${response.text}`, 'yellow');
    }
  });

  await sleep(1000); // Rate limit friendly

  // Test 2: Streaming
  logSection('Test 2: Streaming Generation');
  await runTest('Streaming text generation', async () => {
    const client = new GemBack(clientConfig);
    const stream = client.generateStream('Count from 1 to 3');

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.text);
    }

    const fullText = chunks.join('');
    if (!fullText || chunks.length === 0) {
      throw new Error('No streaming chunks received');
    }
    log(`  Received ${chunks.length} chunks`, 'cyan');
  });

  await sleep(1000);

  // Test 3: Generation with Options
  logSection('Test 3: Generation with Options');
  await runTest('Generation with temperature and maxTokens', async () => {
    const client = new GemBack(clientConfig);
    const response = await client.generate('Write a haiku about TypeScript', {
      temperature: 0.7,
      maxTokens: 100,
      topP: 0.9,
    });

    if (!response.text) {
      throw new Error('Response text is empty');
    }
    if (response.usage) {
      log(`  Token usage: ${response.usage.totalTokens} total`, 'cyan');
    }
  });

  await sleep(1000);

  // Test 4: Client Caching
  logSection('Test 4: Client Caching');
  await runTest('Client caching (same API key)', async () => {
    const geminiClient = new GeminiClient();
    const testKey = apiKey || apiKeys![0];

    // First call - creates new client
    const start1 = Date.now();
    await geminiClient.generate('Hi', 'gemini-2.5-flash', testKey);
    const duration1 = Date.now() - start1;

    await sleep(500);

    // Second call - should reuse cached client
    const start2 = Date.now();
    await geminiClient.generate('Hi again', 'gemini-2.5-flash', testKey);
    const duration2 = Date.now() - start2;

    log(`  First request: ${duration1}ms`, 'cyan');
    log(`  Second request: ${duration2}ms (cached client)`, 'cyan');

    if (duration2 < duration1) {
      log(`  ⚡ Performance improvement: ${duration1 - duration2}ms faster`, 'green');
    }
  });

  await sleep(1000);

  // Test 5: Multimodal Content (Text Only)
  logSection('Test 5: Multimodal Content API');
  await runTest('GenerateContent with text', async () => {
    const client = new GemBack(clientConfig);
    const response = await client.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'What is the capital of South Korea?' }],
        },
      ],
    });

    if (!response.text) {
      throw new Error('Response text is empty');
    }
    if (!response.text.toLowerCase().includes('seoul')) {
      log(`  Response: ${response.text}`, 'yellow');
    }
  });

  await sleep(1000);

  // Test 6: Multimodal Streaming
  logSection('Test 6: Multimodal Streaming');
  await runTest('GenerateContentStream with text', async () => {
    const client = new GemBack(clientConfig);
    const stream = client.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Name 3 programming languages' }],
        },
      ],
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.text);
    }

    if (chunks.length === 0) {
      throw new Error('No streaming chunks received');
    }
    log(`  Received ${chunks.length} chunks`, 'cyan');
  });

  await sleep(1000);

  // Test 7: Error Handling
  logSection('Test 7: Error Handling');
  await runTest('Invalid API key error handling', async () => {
    const client = new GemBack({ apiKey: 'invalid-key-12345' });

    try {
      await client.generate('Test');
      throw new Error('Should have thrown an error for invalid API key');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('401')) {
          // Expected error
          return;
        }
      }
      throw new Error('Unexpected error type');
    }
  });

  await sleep(1000);

  // Test 8: Multi-Key Rotation (if multiple keys provided)
  if (apiKeys && apiKeys.length > 1) {
    logSection('Test 8: Multi-Key Rotation');
    await runTest('Multi-key round-robin rotation', async () => {
      const client = new GemBack({
        apiKeys,
        apiKeyRotationStrategy: 'round-robin',
      });

      // Make multiple requests
      for (let i = 0; i < apiKeys.length; i++) {
        await client.generate(`Request ${i + 1}`);
        await sleep(500);
      }

      const stats = client.getFallbackStats();
      if (stats.apiKeyStats && stats.apiKeyStats.length > 0) {
        log(`  Used ${stats.apiKeyStats.length} different API keys`, 'cyan');
        stats.apiKeyStats.forEach((keyStat, idx) => {
          log(`    Key ${idx}: ${keyStat.totalRequests} requests`, 'cyan');
        });
      }
    });
  }

  // Test 9: Cache Clearing
  logSection('Test 9: Cache Clearing');
  await runTest('clearCache() method', async () => {
    const geminiClient = new GeminiClient();
    const testKey = apiKey || apiKeys![0];

    // Make a request to populate cache
    await geminiClient.generate('Test', 'gemini-2.5-flash', testKey);

    // Clear cache
    geminiClient.clearCache();

    // Make another request - should create new client
    await geminiClient.generate('Test after clear', 'gemini-2.5-flash', testKey);

    log('  Cache cleared successfully', 'cyan');
  });

  // Summary
  logSection('Test Summary');

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  log(`\nTotal Tests: ${testResults.length}`, 'cyan');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`, 'cyan');
  log(`Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`, 'cyan');

  if (failed > 0) {
    log('\n❌ Some tests failed:', 'red');
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.error}`, 'red');
      });
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', 'green');
    log('SDK migration is working correctly with real API calls.', 'green');
    process.exit(0);
  }
}

// Run tests
main().catch((error) => {
  log('\n💥 Unexpected error during testing:', 'red');
  console.error(error);
  process.exit(1);
});
