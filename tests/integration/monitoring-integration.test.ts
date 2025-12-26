import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';

vi.mock('../../src/client/GeminiClient');

describe('Monitoring Integration Tests', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  describe('Basic Monitoring', () => {
    it('should include monitoring data in stats when enabled', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      await client.generate('Test prompt');

      const stats = client.getFallbackStats();
      expect(stats.monitoring).toBeDefined();
      expect(stats.monitoring?.rateLimitStatus).toBeDefined();
      expect(stats.monitoring?.modelHealth).toBeDefined();
      expect(stats.monitoring?.summary).toBeDefined();
    });

    it('should not include monitoring data when disabled', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: false,
      });

      await client.generate('Test prompt');

      const stats = client.getFallbackStats();
      expect(stats.monitoring).toBeUndefined();
    });
  });

  describe('Rate Limit Tracking', () => {
    it('should track rate limits for requests', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      const flashStatus = stats.monitoring?.rateLimitStatus?.find(
        (s) => s.model === 'gemini-3-flash-preview'
      );

      expect(flashStatus).toBeDefined();
      expect(flashStatus?.currentRPM).toBe(5);
      expect(flashStatus?.windowStats.requestsInLastMinute).toBe(5);
    });

    it('should track rate limits separately for streaming requests', async () => {
      async function* createMockStream(text: string) {
        yield { text };
      }

      mockGeminiClient.generateStream.mockImplementation(() => {
        return createMockStream('Response');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make 3 streaming requests
      for (let i = 0; i < 3; i++) {
        const stream = client.generateStream(`Request ${i}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of stream) {
          // Consume stream
        }
      }

      const stats = client.getFallbackStats();
      const flashStatus = stats.monitoring?.rateLimitStatus?.find(
        (s) => s.model === 'gemini-3-flash-preview'
      );

      expect(flashStatus?.currentRPM).toBe(3);
    });

    it('should track rate limits per API key when using multi-key', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKeys: ['key1', 'key2', 'key3'],
        enableMonitoring: true,
      });

      // Make 9 requests (3 per key with round-robin)
      for (let i = 0; i < 9; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      // Overall RPM should be 9
      const flashStatus = stats.monitoring?.rateLimitStatus?.find(
        (s) => s.model === 'gemini-3-flash-preview'
      );
      expect(flashStatus?.currentRPM).toBe(9);
    });
  });

  describe('Health Monitoring', () => {
    it('should track successful requests as healthy', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make 20 successful requests
      for (let i = 0; i < 20; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );

      expect(flashHealth).toBeDefined();
      expect(flashHealth?.status).toBe('healthy');
      expect(flashHealth?.successRate).toBe(1);
      expect(flashHealth?.metrics.totalRequests).toBe(20);
      expect(flashHealth?.metrics.successfulRequests).toBe(20);
      expect(flashHealth?.consecutiveFailures).toBe(0);
    });

    it('should track failed requests and update health status', async () => {
      mockGeminiClient.generate.mockImplementation(() => {
        return Promise.reject(new Error('500 Server error'));
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
        maxRetries: 0,
      });

      // Make requests that fail on all models
      for (let i = 0; i < 10; i++) {
        try {
          await client.generate(`Request ${i}`);
        } catch (e) {
          // Expected to fail
        }
      }

      const stats = client.getFallbackStats();
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );

      expect(flashHealth).toBeDefined();
      expect(flashHealth?.status).toBe('unhealthy');
      expect(flashHealth?.successRate).toBe(0);
      expect(flashHealth?.metrics.failedRequests).toBeGreaterThan(0);
    });

    it('should track response times in health metrics', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };

      // Mock with delay to simulate response time
      mockGeminiClient.generate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return mockResponse;
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );

      expect(flashHealth).toBeDefined();
      expect(flashHealth?.averageResponseTime).toBeGreaterThan(0);
      expect(flashHealth?.metrics.p50ResponseTime).toBeGreaterThan(0);
      expect(flashHealth?.metrics.p95ResponseTime).toBeGreaterThan(0);
    });

    it('should track consecutive failures', async () => {
      let callCount = 0;
      mockGeminiClient.generate.mockImplementation(() => {
        callCount++;
        // Fail first 3 attempts, then succeed
        if (callCount <= 9) {
          // 3 requests * 3 models in default fallback chain
          return Promise.reject(new Error('500 Server error'));
        }
        return Promise.resolve({
          text: 'Success',
          model: 'gemini-3-flash-preview' as const,
          finishReason: 'STOP',
        });
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
        maxRetries: 0,
      });

      // Make 3 requests that fail
      for (let i = 0; i < 3; i++) {
        try {
          await client.generate(`Request ${i}`);
        } catch (e) {
          // Expected
        }
      }

      let stats = client.getFallbackStats();
      let flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );
      expect(flashHealth?.consecutiveFailures).toBe(3);

      // Make a successful request
      await client.generate('Success request');

      stats = client.getFallbackStats();
      flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );
      expect(flashHealth?.consecutiveFailures).toBe(0);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate summary statistics correctly', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make requests to create healthy state
      for (let i = 0; i < 20; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();
      const summary = stats.monitoring?.summary;

      expect(summary).toBeDefined();
      expect(summary?.healthyModels).toBeGreaterThan(0);
      expect(summary?.overallSuccessRate).toBeGreaterThan(0);
      expect(summary?.averageResponseTime).toBeGreaterThanOrEqual(0); // Mocked calls may have 0 response time
    });

    it('should reflect degraded models in summary', async () => {
      let callCount = 0;
      mockGeminiClient.generate.mockImplementation(() => {
        callCount++;
        // 85% success rate (15 failures out of 100)
        if (callCount % 7 === 0) {
          return Promise.reject(new Error('500 Server error'));
        }
        return Promise.resolve({
          text: 'Success',
          model: 'gemini-3-flash-preview' as const,
          finishReason: 'STOP',
        });
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
        maxRetries: 0,
      });

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        try {
          await client.generate(`Request ${i}`);
        } catch (e) {
          // Some will fail
        }
      }

      const stats = client.getFallbackStats();
      const summary = stats.monitoring?.summary;

      expect(summary).toBeDefined();
      // Should have some degraded or unhealthy models
      expect(summary!.degradedModels + summary!.unhealthyModels).toBeGreaterThan(0);
    });
  });

  describe('Fallback Behavior with Monitoring', () => {
    it('should track health across fallback chain', async () => {
      mockGeminiClient.generate.mockImplementation((_prompt: string, model: string) => {
        // First model fails, second succeeds
        if (model === 'gemini-3-flash-preview') {
          return Promise.reject(new Error('500 Server error'));
        }
        return Promise.resolve({
          text: 'Success',
          model: model as 'gemini-2.5-flash',
          finishReason: 'STOP',
        });
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
        maxRetries: 0,
      });

      // Make 10 requests that fallback
      for (let i = 0; i < 10; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();

      // First model should be unhealthy
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );
      expect(flashHealth?.metrics.failedRequests).toBe(10);

      // Second model should be healthy
      const liteHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-2.5-flash'
      );
      expect(liteHealth?.metrics.successfulRequests).toBe(10);
    });
  });

  describe('Multi-Key with Monitoring', () => {
    it('should track health and rate limits for multi-key setup', async () => {
      const mockResponse = {
        text: 'Success',
        model: 'gemini-3-flash-preview' as const,
        finishReason: 'STOP',
      };
      mockGeminiClient.generate.mockResolvedValue(mockResponse);

      const client = new GemBack({
        apiKeys: ['key1', 'key2', 'key3'],
        apiKeyRotationStrategy: 'round-robin',
        enableMonitoring: true,
      });

      // Make 30 requests (10 per key)
      for (let i = 0; i < 30; i++) {
        await client.generate(`Request ${i}`);
      }

      const stats = client.getFallbackStats();

      // Should have API key stats
      expect(stats.apiKeyStats).toBeDefined();
      expect(stats.apiKeyStats?.length).toBe(3);

      // Should have monitoring data
      expect(stats.monitoring).toBeDefined();
      expect(stats.monitoring?.rateLimitStatus).toBeDefined();
      expect(stats.monitoring?.modelHealth).toBeDefined();

      // Health should reflect all successful requests
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );
      expect(flashHealth?.metrics.totalRequests).toBe(30);
      expect(flashHealth?.status).toBe('healthy');
    });
  });

  describe('Stream Monitoring', () => {
    it('should track health for streaming requests', async () => {
      async function* createMockStream(text: string) {
        yield { text };
      }

      mockGeminiClient.generateStream.mockImplementation(() => {
        return createMockStream('Response');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
      });

      // Make 10 streaming requests
      for (let i = 0; i < 10; i++) {
        const stream = client.generateStream(`Request ${i}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of stream) {
          // Consume stream
        }
      }

      const stats = client.getFallbackStats();
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );

      expect(flashHealth?.metrics.totalRequests).toBe(10);
      expect(flashHealth?.metrics.successfulRequests).toBe(10);
      expect(flashHealth?.status).toBe('healthy');
    });

    it('should track failed streaming requests', async () => {
      mockGeminiClient.generateStream.mockImplementation(() => {
        throw new Error('Stream error');
      });

      const client = new GemBack({
        apiKey: 'test-key',
        enableMonitoring: true,
        maxRetries: 0,
      });

      // Make requests that fail
      for (let i = 0; i < 5; i++) {
        try {
          const stream = client.generateStream(`Request ${i}`);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const _chunk of stream) {
            // Should not reach here
          }
        } catch (e) {
          // Expected
        }
      }

      const stats = client.getFallbackStats();
      const flashHealth = stats.monitoring?.modelHealth?.find(
        (h) => h.model === 'gemini-3-flash-preview'
      );

      expect(flashHealth?.metrics.failedRequests).toBeGreaterThan(0);
    });
  });
});
