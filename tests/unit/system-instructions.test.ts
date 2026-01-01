import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import type { GeminiResponse } from '../../src/types/response';
import type { Content } from '../../src/types/config';

vi.mock('../../src/client/GeminiClient');

describe('System Instructions', () => {
  let client: GemBack;
  let mockGeminiClient: any;

  beforeEach(() => {
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      validateApiKey: vi.fn().mockResolvedValue(true),
      clearCache: vi.fn(),
    };

    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);

    client = new GemBack({
      apiKey: 'test-api-key',
      fallbackOrder: ['gemini-2.5-flash'],
    });
  });

  describe('generate() with system instructions', () => {
    it('should pass system instruction as string to SDK', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Formal response',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const result = await client.generate('Hello', {
        systemInstruction: 'You are a formal assistant. Always respond professionally.',
      });

      expect(result.text).toBe('Formal response');
      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Hello',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a formal assistant. Always respond professionally.',
        })
      );
    });

    it('should pass system instruction as Content object to SDK', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Creative response',
        model: 'gemini-2.5-flash',
      };

      const systemInstruction: Content = {
        role: 'user',
        parts: [{ text: 'You are a creative writing assistant.' }],
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const result = await client.generate('Tell me a story', {
        systemInstruction,
      });

      expect(result.text).toBe('Creative response');
      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Tell me a story',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction,
        })
      );
    });

    it('should work without system instruction', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Normal response',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const result = await client.generate('Hello');

      expect(result.text).toBe('Normal response');
      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Hello',
        'gemini-2.5-flash',
        'test-api-key',
        undefined
      );
    });
  });

  describe('generateStream() with system instructions', () => {
    it('should pass system instruction to SDK in streaming mode', async () => {
      async function* mockStream() {
        yield { text: 'Chunk 1' };
        yield { text: 'Chunk 2' };
      }

      mockGeminiClient.generateStream.mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of client.generateStream('Test prompt', {
        systemInstruction: 'You are a helpful assistant.',
      })) {
        chunks.push(chunk.text);
      }

      expect(chunks).toContain('Chunk 1');
      expect(chunks).toContain('Chunk 2');
      expect(mockGeminiClient.generateStream).toHaveBeenCalledWith(
        'Test prompt',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a helpful assistant.',
        })
      );
    });
  });

  describe('generateContent() with system instructions', () => {
    it('should pass system instruction in multimodal requests', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Analyzed image',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);

      const result = await client.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Describe this image' }],
          },
        ],
        systemInstruction: 'You are an expert image analyst.',
      });

      expect(result.text).toBe('Analyzed image');
      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.any(Array),
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are an expert image analyst.',
        })
      );
    });

    it('should work with Content object as system instruction', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Technical analysis',
        model: 'gemini-2.5-flash',
      };

      const systemInstruction: Content = {
        role: 'user',
        parts: [{ text: 'You are a technical expert. Use precise terminology.' }],
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);

      const result = await client.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Explain this concept' }],
          },
        ],
        systemInstruction,
      });

      expect(result.text).toBe('Technical analysis');
      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.any(Array),
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction,
        })
      );
    });
  });

  describe('generateContentStream() with system instructions', () => {
    it('should pass system instruction in multimodal streaming', async () => {
      async function* mockStream() {
        yield { text: 'Stream 1' };
        yield { text: 'Stream 2' };
      }

      mockGeminiClient.generateContentStream.mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of client.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Analyze this' }],
          },
        ],
        systemInstruction: 'You are a data analyst.',
      })) {
        chunks.push(chunk.text);
      }

      expect(chunks).toContain('Stream 1');
      expect(chunks).toContain('Stream 2');
      expect(mockGeminiClient.generateContentStream).toHaveBeenCalledWith(
        expect.any(Array),
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a data analyst.',
        })
      );
    });
  });

  describe('chat() with system instructions', () => {
    it('should pass system instruction through chat interface', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Polite response',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const result = await client.chat(
        [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
        {
          systemInstruction: 'You are a polite conversational assistant.',
        }
      );

      expect(result.text).toBe('Polite response');
      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        expect.stringContaining('How are you?'),
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a polite conversational assistant.',
        })
      );
    });
  });

  describe('fallback behavior with system instructions', () => {
    it('should maintain system instruction across model fallbacks', async () => {
      const client = new GemBack({
        apiKey: 'test-api-key',
        fallbackOrder: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      });

      // First model fails
      mockGeminiClient.generate
        .mockRejectedValueOnce(new Error('Model overloaded'))
        .mockResolvedValueOnce({
          text: 'Fallback response',
          model: 'gemini-2.5-flash-lite',
        });

      const result = await client.generate('Test', {
        systemInstruction: 'You are a helpful assistant.',
      });

      expect(result.text).toBe('Fallback response');

      // Both attempts should have system instruction
      expect(mockGeminiClient.generate).toHaveBeenNthCalledWith(
        1,
        'Test',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a helpful assistant.',
        })
      );
      expect(mockGeminiClient.generate).toHaveBeenNthCalledWith(
        2,
        'Test',
        'gemini-2.5-flash-lite',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: 'You are a helpful assistant.',
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty string system instruction', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Response',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      await client.generate('Test', {
        systemInstruction: '',
      });

      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Test',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: '',
        })
      );
    });

    it('should handle undefined system instruction', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Response',
        model: 'gemini-2.5-flash',
      };

      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      await client.generate('Test', {
        systemInstruction: undefined,
      });

      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Test',
        'gemini-2.5-flash',
        'test-api-key',
        expect.objectContaining({
          systemInstruction: undefined,
        })
      );
    });
  });
});
