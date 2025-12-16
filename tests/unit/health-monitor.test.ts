import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthMonitor } from '../../src/monitoring/health-monitor';
import type { GeminiModel } from '../../src/types/models';

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    monitor = new HealthMonitor();
    vi.useFakeTimers();
  });

  describe('Request Recording', () => {
    it('should record successful requests', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, true);
      monitor.recordRequest(model, 1500, true);
      monitor.recordRequest(model, 1200, true);

      const health = monitor.getHealth(model);

      expect(health.metrics.totalRequests).toBe(3);
      expect(health.metrics.successfulRequests).toBe(3);
      expect(health.metrics.failedRequests).toBe(0);
      expect(health.successRate).toBe(1);
    });

    it('should record failed requests', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, true);
      monitor.recordRequest(model, 500, false, '500 Server error');
      monitor.recordRequest(model, 600, false, '429 Rate limit');

      const health = monitor.getHealth(model);

      expect(health.metrics.totalRequests).toBe(3);
      expect(health.metrics.successfulRequests).toBe(1);
      expect(health.metrics.failedRequests).toBe(2);
      expect(health.successRate).toBeCloseTo(0.33, 2);
    });

    it('should track consecutive failures', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, false);

      const health = monitor.getHealth(model);
      expect(health.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, true); // Success resets

      const health = monitor.getHealth(model);
      expect(health.consecutiveFailures).toBe(0);
    });

    it('should track timeouts separately', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, false, 'Request timeout');
      monitor.recordRequest(model, 1000, false, 'Network timeout');
      monitor.recordRequest(model, 1000, false, '500 Server error');

      const health = monitor.getHealth(model);
      expect(health.metrics.timeouts).toBe(2);
    });
  });

  describe('Health Status Determination', () => {
    it('should mark as healthy with high success rate', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // 96% success rate, fast responses
      for (let i = 0; i < 96; i++) {
        monitor.recordRequest(model, 1000, true);
      }
      for (let i = 0; i < 4; i++) {
        monitor.recordRequest(model, 1000, false);
      }

      const health = monitor.getHealth(model);
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBeCloseTo(0.96, 2);
    });

    it('should mark as degraded with moderate success rate', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // 85% success rate
      for (let i = 0; i < 85; i++) {
        monitor.recordRequest(model, 2000, true);
      }
      for (let i = 0; i < 15; i++) {
        monitor.recordRequest(model, 2000, false);
      }

      const health = monitor.getHealth(model);
      expect(health.status).toBe('degraded');
      expect(health.successRate).toBeCloseTo(0.85, 2);
    });

    it('should mark as unhealthy with low success rate', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // 70% success rate (below degraded threshold)
      for (let i = 0; i < 70; i++) {
        monitor.recordRequest(model, 1000, true);
      }
      for (let i = 0; i < 30; i++) {
        monitor.recordRequest(model, 1000, false);
      }

      const health = monitor.getHealth(model);
      expect(health.status).toBe('unhealthy');
      expect(health.successRate).toBeCloseTo(0.70, 2);
    });

    it('should mark as degraded with slow response times', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // High success but slow responses (4000ms avg)
      for (let i = 0; i < 100; i++) {
        monitor.recordRequest(model, 4000, true);
      }

      const health = monitor.getHealth(model);
      expect(health.status).toBe('degraded');
      expect(health.averageResponseTime).toBe(4000);
    });

    it('should mark as unhealthy with very slow response times', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Very slow responses (6000ms avg)
      for (let i = 0; i < 100; i++) {
        monitor.recordRequest(model, 6000, true);
      }

      const health = monitor.getHealth(model);
      expect(health.status).toBe('unhealthy');
    });

    it('should return unknown status with no data', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      const health = monitor.getHealth(model);
      expect(health.status).toBe('unknown');
      expect(health.successRate).toBe(0);
      expect(health.metrics.totalRequests).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate average response time correctly', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, true);
      monitor.recordRequest(model, 2000, true);
      monitor.recordRequest(model, 1500, true);

      const health = monitor.getHealth(model);
      expect(health.averageResponseTime).toBeCloseTo(1500, 0);
    });

    it('should calculate percentile response times', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record various response times (100 data points for better percentile calculation)
      for (let i = 1; i <= 100; i++) {
        monitor.recordRequest(model, i * 10, true);
      }

      const health = monitor.getHealth(model);
      expect(health.metrics.p50ResponseTime).toBeGreaterThan(0);
      expect(health.metrics.p95ResponseTime).toBeGreaterThan(health.metrics.p50ResponseTime);
      expect(health.metrics.p99ResponseTime).toBeGreaterThanOrEqual(health.metrics.p95ResponseTime);
    });

    it('should only include successful requests in response time calculations', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, true);
      monitor.recordRequest(model, 5000, false); // Failed request, should not affect avg
      monitor.recordRequest(model, 2000, true);

      const health = monitor.getHealth(model);
      expect(health.averageResponseTime).toBeCloseTo(1500, 0); // (1000 + 2000) / 2
    });

    it('should calculate availability correctly', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // 8 successful, 2 timeouts
      for (let i = 0; i < 8; i++) {
        monitor.recordRequest(model, 1000, true);
      }
      for (let i = 0; i < 2; i++) {
        monitor.recordRequest(model, 1000, false, 'timeout');
      }

      const health = monitor.getHealth(model);
      expect(health.availability).toBeCloseTo(0.8, 2); // 8 available out of 10
    });
  });

  describe('Time Windows', () => {
    it('should only consider recent metrics (last hour)', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record old requests
      for (let i = 0; i < 50; i++) {
        monitor.recordRequest(model, 1000, false);
      }

      // Advance 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // Record new successful requests
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(model, 1000, true);
      }

      const health = monitor.getHealth(model);
      // Should only count recent requests
      expect(health.metrics.totalRequests).toBe(10);
      expect(health.successRate).toBe(1);
    });
  });

  describe('Model Comparison', () => {
    it('should identify healthiest model', () => {
      // Model 1: 90% success, 1500ms avg
      for (let i = 0; i < 90; i++) {
        monitor.recordRequest('gemini-2.5-flash', 1500, true);
      }
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest('gemini-2.5-flash', 1500, false);
      }

      for (let i = 0; i < 95; i++) {
        monitor.recordRequest('gemini-2.5-flash-lite', 2000, true);
      }
      for (let i = 0; i < 5; i++) {
        monitor.recordRequest('gemini-2.5-flash-lite', 2000, false);
      }

      // Model 3: 98% success, 1000ms avg (best)
      /* 
       * Can't test 3 valid models since we only have 2 now. 
       * Just testing with 2 models is sufficient for logic check.
       */

      const healthiest = monitor.getHealthiestModel([
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
      ]);

      expect(healthiest).toBe('gemini-2.5-flash-lite');
    });

    it('should return null when no models are healthy', () => {
      // All models unhealthy
      for (let i = 0; i < 30; i++) {
        monitor.recordRequest('gemini-2.5-flash', 1000, false);
      }
      for (let i = 0; i < 30; i++) {
        monitor.recordRequest('gemini-2.5-flash-lite', 1000, false);
      }

      const healthiest = monitor.getHealthiestModel([
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
      ]);

      expect(healthiest).toBeNull();
    });

    it('should check if model is healthy', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record healthy metrics
      for (let i = 0; i < 96; i++) {
        monitor.recordRequest(model, 1000, true);
      }
      for (let i = 0; i < 4; i++) {
        monitor.recordRequest(model, 1000, false);
      }

      expect(monitor.isModelHealthy(model)).toBe(true);
    });

    it('should accept degraded as healthy enough', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record degraded metrics (85% success)
      for (let i = 0; i < 85; i++) {
        monitor.recordRequest(model, 2000, true);
      }
      for (let i = 0; i < 15; i++) {
        monitor.recordRequest(model, 2000, false);
      }

      expect(monitor.isModelHealthy(model)).toBe(true);
    });

    it('should reject unhealthy models', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record unhealthy metrics
      for (let i = 0; i < 30; i++) {
        monitor.recordRequest(model, 1000, false);
      }

      expect(monitor.isModelHealthy(model)).toBe(false);
    });
  });

  describe('Get All Health', () => {
    it('should return health for all models', () => {
      monitor.recordRequest('gemini-2.5-flash', 1000, true);
      const allHealth = monitor.getAllHealth();

      expect(allHealth.length).toBe(2); // All 2 supported models
      expect(allHealth.map((h) => h.model)).toContain('gemini-2.5-flash');
      expect(allHealth.map((h) => h.model)).toContain('gemini-2.5-flash-lite');
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate summary across all models', () => {
      // Healthy model
      for (let i = 0; i < 96; i++) {
        monitor.recordRequest('gemini-2.5-flash', 1000, true);
      }
      for (let i = 0; i < 4; i++) {
        monitor.recordRequest('gemini-2.5-flash', 1000, false);
      }

      // Degraded model
      for (let i = 0; i < 85; i++) {
        monitor.recordRequest('gemini-2.5-flash-lite', 2000, true);
      }
      for (let i = 0; i < 15; i++) {
        monitor.recordRequest('gemini-2.5-flash-lite', 2000, false);
      }

      // Unhealthy model
      // Unhealthy model - reusing 2.5-flash to make it unhealthy now
      // This will overwrite previous healthy stats for 2.5-flash
      for (let i = 0; i < 30; i++) {
        monitor.recordRequest('gemini-2.5-flash', 3000, false);
      }

      const summary = monitor.getSummary();

      expect(summary.healthyModels).toBe(0); // 2.5-flash became unhealthy
      expect(summary.degradedModels).toBe(1); // 2.5-flash-lite is degraded
      expect(summary.unhealthyModels).toBe(1); // 2.5-flash is unhealthy
      expect(summary.overallSuccessRate).toBeGreaterThan(0);
      expect(summary.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset specific model metrics', () => {
      monitor.recordRequest('gemini-2.5-flash', 1000, true);
      monitor.recordRequest('gemini-2.5-flash-lite', 1000, true);

      monitor.reset('gemini-2.5-flash');

      const health1 = monitor.getHealth('gemini-2.5-flash');
      const health2 = monitor.getHealth('gemini-2.5-flash-lite');

      expect(health1.metrics.totalRequests).toBe(0);
      expect(health2.metrics.totalRequests).toBe(1);
    });

    it('should reset all metrics', () => {
      monitor.recordRequest('gemini-2.5-flash', 1000, true);
      monitor.recordRequest('gemini-2.5-flash-lite', 1000, true);

      monitor.reset();

      const health1 = monitor.getHealth('gemini-2.5-flash');
      const health2 = monitor.getHealth('gemini-2.5-flash-lite');

      expect(health1.metrics.totalRequests).toBe(0);
      expect(health2.metrics.totalRequests).toBe(0);
    });

    it('should reset consecutive failures', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, false);

      monitor.reset(model);

      const health = monitor.getHealth(model);
      expect(health.consecutiveFailures).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response time array for percentiles', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record only failures
      monitor.recordRequest(model, 1000, false);
      monitor.recordRequest(model, 1000, false);

      const health = monitor.getHealth(model);
      expect(health.metrics.p50ResponseTime).toBe(0);
      expect(health.metrics.p95ResponseTime).toBe(0);
      expect(health.metrics.p99ResponseTime).toBe(0);
    });

    it('should handle single data point for percentiles', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      monitor.recordRequest(model, 1000, true);

      const health = monitor.getHealth(model);
      expect(health.metrics.p50ResponseTime).toBe(1000);
      expect(health.metrics.p95ResponseTime).toBe(1000);
      expect(health.metrics.p99ResponseTime).toBe(1000);
    });

    it('should trim old metrics when exceeding max', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 1500 requests (exceeds maxMetricsPerModel of 1000)
      for (let i = 0; i < 1500; i++) {
        monitor.recordRequest(model, 1000, true);
      }

      // Should only keep last 1000
      const health = monitor.getHealth(model);
      expect(health.metrics.totalRequests).toBe(1000);
    });
  });
});
