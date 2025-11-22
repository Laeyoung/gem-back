import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, sleep } from '../../src/utils/retry';

describe('retry utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, { maxRetries: 3, delay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, { maxRetries: 3, delay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('persistent failure');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, { maxRetries: 2, delay: 10 })).rejects.toThrow(
        'persistent failure'
      );

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should apply exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retryWithBackoff(fn, { maxRetries: 2, delay: 50 });
      const elapsed = Date.now() - start;

      // First retry: 50ms, second retry: 100ms = 150ms total minimum
      expect(elapsed).toBeGreaterThanOrEqual(140);
    });

    it('should respect shouldRetry callback', async () => {
      const nonRetryableError = new Error('fatal error');
      const fn = vi.fn().mockRejectedValue(nonRetryableError);

      const shouldRetrySpy = vi.fn();
      const shouldRetry = (error: Error) => {
        shouldRetrySpy(error);
        return error.message.includes('retryable');
      };

      await expect(retryWithBackoff(fn, { maxRetries: 3, delay: 10, shouldRetry })).rejects.toThrow(
        'fatal error'
      );

      expect(fn).toHaveBeenCalledTimes(1); // Should not retry
      expect(shouldRetrySpy).toHaveBeenCalledTimes(1);
      expect(shouldRetrySpy).toHaveBeenCalledWith(nonRetryableError);
    });

    it('should retry when shouldRetry returns true', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('retryable error'))
        .mockResolvedValue('success');

      const shouldRetry = (error: Error) => error.message.includes('retryable');

      const result = await retryWithBackoff(fn, { maxRetries: 2, delay: 10, shouldRetry });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
