/**
 * JSON Mode Example
 *
 * This example demonstrates how to use JSON mode to get structured
 * JSON responses from the Gemini API.
 *
 * JSON mode ensures the model returns valid JSON that can be easily
 * parsed and used in your application without manual text parsing.
 */

import { GemBack } from 'gemback';
import type { ResponseSchema } from 'gemback';

async function main() {
  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    // Example 1: Basic JSON mode without schema
    console.log('=== Example 1: Basic JSON Mode ===\n');

    const response1 = await client.generate('Generate a user profile with name, age, and email', {
      responseMimeType: 'application/json',
    });

    console.log('Raw text:', response1.text);
    console.log('Parsed JSON:', response1.json);
    console.log('Type:', typeof response1.json);

    // Example 2: JSON mode with schema validation
    console.log('\n\n=== Example 2: JSON Mode with Schema ===\n');

    const userSchema: ResponseSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['city', 'country'],
        },
      },
      required: ['name', 'age', 'email'],
    };

    const response2 = await client.generate('Generate a sample user profile', {
      responseMimeType: 'application/json',
      responseSchema: userSchema,
    });

    console.log('Parsed JSON:', JSON.stringify(response2.json, null, 2));

    // Example 3: Array of objects with schema
    console.log('\n\n=== Example 3: Array of Objects ===\n');

    const productsSchema: ResponseSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          inStock: { type: 'boolean' },
        },
        required: ['id', 'name', 'price'],
      },
    };

    const response3 = await client.generate('Generate 3 sample products for an e-commerce store', {
      responseMimeType: 'application/json',
      responseSchema: productsSchema,
    });

    console.log('Products:', JSON.stringify(response3.json, null, 2));

    // Example 4: Complex nested schema
    console.log('\n\n=== Example 4: Complex Nested Structure ===\n');

    const blogPostSchema: ResponseSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        author: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            bio: { type: 'string' },
          },
          required: ['name', 'email'],
        },
        content: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        metadata: {
          type: 'object',
          properties: {
            publishDate: { type: 'string' },
            readTime: { type: 'number' },
            views: { type: 'number' },
          },
        },
      },
      required: ['title', 'author', 'content'],
    };

    const response4 = await client.generate('Generate a sample blog post about TypeScript', {
      responseMimeType: 'application/json',
      responseSchema: blogPostSchema,
    });

    console.log('Blog Post:', JSON.stringify(response4.json, null, 2));

    // Example 5: Combining with system instructions
    console.log('\n\n=== Example 5: JSON Mode + System Instructions ===\n');

    const recipeSchema: ResponseSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        difficulty: { type: 'string' },
        prepTime: { type: 'number' },
        cookTime: { type: 'number' },
        servings: { type: 'number' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string' },
              amount: { type: 'string' },
            },
          },
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['name', 'difficulty', 'ingredients', 'instructions'],
    };

    const response5 = await client.generate('Create a simple pasta recipe', {
      systemInstruction:
        'You are a professional chef. Create detailed, easy-to-follow recipes with precise measurements.',
      responseMimeType: 'application/json',
      responseSchema: recipeSchema,
      temperature: 0.7,
    });

    console.log('Recipe:', JSON.stringify(response5.json, null, 2));

    // Example 6: Data extraction use case
    console.log('\n\n=== Example 6: Data Extraction ===\n');

    const extractionSchema: ResponseSchema = {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        sentiment: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['entities', 'sentiment', 'summary'],
    };

    const response6 = await client.generate(
      'Extract entities, sentiment, and summarize: "Apple Inc. announced a new iPhone today. CEO Tim Cook said the product will revolutionize mobile photography. Stock price increased 5%."',
      {
        responseMimeType: 'application/json',
        responseSchema: extractionSchema,
      }
    );

    console.log('Extracted Data:', JSON.stringify(response6.json, null, 2));

    // Example 7: API response formatting
    console.log('\n\n=== Example 7: API Response Format ===\n');

    const apiResponseSchema: ResponseSchema = {
      type: 'object',
      properties: {
        status: { type: 'string' },
        code: { type: 'number' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['status', 'code'],
    };

    const response7 = await client.generate(
      'Generate a success API response for a user creation endpoint',
      {
        responseMimeType: 'application/json',
        responseSchema: apiResponseSchema,
      }
    );

    console.log('API Response:', JSON.stringify(response7.json, null, 2));

    // Example 8: Type-safe usage with TypeScript
    console.log('\n\n=== Example 8: TypeScript Type Safety ===\n');

    interface User {
      id: number;
      name: string;
      email: string;
      active: boolean;
    }

    const response8 = await client.generate('Generate a sample user', {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          email: { type: 'string' },
          active: { type: 'boolean' },
        },
        required: ['id', 'name', 'email', 'active'],
      },
    });

    const user = response8.json as User;
    console.log('User ID:', user.id);
    console.log('User Name:', user.name);
    console.log('User Email:', user.email);
    console.log('User Active:', user.active);

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
