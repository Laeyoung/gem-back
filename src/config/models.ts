import type { GeminiModel } from '../types/models';

export const MODEL_PRIORITY: Record<GeminiModel, number> = {
  'gemini-2.5-flash': 1,
  'gemini-2.5-flash-lite': 2,
  'gemini-2.0-flash': 3,
  'gemini-2.0-flash-lite': 4,
};

export const MODEL_INFO: Record<
  GeminiModel,
  {
    name: string;
    description: string;
    maxTokens: number;
  }
> = {
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    description: 'Latest, highest performance model',
    maxTokens: 8192,
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight version of 2.5 Flash',
    maxTokens: 8192,
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    description: 'Stable version',
    maxTokens: 8192,
  },
  'gemini-2.0-flash-lite': {
    name: 'Gemini 2.0 Flash Lite',
    description: 'Lightweight stable version',
    maxTokens: 8192,
  },
};
