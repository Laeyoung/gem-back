import { describe, it, expect, vi } from 'vitest';
import { RateLimitTracker } from '../../src/monitoring/rate-limit-tracker';
import { FREE_TIER_LIMITS, NON_FREE_TIER_MODELS } from '../../src/config/free-tier-limits';

describe('Free-tier limits (Phase 3)', () => {
  it('applies per-model RPM defaults from FREE_TIER_LIMITS', () => {
    const tracker = new RateLimitTracker();

    // gemini-3.5-flash: 5 RPM
    const status35 = tracker.getStatus('gemini-3.5-flash');
    expect(status35.maxRPM).toBe(5);
    expect(status35.maxTPM).toBe(250_000);

    // gemini-3.1-flash-lite: 15 RPM (highest free-tier)
    const statusLite = tracker.getStatus('gemini-3.1-flash-lite');
    expect(statusLite.maxRPM).toBe(15);
    expect(statusLite.maxTPM).toBe(250_000);

    // gemini-2.5-flash-lite: 10 RPM
    const statusFlashLite = tracker.getStatus('gemini-2.5-flash-lite');
    expect(statusFlashLite.maxRPM).toBe(10);
  });

  it('uses paid-tier conservative default for non-free-tier models', () => {
    const tracker = new RateLimitTracker();

    const status = tracker.getStatus('gemini-2.5-pro');
    expect(status.maxRPM).toBe(15); // conservative paid-tier default
    expect(status.maxTPM).toBeUndefined(); // no TPM tracking for paid-tier
    expect(status.tpmUtilizationPercent).toBeUndefined();
  });

  it('customLimits override does not affect other models', () => {
    const tracker = new RateLimitTracker({
      'gemini-2.5-pro': { rpm: 50, rpd: 5000 },
    });

    // Overridden model
    expect(tracker.getStatus('gemini-2.5-pro').maxRPM).toBe(50);
    // Sibling paid-tier model still on default
    expect(tracker.getStatus('gemini-3.1-pro-preview').maxRPM).toBe(15);
    // Free-tier model unaffected
    expect(tracker.getStatus('gemini-3.5-flash').maxRPM).toBe(5);
  });

  it('NON_FREE_TIER_MODELS lists the expected paid-only set', () => {
    expect(NON_FREE_TIER_MODELS).toEqual([
      'gemini-2.5-pro',
      'gemini-3.1-pro-preview',
      'gemini-4-argon', // dashboard limit 0 on 2026-11-11
    ]);
    // Free-tier models should NOT be in NON_FREE_TIER_MODELS
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.5-flash' as never);
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.1-flash-lite' as never);
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.5-flash-lite' as never);
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.6-flash' as never);
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.8-flash' as never);
  });

  it('applies dashboard limits to the default-chain models', () => {
    const tracker = new RateLimitTracker();
    // AI Studio dashboard, 2026-11-11 (Free tier)
    expect(tracker.getStatus('gemini-3.5-flash-lite').maxRPM).toBe(15);
    expect(tracker.getStatus('gemini-3.5-flash-lite').maxTPM).toBe(250_000);
    expect(tracker.getStatus('gemini-3.6-flash').maxRPM).toBe(5);
    expect(tracker.getStatus('gemini-3.6-flash').maxTPM).toBe(250_000);
    expect(tracker.getStatus('gemini-3.8-flash').maxRPM).toBe(5);
    expect(tracker.getStatus('gemini-3.8-flash').maxTPM).toBe(250_000);
  });

  it('does not bundle free-tier limits for paid-only models', () => {
    // Dashboard shows limit 0 for these; they keep the tracker default.
    for (const model of NON_FREE_TIER_MODELS) {
      expect(FREE_TIER_LIMITS[model]).toBeUndefined();
      const status = new RateLimitTracker().getStatus(model);
      expect(status.maxRPM).toBe(15);
      expect(status.maxTPM).toBeUndefined();
    }
  });

  it('falls back to the conservative default for IDs outside ALL_MODELS instead of throwing', () => {
    const tracker = new RateLimitTracker();
    for (const model of ['gemini-2.0-flash', 'some-future-model']) {
      tracker.recordRequest(model as any);
      const status = tracker.getStatus(model as any);
      expect(status.maxRPM).toBe(15);
      expect(status.currentRPM).toBe(1);
      expect(status.maxTPM).toBeUndefined();
      expect(tracker.wouldExceedLimit(model as any)).toBe(false);
    }
  });

  it('FREE_TIER_LIMITS matches the AI Studio dashboard (2026-11-11, Free tier)', () => {
    expect(FREE_TIER_LIMITS).toEqual({
      'gemini-3.5-flash-lite': { rpm: 15, tpm: 250_000, rpd: 500 },
      'gemini-3.1-flash-lite': { rpm: 15, tpm: 250_000, rpd: 500 },
      'gemini-3.6-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
      'gemini-3.8-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
      'gemini-3-flash-preview': { rpm: 5, tpm: 250_000, rpd: 20 },
      'gemini-2.5-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
      'gemini-2.5-flash-lite': { rpm: 10, tpm: 250_000, rpd: 20 },
      // Not on the dashboard; requests auto-route, so they inherit the target's limits.
      'gemini-3.5-flash': { rpm: 5, tpm: 250_000, rpd: 20 }, // → gemini-3.6-flash
      'gemini-3.7-flash': { rpm: 5, tpm: 250_000, rpd: 20 }, // → gemini-3.8-flash
    });
  });

  it('superseded models carry the limits of the model their requests route to', () => {
    expect(FREE_TIER_LIMITS['gemini-3.5-flash']).toEqual(FREE_TIER_LIMITS['gemini-3.6-flash']);
    expect(FREE_TIER_LIMITS['gemini-3.7-flash']).toEqual(FREE_TIER_LIMITS['gemini-3.8-flash']);
  });
});

describe('TPM tracking (Phase 4)', () => {
  it('records tokens and surfaces currentTPM', () => {
    const tracker = new RateLimitTracker();

    tracker.recordRequest('gemini-3.5-flash');
    tracker.recordTokens('gemini-3.5-flash', 50_000);

    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.currentTPM).toBe(50_000);
    expect(status.tpmUtilizationPercent).toBeCloseTo(20, 1); // 50K / 250K
  });

  it('flags willExceedSoon when TPM crosses 90% even if RPM is low', () => {
    const tracker = new RateLimitTracker();

    tracker.recordRequest('gemini-3.5-flash');
    tracker.recordTokens('gemini-3.5-flash', 225_000); // 90% of 250K

    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.currentRPM).toBe(1); // very low RPM
    expect(status.tpmUtilizationPercent).toBeCloseTo(90, 1);
    expect(status.willExceedSoon).toBe(true);
  });

  it('flags isNearLimit at 80% TPM', () => {
    const tracker = new RateLimitTracker();
    tracker.recordRequest('gemini-3.5-flash');
    tracker.recordTokens('gemini-3.5-flash', 200_000); // 80% of 250K

    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.isNearLimit).toBe(true);
    expect(status.willExceedSoon).toBe(false); // exactly at 80, not yet 90
  });

  it('does not surface TPM fields for paid-tier models', () => {
    const tracker = new RateLimitTracker();
    tracker.recordRequest('gemini-2.5-pro');
    tracker.recordTokens('gemini-2.5-pro', 999_999_999); // huge — should not trigger anything

    const status = tracker.getStatus('gemini-2.5-pro');
    expect(status.currentTPM).toBeUndefined();
    expect(status.maxTPM).toBeUndefined();
    expect(status.tpmUtilizationPercent).toBeUndefined();
    expect(status.isNearLimit).toBe(false);
    expect(status.willExceedSoon).toBe(false);
  });

  it('reset() clears token history alongside request history', () => {
    const tracker = new RateLimitTracker();
    tracker.recordRequest('gemini-3.5-flash');
    tracker.recordTokens('gemini-3.5-flash', 100_000);

    tracker.reset('gemini-3.5-flash');

    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.currentRPM).toBe(0);
    expect(status.currentTPM).toBe(0);
  });

  it('wouldExceedLimit returns true when TPM is exhausted but RPM is well under', () => {
    const tracker = new RateLimitTracker();

    // Single request — RPM = 1 of 5, comfortably under
    tracker.recordRequest('gemini-3.5-flash');
    // …but tokens hit the TPM ceiling
    tracker.recordTokens('gemini-3.5-flash', 250_000);

    expect(tracker.wouldExceedLimit('gemini-3.5-flash')).toBe(true);
  });

  it('wouldExceedLimit ignores TPM for paid-tier models even when token count is huge', () => {
    const tracker = new RateLimitTracker();

    tracker.recordRequest('gemini-2.5-pro');
    tracker.recordTokens('gemini-2.5-pro', 5_000_000); // would dwarf any free-tier limit

    expect(tracker.wouldExceedLimit('gemini-2.5-pro')).toBe(false);
  });

  it('does not record TPM for streaming methods (intentional per MONITORING.md §TPM)', () => {
    // Regression guard: streaming generators don't surface usageMetadata
    // per-chunk, so RateLimitTracker does not see streaming token usage.
    // If a future change wires streaming TPM through, this assertion should
    // be updated alongside MONITORING.md to keep docs and behavior aligned.
    const tracker = new RateLimitTracker();
    tracker.recordRequest('gemini-3.5-flash');
    // Note the absence of any tracker.recordTokens() call here — that is the
    // contract the streaming paths inherit from FallbackClient.
    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.currentTPM).toBe(0);
    expect(status.tpmUtilizationPercent).toBe(0);
  });

  it('excludes tokens older than 1 minute from currentTPM but retains them within the 5-minute window', () => {
    vi.useFakeTimers();
    try {
      const tracker = new RateLimitTracker();
      tracker.recordTokens('gemini-3.5-flash', 100_000);

      // Just past the 1-minute query window but well inside the 5-minute retention window.
      vi.advanceTimersByTime(65_000);

      const status = tracker.getStatus('gemini-3.5-flash');
      expect(status.currentTPM).toBe(0); // 1-min query window excludes the 65s-old record

      // Record fresh tokens; only the new ones should be counted.
      tracker.recordTokens('gemini-3.5-flash', 30_000);
      const status2 = tracker.getStatus('gemini-3.5-flash');
      expect(status2.currentTPM).toBe(30_000);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('customRateLimits merge semantics', () => {
  it('preserves unspecified fields on the existing entry (partial-field merge)', () => {
    const tracker = new RateLimitTracker({
      // override only RPM; tpm should be retained from FREE_TIER_LIMITS default
      'gemini-3.5-flash': { rpm: 99 },
    });

    const status = tracker.getStatus('gemini-3.5-flash');
    expect(status.maxRPM).toBe(99);
    expect(status.maxTPM).toBe(250_000); // tpm from FREE_TIER_LIMITS, not lost
  });

  it('can introduce tpm on a paid-tier model via partial override', () => {
    const tracker = new RateLimitTracker({
      'gemini-2.5-pro': { tpm: 500_000 },
    });

    const status = tracker.getStatus('gemini-2.5-pro');
    expect(status.maxRPM).toBe(15); // conservative paid-tier default preserved
    expect(status.maxTPM).toBe(500_000); // newly introduced via override
  });

  it('accepts overrides for unlisted model IDs with rpm supplied', () => {
    const tracker = new RateLimitTracker({
      ['future-unknown-model' as any]: { rpm: 7, tpm: 100_000 },
    });

    const status = tracker.getStatus('future-unknown-model' as any);
    expect(status.maxRPM).toBe(7);
    expect(status.maxTPM).toBe(100_000);
  });

  it('accepts partial overrides for unlisted model IDs, falling back to rpm=15', () => {
    const tracker = new RateLimitTracker({
      ['future-unknown-model' as any]: { tpm: 100_000 },
    });

    const status = tracker.getStatus('future-unknown-model' as any);
    // No rpm supplied → conservative paid-tier default kicks in.
    expect(status.maxRPM).toBe(15);
    expect(status.maxTPM).toBe(100_000);
  });
});
