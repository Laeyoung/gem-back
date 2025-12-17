import { GoogleGenAI } from '@google/genai';
import type { GeminiModel, EmbeddingModel } from '../types/models';
import type {
  GenerateOptions,
  GenerateContentRequest,
  Content,
  EmbedOptions,
} from '../types/config';
import type { GeminiResponse, EmbedResponse } from '../types/response';

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

  async embedContent(
    content: string | string[],
    modelName: EmbeddingModel,
    apiKey: string,
    options?: EmbedOptions
  ): Promise<EmbedResponse> {
    const ai = this.getClient(apiKey);

    const config = {
      title: options?.title,
      taskType: options?.taskType,
      outputDimensionality: options?.outputDimensionality,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });

    const embedPromise = ai.models.embedContent({
      model: modelName,
      contents: Array.isArray(content) ? content : [content],
      config,
    });

    const result = await Promise.race([embedPromise, timeoutPromise]);

    // The SDK returns embeddings as an array of objects with 'values' property
    // We map it to just an array of number[]
    const embeddings = result.embeddings?.map((e) => e.values || []) || [];

    // Calculate approx token count if not provided (SDK might not return usage for embeddings yet)
    // For now we just return undefined for usage if not available
    const usage = undefined;

    return {
      embeddings,
      model: modelName,
      usage,
    };
  }
}
