import { GoogleGenAI } from '@google/genai';
import type { GeminiModel } from '../types/models';
import type { GenerateOptions, GenerateContentRequest, Content } from '../types/config';
import type { GeminiResponse } from '../types/response';

export class GeminiClient {
  private timeout: number;
  private clientCache: Map<string, GoogleGenAI> = new Map();

  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  private getClient(apiKey: string): GoogleGenAI {
    if (!this.clientCache.has(apiKey)) {
      this.clientCache.set(apiKey, new GoogleGenAI({ apiKey }));
    }
    return this.clientCache.get(apiKey)!;
  }

  clearCache(): void {
    this.clientCache.clear();
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const ai = this.getClient(apiKey);
    try {
      // Use list() as a lightweight check.
      // Even if we don't list all models, a successful auth check is enough.
      // We limit to 1 to keep it light if possible, though list() usually pages.
      await ai.models.list({ config: { pageSize: 1 } });
      return true;
    } catch (error) {
      // If it's an auth error, return false.
      // Otherwise, we assume the key is valid but something else is wrong (e.g. network),
      // so we might still want to return false or throw.
      // For validation purposes, if we can't connect, it's invalid.
      return false;
    }
  }

  async generate(
    prompt: string,
    modelName: GeminiModel,
    apiKey: string,
    options?: GenerateOptions
  ): Promise<GeminiResponse> {
    const ai = this.getClient(apiKey);

    const config = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config,
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const text = result.text ?? '';

    return {
      text,
      model: modelName,
      finishReason: result.candidates?.[0]?.finishReason,
      usage: result.usageMetadata
        ? {
            promptTokens: result.usageMetadata.promptTokenCount || 0,
            completionTokens: result.usageMetadata.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }

  async *generateStream(
    prompt: string,
    modelName: GeminiModel,
    apiKey: string,
    options?: GenerateOptions
  ): AsyncGenerator<{ text: string }> {
    const ai = this.getClient(apiKey);

    const config = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config,
    });

    for await (const chunk of response) {
      const chunkText = chunk.text ?? '';
      if (chunkText) {
        yield { text: chunkText };
      }
    }
  }

  async generateContent(
    contents: Content[],
    modelName: GeminiModel,
    apiKey: string,
    options?: Omit<GenerateContentRequest, 'contents' | 'model'>
  ): Promise<GeminiResponse> {
    const ai = this.getClient(apiKey);

    const config = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const text = result.text ?? '';

    return {
      text,
      model: modelName,
      finishReason: result.candidates?.[0]?.finishReason,
      usage: result.usageMetadata
        ? {
            promptTokens: result.usageMetadata.promptTokenCount || 0,
            completionTokens: result.usageMetadata.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }

  async *generateContentStream(
    contents: Content[],
    modelName: GeminiModel,
    apiKey: string,
    options?: Omit<GenerateContentRequest, 'contents' | 'model'>
  ): AsyncGenerator<{ text: string }> {
    const ai = this.getClient(apiKey);

    const config = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const response = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config,
    });

    for await (const chunk of response) {
      const chunkText = chunk.text ?? '';
      if (chunkText) {
        yield { text: chunkText };
      }
    }
  }
}
