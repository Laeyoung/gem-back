/** ⚠️ PREVIEW - Gemini 3 Pro Preview */
export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

/**
 * Default fallback order for stable models
 * Preview models (like gemini-3-pro-preview) are not included by default
 * Users must explicitly add them to their fallback order if desired
 */
export const DEFAULT_FALLBACK_ORDER: GeminiModel[] = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

/**
 * All supported models (including preview models)
 * Use this constant when iterating over all possible models
 */
export const ALL_MODELS: GeminiModel[] = [
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];
