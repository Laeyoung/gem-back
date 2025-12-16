import type {
  GemBackOptions,
  GenerateOptions,
  ChatMessage,
  GenerateContentRequest,
} from '../types/config';
import type { GeminiResponse, StreamChunk, FallbackStats } from '../types/response';
import type { AttemptRecord } from '../types/errors';
import { DEFAULT_CLIENT_OPTIONS } from '../config/defaults';
import { Logger } from '../utils/logger';
import { GeminiClient } from './GeminiClient';
import { GeminiBackError } from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import { ApiKeyRotator } from '../utils/api-key-rotator';
import { RateLimitTracker } from '../monitoring/rate-limit-tracker';
import { HealthMonitor } from '../monitoring/health-monitor';
import {
  isRateLimitError,
  isRetryableError,
  isAuthError,
  getErrorStatusCode,
} from '../utils/error-handler';

export class GemBack {
  private options: Required<Omit<GemBackOptions, 'apiKey' | 'apiKeys'>> & {
    apiKey?: string;
    apiKeys?: string[];
  };
  private logger: Logger;
  private client: GeminiClient;
  private stats: FallbackStats;
  private apiKeyRotator: ApiKeyRotator | null;
  private rateLimitTracker: RateLimitTracker | null;
  private healthMonitor: HealthMonitor | null;

  constructor(options: GemBackOptions) {
    if (!options.apiKey && (!options.apiKeys || options.apiKeys.length === 0)) {
      throw new Error('Either apiKey or apiKeys must be provided');
    }

    this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options } as Required<
      Omit<GemBackOptions, 'apiKey' | 'apiKeys'>
    > & { apiKey?: string; apiKeys?: string[] };

    this.logger = new Logger(this.options.debug ? 'debug' : this.options.logLevel, '[GemBack]');
    this.client = new GeminiClient(this.options.timeout);

    const apiKeys = options.apiKeys || (options.apiKey ? [options.apiKey] : []);
    this.apiKeyRotator =
      apiKeys.length > 1
        ? new ApiKeyRotator(apiKeys, options.apiKeyRotationStrategy || 'round-robin')
        : null;

    const singleKey = !this.apiKeyRotator;
    this.logger.info(
      singleKey
        ? 'Single API key mode'
        : `Multi API key mode: ${apiKeys.length} keys with ${this.options.apiKeyRotationStrategy || 'round-robin'} strategy`
    );

    // Initialize monitoring if enabled
    this.rateLimitTracker = options.enableMonitoring ? new RateLimitTracker() : null;
    this.healthMonitor = options.enableMonitoring ? new HealthMonitor() : null;

    if (this.rateLimitTracker || this.healthMonitor) {
      this.logger.info('Monitoring enabled: Rate limit tracking and health monitoring');
    }

    this.stats = {
      totalRequests: 0,
      successRate: 0,
      modelUsage: {
        'gemini-2.5-flash': 0,
        'gemini-2.5-flash-lite': 0,
      },
      failureCount: 0,
      apiKeyStats: this.apiKeyRotator ? this.apiKeyRotator.getStats() : undefined,
    };
  }

  private getApiKey(): { key: string; index: number | null } {
    if (this.apiKeyRotator) {
      const result = this.apiKeyRotator.getNextKey();
      return { key: result.key, index: result.index };
    }
    return { key: this.options.apiKey || this.options.apiKeys![0], index: null };
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GeminiResponse> {
    this.stats.totalRequests++;

    const attempts: AttemptRecord[] = [];
    const modelsToTry = options?.model ? [options.model] : this.options.fallbackOrder;
    const { key: apiKey, index: keyIndex } = this.getApiKey();

    for (const model of modelsToTry) {
      this.logger.debug(
        `Attempting: ${model}${keyIndex !== null ? ` (API Key #${keyIndex + 1})` : ''}`
      );

      // Check rate limit prediction before making request
      if (this.rateLimitTracker) {
        const status = this.rateLimitTracker.getStatus(model);
        if (status.willExceedSoon) {
          this.logger.warn(
            `Rate limit warning for ${model}: ${status.windowStats.requestsInLastMinute}/${status.maxRPM} RPM`
          );
        }
        if (this.rateLimitTracker.wouldExceedLimit(model)) {
          const waitTime = this.rateLimitTracker.getRecommendedWaitTime(model);
          this.logger.warn(`Would exceed rate limit for ${model}. Recommended wait: ${waitTime}ms`);
        }
      }

      const startTime = Date.now();
      try {
        // Record rate limit tracking (tracked by model, not per API key)
        if (this.rateLimitTracker) {
          this.rateLimitTracker.recordRequest(model);
        }

        const response = await retryWithBackoff(
          () => this.client.generate(prompt, model, apiKey, options),
          {
            maxRetries: this.options.maxRetries,
            delay: this.options.retryDelay,
            shouldRetry: (error: Error) => {
              if (isAuthError(error)) {
                this.logger.error(`Authentication error for ${model}: ${error.message}`);
                return false;
              }
              if (isRateLimitError(error)) {
                this.logger.warn(`Rate limit hit for ${model}: ${error.message}`);
                return false;
              }
              return isRetryableError(error);
            },
          }
        );

        const responseTime = Date.now() - startTime;

        // Record health monitoring
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, true);
        }

        this.stats.modelUsage[model]++;
        this.updateSuccessRate();
        if (keyIndex !== null && this.apiKeyRotator) {
          this.apiKeyRotator.recordSuccess(keyIndex);
        }
        this.logger.info(`Success: ${model} (${responseTime}ms)`);
        return response;
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);
        const responseTime = Date.now() - startTime;

        // Record health monitoring for failure
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, false, err.message);
        }

        attempts.push({
          model,
          error: err.message,
          timestamp: new Date(),
          statusCode,
        });

        this.logger.warn(`Failed (${statusCode || 'unknown'}): ${model} - ${err.message}`);

        if (isAuthError(err)) {
          this.stats.failureCount++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordFailure(keyIndex);
          }
          throw new GeminiBackError(
            'Authentication failed. Please check your API key.',
            'AUTH_ERROR',
            attempts,
            statusCode,
            model
          );
        }

        if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          this.logger.info(`Fallback to: ${modelsToTry[modelsToTry.indexOf(model) + 1]}`);
        }
      }
    }

    this.stats.failureCount++;
    this.updateSuccessRate();
    if (keyIndex !== null && this.apiKeyRotator) {
      this.apiKeyRotator.recordFailure(keyIndex);
    }
    throw new GeminiBackError(
      'All models failed. Please try again later.',
      'ALL_MODELS_FAILED',
      attempts
    );
  }

  private updateSuccessRate(): void {
    const totalAttempts = this.stats.totalRequests;
    const successCount = totalAttempts - this.stats.failureCount;
    this.stats.successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<StreamChunk> {
    this.stats.totalRequests++;

    const attempts: AttemptRecord[] = [];
    const modelsToTry = options?.model ? [options.model] : this.options.fallbackOrder;
    const { key: apiKey, index: keyIndex } = this.getApiKey();

    for (const model of modelsToTry) {
      this.logger.debug(
        `Attempting stream: ${model}${keyIndex !== null ? ` (API Key #${keyIndex + 1})` : ''}`
      );

      // Check rate limit prediction before making request
      if (this.rateLimitTracker) {
        const status = this.rateLimitTracker.getStatus(model);
        if (status.willExceedSoon) {
          this.logger.warn(
            `Rate limit warning for ${model}: ${status.windowStats.requestsInLastMinute}/${status.maxRPM} RPM`
          );
        }
        if (this.rateLimitTracker.wouldExceedLimit(model)) {
          const waitTime = this.rateLimitTracker.getRecommendedWaitTime(model);
          this.logger.warn(`Would exceed rate limit for ${model}. Recommended wait: ${waitTime}ms`);
        }
      }

      const startTime = Date.now();
      try {
        // Record rate limit tracking (tracked by model, not per API key)
        if (this.rateLimitTracker) {
          this.rateLimitTracker.recordRequest(model);
        }

        const stream = this.client.generateStream(prompt, model, apiKey, options);
        let hasYielded = false;

        for await (const chunk of stream) {
          hasYielded = true;
          yield {
            text: chunk.text,
            model,
            isComplete: false,
          };
        }

        if (hasYielded) {
          yield {
            text: '',
            model,
            isComplete: true,
          };

          const responseTime = Date.now() - startTime;

          // Record health monitoring
          if (this.healthMonitor) {
            this.healthMonitor.recordRequest(model, responseTime, true);
          }

          this.stats.modelUsage[model]++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordSuccess(keyIndex);
          }
          this.logger.info(`Stream success: ${model} (${responseTime}ms)`);
          return;
        }
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);
        const responseTime = Date.now() - startTime;

        // Record health monitoring for failure
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, false, err.message);
        }

        attempts.push({
          model,
          error: err.message,
          timestamp: new Date(),
          statusCode,
        });

        this.logger.warn(`Stream failed (${statusCode || 'unknown'}): ${model}`);

        if (isAuthError(err)) {
          this.stats.failureCount++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordFailure(keyIndex);
          }
          throw new GeminiBackError(
            'Authentication failed. Please check your API key.',
            'AUTH_ERROR',
            attempts,
            statusCode,
            model
          );
        }

        if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          this.logger.info(`Fallback to: ${modelsToTry[modelsToTry.indexOf(model) + 1]}`);
        }
      }
    }

    this.stats.failureCount++;
    this.updateSuccessRate();
    if (keyIndex !== null && this.apiKeyRotator) {
      this.apiKeyRotator.recordFailure(keyIndex);
    }
    throw new GeminiBackError(
      'All models failed for streaming. Please try again later.',
      'ALL_MODELS_FAILED',
      attempts
    );
  }

  async chat(messages: ChatMessage[], options?: GenerateOptions): Promise<GeminiResponse> {
    const conversationPrompt = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const finalPrompt = `${conversationPrompt}\n\nAssistant:`;

    return this.generate(finalPrompt, options);
  }

  async generateContent(request: GenerateContentRequest): Promise<GeminiResponse> {
    this.stats.totalRequests++;

    const attempts: AttemptRecord[] = [];
    const modelsToTry = request.model ? [request.model] : this.options.fallbackOrder;
    const { key: apiKey, index: keyIndex } = this.getApiKey();

    for (const model of modelsToTry) {
      this.logger.debug(
        `Attempting multimodal: ${model}${keyIndex !== null ? ` (API Key #${keyIndex + 1})` : ''}`
      );

      // Check rate limit prediction before making request
      if (this.rateLimitTracker) {
        const status = this.rateLimitTracker.getStatus(model);
        if (status.willExceedSoon) {
          this.logger.warn(
            `Rate limit warning for ${model}: ${status.windowStats.requestsInLastMinute}/${status.maxRPM} RPM`
          );
        }
        if (this.rateLimitTracker.wouldExceedLimit(model)) {
          const waitTime = this.rateLimitTracker.getRecommendedWaitTime(model);
          this.logger.warn(`Would exceed rate limit for ${model}. Recommended wait: ${waitTime}ms`);
        }
      }

      const startTime = Date.now();
      try {
        // Record rate limit tracking (tracked by model, not per API key)
        if (this.rateLimitTracker) {
          this.rateLimitTracker.recordRequest(model);
        }

        const response = await retryWithBackoff(
          () =>
            this.client.generateContent(request.contents, model, apiKey, {
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              topP: request.topP,
              topK: request.topK,
            }),
          {
            maxRetries: this.options.maxRetries,
            delay: this.options.retryDelay,
            shouldRetry: (error: Error) => {
              if (isAuthError(error)) {
                this.logger.error(`Authentication error for ${model}: ${error.message}`);
                return false;
              }
              if (isRateLimitError(error)) {
                this.logger.warn(`Rate limit hit for ${model}: ${error.message}`);
                return false;
              }
              return isRetryableError(error);
            },
          }
        );

        const responseTime = Date.now() - startTime;

        // Record health monitoring
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, true);
        }

        this.stats.modelUsage[model]++;
        this.updateSuccessRate();
        if (keyIndex !== null && this.apiKeyRotator) {
          this.apiKeyRotator.recordSuccess(keyIndex);
        }
        this.logger.info(`Success: ${model} (${responseTime}ms)`);
        return response;
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);
        const responseTime = Date.now() - startTime;

        // Record health monitoring for failure
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, false, err.message);
        }

        attempts.push({
          model,
          error: err.message,
          timestamp: new Date(),
          statusCode,
        });

        this.logger.warn(`Failed (${statusCode || 'unknown'}): ${model} - ${err.message}`);

        if (isAuthError(err)) {
          this.stats.failureCount++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordFailure(keyIndex);
          }
          throw new GeminiBackError(
            'Authentication failed. Please check your API key.',
            'AUTH_ERROR',
            attempts,
            statusCode,
            model
          );
        }

        if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          this.logger.info(`Fallback to: ${modelsToTry[modelsToTry.indexOf(model) + 1]}`);
        }
      }
    }

    this.stats.failureCount++;
    this.updateSuccessRate();
    if (keyIndex !== null && this.apiKeyRotator) {
      this.apiKeyRotator.recordFailure(keyIndex);
    }
    throw new GeminiBackError(
      'All models failed. Please try again later.',
      'ALL_MODELS_FAILED',
      attempts
    );
  }

  async *generateContentStream(request: GenerateContentRequest): AsyncGenerator<StreamChunk> {
    this.stats.totalRequests++;

    const attempts: AttemptRecord[] = [];
    const modelsToTry = request.model ? [request.model] : this.options.fallbackOrder;
    const { key: apiKey, index: keyIndex } = this.getApiKey();

    for (const model of modelsToTry) {
      this.logger.debug(
        `Attempting multimodal stream: ${model}${keyIndex !== null ? ` (API Key #${keyIndex + 1})` : ''}`
      );

      // Check rate limit prediction before making request
      if (this.rateLimitTracker) {
        const status = this.rateLimitTracker.getStatus(model);
        if (status.willExceedSoon) {
          this.logger.warn(
            `Rate limit warning for ${model}: ${status.windowStats.requestsInLastMinute}/${status.maxRPM} RPM`
          );
        }
        if (this.rateLimitTracker.wouldExceedLimit(model)) {
          const waitTime = this.rateLimitTracker.getRecommendedWaitTime(model);
          this.logger.warn(`Would exceed rate limit for ${model}. Recommended wait: ${waitTime}ms`);
        }
      }

      const startTime = Date.now();
      try {
        // Record rate limit tracking (tracked by model, not per API key)
        if (this.rateLimitTracker) {
          this.rateLimitTracker.recordRequest(model);
        }

        const stream = this.client.generateContentStream(request.contents, model, apiKey, {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          topP: request.topP,
          topK: request.topK,
        });
        let hasYielded = false;

        for await (const chunk of stream) {
          hasYielded = true;
          yield {
            text: chunk.text,
            model,
            isComplete: false,
          };
        }

        if (hasYielded) {
          yield {
            text: '',
            model,
            isComplete: true,
          };

          const responseTime = Date.now() - startTime;

          // Record health monitoring
          if (this.healthMonitor) {
            this.healthMonitor.recordRequest(model, responseTime, true);
          }

          this.stats.modelUsage[model]++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordSuccess(keyIndex);
          }
          this.logger.info(`Stream success: ${model} (${responseTime}ms)`);
          return;
        }
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);
        const responseTime = Date.now() - startTime;

        // Record health monitoring for failure
        if (this.healthMonitor) {
          this.healthMonitor.recordRequest(model, responseTime, false, err.message);
        }

        attempts.push({
          model,
          error: err.message,
          timestamp: new Date(),
          statusCode,
        });

        this.logger.warn(`Stream failed (${statusCode || 'unknown'}): ${model}`);

        if (isAuthError(err)) {
          this.stats.failureCount++;
          this.updateSuccessRate();
          if (keyIndex !== null && this.apiKeyRotator) {
            this.apiKeyRotator.recordFailure(keyIndex);
          }
          throw new GeminiBackError(
            'Authentication failed. Please check your API key.',
            'AUTH_ERROR',
            attempts,
            statusCode,
            model
          );
        }

        if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          this.logger.info(`Fallback to: ${modelsToTry[modelsToTry.indexOf(model) + 1]}`);
        }
      }
    }

    this.stats.failureCount++;
    this.updateSuccessRate();
    if (keyIndex !== null && this.apiKeyRotator) {
      this.apiKeyRotator.recordFailure(keyIndex);
    }
    throw new GeminiBackError(
      'All models failed for streaming. Please try again later.',
      'ALL_MODELS_FAILED',
      attempts
    );
  }

  getFallbackStats(): FallbackStats {
    const stats: FallbackStats = {
      ...this.stats,
      apiKeyStats: this.apiKeyRotator ? this.apiKeyRotator.getStats() : undefined,
    };

    // Add monitoring data if monitoring is enabled
    if (this.rateLimitTracker || this.healthMonitor) {
      const models: Array<'gemini-2.5-flash' | 'gemini-2.5-flash-lite'> = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
      ];

      const rateLimitStatus = this.rateLimitTracker
        ? models.map((model) => this.rateLimitTracker!.getStatus(model))
        : undefined;

      const modelHealth = this.healthMonitor
        ? models.map((model) => this.healthMonitor!.getHealth(model))
        : undefined;

      // Calculate summary statistics
      const healthyModels = modelHealth?.filter((h) => h.status === 'healthy').length || 0;
      const degradedModels = modelHealth?.filter((h) => h.status === 'degraded').length || 0;
      const unhealthyModels = modelHealth?.filter((h) => h.status === 'unhealthy').length || 0;

      const overallSuccessRate = modelHealth?.length
        ? modelHealth.reduce((sum, h) => sum + h.successRate, 0) / modelHealth.length
        : 0;

      const averageResponseTime = modelHealth?.length
        ? modelHealth.reduce((sum, h) => sum + (h.averageResponseTime || 0), 0) / modelHealth.length
        : 0;

      stats.monitoring = {
        rateLimitStatus,
        modelHealth,
        summary: {
          healthyModels,
          degradedModels,
          unhealthyModels,
          overallSuccessRate,
          averageResponseTime,
        },
      };
    }

    return stats;
  }
}
