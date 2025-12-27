// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-26T14:07:46.178Z
// Source: Gemini API v1beta/models
// Generator: scripts/generate-models.ts

/**
 * Supported Gemini model identifiers
 */
export type GeminiModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  /** ⚠️ PREVIEW - Gemini 3 Flash Preview */
  | 'gemini-3-flash-preview'
  /** ⚠️ PREVIEW - Gemini 3 Pro Preview */
  | 'gemini-3-pro-preview';

/**
 * Default fallback order for stable models
 * Preview and experimental models must be explicitly specified
 */
export const DEFAULT_FALLBACK_ORDER: GeminiModel[] = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

/**
 * All supported models (including preview and experimental)
 */
export const ALL_MODELS: GeminiModel[] = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
];
