// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-26T14:07:46.178Z
// Source: Gemini API v1beta/models
// Generator: scripts/generate-models.ts

import type { GeminiModel } from '../types/models';

/**
 * Model priority (lower number = higher priority in fallback order)
 * Used internally for intelligent fallback selection
 */
export const MODEL_PRIORITY: Record<GeminiModel, number> = {
  'gemini-3-flash-preview': 0, // 5 RPM (free) - highest priority
  'gemini-2.5-flash': 1, // 5 RPM (free)
  'gemini-2.5-flash-lite': 2, // 10 RPM (free)
  'gemini-2.5-pro': 105,
  'gemini-2.0-flash': 200,
  'gemini-2.0-flash-lite': 210,
  'gemini-3-pro-preview': 1305,
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
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro Preview',
    description: 'Gemini 3 Pro Preview',
    maxTokens: 65536,
  },
};
