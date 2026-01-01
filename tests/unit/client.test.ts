import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../../src/client/GeminiClient';

const mockModels = {
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: mockModels,
  })),
}));

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModels.generateContent.mockResolvedValue({
      text: 'Mock response text',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30,
      },
    });

    mockModels.generateContentStream.mockImplementation(async function* () {
      yield { text: 'Mock ' };
      yield { text: 'stream ' };
      yield { text: 'response' };
    });
  });

  describe('constructor', () => {
    it('should initialize with default timeout', () => {
      const client = new GeminiClient();
      expect(client).toBeInstanceOf(GeminiClient);
    });

    it('should initialize with custom timeout', () => {
      const client = new GeminiClient(60000);
      expect(client).toBeInstanceOf(GeminiClient);
    });
  });

  describe('generate', () => {
    it('should generate text successfully', async () => {
      const client = new GeminiClient();
      const response = await client.generate('Hello', 'gemini-2.5-flash', 'test-api-key');

      expect(response).toEqual({
        text: 'Mock response text',
        model: 'gemini-2.5-flash',
        finishReason: 'STOP',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should pass generation options', async () => {
      const client = new GeminiClient();
      await client.generate('Hello', 'gemini-2.5-flash', 'test-api-key', {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
      });

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.9,
          topK: 40,
        },
      });
    });

    it('should throw error on API failure', async () => {
      mockModels.generateContent.mockRejectedValue(new Error('API Error'));

      const client = new GeminiClient();
      await expect(client.generate('Hello', 'gemini-2.5-flash', 'test-api-key')).rejects.toThrow(
        'API Error'
      );
    });

    it('should timeout after specified duration', async () => {
      mockModels.generateContent.mockImplementation(() => new Promise(() => {})); // Never resolves

      const client = new GeminiClient(100);
      await expect(client.generate('Hello', 'gemini-2.5-flash', 'test-api-key')).rejects.toThrow(
        'Request timeout'
      );
    }, 10000);
  });

  describe('generateStream', () => {
    it('should stream text successfully', async () => {
      const client = new GeminiClient();
      const stream = client.generateStream('Hello', 'gemini-2.5-flash', 'test-api-key');

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk.text);
      }

      expect(chunks).toEqual(['Mock ', 'stream ', 'response']);
    });

    it('should pass generation options for streaming', async () => {
      const client = new GeminiClient();
      const stream = client.generateStream('Hello', 'gemini-2.5-flash', 'test-api-key', {
        temperature: 0.5,
        maxTokens: 500,
      });

      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      expect(mockModels.generateContentStream).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        config: {
          temperature: 0.5,
          maxOutputTokens: 500,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should throw error on stream failure', async () => {
      mockModels.generateContentStream.mockRejectedValue(new Error('Stream Error'));

      const client = new GeminiClient();
      const stream = client.generateStream('Hello', 'gemini-2.5-flash', 'test-api-key');

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Stream Error');
    });
  });

  describe('generateContent (multimodal)', () => {
    it('should generate content with image successfully', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'What is in this image?' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'base64_image_data',
              },
            },
          ],
        },
      ];

      const response = await client.generateContent(contents, 'gemini-2.5-flash', 'test-api-key');

      expect(response).toEqual({
        text: 'Mock response text',
        model: 'gemini-2.5-flash',
        finishReason: 'STOP',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should generate content with multiple images', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'Compare these images' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image1_base64',
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'image2_base64',
              },
            },
          ],
        },
      ];

      await client.generateContent(contents, 'gemini-2.5-flash', 'test-api-key');

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should generate content with fileData', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'Analyze this file' },
            {
              fileData: {
                mimeType: 'image/jpeg',
                fileUri: 'gs://bucket/image.jpg',
              },
            },
          ],
        },
      ];

      await client.generateContent(contents, 'gemini-2.5-flash', 'test-api-key');

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should pass generation options for multimodal content', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'What is this?' },
            { inlineData: { mimeType: 'image/jpeg', data: 'img_data' } },
          ],
        },
      ];

      await client.generateContent(contents, 'gemini-2.5-flash', 'test-api-key', {
        temperature: 0.8,
        maxTokens: 2000,
        topP: 0.95,
        topK: 50,
      });

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: 0.8,
          maxOutputTokens: 2000,
          topP: 0.95,
          topK: 50,
        },
      });
    });

    it('should handle multi-turn conversation with images', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'What is in this image?' },
            { inlineData: { mimeType: 'image/jpeg', data: 'img_data' } },
          ],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'This is a cat.' }],
        },
        {
          role: 'user' as const,
          parts: [{ text: 'What color is it?' }],
        },
      ];

      await client.generateContent(contents, 'gemini-2.5-flash', 'test-api-key');

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });
  });

  describe('generateContentStream (multimodal)', () => {
    it('should stream multimodal content successfully', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [
            { text: 'Describe this image' },
            { inlineData: { mimeType: 'image/jpeg', data: 'img_data' } },
          ],
        },
      ];

      const stream = client.generateContentStream(contents, 'gemini-2.5-flash', 'test-api-key');

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk.text);
      }

      expect(chunks).toEqual(['Mock ', 'stream ', 'response']);
      expect(mockModels.generateContentStream).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: undefined,
          maxOutputTokens: undefined,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should pass generation options for multimodal streaming', async () => {
      const client = new GeminiClient();
      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: 'Analyze' }, { inlineData: { mimeType: 'image/jpeg', data: 'data' } }],
        },
      ];

      const stream = client.generateContentStream(contents, 'gemini-2.5-flash', 'test-api-key', {
        temperature: 0.6,
        maxTokens: 1500,
      });

      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      expect(mockModels.generateContentStream).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: 0.6,
          maxOutputTokens: 1500,
          topP: undefined,
          topK: undefined,
        },
      });
    });
  });
});
