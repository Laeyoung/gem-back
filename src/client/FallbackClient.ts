import type { GeminiBackClientOptions, GenerateOptions, ChatMessage } from '../types/config';
import type { GeminiResponse, StreamChunk, FallbackStats } from '../types/response';
import type { AttemptRecord } from '../types/errors';
import { DEFAULT_CLIENT_OPTIONS } from '../config/defaults';
import { Logger } from '../utils/logger';
import { GeminiClient } from './GeminiClient';
import { GeminiBackError } from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import {
  isRateLimitError,
  isRetryableError,
  isAuthError,
  getErrorStatusCode,
} from '../utils/error-handler';

export class GeminiBackClient {
  private options: Required<GeminiBackClientOptions>;
  private logger: Logger;
  private client: GeminiClient;
  private stats: FallbackStats;

  constructor(options: GeminiBackClientOptions) {
    this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options } as Required<GeminiBackClientOptions>;
    this.logger = new Logger(this.options.debug ? 'debug' : this.options.logLevel, '[GemBack]');
    this.client = new GeminiClient(this.options.apiKey, this.options.timeout);
    this.stats = {
      totalRequests: 0,
      successRate: 0,
      modelUsage: {
        'gemini-2.5-flash': 0,
        'gemini-2.5-flash-lite': 0,
        'gemini-2.0-flash': 0,
        'gemini-2.0-flash-lite': 0,
      },
      failureCount: 0,
    };
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GeminiResponse> {
    this.stats.totalRequests++;

    const attempts: AttemptRecord[] = [];
    const modelsToTry = options?.model ? [options.model] : this.options.fallbackOrder;

    for (const model of modelsToTry) {
      this.logger.debug(`Attempting: ${model}`);

      try {
        const response = await retryWithBackoff(
          () => this.client.generate(prompt, model, options),
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

        this.stats.modelUsage[model]++;
        this.updateSuccessRate();
        this.logger.info(`Success: ${model}`);
        return response;
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);

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

    for (const model of modelsToTry) {
      this.logger.debug(`Attempting stream: ${model}`);

      try {
        const stream = this.client.generateStream(prompt, model, options);
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

          this.stats.modelUsage[model]++;
          this.updateSuccessRate();
          this.logger.info(`Stream success: ${model}`);
          return;
        }
      } catch (error) {
        const err = error as Error;
        const statusCode = getErrorStatusCode(err);

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

  getFallbackStats(): FallbackStats {
    return { ...this.stats };
  }
}
