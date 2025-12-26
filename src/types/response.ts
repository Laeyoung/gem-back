import type { GeminiModel, EmbeddingModel } from './models';

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

export interface EmbedResponse {
  embeddings: number[][];
  model: EmbeddingModel;
  usage?: {
    totalTokens: number;
  };
}

export interface StreamChunk {
  text: string;
  model: GeminiModel;
  isComplete: boolean;
}

export interface ApiKeyStats {
  keyIndex: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed?: Date;
}

export interface FallbackStats {
  totalRequests: number;
  successRate: number;
  modelUsage: Record<GeminiModel | EmbeddingModel, number>;
  failureCount: number;
  apiKeyStats?: ApiKeyStats[];
  monitoring?: {
    rateLimitStatus?: import('../monitoring').RateLimitStatus[];
    modelHealth?: import('../monitoring').ModelHealth[];
    summary?: {
      healthyModels: number;
      degradedModels: number;
      unhealthyModels: number;
      overallSuccessRate: number;
      averageResponseTime: number;
    };
  };
}
