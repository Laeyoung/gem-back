import type { GeminiModel } from './models';

export interface GeminiResponse {
  text: string;
  model: GeminiModel;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  text: string;
  model: GeminiModel;
  isComplete: boolean;
}

export interface FallbackStats {
  totalRequests: number;
  successRate: number;
  modelUsage: Record<GeminiModel, number>;
  failureCount: number;
}
