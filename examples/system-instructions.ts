/**
 * System Instructions Example
 *
 * This example demonstrates how to use system instructions to control
 * the model's behavior and response style.
 *
 * System instructions are directives that guide the model's overall behavior,
 * tone, and response format throughout the conversation.
 */

import { GemBack } from 'gemback';

async function main() {
  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    // Example 1: Basic system instruction with string
    console.log('=== Example 1: String System Instruction ===\n');

    const response1 = await client.generate('What is TypeScript?', {
      systemInstruction: 'You are a helpful programming tutor. Explain concepts clearly and concisely for beginners.',
      temperature: 0.7,
    });

    console.log('Response:', response1.text);
    console.log('Model used:', response1.model);

    // Example 2: Structured system instruction with Content object
    console.log('\n\n=== Example 2: Structured System Instruction ===\n');

    const response2 = await client.generate('What is TypeScript?', {
      systemInstruction: {
        role: 'user',
        parts: [
          {
            text: 'You are a senior software engineer. Provide technical, in-depth explanations with code examples.',
          },
        ],
      },
      temperature: 0.7,
    });

    console.log('Response:', response2.text);
    console.log('Model used:', response2.model);

    // Example 3: System instruction with streaming
    console.log('\n\n=== Example 3: System Instruction with Streaming ===\n');

    const stream = client.generateStream('Explain async/await in JavaScript', {
      systemInstruction:
        'You are a concise technical writer. Use bullet points and keep explanations under 100 words.',
      temperature: 0.5,
    });

    process.stdout.write('Response: ');
    for await (const chunk of stream) {
      process.stdout.write(chunk.text);
    }
    console.log('\n');

    // Example 4: System instruction in chat mode
    console.log('\n=== Example 4: System Instruction in Chat ===\n');

    const response4 = await client.chat(
      [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi! How can I help you today?' },
        { role: 'user', content: 'Tell me about Promises in JavaScript' },
      ],
      {
        systemInstruction: 'You are a friendly coding mentor. Use analogies to explain complex concepts.',
        temperature: 0.8,
      }
    );

    console.log('Response:', response4.text);

    // Example 5: Different system instructions for different use cases
    console.log('\n\n=== Example 5: Role-Based System Instructions ===\n');

    // Technical documentation style
    const techDoc = await client.generate('What is a REST API?', {
      systemInstruction:
        'You are a technical documentation writer. Provide formal, structured explanations with clear definitions.',
    });

    console.log('Technical Doc Style:');
    console.log(techDoc.text);

    // Conversational tutor style
    const tutorStyle = await client.generate('What is a REST API?', {
      systemInstruction:
        'You are a friendly tutor. Use simple language and real-world analogies to explain concepts.',
    });

    console.log('\n\nTutor Style:');
    console.log(tutorStyle.text);

    // Check statistics
    const stats = client.getFallbackStats();
    console.log('\n\n=== Client Statistics ===');
    console.log('Total requests:', stats.totalRequests);
    console.log('Success rate:', (stats.successRate * 100).toFixed(2) + '%');
    console.log('Model usage:', stats.modelUsage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
