import type { GeminiModel } from '../types/models';

/**
 * Why a model is deprecated.
 *
 * - `replaced_by_newer`: A newer version is available (most common).
 * - `removed_from_api`: Upstream API no longer returns the model; calls will 404.
 *   When set, `FallbackClient` skips the call entirely and immediately falls back.
 * - `tier_change`: Model still exists in the API but moved off the free tier.
 */
export type DeprecationReason = 'replaced_by_newer' | 'removed_from_api' | 'tier_change';

/**
 * Deprecated model information
 * Models that are scheduled for shutdown with replacement recommendations
 *
 * Note: Preview models (e.g. gemini-3-flash-preview, gemini-3.1-pro-preview)
 * are inherently unstable and may be removed by Google without prior deprecation
 * notice. This list only tracks officially announced deprecation schedules.
 */
export interface DeprecatedModelInfo {
  model: GeminiModel;
  shutdownDate: string; // ISO date string (YYYY-MM-DD)
  replacement: GeminiModel;
  reason: DeprecationReason;
  /**
   * Free-text context (e.g. original announcement copy). Optional.
   * Use the structured `reason` for behavior decisions; `notes` is human-only.
   */
  notes?: string;
}

export const DEPRECATED_MODELS: DeprecatedModelInfo[] = [
  {
    model: 'gemini-2.0-flash',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3-flash-preview',
    reason: 'replaced_by_newer',
    notes: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.0-flash-lite',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3.1-flash-lite',
    reason: 'replaced_by_newer',
    notes: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.5-flash',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3-flash-preview',
    reason: 'replaced_by_newer',
    notes: 'Gemini 2.5 Flash scheduled deprecation',
  },
  {
    model: 'gemini-2.5-pro',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3.1-pro-preview',
    reason: 'replaced_by_newer',
    notes: 'Gemini 2.5 Pro scheduled deprecation',
  },
  {
    model: 'gemini-2.5-flash-lite',
    shutdownDate: '2026-07-22',
    replacement: 'gemini-3.1-flash-lite',
    reason: 'replaced_by_newer',
    notes: 'Gemini 2.5 Flash-Lite scheduled deprecation',
  },
  {
    model: 'gemini-3.1-flash-lite-preview',
    shutdownDate: '2026-05-29',
    replacement: 'gemini-3.1-flash-lite',
    reason: 'replaced_by_newer',
    notes:
      'Stable gemini-3.1-flash-lite released; preview retained for backward compatibility but will be removed in a future release.',
  },
];
