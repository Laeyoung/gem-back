import type { GeminiModel } from './models';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface GemBackOptions {
  apiKey?: string;
  apiKeys?: string[];
  fallbackOrder?: GeminiModel[];
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
  debug?: boolean;
  logLevel?: LogLevel;
  apiKeyRotationStrategy?: 'round-robin' | 'least-used';
  enableMonitoring?: boolean; // Enable rate limit tracking and health monitoring
  enableRateLimitPrediction?: boolean; // Enable predictive rate limit warnings
}

// Deprecated: Use GemBackOptions instead
export type GeminiBackClientOptions = GemBackOptions;

export interface GenerateOptions {
  model?: GeminiModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export { GeminiModel };
