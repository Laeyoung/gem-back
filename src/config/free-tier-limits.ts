import type { GeminiModel } from '../types/models';

export interface FreeTierLimit {
  rpm: number;
  tpm: number;
  rpd: number;
}

/**
 * Free-tier quotas observed in the AI Studio dashboard on 2026-05-28.
 *
 * NOT re-verified since: per-model free-tier quotas are no longer published in
 * the docs (dashboard only), so the 0.8.0 sync on 2026-11-10 could not refresh
 * these numbers. Treat them as a best-effort snapshot.
 *
 * Models with an entry here are known to provide free-tier access with the
 * specified per-minute and per-day limits. Models absent from this map fall
 * back to the conservative `{ rpm: 15, rpd: 1500 }` default in
 * `RateLimitTracker`; TPM tracking is skipped for those.
 *
 * Free-tier models WITHOUT an entry because their limits are unknown (a
 * maintainer needs to read them off the AI Studio dashboard):
 *   - gemini-3.5-flash-lite, gemini-3.6-flash (free-tier access confirmed by
 *     probe on 2026-11-10)
 *   - gemini-3.7-flash, gemini-3.8-flash (free-tier access unconfirmed)
 * Callers can supply real numbers via the `customRateLimits` option meanwhile.
 *
 * Long-term automation: see docs/plan-auto-free-tier-update.md.
 */
export const FREE_TIER_LIMITS: Readonly<Partial<Record<GeminiModel, Readonly<FreeTierLimit>>>> =
  Object.freeze({
    'gemini-2.5-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-2.5-flash-lite': Object.freeze({ rpm: 10, tpm: 250_000, rpd: 20 }),
    'gemini-3-flash-preview': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-3.1-flash-lite': Object.freeze({ rpm: 15, tpm: 250_000, rpd: 500 }),
    'gemini-3.5-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
  });

/**
 * Models that are still in the API but offer no free tier (paid-only).
 * `FallbackClient` emits a one-time `logger.warn` when these are invoked, so
 * users on free-tier keys understand why they're seeing 4xx errors.
 *
 * Observed: gemini-2.5-pro, gemini-3.1-pro-preview on 2026-05-28 (dashboard);
 * gemini-4-argon on 2026-11-10 (429 with free-tier `limit: 0`).
 */
export const NON_FREE_TIER_MODELS: readonly GeminiModel[] = [
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
  'gemini-4-argon',
] as const;
