import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../../src/client/GeminiClient';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
  generateContentStream: mockGenerateContentStream,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Mock response text',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      },
    });

    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => 'Mock ' };
        yield { text: () => 'stream ' };
        yield { text: () => 'response' };
      })(),
    });
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      const client = new GeminiClient('test-api-key');
      expect(client).toBeInstanceOf(GeminiClient);
    });

    it('should initialize with custom timeout', () => {
      const client = new GeminiClient('test-api-key', 60000);
      expect(client).toBeInstanceOf(GeminiClient);
    });
  });

  describe('generate', () => {
    it('should generate text successfully', async () => {
      const client = new GeminiClient('test-api-key');
      const response = await client.generate('Hello', 'gemini-2.5-flash');

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

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
      });
    });

    it('should pass generation options', async () => {
      const client = new GeminiClient('test-api-key');
      await client.generate('Hello', 'gemini-2.5-flash', {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.9,
          topK: 40,
        },
      });
    });

    it('should throw error on API failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const client = new GeminiClient('test-api-key');
      await expect(client.generate('Hello', 'gemini-2.5-flash')).rejects.toThrow('API Error');
    });

    it('should timeout after specified duration', async () => {
      mockGenerateContent.mockImplementation(() => new Promise(() => {})); // Never resolves

      const client = new GeminiClient('test-api-key', 100);
      await expect(client.generate('Hello', 'gemini-2.5-flash')).rejects.toThrow(
        'Request timeout'
      );
    }, 10000);
  });

  describe('generateStream', () => {
    it('should stream text successfully', async () => {
      const client = new GeminiClient('test-api-key');
      const stream = client.generateStream('Hello', 'gemini-2.5-flash');

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk.text);
      }

      expect(chunks).toEqual(['Mock ', 'stream ', 'response']);
    });

    it('should pass generation options for streaming', async () => {
      const client = new GeminiClient('test-api-key');
      const stream = client.generateStream('Hello', 'gemini-2.5-flash', {
        temperature: 0.5,
        maxTokens: 500,
      });

      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500,
          topP: undefined,
          topK: undefined,
        },
      });
    });

    it('should throw error on stream failure', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('Stream Error'));

      const client = new GeminiClient('test-api-key');
      const stream = client.generateStream('Hello', 'gemini-2.5-flash');

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Stream Error');
    });
  });
});
