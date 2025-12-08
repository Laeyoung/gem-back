import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitTracker } from '../../src/monitoring/rate-limit-tracker';
import type { GeminiModel } from '../../src/types/models';

describe('RateLimitTracker', () => {
  let tracker: RateLimitTracker;

  beforeEach(() => {
    tracker = new RateLimitTracker();
    vi.useFakeTimers();
  });

  describe('Request Recording', () => {
    it('should record requests for a model', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      tracker.recordRequest(model);
      tracker.recordRequest(model);
      tracker.recordRequest(model);

      const status = tracker.getStatus(model);
      expect(status.currentRPM).toBe(3);
      expect(status.windowStats.requestsInLastMinute).toBe(3);
    });

    it('should record requests separately for different models', () => {
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash-lite');

      const status1 = tracker.getStatus('gemini-2.5-flash');
      const status2 = tracker.getStatus('gemini-2.5-flash-lite');

      expect(status1.currentRPM).toBe(2);
      expect(status2.currentRPM).toBe(1);
    });

    it('should track requests separately per API key index', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      tracker.recordRequest(model, 0);
      tracker.recordRequest(model, 0);
      tracker.recordRequest(model, 1);

      const status0 = tracker.getStatus(model, 0);
      const status1 = tracker.getStatus(model, 1);

      expect(status0.currentRPM).toBe(2);
      expect(status1.currentRPM).toBe(1);
    });
  });

  describe('Rate Limit Detection', () => {
    it('should detect when near rate limit', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 12 requests (80% of 15 RPM limit)
      for (let i = 0; i < 12; i++) {
        tracker.recordRequest(model);
      }

      const status = tracker.getStatus(model);
      expect(status.isNearLimit).toBe(true);
      expect(status.willExceedSoon).toBe(false);
    });

    it('should detect when will exceed soon', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 14 requests (93% of 15 RPM limit)
      for (let i = 0; i < 14; i++) {
        tracker.recordRequest(model);
      }

      const status = tracker.getStatus(model);
      expect(status.isNearLimit).toBe(true);
      expect(status.willExceedSoon).toBe(true);
    });

    it('should correctly calculate utilization percent', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 7.5 requests (50% of 15 RPM)
      for (let i = 0; i < 7; i++) {
        tracker.recordRequest(model);
      }

      const status = tracker.getStatus(model);
      expect(status.utilizationPercent).toBeCloseTo(46.67, 1); // 7/15 * 100
      expect(status.isNearLimit).toBe(false);
    });

    it('should return true when would exceed limit', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 15 requests (at limit)
      for (let i = 0; i < 15; i++) {
        tracker.recordRequest(model);
      }

      expect(tracker.wouldExceedLimit(model)).toBe(true);
    });

    it('should return false when under limit', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      tracker.recordRequest(model);
      tracker.recordRequest(model);

      expect(tracker.wouldExceedLimit(model)).toBe(false);
    });
  });

  describe('Time Windows', () => {
    it('should clean old requests outside 1-minute window', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        tracker.recordRequest(model);
      }

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      // Record new request to trigger cleanup
      tracker.recordRequest(model);

      const status = tracker.getStatus(model);
      // Only the new request should be in the 1-minute window
      expect(status.currentRPM).toBe(1);
      expect(status.windowStats.requestsInLastMinute).toBe(1);
    });

    it('should track 5-minute window correctly', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 3 requests
      for (let i = 0; i < 3; i++) {
        tracker.recordRequest(model);
      }

      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Record 2 more requests
      for (let i = 0; i < 2; i++) {
        tracker.recordRequest(model);
      }

      const status = tracker.getStatus(model);
      expect(status.windowStats.requestsInLast5Minutes).toBe(5);
      expect(status.windowStats.averageRPM).toBe(1); // 5 requests / 5 minutes
    });

    it('should calculate next reset time correctly', () => {
      const now = new Date('2025-01-01T12:34:56.789Z');
      vi.setSystemTime(now);

      const model: GeminiModel = 'gemini-2.5-flash';
      tracker.recordRequest(model);

      const status = tracker.getStatus(model);
      const expectedReset = new Date('2025-01-01T12:35:00.000Z');

      expect(status.nextResetTime.getTime()).toBe(expectedReset.getTime());
    });
  });

  describe('Wait Time Recommendations', () => {
    it('should return 0 wait time when not near limit', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      tracker.recordRequest(model);
      tracker.recordRequest(model);

      const waitTime = tracker.getRecommendedWaitTime(model);
      expect(waitTime).toBe(0);
    });

    it('should suggest 5 second wait when will exceed soon with high utilization', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 14 requests (93% of limit)
      for (let i = 0; i < 14; i++) {
        tracker.recordRequest(model);
      }

      const waitTime = tracker.getRecommendedWaitTime(model);
      // High utilization rate (14/5 = 2.8 avg RPM) > remaining capacity (1)
      expect(waitTime).toBe(5000); // 5 seconds
    });

    it('should suggest wait until reset when at limit', () => {
      const now = new Date('2025-01-01T12:34:56.789Z');
      vi.setSystemTime(now);

      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 15 requests (at limit)
      for (let i = 0; i < 15; i++) {
        tracker.recordRequest(model);
      }

      const waitTime = tracker.getRecommendedWaitTime(model);
      // Should wait until next minute (12:35:00.000Z)
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThan(5000); // Less than 5 seconds
    });
  });

  describe('Custom Limits', () => {
    it('should accept custom rate limits', () => {
      const customTracker = new RateLimitTracker({
        'gemini-2.5-flash': { rpm: 30 },
      });

      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 20 requests (67% of custom 30 RPM)
      for (let i = 0; i < 20; i++) {
        customTracker.recordRequest(model);
      }

      const status = customTracker.getStatus(model);
      expect(status.maxRPM).toBe(30);
      expect(status.currentRPM).toBe(20);
      expect(status.isNearLimit).toBe(false); // Under 80% threshold
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', () => {
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash-lite');

      const stats = tracker.getStatistics();

      expect(stats.totalRequests).toBe(3);
      expect(stats.requestsByModel['gemini-2.5-flash']).toBe(2);
      expect(stats.requestsByModel['gemini-2.5-flash-lite']).toBe(1);
      expect(stats.peakRPM).toBe(3);
    });

    it('should calculate average RPM correctly', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      // Record 10 requests
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest(model);
      }

      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Record 5 more requests
      for (let i = 0; i < 5; i++) {
        tracker.recordRequest(model);
      }

      const stats = tracker.getStatistics();
      expect(stats.averageRPM).toBe(3); // 15 requests / 5 minutes
    });
  });

  describe('Reset', () => {
    it('should reset specific model tracking', () => {
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash-lite');

      tracker.reset('gemini-2.5-flash');

      const status1 = tracker.getStatus('gemini-2.5-flash');
      const status2 = tracker.getStatus('gemini-2.5-flash-lite');

      expect(status1.currentRPM).toBe(0);
      expect(status2.currentRPM).toBe(1);
    });

    it('should reset all tracking', () => {
      tracker.recordRequest('gemini-2.5-flash');
      tracker.recordRequest('gemini-2.5-flash-lite');

      tracker.reset();

      const status1 = tracker.getStatus('gemini-2.5-flash');
      const status2 = tracker.getStatus('gemini-2.5-flash-lite');

      expect(status1.currentRPM).toBe(0);
      expect(status2.currentRPM).toBe(0);
    });

    it('should reset specific API key tracking', () => {
      const model: GeminiModel = 'gemini-2.5-flash';

      tracker.recordRequest(model, 0);
      tracker.recordRequest(model, 1);

      tracker.reset(model, 0);

      const status0 = tracker.getStatus(model, 0);
      const status1 = tracker.getStatus(model, 1);

      expect(status0.currentRPM).toBe(0);
      expect(status1.currentRPM).toBe(1);
    });
  });

  describe('Get Models Near Limit', () => {
    it('should return only models near their limit', () => {
      // Model 1: near limit
      for (let i = 0; i < 13; i++) {
        tracker.recordRequest('gemini-2.5-flash');
      }

      // Model 2: not near limit
      tracker.recordRequest('gemini-2.5-flash-lite');
      tracker.recordRequest('gemini-2.5-flash-lite');

      const nearLimit = tracker.getModelsNearLimit();

      expect(nearLimit.length).toBe(1);
      expect(nearLimit[0].model).toBe('gemini-2.5-flash');
      expect(nearLimit[0].isNearLimit).toBe(true);
    });
  });
});
