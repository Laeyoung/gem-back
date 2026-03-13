import type { GeminiModel } from '../types/models';

/**
 * Deprecated model information
 * Models that are scheduled for shutdown with replacement recommendations
 */
export interface DeprecatedModelInfo {
  model: GeminiModel;
  shutdownDate: string; // ISO date string (YYYY-MM-DD)
  replacement: GeminiModel;
  reason: string;
}

export const DEPRECATED_MODELS: DeprecatedModelInfo[] = [
  {
    model: 'gemini-2.0-flash',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-2.5-flash',
    reason: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.0-flash-lite',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-2.5-flash-lite',
    reason: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.5-flash',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3-flash-preview',
    reason: 'Gemini 2.5 Flash scheduled deprecation',
  },
  {
    model: 'gemini-2.5-pro',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3.1-pro-preview',
    reason: 'Gemini 2.5 Pro scheduled deprecation',
  },
  {
    model: 'gemini-2.5-flash-lite',
    shutdownDate: '2026-07-22',
    replacement: 'gemini-3.1-flash-lite-preview',
    reason: 'Gemini 2.5 Flash-Lite scheduled deprecation',
  },
];
