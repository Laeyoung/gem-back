import type { GeminiModel } from '../types/models';
import type { GenerateOptions } from '../types/config';
import type { GeminiResponse } from '../types/response';

export class GeminiClient {
  private _apiKey: string;
  private _timeout: number;

  constructor(apiKey: string, timeout = 30000) {
    this._apiKey = apiKey;
    this._timeout = timeout;
  }

  async generate(
    _prompt: string,
    _model: GeminiModel,
    _options?: GenerateOptions
  ): Promise<GeminiResponse> {
    // TODO: Implement actual Gemini API call
    throw new Error('Not implemented yet');
  }

  async *generateStream(
    _prompt: string,
    _model: GeminiModel,
    _options?: GenerateOptions
  ): AsyncGenerator<{ text: string }> {
    // TODO: Implement streaming
    throw new Error('Not implemented yet');
  }
}
