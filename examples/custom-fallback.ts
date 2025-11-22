/**
 * Custom Fallback Order Example
 *
 * This example shows how to customize the fallback order and retry settings.
 * You can specify which models to use and in what order.
 */

import { GeminiBackClient } from 'gemback';

async function main() {
  // Create a client with custom fallback order
  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',

    // Only use these two models in this order
    fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash'],

    // Increase retry attempts for each model
    maxRetries: 3,

    // Adjust initial retry delay (in milliseconds)
    retryDelay: 2000, // 2 seconds

    // Set custom timeout (in milliseconds)
    timeout: 60000, // 60 seconds

    // Enable debug logging to see fallback in action
    debug: true,
  });

  try {
    console.log('Making request with custom fallback configuration...\n');

    const response = await client.generate(
      'Write a haiku about programming.',
      // You can also specify a model directly for this request
      {
        model: 'gemini-2.5-flash', // Start with this model
        temperature: 0.7, // Control creativity
        maxTokens: 100, // Limit response length
      }
    );

    console.log('\nResponse:', response.text);
    console.log('Model used:', response.model);

    // Check which models were actually used
    const stats = client.getFallbackStats();
    console.log('\nModel usage breakdown:');
    Object.entries(stats.modelUsage).forEach(([model, count]) => {
      if (count > 0) {
        console.log(`  ${model}: ${count} request(s)`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
