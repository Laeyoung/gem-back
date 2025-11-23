import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeyRotator } from '../../src/utils/api-key-rotator';

describe('ApiKeyRotator', () => {
  describe('constructor', () => {
    it('should initialize with API keys', () => {
      const rotator = new ApiKeyRotator(['key1', 'key2', 'key3']);
      expect(rotator.getTotalKeys()).toBe(3);
    });

    it('should throw error with empty keys array', () => {
      expect(() => new ApiKeyRotator([])).toThrow('At least one API key is required');
    });

    it('should initialize with default round-robin strategy', () => {
      const rotator = new ApiKeyRotator(['key1', 'key2']);
      expect(rotator).toBeInstanceOf(ApiKeyRotator);
    });

    it('should initialize with least-used strategy', () => {
      const rotator = new ApiKeyRotator(['key1', 'key2'], 'least-used');
      expect(rotator).toBeInstanceOf(ApiKeyRotator);
    });
  });

  describe('round-robin strategy', () => {
    let rotator: ApiKeyRotator;

    beforeEach(() => {
      rotator = new ApiKeyRotator(['key1', 'key2', 'key3'], 'round-robin');
    });

    it('should rotate through keys in order', () => {
      const result1 = rotator.getNextKey();
      expect(result1.key).toBe('key1');
      expect(result1.index).toBe(0);

      const result2 = rotator.getNextKey();
      expect(result2.key).toBe('key2');
      expect(result2.index).toBe(1);

      const result3 = rotator.getNextKey();
      expect(result3.key).toBe('key3');
      expect(result3.index).toBe(2);

      const result4 = rotator.getNextKey();
      expect(result4.key).toBe('key1');
      expect(result4.index).toBe(0);
    });

    it('should update lastUsed timestamp', () => {
      const before = Date.now();
      rotator.getNextKey();
      const stats = rotator.getStats();
      const after = Date.now();

      expect(stats[0].lastUsed).toBeDefined();
      expect(stats[0].lastUsed!.getTime()).toBeGreaterThanOrEqual(before);
      expect(stats[0].lastUsed!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('least-used strategy', () => {
    let rotator: ApiKeyRotator;

    beforeEach(() => {
      rotator = new ApiKeyRotator(['key1', 'key2', 'key3'], 'least-used');
    });

    it('should select least used key', () => {
      // All start at 0, should pick first
      const result1 = rotator.getNextKey();
      expect(result1.index).toBe(0);

      // Now key1 has 1 request, should pick key2
      const result2 = rotator.getNextKey();
      expect(result2.index).toBe(1);

      // Now key1 and key2 have 1, should pick key3
      const result3 = rotator.getNextKey();
      expect(result3.index).toBe(2);

      // Now all have 1, should pick key1 again
      const result4 = rotator.getNextKey();
      expect(result4.index).toBe(0);
    });

    it('should balance load across keys', () => {
      for (let i = 0; i < 9; i++) {
        rotator.getNextKey();
      }

      const stats = rotator.getStats();
      expect(stats[0].totalRequests).toBe(3);
      expect(stats[1].totalRequests).toBe(3);
      expect(stats[2].totalRequests).toBe(3);
    });
  });

  describe('statistics tracking', () => {
    let rotator: ApiKeyRotator;

    beforeEach(() => {
      rotator = new ApiKeyRotator(['key1', 'key2'], 'round-robin');
    });

    it('should track successful requests', () => {
      const { index } = rotator.getNextKey();
      rotator.recordSuccess(index);

      const stats = rotator.getStats();
      expect(stats[index].successCount).toBe(1);
      expect(stats[index].failureCount).toBe(0);
      expect(stats[index].successRate).toBe(1);
    });

    it('should track failed requests', () => {
      const { index } = rotator.getNextKey();
      rotator.recordFailure(index);

      const stats = rotator.getStats();
      expect(stats[index].successCount).toBe(0);
      expect(stats[index].failureCount).toBe(1);
      expect(stats[index].successRate).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      const { index } = rotator.getNextKey();

      rotator.recordSuccess(index);
      rotator.recordSuccess(index);
      rotator.recordFailure(index);

      const stats = rotator.getStats();
      expect(stats[index].successCount).toBe(2);
      expect(stats[index].failureCount).toBe(1);
      expect(stats[index].successRate).toBeCloseTo(0.6667, 2);
    });

    it('should track total requests per key', () => {
      rotator.getNextKey(); // key1
      rotator.getNextKey(); // key2
      rotator.getNextKey(); // key1

      const stats = rotator.getStats();
      expect(stats[0].totalRequests).toBe(2);
      expect(stats[1].totalRequests).toBe(1);
    });

    it('should return all key stats', () => {
      rotator.getNextKey();
      rotator.getNextKey();

      const stats = rotator.getStats();
      expect(stats).toHaveLength(2);
      expect(stats[0].keyIndex).toBe(0);
      expect(stats[1].keyIndex).toBe(1);
    });
  });

  describe('getKeyByIndex', () => {
    it('should return correct key by index', () => {
      const rotator = new ApiKeyRotator(['key1', 'key2', 'key3']);
      expect(rotator.getKeyByIndex(0)).toBe('key1');
      expect(rotator.getKeyByIndex(1)).toBe('key2');
      expect(rotator.getKeyByIndex(2)).toBe('key3');
    });

    it('should return undefined for invalid index', () => {
      const rotator = new ApiKeyRotator(['key1', 'key2']);
      expect(rotator.getKeyByIndex(5)).toBeUndefined();
    });
  });
});
