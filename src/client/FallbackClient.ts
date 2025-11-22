import type { GeminiBackClientOptions, GenerateOptions, ChatMessage } from '../types/config';
import type { GeminiResponse, StreamChunk, FallbackStats } from '../types/response';
import { DEFAULT_CLIENT_OPTIONS } from '../config/defaults';
import { Logger } from '../utils/logger';
import { GeminiClient } from './GeminiClient';

export class GeminiBackClient {
  private options: Required<GeminiBackClientOptions>;
  private _logger: Logger;
  private _client: GeminiClient;
  private stats: FallbackStats;

  constructor(options: GeminiBackClientOptions) {
    this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options } as Required<GeminiBackClientOptions>;
    this._logger = new Logger(
      this.options.debug ? 'debug' : this.options.logLevel,
      '[GemBack]'
    );
    this._client = new GeminiClient(this.options.apiKey, this.options.timeout);
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

  async generate(_prompt: string, _options?: GenerateOptions): Promise<GeminiResponse> {
    // TODO: Implement fallback logic
    throw new Error('Not implemented yet');
  }

  async *generateStream(
    _prompt: string,
    _options?: GenerateOptions
  ): AsyncGenerator<StreamChunk> {
    // TODO: Implement streaming with fallback
    throw new Error('Not implemented yet');
  }

  async chat(_messages: ChatMessage[], _options?: GenerateOptions): Promise<GeminiResponse> {
    // TODO: Implement chat with fallback
    throw new Error('Not implemented yet');
  }

  getFallbackStats(): FallbackStats {
    return { ...this.stats };
  }
}
