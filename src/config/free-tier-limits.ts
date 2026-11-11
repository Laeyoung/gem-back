import type { GeminiModel } from '../types/models';

export interface FreeTierLimit {
  rpm: number;
  tpm: number;
  rpd: number;
}

/**
 * Free-tier quotas read from the Google AI Studio dashboard (Usage & Billing →
 * Rate Limit, "All models" view) on 2026-11-11, on an account whose projects
 * are all on the Free tier. Values are the "limit" side of the dashboard's
 * "used / limit" columns.
 *
 * Models with an entry here are known to provide free-tier access with the
 * specified per-minute and per-day limits. Models absent from this map fall
 * back to the conservative `{ rpm: 15, rpd: 1500 }` default in
 * `RateLimitTracker`; TPM tracking is skipped for those.
 *
 * Long-term automation: see docs/plan-auto-free-tier-update.md.
 */
export const FREE_TIER_LIMITS: Readonly<Partial<Record<GeminiModel, Readonly<FreeTierLimit>>>> =
  Object.freeze({
    'gemini-3.5-flash-lite': Object.freeze({ rpm: 15, tpm: 250_000, rpd: 500 }),
    'gemini-3.1-flash-lite': Object.freeze({ rpm: 15, tpm: 250_000, rpd: 500 }),
    'gemini-3.6-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-3.8-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-3-flash-preview': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-2.5-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    'gemini-2.5-flash-lite': Object.freeze({ rpm: 10, tpm: 250_000, rpd: 20 }),
    // Not listed on the dashboard: superseded, and Google auto-routes its
    // requests to gemini-3.6-flash, so it is metered against that model's limits.
    'gemini-3.5-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
    // Not listed on the dashboard: superseded, and Google auto-routes its
    // requests to gemini-3.8-flash, so it is metered against that model's limits.
    'gemini-3.7-flash': Object.freeze({ rpm: 5, tpm: 250_000, rpd: 20 }),
  });

/**
 * Models that are still in the API but offer no free tier (paid-only).
 * `FallbackClient` emits a one-time `logger.warn` when these are invoked, so
 * users on free-tier keys understand why they're seeing 4xx errors.
 *
 * All three show a free-tier limit of 0 RPM / 0 TPM / 0 RPD in the AI Studio
 * dashboard on 2026-11-11 (gemini-4-argon also returned 429 with free-tier
 * `limit: 0` when probed on 2026-11-10).
 */
export const NON_FREE_TIER_MODELS: readonly GeminiModel[] = [
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
  'gemini-4-argon',
] as const;
