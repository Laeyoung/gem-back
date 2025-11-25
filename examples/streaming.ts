/**
 * Streaming Response Example
 *
 * This example demonstrates how to use streaming to get real-time responses.
 * Streaming is useful for long-form content where you want to display results
 * as they are generated.
 */

import { GemBack } from 'gemback';

async function main() {
  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    debug: false, // Disable debug to see clean output
  });

  try {
    console.log('Starting streaming response...\n');
    console.log('Story:\n');

    // Use generateStream for streaming responses
    const stream = client.generateStream(
      'Tell me a short story about a robot learning to code in TypeScript.',
      {
        temperature: 0.8, // Higher temperature for more creative output
        maxTokens: 500,
      }
    );

    let fullText = '';
    let currentModel = '';

    // Iterate over chunks as they arrive
    for await (const chunk of stream) {
      if (chunk.isComplete) {
        // Final chunk indicating completion
        currentModel = chunk.model;
        console.log('\n\n[Stream completed]');
        break;
      }

      // Print each chunk as it arrives
      process.stdout.write(chunk.text);
      fullText += chunk.text;
    }

    console.log('\n\nModel used:', currentModel);
    console.log('Total characters:', fullText.length);

    // Check statistics
    const stats = client.getFallbackStats();
    console.log('\nStatistics:');
    console.log('  Success rate:', (stats.successRate * 100).toFixed(2) + '%');
    console.log('  Total requests:', stats.totalRequests);
  } catch (error) {
    console.error('\n\nError during streaming:', error);
    process.exit(1);
  }
}

main();
