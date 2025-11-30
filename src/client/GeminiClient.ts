import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiModel } from '../types/models';
import type { GenerateOptions, GenerateContentRequest, Content } from '../types/config';
import type { GeminiResponse } from '../types/response';

export class GeminiClient {
  private timeout: number;

  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  async generate(
    prompt: string,
    modelName: GeminiModel,
    apiKey: string,
    options?: GenerateOptions
  ): Promise<GeminiResponse> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
    });

    const generationConfig = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });

    const generatePromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    return {
      text,
      model: modelName,
      finishReason: response.candidates?.[0]?.finishReason,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
    });

    const generationConfig = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
    });

    const generationConfig = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });

    const generatePromise = model.generateContent({
      contents,
      generationConfig,
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    return {
      text,
      model: modelName,
      finishReason: response.candidates?.[0]?.finishReason,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
    });

    const generationConfig = {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      topP: options?.topP,
      topK: options?.topK,
    };

    const result = await model.generateContentStream({
      contents,
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield { text: chunkText };
      }
    }
  }
}
