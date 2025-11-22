/**
 * Basic Usage Example
 *
 * This example demonstrates the most basic usage of Gem Back.
 * It shows how to create a client and make a simple text generation request.
 */

import { GeminiBackClient } from 'gemback';

async function main() {
  // Create a client with your API key
  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    // Make a simple text generation request
    console.log('Generating response...\n');

    const response = await client.generate('Explain what TypeScript is in 2 sentences.');

    // Display the result
    console.log('Response:', response.text);
    console.log('\nModel used:', response.model);

    if (response.usage) {
      console.log('\nToken usage:');
      console.log('  Prompt tokens:', response.usage.promptTokens);
      console.log('  Completion tokens:', response.usage.completionTokens);
      console.log('  Total tokens:', response.usage.totalTokens);
    }

    // Check statistics
    const stats = client.getFallbackStats();
    console.log('\nClient statistics:');
    console.log('  Total requests:', stats.totalRequests);
    console.log('  Success rate:', (stats.successRate * 100).toFixed(2) + '%');
    console.log('  Model usage:', stats.modelUsage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
