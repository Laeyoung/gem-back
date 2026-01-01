import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src';
import type { SafetySetting } from '../../src/types/config';
import * as GoogleGenAI from '@google/genai';

// Mock @google/genai
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  const mockList = vi.fn();

  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        list: mockList,
      },
    })),
    FunctionCallingConfigMode: {
      AUTO: 'AUTO',
      ANY: 'ANY',
      NONE: 'NONE',
    },
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: {
      BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
      BLOCK_NONE: 'BLOCK_NONE',
    },
  };
});

describe('Safety Settings', () => {
  let client: GemBack;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GemBack({ apiKey: 'test-key' });
  });

  const mockSuccessResponse = {
    text: 'Safe response',
    candidates: [
      {
        content: { parts: [{ text: 'Safe response' }] },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    },
  };

  describe('generate', () => {
    it('should pass safety settings to SDK', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
      ];

      await client.generate('Test prompt', { safetySettings });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings,
        })
      );
    });

    it('should pass multiple safety settings', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH' as any,
          threshold: 'BLOCK_LOW_AND_ABOVE' as any,
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
          threshold: 'BLOCK_ONLY_HIGH' as any,
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
          threshold: 'BLOCK_NONE' as any,
        },
      ];

      await client.generate('Test prompt', { safetySettings });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings,
        })
      );
    });

    it('should work without safety settings (backward compatible)', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Test prompt');

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        undefined
      );
    });

    it('should combine safety settings with other options', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
      ];

      await client.generate('Test prompt', {
        safetySettings,
        temperature: 0.7,
        maxTokens: 1000,
        systemInstruction: 'You are a helpful assistant',
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings,
          temperature: 0.7,
          maxTokens: 1000,
          systemInstruction: 'You are a helpful assistant',
        })
      );
    });
  });

  describe('generateStream', () => {
    it('should pass safety settings in streaming mode', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'Safe ', candidates: [{ finishReason: null }] };
          yield { text: 'response', candidates: [{ finishReason: 'STOP' }] };
        },
      };

      const mockGenerateStream = vi.fn().mockReturnValue(mockStream);
      (client as any).client.generateStream = mockGenerateStream;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_LOW_AND_ABOVE' as any,
        },
      ];

      const stream = client.generateStream('Test prompt', { safetySettings });
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(mockGenerateStream).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings,
        })
      );
      expect(chunks.length).toBeGreaterThan(0); // At least some chunks received
    });
  });

  describe('generateContent', () => {
    it('should pass safety settings in multimodal content', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generateContent = mockGenerateContent;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
      ];

      const request = {
        contents: [
          {
            role: 'user' as const,
            parts: [
              { text: 'What is in this image?' },
              { inlineData: { mimeType: 'image/png', data: 'base64data' } },
            ],
          },
        ],
        safetySettings,
      };

      await client.generateContent(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        request.contents,
        'gemini-3-flash-preview',
        expect.any(String),
        expect.objectContaining({
          safetySettings,
        })
      );
    });
  });

  describe('generateContentStream', () => {
    it('should pass safety settings in streaming multimodal', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'Safe ', candidates: [{ finishReason: null }] };
          yield { text: 'response', candidates: [{ finishReason: 'STOP' }] };
        },
      };

      const mockGenerateContentStream = vi.fn().mockReturnValue(mockStream);
      (client as any).client.generateContentStream = mockGenerateContentStream;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
          threshold: 'BLOCK_ONLY_HIGH' as any,
        },
      ];

      const request = {
        contents: [
          {
            role: 'user' as const,
            parts: [{ text: 'Test content' }],
          },
        ],
        safetySettings,
      };

      const stream = client.generateContentStream(request);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        request.contents,
        'gemini-3-flash-preview',
        expect.any(String),
        expect.objectContaining({
          safetySettings,
        })
      );
    });
  });

  describe('Fallback behavior with safety settings', () => {
    it('should maintain safety settings across fallback attempts', async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce({
          message: '429 Rate limit exceeded',
          status: 429,
        })
        .mockResolvedValueOnce(mockSuccessResponse);

      (client as any).client.generate = mockGenerate;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
      ];

      const client2 = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      });
      (client2 as any).client.generate = mockGenerate;

      const response = await client2.generate('Test prompt', { safetySettings });

      expect(response.text).toBe('Safe response');
      // Both calls should have safety settings
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(mockGenerate).toHaveBeenNthCalledWith(
        1,
        'Test prompt',
        'gemini-2.5-flash',
        'test-key',
        expect.objectContaining({ safetySettings })
      );
      expect(mockGenerate).toHaveBeenNthCalledWith(
        2,
        'Test prompt',
        'gemini-2.5-flash-lite',
        'test-key',
        expect.objectContaining({ safetySettings })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty safety settings array', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Test prompt', { safetySettings: [] });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings: [],
        })
      );
    });

    it('should handle safety settings with undefined threshold', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const safetySettings: SafetySetting[] = [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          // threshold is optional in SDK type
        },
      ];

      await client.generate('Test prompt', { safetySettings });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          safetySettings,
        })
      );
    });
  });
});
