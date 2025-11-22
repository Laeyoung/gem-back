/**
 * Advanced Configuration Example
 *
 * This example demonstrates advanced usage patterns including:
 * - Chat conversations
 * - Fine-tuned generation parameters
 * - Statistics monitoring
 * - Log level configuration
 */

import { GeminiBackClient } from 'gemback';

async function chatConversation() {
  console.log('=== Chat Conversation Example ===\n');

  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    logLevel: 'info', // Show info-level logs
  });

  // Simulate a conversation
  const messages = [
    { role: 'user' as const, content: 'Hello! Can you help me with TypeScript?' },
    {
      role: 'assistant' as const,
      content: 'Of course! I\'d be happy to help you with TypeScript. What would you like to know?',
    },
    {
      role: 'user' as const,
      content: 'What are the main benefits of using TypeScript over JavaScript?',
    },
  ];

  try {
    const response = await client.chat(messages, {
      temperature: 0.7,
      maxTokens: 300,
    });

    console.log('Assistant:', response.text);
    console.log('\nModel used:', response.model);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function statisticsMonitoring() {
  console.log('\n\n=== Statistics Monitoring Example ===\n');

  const client = new GeminiBackClient({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    debug: false,
  });

  // Make multiple requests
  const prompts = [
    'Count to 5',
    'What is 2+2?',
    'Name three programming languages',
    'What color is the sky?',
    'Translate "hello" to Spanish',
  ];

  console.log(`Making ${prompts.length} requests...\n`);

  for (const [index, prompt] of prompts.entries()) {
    try {
      await client.generate(prompt, { maxTokens: 50 });
      console.log(`Request ${index + 1}/${prompts.length} completed`);
    } catch (error) {
      console.error(`Request ${index + 1}/${prompts.length} failed`);
    }
  }

  // Display comprehensive statistics
  const stats = client.getFallbackStats();

  console.log('\n=== Final Statistics ===');
  console.log('Total requests:', stats.totalRequests);
  console.log('Success rate:', (stats.successRate * 100).toFixed(2) + '%');
  console.log('Failures:', stats.failureCount);

  console.log('\nModel usage breakdown:');
  Object.entries(stats.modelUsage).forEach(([model, count]) => {
    if (count > 0) {
      const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
      console.log(`  ${model}: ${count} (${percentage}%)`);
    }
  });
}

async function customLogging() {
  console.log('\n\n=== Custom Logging Example ===\n');

  // Create clients with different log levels
  const clients = {
    silent: new GeminiBackClient({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
      logLevel: 'silent', // No logs
    }),
    error: new GeminiBackClient({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
      logLevel: 'error', // Only errors
    }),
    debug: new GeminiBackClient({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
      debug: true, // All logs including debug
    }),
  };

  console.log('Silent client (no logs):');
  await clients.silent.generate('Hello', { maxTokens: 10 });

  console.log('\n\nError-level client (errors only):');
  await clients.error.generate('Hello', { maxTokens: 10 });

  console.log('\n\nDebug client (all logs):');
  await clients.debug.generate('Hello', { maxTokens: 10 });
}

async function main() {
  await chatConversation();
  await statisticsMonitoring();
  await customLogging();
}

main().catch(console.error);
