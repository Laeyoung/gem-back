/**
 * Safety Settings Example
 *
 * This example demonstrates how to use safety settings to control
 * content filtering and moderation in Gemini API responses.
 *
 * Safety settings allow you to configure thresholds for different
 * harm categories (hate speech, harassment, sexually explicit content, etc.)
 */

import { GemBack } from 'gemback';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

async function main() {
  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    // Example 1: Basic safety settings with default blocking
    console.log('=== Example 1: Default Safety Settings ===\n');

    const response1 = await client.generate('Tell me about content moderation', {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    console.log('Response:', response1.text);
    console.log('Model used:', response1.model);

    // Example 2: Strict safety settings (block low and above)
    console.log('\n\n=== Example 2: Strict Safety Settings ===\n');

    const response2 = await client.generate('What are different types of online content?', {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });

    console.log('Response:', response2.text);
    console.log('Model used:', response2.model);

    // Example 3: Permissive safety settings (only block high severity)
    console.log('\n\n=== Example 3: Permissive Safety Settings ===\n');

    const response3 = await client.generate('Discuss social media content guidelines', {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    console.log('Response:', response3.text);

    // Example 4: Safety settings with fallback handling
    console.log('\n\n=== Example 4: Safety Settings with Automatic Fallback ===\n');

    try {
      const response4 = await client.generate('Generate a story about friendship', {
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
        temperature: 0.7,
      });

      console.log('Response:', response4.text);
      console.log('Model used:', response4.model);
    } catch (error: any) {
      // If all models block the content, you'll get an error
      console.log('Content was blocked by safety filters');
      console.log('Error:', error.message);
    }

    // Example 5: Combining safety settings with other options
    console.log('\n\n=== Example 5: Safety Settings + System Instructions ===\n');

    const response5 = await client.generate('Write an educational article about online safety', {
      systemInstruction:
        'You are an educational content writer focused on digital literacy and online safety for teenagers.',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
      temperature: 0.5,
      maxTokens: 500,
    });

    console.log('Response:', response5.text);

    // Example 6: Different safety levels for different use cases
    console.log('\n\n=== Example 6: Use Case Based Safety Levels ===\n');

    // Children's content - strict filtering
    const childrenContent = await client.generate('Tell a fun story for kids', {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });

    console.log("Children's Content:");
    console.log(childrenContent.text);

    // Adult educational content - moderate filtering
    const adultContent = await client.generate('Explain historical conflicts', {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    console.log('\n\nAdult Educational Content:');
    console.log(adultContent.text);

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
