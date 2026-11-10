// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2026-11-10T13:19:52.584Z
// Source: Gemini API v1beta/models
// Generator: scripts/generate-models.ts

/**
 * Supported Gemini model identifiers
 */
export type GeminiModel =
  | 'gemini-3.5-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.7-flash'
  | 'gemini-3.8-flash'
  | 'gemini-4-argon'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.5-flash-lite'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite'
  /** ⚠️ PREVIEW - Gemini 3 Flash Preview */
  | 'gemini-3-flash-preview'
  /** ⚠️ PREVIEW - Gemini 3.1 Pro Preview */
  | 'gemini-3.1-pro-preview'
  /** ⚠️ PREVIEW - Gemini 3.1 Flash Lite Preview */
  | 'gemini-3.1-flash-lite-preview';

/**
 * Default fallback order: current GA models with free-tier access, lite first.
 * Preview and experimental models must be explicitly specified
 */
export const DEFAULT_FALLBACK_ORDER: GeminiModel[] = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];

/**
 * All supported models (including preview and experimental)
 */
export const ALL_MODELS: GeminiModel[] = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-4-argon',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
];
