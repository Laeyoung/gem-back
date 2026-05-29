import type { GeminiModel } from '../types/models';

export interface FreeTierLimit {
  rpm: number;
  tpm: number;
  rpd: number;
}

/**
 * Free-tier quotas observed in AI Studio dashboard on 2026-05-28.
 *
 * Models with an entry here are known to provide free-tier access with the
 * specified per-minute and per-day limits. Models absent from this map fall
 * back to the conservative `{ rpm: 15, rpd: 1500 }` paid-tier default in
 * `RateLimitTracker`; TPM tracking is skipped for those.
 *
 * Refresh this snapshot when AI Studio publishes new quotas. Long-term
 * automation: see docs/plan-auto-free-tier-update.md.
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
 * Models that are still in the API but no longer offer a free tier
 * (paid-only as of 2026-05-28). `FallbackClient` emits a one-time
 * `logger.warn` when these are invoked, so users on free-tier keys
 * understand why they're seeing 4xx errors.
 */
export const NON_FREE_TIER_MODELS: readonly GeminiModel[] = [
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3.1-pro-preview',
] as const;
