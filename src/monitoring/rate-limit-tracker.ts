import type { GeminiModel } from '../types/models';

export interface RateLimitConfig {
  rpm: number; // Requests per minute
  rpd?: number; // Requests per day (optional)
}

export interface RateLimitWindow {
  startTime: Date;
  requestCount: number;
  exceededCount: number;
}

export interface RateLimitStatus {
  model: GeminiModel;
  currentRPM: number;
  maxRPM: number;
  utilizationPercent: number;
  isNearLimit: boolean;
  willExceedSoon: boolean;
  nextResetTime: Date;
  windowStats: {
    requestsInLastMinute: number;
    requestsInLast5Minutes: number;
    averageRPM: number;
  };
}

/**
 * Tracks rate limiting for each model and API key combination
 * Provides predictions and warnings before hitting limits
 */
export class RateLimitTracker {
  private readonly defaultLimits: Record<GeminiModel, RateLimitConfig> = {
    'gemini-2.5-flash': { rpm: 15, rpd: 1500 },
    'gemini-2.5-flash-lite': { rpm: 15, rpd: 1500 },
    'gemini-2.0-flash': { rpm: 15, rpd: 1500 },
    'gemini-2.0-flash-lite': { rpm: 15, rpd: 1500 },
  };

  private requestHistory: Map<string, Date[]> = new Map();
  private warningThreshold = 0.8; // Warn at 80% capacity
  private predictionThreshold = 0.9; // Predict exceed at 90%

  constructor(customLimits?: Partial<Record<GeminiModel, RateLimitConfig>>) {
    if (customLimits) {
      Object.assign(this.defaultLimits, customLimits);
    }
  }

  /**
   * Record a request for a model
   */
  recordRequest(model: GeminiModel, apiKeyIndex?: number): void {
    const key = this.getKey(model, apiKeyIndex);
    const now = new Date();

    if (!this.requestHistory.has(key)) {
      this.requestHistory.set(key, []);
    }

    const history = this.requestHistory.get(key)!;
    history.push(now);

    // Clean old entries (older than 5 minutes)
    this.cleanOldEntries(key);
  }

  /**
   * Get current rate limit status for a model
   */
  getStatus(model: GeminiModel, apiKeyIndex?: number): RateLimitStatus {
    const key = this.getKey(model, apiKeyIndex);
    const config = this.defaultLimits[model];
    const history = this.requestHistory.get(key) || [];

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const requestsInLastMinute = history.filter((t) => t >= oneMinuteAgo).length;
    const requestsInLast5Minutes = history.filter((t) => t >= fiveMinutesAgo).length;

    const averageRPM = requestsInLast5Minutes / 5;
    const currentRPM = requestsInLastMinute;
    const utilizationPercent = (currentRPM / config.rpm) * 100;

    const isNearLimit = utilizationPercent >= this.warningThreshold * 100;
    const willExceedSoon = utilizationPercent >= this.predictionThreshold * 100;

    // Calculate next reset time (start of next minute)
    const nextResetTime = new Date(now.getTime());
    nextResetTime.setSeconds(0, 0);
    nextResetTime.setMinutes(nextResetTime.getMinutes() + 1);

    return {
      model,
      currentRPM,
      maxRPM: config.rpm,
      utilizationPercent,
      isNearLimit,
      willExceedSoon,
      nextResetTime,
      windowStats: {
        requestsInLastMinute,
        requestsInLast5Minutes,
        averageRPM,
      },
    };
  }

  /**
   * Check if a request would exceed the rate limit
   */
  wouldExceedLimit(model: GeminiModel, apiKeyIndex?: number): boolean {
    const status = this.getStatus(model, apiKeyIndex);
    return status.currentRPM >= status.maxRPM;
  }

  /**
   * Get all models that are near their rate limit
   */
  getModelsNearLimit(): RateLimitStatus[] {
    const models: GeminiModel[] = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];

    return models
      .map((model) => this.getStatus(model))
      .filter((status) => status.isNearLimit);
  }

  /**
   * Get recommended wait time before next request
   */
  getRecommendedWaitTime(model: GeminiModel, apiKeyIndex?: number): number {
    const status = this.getStatus(model, apiKeyIndex);

    if (!status.willExceedSoon) {
      return 0; // No wait needed
    }

    if (status.currentRPM >= status.maxRPM) {
      // Already at limit, wait until next reset
      return status.nextResetTime.getTime() - Date.now();
    }

    // Near limit, suggest small delay
    const remainingCapacity = status.maxRPM - status.currentRPM;
    const utilizationRate = status.windowStats.averageRPM;

    if (utilizationRate > remainingCapacity) {
      // High utilization, suggest longer wait
      return 5000; // 5 seconds
    }

    return 1000; // 1 second
  }

  /**
   * Reset tracking for a specific model/key combination
   */
  reset(model?: GeminiModel, apiKeyIndex?: number): void {
    if (model) {
      const key = this.getKey(model, apiKeyIndex);
      this.requestHistory.delete(key);
    } else {
      this.requestHistory.clear();
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics(): {
    totalRequests: number;
    requestsByModel: Record<GeminiModel, number>;
    peakRPM: number;
    averageRPM: number;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    let totalRequests = 0;
    const requestsByModel: Record<GeminiModel, number> = {
      'gemini-2.5-flash': 0,
      'gemini-2.5-flash-lite': 0,
      'gemini-2.0-flash': 0,
      'gemini-2.0-flash-lite': 0,
    };

    let requestsInLastMinute = 0;
    let requestsInLast5Minutes = 0;

    this.requestHistory.forEach((history, key) => {
      const model = this.extractModelFromKey(key);
      requestsByModel[model] += history.length;
      totalRequests += history.length;

      requestsInLastMinute += history.filter((t) => t >= oneMinuteAgo).length;
      requestsInLast5Minutes += history.filter((t) => t >= fiveMinutesAgo).length;
    });

    return {
      totalRequests,
      requestsByModel,
      peakRPM: requestsInLastMinute,
      averageRPM: requestsInLast5Minutes / 5,
    };
  }

  private getKey(model: GeminiModel, apiKeyIndex?: number): string {
    return apiKeyIndex !== undefined ? `${model}:${apiKeyIndex}` : model;
  }

  private extractModelFromKey(key: string): GeminiModel {
    const model = key.split(':')[0];
    return model as GeminiModel;
  }

  private cleanOldEntries(key: string): void {
    const history = this.requestHistory.get(key);
    if (!history) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const filtered = history.filter((t) => t >= fiveMinutesAgo);

    this.requestHistory.set(key, filtered);
  }
}
