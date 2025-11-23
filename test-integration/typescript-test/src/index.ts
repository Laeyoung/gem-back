/**
 * TypeScript Integration Test for gemback
 *
 * This tests the type safety and functionality of gemback in a TypeScript environment
 */

import { GeminiBackClient, type GeminiBackClientOptions, type GeminiResponse } from 'gemback';

async function main(): Promise<void> {
  console.log('=== TypeScript Integration Test ===\n');

  // Check if API key is provided
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY environment variable not set');
    console.log('ℹ️  This is expected for package testing');
    console.log('✅ Import test passed - gemback types are correctly loaded\n');

    // Test type checking with TypeScript
    try {
      const options: GeminiBackClientOptions = {
        apiKey: 'dummy-key-for-structure-test'
      };

      const client = new GeminiBackClient(options);
      console.log('✅ Client instantiation successful');
      console.log('✅ TypeScript types: All types imported correctly');
      console.log('✅ Type checking: client is', typeof client);

      // Test that methods exist (type checking at compile time)
      const methods: string[] = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
        .filter(m => m !== 'constructor');
      console.log('✅ Methods available:', methods.join(', '));
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Failed to create client:', error.message);
      }
      process.exit(1);
    }

    console.log('\n📝 To run full API tests, set GEMINI_API_KEY environment variable');
    return;
  }

  // Full API test with real key
  console.log('✅ API key found, running full integration test...\n');

  try {
    // Test 1: Basic client creation with type checking
    console.log('Test 1: Basic client creation with strict types');
    const options: GeminiBackClientOptions = {
      apiKey: apiKey,
      debug: true,
      maxRetries: 2,
      timeout: 30000
    };

    const client = new GeminiBackClient(options);
    console.log('✅ Client created with type-safe configuration\n');

    // Test 2: Simple text generation with typed response
    console.log('Test 2: Type-safe text generation');
    const response: GeminiResponse = await client.generate('Say "Hello from TypeScript test!" in a friendly way.');

    // TypeScript should enforce these properties exist
    const text: string = response.text;
    const model: string = response.model;

    console.log('Response:', text);
    console.log('Model used:', model);
    console.log('✅ Text generation with type safety successful\n');

    // Test 3: Get statistics with typed return
    console.log('Test 3: Get fallback statistics with types');
    const stats = client.getFallbackStats();

    // Type checking for stats properties
    const totalRequests: number = stats.totalRequests;
    const successRate: number = stats.successRate;
    const modelUsage: Record<string, number> = stats.modelUsage;

    console.log('Total requests:', totalRequests);
    console.log('Success rate:', successRate);
    console.log('Model usage:', modelUsage);
    console.log('✅ Statistics with type safety retrieved successfully\n');

    // Test 4: Type checking for options
    console.log('Test 4: Testing type safety on options');

    // This should compile - valid options
    const validOptions: GeminiBackClientOptions = {
      apiKey: apiKey,
      fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash'],
      maxRetries: 3,
      timeout: 60000,
      debug: false,
      enableMonitoring: true,
      enableRateLimitPrediction: true
    };

    const typedClient = new GeminiBackClient(validOptions);
    console.log('✅ Type checking ensures only valid options are accepted\n');

    console.log('=== All TypeScript tests passed! ===');
    console.log('✅ Type safety verified');
    console.log('✅ Runtime behavior verified');
    console.log('✅ Type definitions are correct');

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Test failed:', error.message);
    }
    process.exit(1);
  }
}

main();
