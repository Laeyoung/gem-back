import type { GeminiModel } from '../types/models';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ModelHealth {
  model: GeminiModel;
  status: HealthStatus;
  availability: number; // 0-100%
  averageResponseTime: number; // milliseconds
  successRate: number; // 0-1
  lastCheckTime: Date;
  consecutiveFailures: number;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    timeouts: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

export interface PerformanceMetric {
  timestamp: Date;
  responseTime: number;
  success: boolean;
  error?: string;
}

/**
 * Monitors health and performance of models
 */
export class HealthMonitor {
  private modelMetrics: Map<GeminiModel, PerformanceMetric[]> = new Map();
  private healthCheckInterval = 60000; // 1 minute
  private maxMetricsPerModel = 1000; // Keep last 1000 metrics
  private consecutiveFailures: Map<GeminiModel, number> = new Map();

  // Thresholds
  private readonly healthyThresholds = {
    successRate: 0.95, // 95%
    responseTime: 3000, // 3 seconds
    availability: 0.99, // 99%
  };

  private readonly degradedThresholds = {
    successRate: 0.8, // 80%
    responseTime: 5000, // 5 seconds
    availability: 0.9, // 90%
  };

  constructor() {
    this.initializeModels();
  }

  /**
   * Record a request result
   */
  recordRequest(model: GeminiModel, responseTime: number, success: boolean, error?: string): void {
    if (!this.modelMetrics.has(model)) {
      this.modelMetrics.set(model, []);
    }

    const metrics = this.modelMetrics.get(model)!;
    metrics.push({
      timestamp: new Date(),
      responseTime,
      success,
      error,
    });

    // Update consecutive failures
    if (success) {
      this.consecutiveFailures.set(model, 0);
    } else {
      const current = this.consecutiveFailures.get(model) || 0;
      this.consecutiveFailures.set(model, current + 1);
    }

    // Trim old metrics
    if (metrics.length > this.maxMetricsPerModel) {
      metrics.splice(0, metrics.length - this.maxMetricsPerModel);
    }
  }

  /**
   * Get current health status for a model
   */
  getHealth(model: GeminiModel): ModelHealth {
    const metrics = this.modelMetrics.get(model) || [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Filter recent metrics (last hour)
    const recentMetrics = metrics.filter((m) => m.timestamp >= oneHourAgo);

    if (recentMetrics.length === 0) {
      return this.getUnknownHealth(model);
    }

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter((m) => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const timeouts = recentMetrics.filter((m) => m.error?.includes('timeout')).length;

    const successRate = successfulRequests / totalRequests;
    const responseTimes = recentMetrics
      .filter((m) => m.success)
      .map((m) => m.responseTime)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const p50 = this.getPercentile(responseTimes, 50);
    const p95 = this.getPercentile(responseTimes, 95);
    const p99 = this.getPercentile(responseTimes, 99);

    // Calculate availability (considering timeouts and errors)
    const availability = (totalRequests - timeouts) / totalRequests;

    // Determine health status
    const status = this.determineHealthStatus(successRate, averageResponseTime, availability);

    return {
      model,
      status,
      availability,
      averageResponseTime,
      successRate,
      lastCheckTime: now,
      consecutiveFailures: this.consecutiveFailures.get(model) || 0,
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        timeouts,
        p50ResponseTime: p50,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
      },
    };
  }

  /**
   * Get health status for all models
   */
  getAllHealth(): ModelHealth[] {
    const models: GeminiModel[] = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];

    return models.map((model) => this.getHealth(model));
  }

  /**
   * Check if a model is healthy enough to use
   */
  isModelHealthy(model: GeminiModel): boolean {
    const health = this.getHealth(model);
    return health.status === 'healthy' || health.status === 'degraded';
  }

  /**
   * Get recommended model based on health
   */
  getHealthiestModel(models: GeminiModel[]): GeminiModel | null {
    const healths = models.map((model) => ({
      model,
      health: this.getHealth(model),
    }));

    // Filter out unhealthy models
    const healthy = healths.filter(
      (h) => h.health.status === 'healthy' || h.health.status === 'degraded'
    );

    if (healthy.length === 0) {
      return null;
    }

    // Sort by success rate and response time
    healthy.sort((a, b) => {
      if (a.health.successRate !== b.health.successRate) {
        return b.health.successRate - a.health.successRate;
      }
      return a.health.averageResponseTime - b.health.averageResponseTime;
    });

    return healthy[0].model;
  }

  /**
   * Reset health metrics for a model
   */
  reset(model?: GeminiModel): void {
    if (model) {
      this.modelMetrics.delete(model);
      this.consecutiveFailures.delete(model);
    } else {
      this.modelMetrics.clear();
      this.consecutiveFailures.clear();
      this.initializeModels();
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    healthyModels: number;
    degradedModels: number;
    unhealthyModels: number;
    overallSuccessRate: number;
    averageResponseTime: number;
  } {
    const allHealth = this.getAllHealth();

    const healthyModels = allHealth.filter((h) => h.status === 'healthy').length;
    const degradedModels = allHealth.filter((h) => h.status === 'degraded').length;
    const unhealthyModels = allHealth.filter((h) => h.status === 'unhealthy').length;

    const totalRequests = allHealth.reduce((sum, h) => sum + h.metrics.totalRequests, 0);
    const totalSuccess = allHealth.reduce((sum, h) => sum + h.metrics.successfulRequests, 0);
    const totalResponseTime = allHealth.reduce(
      (sum, h) => sum + h.averageResponseTime * h.metrics.totalRequests,
      0
    );

    return {
      healthyModels,
      degradedModels,
      unhealthyModels,
      overallSuccessRate: totalRequests > 0 ? totalSuccess / totalRequests : 0,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
    };
  }

  private initializeModels(): void {
    const models: GeminiModel[] = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];

    models.forEach((model) => {
      if (!this.modelMetrics.has(model)) {
        this.modelMetrics.set(model, []);
      }
      if (!this.consecutiveFailures.has(model)) {
        this.consecutiveFailures.set(model, 0);
      }
    });
  }

  private determineHealthStatus(
    successRate: number,
    responseTime: number,
    availability: number
  ): HealthStatus {
    // Unhealthy if any metric is below degraded threshold
    if (
      successRate < this.degradedThresholds.successRate ||
      responseTime > this.degradedThresholds.responseTime ||
      availability < this.degradedThresholds.availability
    ) {
      return 'unhealthy';
    }

    // Degraded if any metric is below healthy threshold
    if (
      successRate < this.healthyThresholds.successRate ||
      responseTime > this.healthyThresholds.responseTime ||
      availability < this.healthyThresholds.availability
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getUnknownHealth(model: GeminiModel): ModelHealth {
    return {
      model,
      status: 'unknown',
      availability: 0,
      averageResponseTime: 0,
      successRate: 0,
      lastCheckTime: new Date(),
      consecutiveFailures: 0,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        timeouts: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      },
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}
