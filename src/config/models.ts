// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2026-05-28T15:31:44.745Z
// Source: Gemini API v1beta/models
// Generator: scripts/generate-models.ts

import type { GeminiModel } from '../types/models';

/**
 * Model priority (lower number = higher priority in fallback order)
 * Used internally for intelligent fallback selection
 */
export const MODEL_PRIORITY: Record<GeminiModel, number> = {
  'gemini-3.5-flash': 0,
  'gemini-3.1-flash-lite': 10,
  'gemini-2.5-flash': 100,
  'gemini-2.5-pro': 105,
  'gemini-2.5-flash-lite': 110,
  'gemini-2.0-flash': 200,
  'gemini-2.0-flash-lite': 210,
  'gemini-3-flash-preview': 1000,
  'gemini-3.1-pro-preview': 1005,
  'gemini-3.1-flash-lite-preview': 1010,
};

/**
 * Model metadata and capabilities
 */
export const MODEL_INFO: Record<
  GeminiModel,
  {
    name: string;
    description: string;
    maxTokens: number;
  }
> = {
  'gemini-3.5-flash': {
    name: 'Gemini 3.5 Flash',
    description: 'Gemini 3.5 Flash',
    maxTokens: 65536,
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash Lite',
    description: 'Gemini 3.1 Flash Lite',
    maxTokens: 65536,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    description:
      'Stable version of Gemini 2.5 Flash, our mid-size multimodal model that supports up to 1 million tokens, released in June of 2025.',
    maxTokens: 65536,
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    description: 'Stable release (June 17th, 2025) of Gemini 2.5 Pro',
    maxTokens: 65536,
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Stable version of Gemini 2.5 Flash-Lite, released in July of 2025',
    maxTokens: 65536,
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    description: 'Gemini 2.0 Flash',
    maxTokens: 8192,
  },
  'gemini-2.0-flash-lite': {
    name: 'Gemini 2.0 Flash-Lite',
    description: 'Gemini 2.0 Flash-Lite',
    maxTokens: 8192,
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    description: 'Gemini 3 Flash Preview',
    maxTokens: 65536,
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro Preview',
    description: 'Gemini 3.1 Pro Preview',
    maxTokens: 65536,
  },
  'gemini-3.1-flash-lite-preview': {
    name: 'Gemini 3.1 Flash Lite Preview',
    description: 'Gemini 3.1 Flash Lite Preview',
    maxTokens: 65536,
  },
};
