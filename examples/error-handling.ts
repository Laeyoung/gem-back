/**
 * Error Handling Example
 *
 * This example demonstrates how to handle different types of errors
 * that may occur when using Gem Back, including authentication errors,
 * rate limits, and complete failures.
 */

import { GeminiBackClient, GeminiBackError } from 'gemback';

async function demonstrateErrorHandling() {
  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    debug: true,
  });

  try {
    console.log('Making request...\n');

    const response = await client.generate('What is the meaning of life?');
    console.log('Success!', response.text);
  } catch (error) {
    // Check if it's a GeminiBackError
    if (error instanceof GeminiBackError) {
      console.error('\n=== Gem Back Error ===');
      console.error('Error code:', error.code);
      console.error('Message:', error.message);

      // Check error type
      if (error.code === 'AUTH_ERROR') {
        console.error('\nAuthentication failed. Please check your API key.');
        console.error('Status code:', error.statusCode);
      } else if (error.code === 'ALL_MODELS_FAILED') {
        console.error('\nAll models failed to respond.');
        console.error('\nAttempt history:');

        // Show all attempts made
        error.allAttempts.forEach((attempt, index) => {
          console.error(`\n  Attempt ${index + 1}:`);
          console.error(`    Model: ${attempt.model}`);
          console.error(`    Error: ${attempt.error}`);
          console.error(`    Status: ${attempt.statusCode || 'N/A'}`);
          console.error(`    Time: ${attempt.timestamp.toISOString()}`);
        });
      }
    } else {
      // Handle other types of errors
      console.error('\nUnexpected error:', error);
    }

    process.exit(1);
  }
}

async function demonstrateGracefulDegradation() {
  console.log('\n\n=== Graceful Degradation Example ===\n');

  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    const response = await client.generate('Tell me a joke');
    console.log('Response:', response.text);
  } catch (error) {
    if (error instanceof GeminiBackError) {
      // Provide a fallback response
      console.log('Could not get AI response, using fallback...');
      console.log('Fallback: Why do programmers prefer dark mode? Because light attracts bugs!');

      // Log error for monitoring
      console.error('(Error logged for monitoring:', error.code, ')');
    }
  }
}

async function main() {
  await demonstrateErrorHandling();
  await demonstrateGracefulDegradation();
}

main();
