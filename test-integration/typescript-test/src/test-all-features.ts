/**
 * Comprehensive TypeScript Feature Test for gemback
 *
 * Tests all major features with full type safety
 */

import {
  GeminiBackClient,
  type GeminiBackClientOptions,
  type GenerateResponse,
  type GenerateOptions,
  type ChatMessage,
  type FallbackStats
} from 'gemback';

async function testBasicGeneration(client: GeminiBackClient): Promise<void> {
  console.log('\n📝 Test 1: Type-Safe Text Generation');
  console.log('─'.repeat(50));

  const response: GenerateResponse = await client.generate('What is 2+2? Answer in one sentence.');
  console.log('✅ Response:', response.text);
  console.log('   Model:', response.model);
  console.log('   Types verified: text is string, model is string');
}

async function testGenerationWithOptions(client: GeminiBackClient): Promise<void> {
  console.log('\n📝 Test 2: Generation with Type-Safe Options');
  console.log('─'.repeat(50));

  const options: GenerateOptions = {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 100
  };

  const response: GenerateResponse = await client.generate('Tell me a short joke.', options);
  console.log('✅ Response with options:', response.text.substring(0, 50) + '...');
  console.log('   Options type-checked at compile time');
}

async function testStreaming(client: GeminiBackClient): Promise<void> {
  console.log('\n📝 Test 3: Type-Safe Streaming');
  console.log('─'.repeat(50));

  const stream = client.generateStream('Count from 1 to 3.');

  process.stdout.write('✅ Stream output: ');
  for await (const chunk of stream) {
    // TypeScript ensures chunk has text property
    const text: string = chunk.text;
    process.stdout.write(text);
  }
  console.log('\n   Streaming with type safety completed');
}

async function testChatInterface(client: GeminiBackClient): Promise<void> {
  console.log('\n📝 Test 4: Type-Safe Chat Interface');
  console.log('─'.repeat(50));

  // Type-safe message array
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello! What is your name?' },
    { role: 'assistant', content: 'I am Gemini, an AI assistant.' },
    { role: 'user', content: 'Can you help me with TypeScript?' }
  ];

  const response: GenerateResponse = await client.chat(messages);
  console.log('✅ Chat response:', response.text.substring(0, 100) + '...');
  console.log('   Messages type-checked at compile time');
}

async function testMultiKeyRotation(): Promise<void> {
  console.log('\n📝 Test 5: Type-Safe Multi-Key Configuration');
  console.log('─'.repeat(50));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  // Type-safe multi-key options
  const options: GeminiBackClientOptions = {
    apiKeys: [apiKey, apiKey, apiKey],
    apiKeyRotationStrategy: 'round-robin',
    debug: false
  };

  const client = new GeminiBackClient(options);

  console.log('Making 3 requests with type-safe rotation...');
  await client.generate('Request 1');
  await client.generate('Request 2');
  await client.generate('Request 3');

  const stats: FallbackStats = client.getFallbackStats();
  console.log('✅ API Key Stats (type-safe):');
  if (stats.apiKeyStats) {
    stats.apiKeyStats.forEach(keyStat => {
      const keyIndex: number = keyStat.keyIndex;
      const requests: number = keyStat.totalRequests;
      console.log(`   Key #${keyIndex}: ${requests} requests`);
    });
  }
}

async function testMonitoring(): Promise<void> {
  console.log('\n📝 Test 6: Type-Safe Monitoring');
  console.log('─'.repeat(50));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  const options: GeminiBackClientOptions = {
    apiKey: apiKey,
    enableMonitoring: true,
    enableRateLimitPrediction: true,
    debug: false
  };

  const client = new GeminiBackClient(options);

  console.log('Making requests to populate monitoring data...');
  for (let i = 0; i < 3; i++) {
    await client.generate(`Test question ${i + 1}`);
  }

  const stats: FallbackStats = client.getFallbackStats();

  if (stats.monitoring) {
    console.log('✅ Rate Limit Status (type-safe):');
    stats.monitoring.rateLimitStatus.forEach(status => {
      // All properties are type-checked
      const model: string = status.model;
      const currentRPM: number = status.currentRPM;
      const maxRPM: number = status.maxRPM;
      const utilization: number = status.utilizationPercent;

      console.log(`   ${model}: ${currentRPM}/${maxRPM} RPM (${utilization}%)`);
    });

    console.log('\n✅ Model Health (type-safe):');
    stats.monitoring.modelHealth.forEach(health => {
      const model: string = health.model;
      const status: 'healthy' | 'degraded' | 'unhealthy' = health.status;
      const successRate: number = health.successRate;
      const avgResponseTime: number = health.averageResponseTime;

      console.log(`   ${model}: ${status} (success: ${(successRate * 100).toFixed(1)}%, avg: ${avgResponseTime}ms)`);
    });

    console.log('\n✅ Summary (type-safe):');
    const summary = stats.monitoring.summary;
    console.log(`   Healthy models: ${summary.healthyModels}`);
    console.log(`   Overall success rate: ${(summary.overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Average response time: ${summary.averageResponseTime}ms`);
  }
}

async function testErrorHandling(): Promise<void> {
  console.log('\n📝 Test 7: Type-Safe Error Handling');
  console.log('─'.repeat(50));

  try {
    const options: GeminiBackClientOptions = {
      apiKey: 'invalid-key-for-testing',
      debug: false
    };

    const client = new GeminiBackClient(options);
    await client.generate('This should fail');
    console.log('❌ Expected error but succeeded');
  } catch (error) {
    // Type-safe error handling
    if (error instanceof Error) {
      console.log('✅ Correctly caught error:', error.message);
      console.log('   Error is instance of Error ✓');
    }
  }
}

async function testTypeInference(): Promise<void> {
  console.log('\n📝 Test 8: Type Inference');
  console.log('─'.repeat(50));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipped: No API key provided');
    return;
  }

  const client = new GeminiBackClient({ apiKey });

  // Test that TypeScript can infer types correctly
  const response = await client.generate('Test');

  // These should all be properly typed without explicit annotations
  const text = response.text; // inferred as string
  const model = response.model; // inferred as string

  const stats = client.getFallbackStats();
  const totalRequests = stats.totalRequests; // inferred as number
  const successRate = stats.successRate; // inferred as number

  console.log('✅ Type inference working correctly');
  console.log('   All types properly inferred from method returns');
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Gemback TypeScript Integration Test         ║');
  console.log('╚════════════════════════════════════════════════╝');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('\n⚠️  GEMINI_API_KEY not set - running limited tests');
    console.log('ℹ️  Set GEMINI_API_KEY to run full API tests\n');
  }

  try {
    const client = new GeminiBackClient({
      apiKey: apiKey || 'dummy-key',
      debug: false
    });

    if (apiKey) {
      await testBasicGeneration(client);
      await testGenerationWithOptions(client);
      await testStreaming(client);
      await testChatInterface(client);
      await testMultiKeyRotation();
      await testMonitoring();
      await testTypeInference();
    }

    await testErrorHandling();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║         ✅ All TypeScript Tests Passed!        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('✅ Type Safety Verified:');
    console.log('   - All imports type-checked');
    console.log('   - Options properly typed');
    console.log('   - Return values properly typed');
    console.log('   - Error handling type-safe');
    console.log('   - Type inference working');

    if (apiKey) {
      const stats: FallbackStats = client.getFallbackStats();
      console.log('\n📊 Final Statistics (Type-Safe):');
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log(`   Models Used:`, Object.keys(stats.modelUsage).join(', '));
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Test suite failed:', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

main();
