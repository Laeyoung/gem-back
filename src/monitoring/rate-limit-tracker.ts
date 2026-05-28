import type { GeminiModel } from '../types/models';
import { ALL_MODELS } from '../types/models';
import { FREE_TIER_LIMITS } from '../config/free-tier-limits';

export interface RateLimitConfig {
  rpm: number; // Requests per minute
  rpd?: number; // Requests per day (optional)
  tpm?: number; // Tokens per minute (optional, free-tier only)
}

export interface RateLimitWindow {
  startTime: Date;
  requestCount: number;
  exceededCount: number;
}

interface TokenRecord {
  time: Date;
  tokens: number;
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
  // TPM tracking (free-tier models only). All three are `undefined` for paid-tier
  // models — see `FREE_TIER_LIMITS` in src/config/free-tier-limits.ts.
  currentTPM?: number;
  maxTPM?: number;
  tpmUtilizationPercent?: number;
}

/**
 * Tracks rate limiting for each model and API key combination
 * Provides predictions and warnings before hitting limits
 */
export class RateLimitTracker {
  private readonly defaultLimits: Record<GeminiModel, RateLimitConfig>;

  private requestHistory: Map<string, Date[]> = new Map();
  private tokenHistory: Map<string, TokenRecord[]> = new Map();
  private warningThreshold = 0.8; // Warn at 80% capacity
  private predictionThreshold = 0.9; // Predict exceed at 90%

  constructor(customLimits?: Partial<Record<GeminiModel, RateLimitConfig>>) {
    // Seed per-model defaults: free-tier models get their published limits,
    // everything else (paid-tier and unknown) gets a conservative fallback.
    // See docs/plan-free-tier-models-2026-05.md §5 Phase 3 for rationale.
    this.defaultLimits = Object.fromEntries(
      ALL_MODELS.map((model) => {
        const freeTier = FREE_TIER_LIMITS[model];
        if (freeTier) {
          return [model, { rpm: freeTier.rpm, tpm: freeTier.tpm, rpd: freeTier.rpd }];
        }
        return [model, { rpm: 15, rpd: 1500 }]; // paid-tier conservative default; no tpm
      })
    ) as Record<GeminiModel, RateLimitConfig>;

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
   * Record token usage for a completed request.
   *
   * Called by `FallbackClient` AFTER the SDK response resolves (where
   * `usageMetadata.totalTokenCount` is available). Separate from
   * `recordRequest()` because that runs before the SDK call returns.
   *
   * For paid-tier models (no `tpm` in defaults), tokens are still recorded
   * but never compared against a limit.
   */
  recordTokens(model: GeminiModel, tokens: number, apiKeyIndex?: number): void {
    if (tokens <= 0) return;
    const key = this.getKey(model, apiKeyIndex);

    if (!this.tokenHistory.has(key)) {
      this.tokenHistory.set(key, []);
    }

    this.tokenHistory.get(key)!.push({ time: new Date(), tokens });
    this.cleanOldTokens(key);
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
    const rpmUtilization = (currentRPM / config.rpm) * 100;

    let utilizationPercent = rpmUtilization;
    let currentTPM: number | undefined;
    let maxTPM: number | undefined;
    let tpmUtilizationPercent: number | undefined;

    if (config.tpm !== undefined) {
      const tokens = this.tokenHistory.get(key) || [];
      currentTPM = tokens
        .filter((r) => r.time >= oneMinuteAgo)
        .reduce((sum, r) => sum + r.tokens, 0);
      maxTPM = config.tpm;
      tpmUtilizationPercent = (currentTPM / maxTPM) * 100;
      // The effective utilization is whichever limit is closest to being hit.
      utilizationPercent = Math.max(utilizationPercent, tpmUtilizationPercent);
    }

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
      currentTPM,
      maxTPM,
      tpmUtilizationPercent,
    };
  }

  /**
   * Check if a request would exceed the rate limit
   */
  wouldExceedLimit(model: GeminiModel, apiKeyIndex?: number): boolean {
    const status = this.getStatus(model, apiKeyIndex);
    if (status.currentRPM >= status.maxRPM) return true;
    if (status.maxTPM !== undefined && status.currentTPM !== undefined) {
      if (status.currentTPM >= status.maxTPM) return true;
    }
    return false;
  }

  /**
   * Get all models that are near their rate limit
   */
  getModelsNearLimit(): RateLimitStatus[] {
    const models: GeminiModel[] = ALL_MODELS;

    return models.map((model) => this.getStatus(model)).filter((status) => status.isNearLimit);
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
      this.tokenHistory.delete(key);
    } else {
      this.requestHistory.clear();
      this.tokenHistory.clear();
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
    const requestsByModel: Record<GeminiModel, number> = Object.fromEntries(
      ALL_MODELS.map((model) => [model, 0])
    ) as Record<GeminiModel, number>;

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

  private cleanOldTokens(key: string): void {
    const tokens = this.tokenHistory.get(key);
    if (!tokens) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.tokenHistory.set(
      key,
      tokens.filter((r) => r.time >= fiveMinutesAgo)
    );
  }
}
