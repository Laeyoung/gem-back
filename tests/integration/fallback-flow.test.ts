import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GeminiBackError } from '../../src/types/errors';

vi.mock('../../src/client/GeminiClient');

describe('Fallback Flow Integration Tests', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  describe('Complete fallback chain', () => {
    it('should try all models in order when each fails with rate limit', async () => {
      const calls: string[] = [];
      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        calls.push(model);
        if (model === 'gemini-2.0-flash-lite') {
          return Promise.resolve({
            text: 'Success from last model',
            model,
            finishReason: 'STOP',
          });
        }
        throw new Error('429 Rate limit exceeded');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 0,
        debug: false,
      });

      const response = await client.generate('Hello');

      expect(calls).toEqual([
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ]);
      expect(response.text).toBe('Success from last model');
      expect(response.model).toBe('gemini-2.0-flash-lite');
    });

    it('should stop fallback on auth error', async () => {
      const calls: string[] = [];
      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        calls.push(model);
        if (model === 'gemini-2.5-flash-lite') {
          throw new Error('401 Invalid API key');
        }
        throw new Error('429 Rate limit exceeded');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 0,
        debug: false,
      });

      await expect(client.generate('Hello')).rejects.toThrow(GeminiBackError);

      // Should stop at gemini-2.5-flash-lite (second model) due to auth error
      expect(calls).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
    });

    it('should retry transient errors before fallback', async () => {
      const calls: { model: string; attempt: number }[] = [];
      let attemptCount = 0;

      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        attemptCount++;
        const currentAttempt = attemptCount;
        calls.push({ model, attempt: currentAttempt });

        // First model: fail with timeout twice, then succeed
        if (model === 'gemini-2.5-flash') {
          if (currentAttempt <= 2) {
            throw new Error('Request timeout');
          }
          return Promise.resolve({
            text: 'Success after retries',
            model,
            finishReason: 'STOP',
          });
        }
        throw new Error('Unexpected call');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 2,
        retryDelay: 10,
        debug: false,
      });

      const response = await client.generate('Hello');

      expect(response.text).toBe('Success after retries');
      expect(calls).toHaveLength(3);
      expect(calls.every((c) => c.model === 'gemini-2.5-flash')).toBe(true);
    });
  });

  describe('Custom fallback order', () => {
    it('should respect custom fallback order', async () => {
      const calls: string[] = [];
      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        calls.push(model);
        if (model === 'gemini-2.0-flash') {
          return Promise.resolve({
            text: 'Success',
            model,
            finishReason: 'STOP',
          });
        }
        throw new Error('429 Rate limit');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash'],
        maxRetries: 0,
        debug: false,
      });

      await client.generate('Hello');

      expect(calls).toEqual(['gemini-2.5-flash', 'gemini-2.0-flash']);
    });
  });

  describe('Statistics tracking across multiple requests', () => {
    it('should track statistics across successful and failed requests', async () => {
      let callCount = 0;
      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        callCount++;

        // Request 1: succeed on first model
        if (callCount === 1) {
          return Promise.resolve({
            text: 'Success 1',
            model: 'gemini-2.5-flash',
            finishReason: 'STOP',
          });
        }

        // Request 2: fail first model, succeed on second
        if (callCount === 2) {
          throw new Error('429 Rate limit');
        }
        if (callCount === 3) {
          return Promise.resolve({
            text: 'Success 2',
            model: 'gemini-2.5-flash-lite',
            finishReason: 'STOP',
          });
        }

        // Request 3: all models fail
        if (callCount >= 4 && callCount <= 7) {
          throw new Error('500 Server error');
        }

        throw new Error('Unexpected call');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 0,
        debug: false,
      });

      // Request 1: Success
      await client.generate('Request 1');

      // Request 2: Success with fallback
      await client.generate('Request 2');

      // Request 3: All fail
      try {
        await client.generate('Request 3');
      } catch (e) {
        // Expected
      }

      const stats = client.getFallbackStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.successRate).toBeCloseTo(0.6667, 2);
      expect(stats.failureCount).toBe(1);
      expect(stats.modelUsage['gemini-2.5-flash']).toBe(1);
      expect(stats.modelUsage['gemini-2.5-flash-lite']).toBe(1);
    });
  });

  describe('Mixed scenarios', () => {
    it('should handle rate limit, then retry, then success', async () => {
      const calls: string[] = [];
      let callCount = 0;

      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        callCount++;
        calls.push(model);

        // First model: rate limit (no retry for 429)
        if (model === 'gemini-2.5-flash') {
          throw new Error('429 Too many requests');
        }

        // Second model: timeout on first attempt, success on retry
        if (model === 'gemini-2.5-flash-lite') {
          if (callCount === 2) {
            throw new Error('Request timeout');
          }
          return Promise.resolve({
            text: 'Success after fallback and retry',
            model,
            finishReason: 'STOP',
          });
        }

        throw new Error('Unexpected');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 1,
        retryDelay: 10,
        debug: false,
      });

      const response = await client.generate('Hello');

      expect(response.text).toBe('Success after fallback and retry');
      expect(response.model).toBe('gemini-2.5-flash-lite');
      expect(calls).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash-lite']);
    });
  });

  describe('Error context', () => {
    it('should include all attempt records in final error', async () => {
      mockGeminiClient.generate.mockImplementation((prompt: string, model: string) => {
        if (model === 'gemini-2.5-flash') {
          throw new Error('429 Rate limit');
        }
        if (model === 'gemini-2.5-flash-lite') {
          throw new Error('500 Server error');
        }
        if (model === 'gemini-2.0-flash') {
          throw new Error('503 Service unavailable');
        }
        if (model === 'gemini-2.0-flash-lite') {
          throw new Error('Request timeout');
        }
        throw new Error('Unexpected');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        maxRetries: 0,
        debug: false,
      });

      try {
        await client.generate('Hello');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GeminiBackError);
        const geminiError = error as GeminiBackError;

        expect(geminiError.allAttempts).toHaveLength(4);
        expect(geminiError.allAttempts[0].model).toBe('gemini-2.5-flash');
        expect(geminiError.allAttempts[0].error).toContain('429');
        expect(geminiError.allAttempts[1].model).toBe('gemini-2.5-flash-lite');
        expect(geminiError.allAttempts[1].error).toContain('500');
        expect(geminiError.allAttempts[2].model).toBe('gemini-2.0-flash');
        expect(geminiError.allAttempts[3].model).toBe('gemini-2.0-flash-lite');
      }
    });
  });
});
