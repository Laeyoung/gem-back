import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiBackClient } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';

vi.mock('../../src/client/GeminiClient');

describe('Multi API Key Integration Tests', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  describe('Load Balancing Scenarios', () => {
    it('should distribute load evenly with round-robin across 3 keys', async () => {
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

      // Make 9 requests
      for (let i = 0; i < 9; i++) {
        await client.generate(`Request ${i}`);
      }

      const calls = mockGeminiClient.generate.mock.calls;
      expect(calls[0][2]).toBe('key1');
      expect(calls[1][2]).toBe('key2');
      expect(calls[2][2]).toBe('key3');
      expect(calls[3][2]).toBe('key1');
      expect(calls[4][2]).toBe('key2');
      expect(calls[5][2]).toBe('key3');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats![0].totalRequests).toBe(3);
      expect(stats.apiKeyStats![1].totalRequests).toBe(3);
      expect(stats.apiKeyStats![2].totalRequests).toBe(3);
    });

    it('should use least-used strategy to balance uneven load', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
        apiKeyRotationStrategy: 'least-used',
      });

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      // With least-used, distribution should be balanced
      const totalRequests = stats.apiKeyStats!.map((s) => s.totalRequests);
      const maxRequests = Math.max(...totalRequests);
      const minRequests = Math.min(...totalRequests);
      expect(maxRequests - minRequests).toBeLessThanOrEqual(1);
    });
  });

  describe('Failure Scenarios', () => {
    it('should track failures per key correctly', async () => {
      // Mock implementation based on API key
      mockGeminiClient.generate.mockImplementation(
        (_prompt: string, _model: string, apiKey: string) => {
          // key1 always fails for all models
          if (apiKey === 'key1') {
            return Promise.reject(new Error('500 Server error'));
          }
          // key2 succeeds
          return Promise.resolve({
            text: 'Success',
            model: 'gemini-2.5-flash' as const,
            finishReason: 'STOP',
          });
        }
      );

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
        maxRetries: 0,
      });

      // First request uses key1, all models fail
      try {
        await client.generate('Request 1');
      } catch (e) {
        // Expected to fail after trying all models
      }

      // Second request uses key2 and succeeds
      await client.generate('Request 2');

      const stats = client.getFallbackStats();
      // key1 should have 1 failure (counted per request, not per model attempt)
      expect(stats.apiKeyStats![0].failureCount).toBe(1);
      expect(stats.apiKeyStats![0].successCount).toBe(0);
      expect(stats.apiKeyStats![1].failureCount).toBe(0);
      expect(stats.apiKeyStats![1].successCount).toBe(1);
    });

    it('should maintain key rotation even after failures', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      let requestCount = 0;
      mockGeminiClient.generate.mockImplementation(
        (_prompt: string, _model: string, apiKey: string) => {
          // Fail key3, succeed for others
          if (apiKey === 'key3') {
            return Promise.reject(new Error('500 Server error'));
          }
          return Promise.resolve(mockResponse);
        }
      );

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
        maxRetries: 0,
      });

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 9; i++) {
        try {
          await client.generate(`Request ${i}`);
          successCount++;
        } catch (e) {
          failureCount++;
        }
      }

      // key1 and key2 succeed (6 requests), key3 fails (3 requests)
      expect(successCount).toBe(6);
      expect(failureCount).toBe(3);

      const stats = client.getFallbackStats();
      // Each key should have been tried 3 times
      expect(stats.apiKeyStats![0].totalRequests).toBe(3);
      expect(stats.apiKeyStats![1].totalRequests).toBe(3);
      expect(stats.apiKeyStats![2].totalRequests).toBe(3);
    });
  });

  describe('RPM Limit Simulation', () => {
    it('should continue working when one key hits RPM limit', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate.mockImplementation((_prompt, _model, apiKey) => {
        // Simulate key1 hitting RPM limit
        if (apiKey === 'key1') {
          return Promise.reject(new Error('429 Rate limit exceeded'));
        }
        return Promise.resolve(mockResponse);
      });

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
        maxRetries: 0,
      });

      // First request uses key1 and fails
      try {
        await client.generate('Request 1');
      } catch (e) {
        // Expected
      }

      // Next requests use key2 and key3, should succeed
      const response2 = await client.generate('Request 2');
      expect(response2.text).toBe('Success');

      const response3 = await client.generate('Request 3');
      expect(response3.text).toBe('Success');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats![0].successRate).toBe(0); // key1 failed
      expect(stats.apiKeyStats![1].successRate).toBe(1); // key2 succeeded
      expect(stats.apiKeyStats![2].successRate).toBe(1); // key3 succeeded
    });
  });

  describe('Mixed Success/Failure Scenarios', () => {
    it('should track different success rates for each key', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate.mockImplementation((_prompt, _model, apiKey) => {
        // Different behaviors for different keys
        // key1: always succeed
        // key2: always fail
        if (apiKey === 'key2') {
          return Promise.reject(new Error('500 Server error'));
        }
        return Promise.resolve(mockResponse);
      });

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
        maxRetries: 0,
      });

      // Request 1: key1 succeeds
      await client.generate('Request 1');

      // Request 2: key2 fails
      try {
        await client.generate('Request 2');
      } catch (e) {
        // Expected to fail
      }

      // Request 3: key1 succeeds again
      await client.generate('Request 3');

      // Request 4: key2 fails again
      try {
        await client.generate('Request 4');
      } catch (e) {
        // Expected to fail
      }

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats![0].successRate).toBe(1); // key1: 100% success
      expect(stats.apiKeyStats![0].successCount).toBe(2);
      expect(stats.apiKeyStats![0].failureCount).toBe(0);

      expect(stats.apiKeyStats![1].successRate).toBe(0); // key2: 0% success
      expect(stats.apiKeyStats![1].successCount).toBe(0);
      expect(stats.apiKeyStats![1].failureCount).toBe(2);
    });
  });

  describe('Single Key vs Multi Key', () => {
    it('should work identically with single key via apiKey option', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const singleKeyClient = new GeminiBackClient({
        apiKey: 'single-key',
      });

      const multiKeyClient = new GeminiBackClient({
        apiKeys: ['single-key'],
      });

      await singleKeyClient.generate('Test');
      await multiKeyClient.generate('Test');

      const singleStats = singleKeyClient.getFallbackStats();
      const multiStats = multiKeyClient.getFallbackStats();

      expect(singleStats.totalRequests).toBe(1);
      expect(multiStats.totalRequests).toBe(1);
      expect(singleStats.apiKeyStats).toBeUndefined();
      expect(multiStats.apiKeyStats).toBeUndefined(); // Single key, no rotation
    });
  });

  describe('Stream with Multiple Keys', () => {
    it('should rotate keys for streaming requests', async () => {
      async function* createMockStream(text: string) {
        yield { text };
      }

      mockGeminiClient.generateStream.mockImplementation((_prompt, _model, apiKey) => {
        return createMockStream(`Response from ${apiKey}`);
      });

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3'],
      });

      // Make 3 streaming requests
      const stream1 = client.generateStream('Request 1');
      const chunks1 = [];
      for await (const chunk of stream1) {
        if (chunk.text) chunks1.push(chunk.text);
      }

      const stream2 = client.generateStream('Request 2');
      const chunks2 = [];
      for await (const chunk of stream2) {
        if (chunk.text) chunks2.push(chunk.text);
      }

      const stream3 = client.generateStream('Request 3');
      const chunks3 = [];
      for await (const chunk of stream3) {
        if (chunk.text) chunks3.push(chunk.text);
      }

      const calls = mockGeminiClient.generateStream.mock.calls;
      expect(calls[0][2]).toBe('key1');
      expect(calls[1][2]).toBe('key2');
      expect(calls[2][2]).toBe('key3');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats![0].totalRequests).toBe(1);
      expect(stats.apiKeyStats![1].totalRequests).toBe(1);
      expect(stats.apiKeyStats![2].totalRequests).toBe(1);
    });
  });

  describe('High Throughput Scenarios', () => {
    it('should handle 100 concurrent requests with proper key rotation', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3', 'key4', 'key5'],
        apiKeyRotationStrategy: 'round-robin',
      });

      // Make 100 requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(client.generate(`Request ${i}`));
      }

      await Promise.all(promises);

      const stats = client.getFallbackStats();
      // Each of 5 keys should have handled 20 requests
      stats.apiKeyStats!.forEach((keyStat) => {
        expect(keyStat.totalRequests).toBe(20);
        expect(keyStat.successCount).toBe(20);
        expect(keyStat.successRate).toBe(1);
      });

      expect(stats.totalRequests).toBe(100);
      expect(stats.successRate).toBe(1);
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle auth error on first key and try other keys', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate.mockImplementation((_prompt, _model, apiKey) => {
        if (apiKey === 'key1') {
          return Promise.reject(new Error('401 Invalid API key'));
        }
        return Promise.resolve(mockResponse);
      });

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2'],
      });

      // First request with key1 fails with auth error
      try {
        await client.generate('Request 1');
      } catch (e) {
        expect(e).toBeDefined();
      }

      // Second request with key2 succeeds
      const response = await client.generate('Request 2');
      expect(response.text).toBe('Success');

      const stats = client.getFallbackStats();
      expect(stats.apiKeyStats![0].failureCount).toBe(1);
      expect(stats.apiKeyStats![1].successCount).toBe(1);
    });

    it('should maintain stats consistency after multiple error types', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-2.5-flash' as const,
        finishReason: 'STOP',
      };

      mockGeminiClient.generate.mockImplementation((_prompt, _model, apiKey) => {
        // Different error types for different keys
        if (apiKey === 'key1') return Promise.reject(new Error('429 Rate limit'));
        if (apiKey === 'key2') return Promise.reject(new Error('500 Server error'));
        if (apiKey === 'key3') return Promise.reject(new Error('Request timeout'));
        return Promise.resolve(mockResponse);
      });

      const client = new GeminiBackClient({
        apiKeys: ['key1', 'key2', 'key3', 'key4'],
        maxRetries: 0,
      });

      // Request 1: key1 fails with rate limit
      try {
        await client.generate('Request 1');
      } catch (e) {}
      // Request 2: key2 fails with server error
      try {
        await client.generate('Request 2');
      } catch (e) {}
      // Request 3: key3 fails with timeout
      try {
        await client.generate('Request 3');
      } catch (e) {}
      // Request 4: key4 succeeds
      await client.generate('Request 4');

      const stats = client.getFallbackStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.successRate).toBe(0.25); // 1 success out of 4
      expect(stats.apiKeyStats![0].failureCount).toBe(1);
      expect(stats.apiKeyStats![1].failureCount).toBe(1);
      expect(stats.apiKeyStats![2].failureCount).toBe(1);
      expect(stats.apiKeyStats![3].successCount).toBe(1);
    });
  });
});
