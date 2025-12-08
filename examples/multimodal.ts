import { GemBack } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const apiKey = process.env.GEMINI_API_KEY || '';

async function imageAnalysisExample() {
  console.log('\n=== Image Analysis Example ===\n');

  const client = new GemBack({
    apiKey,
    debug: true,
  });

  // Example 1: Analyze an image from a file (base64 encoded)
  const imagePath = path.join(__dirname, 'sample-image.jpg');

  // Check if image exists (for demo purposes, we'll use a placeholder)
  let imageData = '';
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    imageData = imageBuffer.toString('base64');
  } catch (error) {
    console.log('Note: Using placeholder image data. Add your own image to test.');
    // In a real scenario, you would have actual image data here
  }

  try {
    const response = await client.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'What do you see in this image? Please describe it in detail.',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageData || 'placeholder_base64_data',
              },
            },
          ],
        },
      ],
    });

    console.log('Response:', response.text);
    console.log('Model used:', response.model);
    console.log('Tokens used:', response.usage?.totalTokens);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function multipleImagesExample() {
  console.log('\n=== Multiple Images Example ===\n');

  const client = new GemBack({
    apiKey,
    debug: true,
  });

  try {
    const response = await client.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Compare these two images and tell me the differences.',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image1_base64_data',
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image2_base64_data',
              },
            },
          ],
        },
      ],
    });

    console.log('Response:', response.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function conversationWithImageExample() {
  console.log('\n=== Conversation with Image Example ===\n');

  const client = new GemBack({
    apiKey,
    debug: true,
  });

  try {
    const response = await client.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'What is in this image?',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image_base64_data',
              },
            },
          ],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'This image shows a beautiful sunset over the ocean.',
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              text: 'What colors are prominent in the sunset?',
            },
          ],
        },
      ],
    });

    console.log('Response:', response.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function streamingWithImageExample() {
  console.log('\n=== Streaming with Image Example ===\n');

  const client = new GemBack({
    apiKey,
    debug: true,
  });

  try {
    const stream = client.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Describe this image in great detail, step by step.',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image_base64_data',
              },
            },
          ],
        },
      ],
    });

    console.log('Streaming response:');
    for await (const chunk of stream) {
      if (!chunk.isComplete) {
        process.stdout.write(chunk.text);
      } else {
        console.log('\n\nStream complete!');
        console.log('Model used:', chunk.model);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fileDataExample() {
  console.log('\n=== File Data Example (Google Cloud Storage) ===\n');

  const client = new GemBack({
    apiKey,
    debug: true,
  });

  try {
    const response = await client.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Describe this image.',
            },
            {
              fileData: {
                mimeType: 'image/jpeg',
                fileUri: 'gs://your-bucket/your-image.jpg',
              },
            },
          ],
        },
      ],
    });

    console.log('Response:', response.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Helper function to convert image file to base64
export function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Run examples
async function main() {
  if (!apiKey) {
    console.error('Please set GEMINI_API_KEY environment variable');
    process.exit(1);
  }

  await imageAnalysisExample();
  await multipleImagesExample();
  await conversationWithImageExample();
  await streamingWithImageExample();
  await fileDataExample();
}

// Uncomment to run:
// main().catch(console.error);
