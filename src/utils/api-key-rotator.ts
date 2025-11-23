import type { ApiKeyStats } from '../types/response';

export type RotationStrategy = 'round-robin' | 'least-used';

export class ApiKeyRotator {
  private apiKeys: string[];
  private currentIndex: number;
  private strategy: RotationStrategy;
  private keyStats: Map<number, ApiKeyStats>;

  constructor(apiKeys: string[], strategy: RotationStrategy = 'round-robin') {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error('At least one API key is required');
    }

    this.apiKeys = apiKeys;
    this.currentIndex = 0;
    this.strategy = strategy;
    this.keyStats = new Map();

    this.apiKeys.forEach((_, index) => {
      this.keyStats.set(index, {
        keyIndex: index,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        lastUsed: undefined,
      });
    });
  }

  getNextKey(): { key: string; index: number } {
    const index = this.selectKeyIndex();
    const key = this.apiKeys[index];

    const stats = this.keyStats.get(index)!;
    stats.totalRequests++;
    stats.lastUsed = new Date();

    return { key, index };
  }

  private selectKeyIndex(): number {
    if (this.strategy === 'round-robin') {
      const index = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      return index;
    } else {
      return this.getLeastUsedKeyIndex();
    }
  }

  private getLeastUsedKeyIndex(): number {
    let minRequests = Infinity;
    let selectedIndex = 0;

    this.keyStats.forEach((stats, index) => {
      if (stats.totalRequests < minRequests) {
        minRequests = stats.totalRequests;
        selectedIndex = index;
      }
    });

    return selectedIndex;
  }

  recordSuccess(keyIndex: number): void {
    const stats = this.keyStats.get(keyIndex);
    if (stats) {
      stats.successCount++;
      this.updateSuccessRate(stats);
    }
  }

  recordFailure(keyIndex: number): void {
    const stats = this.keyStats.get(keyIndex);
    if (stats) {
      stats.failureCount++;
      this.updateSuccessRate(stats);
    }
  }

  private updateSuccessRate(stats: ApiKeyStats): void {
    const totalAttempts = stats.successCount + stats.failureCount;
    stats.successRate = totalAttempts > 0 ? stats.successCount / totalAttempts : 0;
  }

  getStats(): ApiKeyStats[] {
    return Array.from(this.keyStats.values());
  }

  getTotalKeys(): number {
    return this.apiKeys.length;
  }

  getKeyByIndex(index: number): string | undefined {
    return this.apiKeys[index];
  }
}
