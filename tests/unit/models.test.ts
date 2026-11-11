import { describe, it, expect } from 'vitest';
import { ALL_MODELS, DEFAULT_FALLBACK_ORDER, GeminiModel } from '../../src/types/models';
import {
  DEPRECATED_MODELS,
  REMOVED_MODELS,
  REMOVED_MODEL_REPLACEMENTS,
} from '../../src/config/deprecated';
import { FREE_TIER_LIMITS, NON_FREE_TIER_MODELS } from '../../src/config/free-tier-limits';
import { MODEL_INFO } from '../../src/config/models';

describe('Model Definitions', () => {
  it('should export ALL_MODELS as an array of strings', () => {
    expect(Array.isArray(ALL_MODELS)).toBe(true);
    expect(ALL_MODELS).toHaveLength(13);
    ALL_MODELS.forEach((model) => {
      expect(typeof model).toBe('string');
    });
  });

  it('should include key models in ALL_MODELS', () => {
    expect(ALL_MODELS).toContain('gemini-3.5-flash');
    expect(ALL_MODELS).toContain('gemini-2.5-flash-lite');
    // Newest free-tier models (v0.7.0)
    expect(ALL_MODELS).toContain('gemini-3.5-flash');
    expect(ALL_MODELS).toContain('gemini-3.1-flash-lite');
    // Preview models
    expect(ALL_MODELS).toContain('gemini-3.1-pro-preview');
    expect(ALL_MODELS).toContain('gemini-3-flash-preview');
    // Current GA models (v0.8.0)
    expect(ALL_MODELS).toContain('gemini-3.5-flash-lite');
    expect(ALL_MODELS).toContain('gemini-3.6-flash');
    expect(ALL_MODELS).toContain('gemini-3.7-flash');
    expect(ALL_MODELS).toContain('gemini-3.8-flash');
    expect(ALL_MODELS).toContain('gemini-4-argon');
    // Removed/specialized models (deprecated in v0.6.0 or excluded as variants)
    expect(ALL_MODELS).not.toContain('gemini-3-pro-preview' as GeminiModel);
  });

  it('should keep previews the API still serves even though a newer major exists', () => {
    expect(ALL_MODELS).toContain('gemini-3-flash-preview');
    expect(ALL_MODELS).toContain('gemini-3.1-pro-preview');
    expect(ALL_MODELS).toContain('gemini-3.1-flash-lite-preview');
  });

  it('should not contain non-text or specialized variants', () => {
    for (const model of ALL_MODELS) {
      expect(model).toMatch(/^gemini-\d+(\.\d+)?-/);
      expect(model).not.toMatch(/tts|transcribe|image|customtools|omni|nano-banana/);
    }
  });

  it('should use the API output token limits', () => {
    expect(MODEL_INFO['gemini-4-argon'].maxTokens).toBe(32768);
    expect(MODEL_INFO['gemini-3.6-flash'].maxTokens).toBe(65536);
    expect(MODEL_INFO['gemini-3.5-flash-lite'].maxTokens).toBe(65536);
  });

  it('should default to GA models with free-tier access, lite first', () => {
    expect(DEFAULT_FALLBACK_ORDER).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
    ]);
    const deprecated = new Set<string>(DEPRECATED_MODELS.map((d) => d.model));
    DEFAULT_FALLBACK_ORDER.forEach((model) => {
      expect(model).not.toMatch(/preview|exp/);
      expect(deprecated.has(model)).toBe(false);
      expect(NON_FREE_TIER_MODELS).not.toContain(model);
    });
  });

  it('should only include models with bundled free-tier limits', () => {
    // Every default-chain model has a confirmed free-tier quota (AI Studio, 2026-11-11).
    DEFAULT_FALLBACK_ORDER.forEach((model) => {
      expect(FREE_TIER_LIMITS[model]).toBeDefined();
    });
  });

  it('should ensure DEFAULT_FALLBACK_ORDER is a subset of ALL_MODELS', () => {
    DEFAULT_FALLBACK_ORDER.forEach((model) => {
      expect(ALL_MODELS).toContain(model);
    });
  });

  it('should not include shutdown models in DEFAULT_FALLBACK_ORDER', () => {
    expect(DEFAULT_FALLBACK_ORDER).not.toContain('gemini-3-pro-preview');
  });
});

describe('DEPRECATED_MODELS', () => {
  it('should have all deprecated models in ALL_MODELS', () => {
    DEPRECATED_MODELS.forEach(({ model }) => {
      expect(ALL_MODELS).toContain(model);
    });
  });

  it('should have all replacement models in ALL_MODELS', () => {
    DEPRECATED_MODELS.forEach(({ replacement }) => {
      expect(ALL_MODELS).toContain(replacement);
    });
  });

  it('should have valid shutdown dates where one is announced', () => {
    DEPRECATED_MODELS.forEach(({ shutdownDate }) => {
      if (shutdownDate === undefined) return;
      expect(shutdownDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(shutdownDate)).not.toBeNaN();
    });
  });

  it('should match the official deprecations table (synced 2026-11-10)', () => {
    const byModel = Object.fromEntries(
      DEPRECATED_MODELS.map((d) => [d.model, [d.shutdownDate, d.replacement]])
    );
    expect(byModel).toEqual({
      'gemini-2.5-flash': ['2026-12-01', 'gemini-3.5-flash-lite'],
      'gemini-2.5-pro': ['2026-12-01', 'gemini-3.8-flash'],
      'gemini-3.1-flash-lite': ['2027-05-07', 'gemini-3.5-flash-lite'],
      'gemini-3.1-flash-lite-preview': ['2026-05-25', 'gemini-3.1-flash-lite'],
      'gemini-3-flash-preview': [undefined, 'gemini-3.6-flash'],
      'gemini-3.5-flash': [undefined, 'gemini-3.6-flash'],
      'gemini-3.7-flash': [undefined, 'gemini-3.8-flash'],
    });
    // GA with no announced shutdown date must not be listed.
    expect(byModel).not.toHaveProperty('gemini-2.5-flash-lite');
  });

  it('should list each model at most once', () => {
    const ids = DEPRECATED_MODELS.map((d) => d.model);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('REMOVED_MODELS', () => {
  it('should list the Gemini 2.0 models shut down on 2026-06-01', () => {
    expect(REMOVED_MODELS).toEqual(['gemini-2.0-flash', 'gemini-2.0-flash-lite']);
  });

  it('should not overlap with ALL_MODELS, DEPRECATED_MODELS, FREE_TIER_LIMITS or NON_FREE_TIER_MODELS', () => {
    for (const removed of REMOVED_MODELS) {
      expect(ALL_MODELS as string[]).not.toContain(removed);
      expect(DEPRECATED_MODELS.map((d) => d.model as string)).not.toContain(removed);
      expect(Object.keys(FREE_TIER_LIMITS)).not.toContain(removed);
      expect(NON_FREE_TIER_MODELS as readonly string[]).not.toContain(removed);
    }
  });

  it('should map every removed model to a replacement that is still supported', () => {
    expect(REMOVED_MODEL_REPLACEMENTS).toEqual({
      'gemini-2.0-flash': 'gemini-3.6-flash',
      'gemini-2.0-flash-lite': 'gemini-3.1-flash-lite',
    });
    for (const removed of REMOVED_MODELS) {
      expect(ALL_MODELS).toContain(REMOVED_MODEL_REPLACEMENTS[removed]);
    }
  });
});
