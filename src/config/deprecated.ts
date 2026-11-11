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
 * Models that are scheduled for shutdown, or superseded, with replacement
 * recommendations. Source: the official deprecations table
 * (https://aistudio.google.com/docs/deprecations), last synced 2026-11-10.
 * Dates in that table are the EARLIEST possible retirement dates.
 *
 * Note: Preview models (e.g. gemini-3.1-pro-preview) are inherently unstable
 * and may be removed by Google without prior deprecation notice. This list
 * only tracks officially announced deprecations / recommended replacements.
 */
export interface DeprecatedModelInfo {
  model: GeminiModel;
  /**
   * ISO date string (YYYY-MM-DD) of the announced shutdown (or the date from
   * which requests are rerouted to the replacement). Omitted when the model is
   * superseded but no shutdown date has been announced — e.g. endpoints that
   * Google keeps alive and transparently routes to a newer model.
   */
  shutdownDate?: string;
  replacement: GeminiModel;
  reason: DeprecationReason;
  /**
   * Free-text context (e.g. original announcement copy). Optional.
   * Use the structured `reason` for behavior decisions; `notes` is human-only.
   */
  notes?: string;
}

/**
 * Models that were removed from the upstream Gemini API.
 *
 * Populated when `npm run fetch-models` reports a shipped model that
 * disappeared from `v1beta/models`. Calls referencing these IDs are guaranteed
 * to 404, so `FallbackClient` skips the SDK call entirely and falls through to
 * the next model (see `AttemptRecord.reason === 'removed_from_api'`).
 *
 * Typed as `readonly string[]` (not `readonly GeminiModel[]`) because removed
 * model IDs are by definition no longer members of the `GeminiModel` union.
 * TypeScript callers still naming them get a compile error; JavaScript callers
 * (or `as any` casts) degrade gracefully at runtime via the skip path.
 */
export const REMOVED_MODELS: readonly string[] = [
  'gemini-2.0-flash', // shut down 2026-06-01
  'gemini-2.0-flash-lite', // shut down 2026-06-01
] as const;

/**
 * Officially recommended replacement for each removed model, surfaced in the
 * one-time runtime error so callers know what to migrate to.
 */
export const REMOVED_MODEL_REPLACEMENTS: Readonly<Record<string, GeminiModel>> = Object.freeze({
  'gemini-2.0-flash': 'gemini-3.6-flash',
  'gemini-2.0-flash-lite': 'gemini-3.1-flash-lite',
});

export const DEPRECATED_MODELS: DeprecatedModelInfo[] = [
  {
    model: 'gemini-2.5-flash',
    shutdownDate: '2026-12-01',
    replacement: 'gemini-3.5-flash-lite',
    reason: 'replaced_by_newer',
    notes: 'Deprecated; from 2026-12-01 requests are rerouted to gemini-3.5-flash-lite.',
  },
  {
    model: 'gemini-2.5-pro',
    shutdownDate: '2026-12-01',
    replacement: 'gemini-3.8-flash',
    reason: 'replaced_by_newer',
    notes: 'Deprecated; from 2026-12-01 requests are rerouted to gemini-3.8-flash.',
  },
  {
    model: 'gemini-3.1-flash-lite',
    shutdownDate: '2027-05-07',
    replacement: 'gemini-3.5-flash-lite',
    reason: 'replaced_by_newer',
    notes: 'GA model with an announced shutdown date.',
  },
  {
    model: 'gemini-3.1-flash-lite-preview',
    shutdownDate: '2026-05-25',
    replacement: 'gemini-3.1-flash-lite',
    reason: 'replaced_by_newer',
    notes:
      'Deprecated preview; announced shutdown date has passed but the API still lists it. May disappear at any time.',
  },
  {
    model: 'gemini-3-flash-preview',
    replacement: 'gemini-3.6-flash',
    reason: 'replaced_by_newer',
    notes:
      'Preview model; no shutdown date announced. Recommended replacement is gemini-3.6-flash.',
  },
  {
    model: 'gemini-3.5-flash',
    replacement: 'gemini-3.6-flash',
    reason: 'replaced_by_newer',
    notes:
      'No longer selectable in AI Studio. The endpoint is not shutting down; requests are routed automatically to gemini-3.6-flash.',
  },
  {
    model: 'gemini-3.7-flash',
    replacement: 'gemini-3.8-flash',
    reason: 'replaced_by_newer',
    notes:
      'No longer selectable in AI Studio. The endpoint is not shutting down; requests are routed automatically to gemini-3.8-flash.',
  },
];
