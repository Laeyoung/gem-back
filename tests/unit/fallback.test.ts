import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiBackClient } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GeminiBackError } from '../../src/types/errors';

vi.mock('../../src/client/GeminiClient');

describe('GeminiBackClient', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      const client = new GeminiBackClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(GeminiBackClient);
    });

    it('should use default fallback order', () => {
      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const stats = client.getFallbackStats();
      expect(stats.modelUsage).toHaveProperty('gemini-2.5-flash');
      expect(stats.modelUsage).toHaveProperty('gemini-2.5-flash-lite');
      expect(stats.modelUsage).toHaveProperty('gemini-2.0-flash');
      expect(stats.modelUsage).toHaveProperty('gemini-2.0-flash-lite');
    });

    it('should accept custom fallback order', () => {
      const client = new GeminiBackClient({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash'],
      });
      expect(client).toBeInstanceOf(GeminiBackClient);
    });
  });

  describe('generate', () => {
    it('should succeed on first model', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const response = await client.generate('Hello');

      expect(response).toEqual(mockResponse);
      expect(mockGeminiClient.generate).toHaveBeenCalledTimes(1);
    });

    it('should fallback to next model on rate limit error', async () => {
      const rateLimitError = new Error('429 Rate limit exceeded');
      const successResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash-lite' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key', maxRetries: 0 });
      const response = await client.generate('Hello');

      expect(response.model).toBe('gemini-2.5-flash-lite');
      expect(mockGeminiClient.generate).toHaveBeenCalledTimes(2);
    });

    it('should throw auth error immediately without fallback', async () => {
      const authError = new Error('401 Invalid API key');
      mockGeminiClient.generate.mockRejectedValue(authError);

      const client = new GeminiBackClient({ apiKey: 'test-key' });

      await expect(client.generate('Hello')).rejects.toThrow(GeminiBackError);
      await expect(client.generate('Hello')).rejects.toThrow('Authentication failed');
    });

    it('should fallback through all models and fail', async () => {
      const error = new Error('500 Internal Server Error');
      mockGeminiClient.generate.mockRejectedValue(error);

      const client = new GeminiBackClient({ apiKey: 'test-key', maxRetries: 0 });

      try {
        await client.generate('Hello');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(GeminiBackError);
        expect((err as GeminiBackError).message).toContain('All models failed');
      }

      // Should have tried all 4 models
      expect(mockGeminiClient.generate).toHaveBeenCalledTimes(4);
    });

    it('should use specified model when provided in options', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.0-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      await client.generate('Hello', { model: 'gemini-2.0-flash' });

      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        'Hello',
        'gemini-2.0-flash',
        'test-key',
        {
          model: 'gemini-2.0-flash',
        }
      );
    });

    it('should retry on retryable errors', async () => {
      const timeoutError = new Error('Request timeout');
      const successResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key', maxRetries: 1 });
      const response = await client.generate('Hello');

      expect(response).toEqual(successResponse);
      // Called twice: first failed, second succeeded
      expect(mockGeminiClient.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateStream', () => {
    it('should stream successfully from first model', async () => {
      async function* mockStream() {
        yield { text: 'Hello ' };
        yield { text: 'World' };
      }
      mockGeminiClient.generateStream.mockReturnValue(mockStream());

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const stream = client.generateStream('Hello');

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3); // 2 text chunks + 1 complete
      expect(chunks[0]).toEqual({ text: 'Hello ', model: 'gemini-2.5-flash', isComplete: false });
      expect(chunks[1]).toEqual({ text: 'World', model: 'gemini-2.5-flash', isComplete: false });
      expect(chunks[2]).toEqual({ text: '', model: 'gemini-2.5-flash', isComplete: true });
    });

    it('should fallback on stream error', async () => {
      async function* failStream() {
        throw new Error('429 Rate limit');
      }
      async function* successStream() {
        yield { text: 'Success' };
      }

      mockGeminiClient.generateStream
        .mockReturnValueOnce(failStream())
        .mockReturnValueOnce(successStream());

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const stream = client.generateStream('Hello');

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks[0].model).toBe('gemini-2.5-flash-lite');
    });
  });

  describe('chat', () => {
    it('should format chat messages correctly', async () => {
      const mockResponse = {
        text: 'Chat response',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await client.chat(messages);

      const expectedPrompt =
        'User: Hello\n\nAssistant: Hi there\n\nUser: How are you?\n\nAssistant:';
      expect(mockGeminiClient.generate).toHaveBeenCalledWith(
        expectedPrompt,
        'gemini-2.5-flash',
        'test-key',
        undefined
      );
    });
  });

  describe('getFallbackStats', () => {
    it('should return initial stats', () => {
      const client = new GeminiBackClient({ apiKey: 'test-key' });
      const stats = client.getFallbackStats();

      expect(stats).toEqual({
        totalRequests: 0,
        successRate: 0,
        modelUsage: {
          'gemini-2.5-flash': 0,
          'gemini-2.5-flash-lite': 0,
          'gemini-2.0-flash': 0,
          'gemini-2.0-flash-lite': 0,
        },
        failureCount: 0,
        apiKeyStats: undefined,
      });
    });

    it('should track successful requests', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({ apiKey: 'test-key' });
      await client.generate('Hello');

      const stats = client.getFallbackStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(1);
      expect(stats.modelUsage['gemini-2.5-flash']).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    it('should track failed requests', async () => {
      const error = new Error('500 Server error');
      mockGeminiClient.generate.mockRejectedValue(error);

      const client = new GeminiBackClient({ apiKey: 'test-key', maxRetries: 0 });

      try {
        await client.generate('Hello');
      } catch (e) {
        // Expected
      }

      const stats = client.getFallbackStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.failureCount).toBe(1);
    });

    it('should calculate success rate correctly', async () => {
      let callCount = 0;
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate.mockImplementation(() => {
        callCount++;
        // First two requests succeed immediately
        if (callCount <= 2) {
          return Promise.resolve(mockResponse);
        }
        // Third request: all models fail
        throw new Error('500 Server error');
      });

      const client = new GeminiBackClient({ apiKey: 'test-key', maxRetries: 0 });

      await client.generate('Hello');
      await client.generate('Hello');
      try {
        await client.generate('Hello');
      } catch (e) {
        // Expected
      }

      const stats = client.getFallbackStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successRate).toBeCloseTo(0.6667, 2);
      expect(stats.failureCount).toBe(1);
    });
  });

  describe('Multi API Key Support', () => {
    it('should initialize with multiple API keys', () => {
      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
      });
      expect(client).toBeInstanceOf(GeminiBackClient);
    });

    it('should throw error when neither apiKey nor apiKeys provided', () => {
      expect(() => new GeminiBackClient({} as any)).toThrow(
        'Either apiKey or apiKeys must be provided'
      );
    });

    it('should rotate through API keys with round-robin', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
        apiKeyRotationStrategy: 'round-robin',
      });

      await client.generate('Hello');
      await client.generate('Hello');
      await client.generate('Hello');

      const calls = mockGeminiClient.generate.mock.calls;
      expect(calls[0][2]).toBe('key1'); // First call uses key1
      expect(calls[1][2]).toBe('key2'); // Second call uses key2
      expect(calls[2][2]).toBe('key3'); // Third call uses key3
    });

    it('should use least-used strategy when specified', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
        apiKeyRotationStrategy: 'least-used',
      });

      await client.generate('Hello');
      await client.generate('Hello');

      const calls = mockGeminiClient.generate.mock.calls;
      expect(calls[0][2]).toBe('key1');
      expect(calls[1][2]).toBe('key2');
    });

    it('should track API key usage in stats', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
      });

      await client.generate('Hello');
      await client.generate('Hello');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats).toBeDefined();
      expect(stats.apiKeyStats).toHaveLength(2);
      expect(stats.apiKeyStats![0].totalRequests).toBe(1);
      expect(stats.apiKeyStats![1].totalRequests).toBe(1);
      expect(stats.apiKeyStats![0].successCount).toBe(1);
      expect(stats.apiKeyStats![1].successCount).toBe(1);
    });

    it('should track API key failures', async () => {
      const error = new Error('500 Server error');
      mockGeminiClient.generate.mockRejectedValue(error);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
        maxRetries: 0,
      });

      try {
        await client.generate('Hello');
      } catch (e) {
        // Expected
      }

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats).toBeDefined();
      expect(stats.apiKeyStats![0].failureCount).toBe(1);
      expect(stats.apiKeyStats![0].successRate).toBe(0);
    });

    it('should work with single apiKey in backward compatibility mode', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKey: 'single-key',
      });

      await client.generate('Hello');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats).toBeUndefined(); // Single key mode doesn't track
    });

    it('should stream with multiple API keys', async () => {
      async function* mockStream() {
        yield { text: 'Hello' };
      }
      mockGeminiClient.generateStream.mockReturnValue(mockStream());

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
      });

      const stream = client.generateStream('Hello');
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const call = mockGeminiClient.generateStream.mock.calls[0];
      expect(call[2]).toBe('key1'); // Should use first key
      expect(chunks).toHaveLength(2); // 1 text + 1 complete
    });
  });
});
