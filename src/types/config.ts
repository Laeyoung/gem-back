import type { GeminiModel } from './models';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface GeminiBackClientOptions {
  apiKey: string;
  fallbackOrder?: GeminiModel[];
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
  debug?: boolean;
  logLevel?: LogLevel;
}

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
