import type { GeminiModel } from './models';
import type {
  FunctionDeclaration as SDKFunctionDeclaration,
  FunctionCall as SDKFunctionCall,
  FunctionResponse as SDKFunctionResponse,
  SafetySetting as SDKSafetySetting,
  HarmCategory as SDKHarmCategory,
  HarmBlockThreshold as SDKHarmBlockThreshold,
  Schema as SDKSchema,
} from '@google/genai';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

// Re-export SDK types for function calling
export type FunctionDeclaration = SDKFunctionDeclaration;
export type FunctionCall = SDKFunctionCall;
export type FunctionResponse = SDKFunctionResponse;

// Re-export SDK types for safety settings
export type SafetySetting = SDKSafetySetting;
export type HarmCategory = SDKHarmCategory;
export type HarmBlockThreshold = SDKHarmBlockThreshold;

// Re-export SDK types for JSON mode
export type ResponseSchema = SDKSchema;

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
  systemInstruction?: string | Content;
  tools?: FunctionDeclaration[];
  toolConfig?: ToolConfig;
  safetySettings?: SafetySetting[];
  responseMimeType?: string;
  responseSchema?: ResponseSchema;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Multimodal support types
export interface InlineData {
  mimeType: string;
  data: string; // Base64 encoded data
}

export interface FileData {
  mimeType: string;
  fileUri: string;
}

export type Part = { text: string } | { inlineData: InlineData } | { fileData: FileData };

export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

export type FunctionCallingMode = 'auto' | 'any' | 'none';

export interface ToolConfig {
  functionCallingMode?: FunctionCallingMode;
  allowedFunctionNames?: string[];
}

export interface GenerateContentRequest {
  contents: Content[];
  model?: GeminiModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string | Content;
  tools?: FunctionDeclaration[];
  toolConfig?: ToolConfig;
  safetySettings?: SafetySetting[];
  responseMimeType?: string;
  responseSchema?: ResponseSchema;
}

export { GeminiModel };
