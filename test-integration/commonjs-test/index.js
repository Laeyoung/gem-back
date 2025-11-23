/**
 * CommonJS Integration Test for gemback
 *
 * This tests the basic functionality of gemback in a CommonJS environment
 */

const { GeminiBackClient } = require('gemback');

async function main() {
  console.log('=== CommonJS Integration Test ===\n');

  // Check if API key is provided
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY environment variable not set');
    console.log('ℹ️  This is expected for package testing');
    console.log('✅ Import test passed - gemback is correctly loaded in CommonJS\n');

    // Test that we can create a client instance (it will fail when used without API key)
    try {
      const client = new GeminiBackClient({
        apiKey: 'dummy-key-for-structure-test'
      });
      console.log('✅ Client instantiation successful');
      console.log('✅ Type checking: client is', typeof client);
      console.log('✅ Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(m => m !== 'constructor').join(', '));
    } catch (error) {
      console.error('❌ Failed to create client:', error.message);
      process.exit(1);
    }

    console.log('\n📝 To run full API tests, set GEMINI_API_KEY environment variable');
    return;
  }

  // Full API test with real key
  console.log('✅ API key found, running full integration test...\n');

  try {
    // Test 1: Basic client creation
    console.log('Test 1: Basic client creation');
    const client = new GeminiBackClient({
      apiKey: apiKey,
      debug: true
    });
    console.log('✅ Client created successfully\n');

    // Test 2: Simple text generation
    console.log('Test 2: Simple text generation');
    const response = await client.generate('Say "Hello from CommonJS test!" in a friendly way.');
    console.log('Response:', response.text);
    console.log('Model used:', response.model);
    console.log('✅ Text generation successful\n');

    // Test 3: Get statistics
    console.log('Test 3: Get fallback statistics');
    const stats = client.getFallbackStats();
    console.log('Total requests:', stats.totalRequests);
    console.log('Success rate:', stats.successRate);
    console.log('Model usage:', stats.modelUsage);
    console.log('✅ Statistics retrieved successfully\n');

    console.log('=== All CommonJS tests passed! ===');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.allAttempts) {
      console.error('All attempts:', error.allAttempts);
    }
    process.exit(1);
  }
}

main();
