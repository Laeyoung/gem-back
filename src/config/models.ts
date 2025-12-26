import type { GeminiModel } from '../types/models';

export const MODEL_PRIORITY: Record<GeminiModel, number> = {
  'gemini-3-pro-preview': 0, // Optional - highest performance but preview stability
  'gemini-3-flash': 0.5,
  'gemini-2.5-flash': 1,
  'gemini-2.5-flash-lite': 2,
};

export const MODEL_INFO: Record<
  GeminiModel,
  {
    name: string;
    description: string;
    maxTokens: number;
  }
> = {
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro Preview',
    description: '⚠️ PREVIEW - Most advanced model with breakthrough reasoning (1501 Elo)',
    maxTokens: 8192,
  },
  'gemini-3-flash': {
    name: 'Gemini 3 Flash',
    description: 'Frontier intelligence built for speed',
    maxTokens: 8192,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    description: 'Latest stable model, highest performance',
    maxTokens: 8192,
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight version of 2.5 Flash',
    maxTokens: 8192,
  },
};
