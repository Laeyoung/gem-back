import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../../src/client/GeminiClient';
import type { ResponseSchema } from '../../src/types/config';

// Mock @google/genai
const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockList = vi.fn();

vi.mock('@google/genai', () => ({
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
}));

describe('JSON Mode', () => {
  let client: GeminiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeminiClient();

    // Default successful response
    mockGenerateContent.mockResolvedValue({
      text: 'default response',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON when responseMimeType is application/json', async () => {
      const jsonData = { name: 'John', age: 30, city: 'Tokyo' };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(jsonData),
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });

      const response = await client.generate(
        'Generate JSON',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual(jsonData);
      expect(response.text).toBe(JSON.stringify(jsonData));
    });

    it('should handle complex nested JSON', async () => {
      const complexJson = {
        user: {
          name: 'Alice',
          profile: {
            age: 25,
            interests: ['coding', 'music'],
          },
        },
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          version: '1.0',
        },
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(complexJson),
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15, totalTokenCount: 25 },
      });

      const response = await client.generate(
        'Generate complex JSON',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual(complexJson);
    });

    it('should not parse JSON when responseMimeType is not set', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '{"name": "John"}',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });

      const response = await client.generate('Generate text', 'gemini-3-flash-preview', 'test-key');

      expect(response.json).toBeUndefined();
      expect(response.text).toBe('{"name": "John"}');
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{"name": "John", age: 30}';
      mockGenerateContent.mockResolvedValue({
        text: invalidJson,
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await client.generate(
        'Generate JSON',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toBeUndefined();
      expect(response.text).toBe(invalidJson);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should handle empty JSON object', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '{}',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 },
      });

      const response = await client.generate(
        'Generate empty',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual({});
    });

    it('should handle empty array', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '[]',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 },
      });

      const response = await client.generate(
        'Generate array',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual([]);
    });

    it('should handle null value', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'null',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11 },
      });

      const response = await client.generate(
        'Generate null',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toBeNull();
    });

    it('should handle boolean values', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'true',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11 },
      });

      const response = await client.generate(
        'Generate boolean',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toBe(true);
    });

    it('should handle number values', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '42',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11 },
      });

      const response = await client.generate(
        'Generate number',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toBe(42);
    });

    it('should handle empty text', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0, totalTokenCount: 10 },
      });

      const response = await client.generate('Test', 'gemini-3-flash-preview', 'test-key', {
        responseMimeType: 'application/json',
      });

      expect(response.json).toBeUndefined();
      expect(response.text).toBe('');
    });

    it('should handle array of objects', async () => {
      const arrayData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(arrayData),
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
      });

      const response = await client.generate(
        'Generate array',
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual(arrayData);
    });
  });

  describe('SDK integration', () => {
    it('should pass responseMimeType to SDK', async () => {
      await client.generate('Test', 'gemini-3-flash-preview', 'test-key', {
        responseMimeType: 'application/json',
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        })
      );
    });

    it('should pass responseSchema to SDK', async () => {
      const schema: ResponseSchema = {
        type: 'object' as any,
        properties: {
          name: { type: 'string' as any },
          age: { type: 'number' as any },
        },
        required: ['name', 'age'],
      };

      await client.generate('Test', 'gemini-3-flash-preview', 'test-key', {
        responseMimeType: 'application/json',
        responseSchema: schema,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            responseMimeType: 'application/json',
            responseSchema: schema,
          }),
        })
      );
    });

    it('should combine with other options', async () => {
      const schema: ResponseSchema = {
        type: 'object' as any,
        properties: {
          result: { type: 'string' as any },
        },
      };

      await client.generate('Test', 'gemini-3-flash-preview', 'test-key', {
        temperature: 0.7,
        maxTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: schema,
        systemInstruction: 'You are helpful',
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
          config: expect.objectContaining({
            temperature: 0.7,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
            responseSchema: schema,
            systemInstruction: { role: 'user', parts: [{ text: 'You are helpful' }] },
          }),
        })
      );
    });
  });

  describe('generateContent with JSON mode', () => {
    it('should parse JSON in generateContent', async () => {
      const jsonData = { description: 'Test', tags: ['a', 'b'] };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(jsonData),
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
      });

      const response = await client.generateContent(
        [{ role: 'user', parts: [{ text: 'Test' }] }],
        'gemini-3-flash-preview',
        'test-key',
        {
          responseMimeType: 'application/json',
        }
      );

      expect(response.json).toEqual(jsonData);
    });
  });
});
