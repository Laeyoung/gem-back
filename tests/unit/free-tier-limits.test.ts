import { describe, it, expect } from 'vitest';
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
    expect(tracker.getStatus('gemini-2.0-flash').maxRPM).toBe(15);
    // Free-tier model unaffected
    expect(tracker.getStatus('gemini-3.5-flash').maxRPM).toBe(5);
  });

  it('NON_FREE_TIER_MODELS lists the expected paid-only set', () => {
    expect(NON_FREE_TIER_MODELS).toContain('gemini-2.5-pro');
    expect(NON_FREE_TIER_MODELS).toContain('gemini-2.0-flash');
    expect(NON_FREE_TIER_MODELS).toContain('gemini-2.0-flash-lite');
    expect(NON_FREE_TIER_MODELS).toContain('gemini-3.1-pro-preview');
    // Free-tier models should NOT be in NON_FREE_TIER_MODELS
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.5-flash' as never);
    expect(NON_FREE_TIER_MODELS).not.toContain('gemini-3.1-flash-lite' as never);
  });

  it('FREE_TIER_LIMITS covers all expected free-tier models', () => {
    expect(FREE_TIER_LIMITS['gemini-2.5-flash']).toEqual({ rpm: 5, tpm: 250_000, rpd: 20 });
    expect(FREE_TIER_LIMITS['gemini-2.5-flash-lite']).toEqual({ rpm: 10, tpm: 250_000, rpd: 20 });
    expect(FREE_TIER_LIMITS['gemini-3-flash-preview']).toEqual({ rpm: 5, tpm: 250_000, rpd: 20 });
    expect(FREE_TIER_LIMITS['gemini-3.1-flash-lite']).toEqual({ rpm: 15, tpm: 250_000, rpd: 500 });
    expect(FREE_TIER_LIMITS['gemini-3.5-flash']).toEqual({ rpm: 5, tpm: 250_000, rpd: 20 });
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
});
