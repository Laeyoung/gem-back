/**
 * Multi API Key Usage Examples
 *
 * This file demonstrates various use cases for multiple API key rotation
 */

import { GeminiBackClient } from '../src/index';

// Example 1: Basic Multi-Key Setup with Round-Robin
async function basicMultiKeyExample() {
  console.log('\n=== Example 1: Basic Multi-Key Setup ===\n');

  const client = new GeminiBackClient({
    apiKeys: [
      'GEMINI_API_KEY_1', // Replace with actual keys
      'GEMINI_API_KEY_2',
      'GEMINI_API_KEY_3',
    ],
    apiKeyRotationStrategy: 'round-robin',
    debug: true,
  });

  // Each request will use a different key in rotation
  const response1 = await client.generate('Tell me about TypeScript');
  console.log('Response 1:', response1.text.substring(0, 100));

  const response2 = await client.generate('What is Node.js?');
  console.log('Response 2:', response2.text.substring(0, 100));

  const response3 = await client.generate('Explain async/await');
  console.log('Response 3:', response3.text.substring(0, 100));

  // Check which keys were used
  const stats = client.getFallbackStats();
  console.log('\nKey Usage Stats:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(`Key ${index + 1}: ${keyStat.totalRequests} requests, ${keyStat.successRate * 100}% success rate`);
  });
}

// Example 2: Least-Used Strategy for Optimal Load Balancing
async function leastUsedStrategyExample() {
  console.log('\n=== Example 2: Least-Used Strategy ===\n');

  const client = new GeminiBackClient({
    apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'],
    apiKeyRotationStrategy: 'least-used',
  });

  // Make multiple requests - the least-used key will always be selected
  for (let i = 0; i < 10; i++) {
    await client.generate(`Question ${i + 1}`);
  }

  const stats = client.getFallbackStats();
  console.log('Load distribution:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(`Key ${index + 1}: ${keyStat.totalRequests} requests`);
  });
}

// Example 3: Handling RPM Limits with Multiple Keys
async function rpmLimitHandlingExample() {
  console.log('\n=== Example 3: RPM Limit Handling ===\n');

  const client = new GeminiBackClient({
    apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'],
    maxRetries: 2,
  });

  // Simulate high-frequency requests
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      client.generate(`Batch request ${i + 1}`).catch((error) => {
        console.error(`Request ${i + 1} failed:`, error.message);
        return null;
      })
    );
  }

  const results = await Promise.all(promises);
  const successCount = results.filter((r) => r !== null).length;

  console.log(`\nSuccessful requests: ${successCount}/20`);

  const stats = client.getFallbackStats();
  console.log('\nPer-key statistics:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(
      `Key ${index + 1}: ${keyStat.successCount} successes, ${keyStat.failureCount} failures (${(keyStat.successRate * 100).toFixed(1)}% success rate)`
    );
  });
}

// Example 4: Streaming with Multiple Keys
async function streamingWithMultiKeyExample() {
  console.log('\n=== Example 4: Streaming with Multiple Keys ===\n');

  const client = new GeminiBackClient({
    apiKeys: ['KEY_1', 'KEY_2'],
    apiKeyRotationStrategy: 'round-robin',
  });

  console.log('Stream 1 (using key1):');
  const stream1 = client.generateStream('Tell me a short story');
  for await (const chunk of stream1) {
    if (!chunk.isComplete) {
      process.stdout.write(chunk.text);
    }
  }

  console.log('\n\nStream 2 (using key2):');
  const stream2 = client.generateStream('Write a haiku about coding');
  for await (const chunk of stream2) {
    if (!chunk.isComplete) {
      process.stdout.write(chunk.text);
    }
  }

  const stats = client.getFallbackStats();
  console.log('\n\nStreaming stats:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(`Key ${index + 1}: ${keyStat.totalRequests} streaming requests`);
  });
}

// Example 5: Error Recovery with Multiple Keys
async function errorRecoveryExample() {
  console.log('\n=== Example 5: Error Recovery ===\n');

  const client = new GeminiBackClient({
    apiKeys: ['INVALID_KEY', 'VALID_KEY_1', 'VALID_KEY_2'],
    maxRetries: 1,
  });

  try {
    // First key will fail, but second/third keys should work
    const response = await client.generate('Test query');
    console.log('Successfully recovered from first key failure');
    console.log('Response:', response.text.substring(0, 100));
  } catch (error) {
    console.error('All keys failed:', error);
  }

  const stats = client.getFallbackStats();
  console.log('\nRecovery stats:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(
      `Key ${index + 1}: ${keyStat.successCount} successes, ${keyStat.failureCount} failures`
    );
  });
}

// Example 6: Monitoring Key Health
async function monitorKeyHealthExample() {
  console.log('\n=== Example 6: Monitoring Key Health ===\n');

  const client = new GeminiBackClient({
    apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'],
  });

  // Make requests over time
  for (let i = 0; i < 15; i++) {
    await client.generate(`Monitoring request ${i + 1}`);

    // Check stats every 5 requests
    if ((i + 1) % 5 === 0) {
      const stats = client.getFallbackStats();
      console.log(`\nAfter ${i + 1} requests:`);
      stats.apiKeyStats?.forEach((keyStat, index) => {
        const timeSinceLastUse = keyStat.lastUsed
          ? Date.now() - keyStat.lastUsed.getTime()
          : 'Never used';
        console.log(
          `Key ${index + 1}: ${keyStat.totalRequests} reqs, ${(keyStat.successRate * 100).toFixed(1)}% success, last used: ${timeSinceLastUse}ms ago`
        );
      });
    }
  }
}

// Example 7: Backward Compatibility - Single Key Mode
async function backwardCompatibilityExample() {
  console.log('\n=== Example 7: Single Key (Backward Compatible) ===\n');

  // Old way - still works
  const singleKeyClient = new GeminiBackClient({
    apiKey: 'SINGLE_API_KEY',
  });

  const response = await singleKeyClient.generate('Test with single key');
  console.log('Single key response:', response.text.substring(0, 100));

  const stats = singleKeyClient.getFallbackStats();
  console.log('Single key stats:', {
    totalRequests: stats.totalRequests,
    successRate: stats.successRate,
    hasMultiKeyStats: stats.apiKeyStats !== undefined,
  });
}

// Example 8: High Concurrency with Key Rotation
async function highConcurrencyExample() {
  console.log('\n=== Example 8: High Concurrency ===\n');

  const client = new GeminiBackClient({
    apiKeys: Array.from({ length: 5 }, (_, i) => `KEY_${i + 1}`),
    apiKeyRotationStrategy: 'least-used',
  });

  const startTime = Date.now();

  // 50 concurrent requests
  const promises = Array.from({ length: 50 }, (_, i) =>
    client.generate(`Concurrent request ${i + 1}`)
  );

  const results = await Promise.allSettled(promises);
  const successCount = results.filter((r) => r.status === 'fulfilled').length;

  const duration = Date.now() - startTime;

  console.log(`\nCompleted 50 requests in ${duration}ms`);
  console.log(`Success rate: ${(successCount / 50) * 100}%`);

  const stats = client.getFallbackStats();
  console.log('\nKey distribution:');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(
      `Key ${index + 1}: ${keyStat.totalRequests} requests (${((keyStat.totalRequests / 50) * 100).toFixed(1)}% of total)`
    );
  });
}

// Main execution
async function main() {
  console.log('🔑 Multi API Key Usage Examples\n');
  console.log('These examples demonstrate various use cases for multiple API key rotation.');
  console.log('Replace placeholder keys with actual Gemini API keys to run.\n');

  // Uncomment the examples you want to run:

  // await basicMultiKeyExample();
  // await leastUsedStrategyExample();
  // await rpmLimitHandlingExample();
  // await streamingWithMultiKeyExample();
  // await errorRecoveryExample();
  // await monitorKeyHealthExample();
  // await backwardCompatibilityExample();
  // await highConcurrencyExample();

  console.log('\n✅ Examples completed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicMultiKeyExample,
  leastUsedStrategyExample,
  rpmLimitHandlingExample,
  streamingWithMultiKeyExample,
  errorRecoveryExample,
  monitorKeyHealthExample,
  backwardCompatibilityExample,
  highConcurrencyExample,
};
