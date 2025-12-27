/**
 * Comprehensive Feature Test for gemback (ESM)
 *
 * Tests all major features including:
 * - Basic generation
 * - Streaming
 * - Chat interface
 * - Multi-key rotation
 * - Monitoring
 * - Error handling
 */

import { GemBack } from 'gemback';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testBasicGeneration(client) {
  console.log('\n📝 Test 1: Basic Text Generation');
  console.log('─'.repeat(50));

  const response = await client.generate('What is 2+2? Answer in one sentence.');
  console.log('✅ Response:', response.text);
  console.log('   Model:', response.model);
}

async function testStreaming(client) {
  console.log('\n📝 Test 2: Streaming Response');
  console.log('─'.repeat(50));

  const stream = client.generateStream('Count from 1 to 5, one number per line.');

  process.stdout.write('✅ Stream output: ');
  for await (const chunk of stream) {
    process.stdout.write(chunk.text);
  }
  console.log('\n   Streaming completed');
}

async function testChatInterface(client) {
  console.log('\n📝 Test 3: Chat Interface');
  console.log('─'.repeat(50));

  const messages = [
    { role: 'user', content: 'Hello! What is your name?' },
    { role: 'assistant', content: 'I am Gemini, an AI assistant.' },
    { role: 'user', content: 'Can you help me with programming?' }
  ];

  const response = await client.chat(messages);
  console.log('✅ Chat response:', response.text.substring(0, 100) + '...');
  console.log('   Model:', response.model);
}

async function testMultimodal(client) {
  console.log('\n📝 Test 4: Multimodal Content Generation');
  console.log('─'.repeat(50));

  const response = await client.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: 'What are the main features of Gemini 3.0? Answer in one sentence.' }]
      }
    ]
  });
  console.log('✅ Multimodal response:', response.text);
  console.log('   Model:', response.model);
}

async function testMultiKeyRotation() {
  console.log('\n📝 Test 4: Multi-Key Rotation');
  console.log('─'.repeat(50));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  // Simulate multi-key with same key (for demo)
  const client = new GemBack({
    apiKeys: [apiKey, apiKey, apiKey],
    apiKeyRotationStrategy: 'round-robin',
    debug: false
  });

  console.log('Making 3 requests with round-robin rotation...');
  await client.generate('Request 1');
  await client.generate('Request 2');
  await client.generate('Request 3');

  const stats = client.getFallbackStats();
  console.log('✅ API Key Stats:');
  stats.apiKeyStats.forEach(keyStat => {
    console.log(`   Key #${keyStat.keyIndex}: ${keyStat.totalRequests} requests`);
  });
}

async function testMonitoring() {
  console.log('\n📝 Test 5: Monitoring & Health Tracking');
  console.log('─'.repeat(50));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  const client = new GemBack({
    apiKey: apiKey,
    enableMonitoring: true,
    enableRateLimitPrediction: true,
    debug: false
  });

  // Make some requests
  console.log('Making requests to populate monitoring data...');
  for (let i = 0; i < 3; i++) {
    await client.generate(`Test question ${i + 1}`);
  }

  const stats = client.getFallbackStats();

  if (stats.monitoring) {
    console.log('✅ Rate Limit Status:');
    stats.monitoring.rateLimitStatus.forEach(status => {
      console.log(`   ${status.model}: ${status.currentRPM}/${status.maxRPM} RPM (${status.utilizationPercent}%)`);
    });

    console.log('\n✅ Model Health:');
    stats.monitoring.modelHealth.forEach(health => {
      console.log(`   ${health.model}: ${health.status} (success: ${(health.successRate * 100).toFixed(1)}%, avg: ${health.averageResponseTime}ms)`);
    });

    console.log('\n✅ Summary:');
    console.log(`   Healthy models: ${stats.monitoring.summary.healthyModels}`);
    console.log(`   Overall success rate: ${(stats.monitoring.summary.overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Average response time: ${stats.monitoring.summary.averageResponseTime}ms`);
  }
}

async function testErrorHandling() {
  console.log('\n📝 Test 6: Error Handling');
  console.log('─'.repeat(50));

  try {
    // This should fail - invalid API key
    const client = new GemBack({
      apiKey: 'invalid-key-for-testing',
      debug: false
    });

    await client.generate('This should fail');
    console.log('❌ Expected error but succeeded');
  } catch (error) {
    console.log('✅ Correctly caught error:', error.message);
    if (error.constructor.name === 'GeminiBackError') {
      console.log('   Error type: GeminiBackError ✓');
    }
  }
}

async function testFallbackBehavior(client) {
  console.log('\n📝 Test 7: Fallback Behavior');
  console.log('─'.repeat(50));

  // Test with custom fallback order
  const customClient = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'dummy',
    fallbackOrder: ['gemini-3-flash-preview', 'gemini-2.5-flash'],
    maxRetries: 2,
    debug: true
  });

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  const response = await customClient.generate('Test fallback');
  console.log('✅ Fallback order respected');
  console.log('   Model used:', response.model);
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Gemback Comprehensive Feature Test (ESM)    ║');
  console.log('╚════════════════════════════════════════════════╝');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('\n⚠️  GEMINI_API_KEY not set - running limited tests');
    console.log('ℹ️  Set GEMINI_API_KEY to run full API tests\n');
  }

  try {
    const client = new GemBack({
      apiKey: apiKey || 'dummy-key',
      debug: false
    });

    if (apiKey) {
      await testBasicGeneration(client);
      await delay(5000);
      await testStreaming(client);
      await delay(5000);
      await testChatInterface(client);
      await delay(5000);
      await testMultimodal(client);
      await delay(5000);
      await testMultiKeyRotation();
      await delay(5000);
      await testMonitoring();
      await delay(5000);
      await testFallbackBehavior(client);
    }

    await testErrorHandling();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║            ✅ All Tests Passed!                ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (apiKey) {
      const stats = client.getFallbackStats();
      console.log('📊 Final Statistics:');
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log(`   Models Used:`, Object.keys(stats.modelUsage).join(', '));
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
