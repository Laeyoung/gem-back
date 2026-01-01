import { describe, it, expect } from 'vitest';
import { ALL_MODELS, DEFAULT_FALLBACK_ORDER, GeminiModel } from '../../src/types/models';

describe('Model Definitions', () => {
  it('should export ALL_MODELS as an array of strings', () => {
    expect(Array.isArray(ALL_MODELS)).toBe(true);
    expect(ALL_MODELS.length).toBeGreaterThan(0);
    ALL_MODELS.forEach((model) => {
      expect(typeof model).toBe('string');
    });
  });

  it('should include key models in ALL_MODELS', () => {
    expect(ALL_MODELS).toContain('gemini-2.5-flash');
    expect(ALL_MODELS).toContain('gemini-2.5-flash-lite');
    // Preview models
    expect(ALL_MODELS).toContain('gemini-3-pro-preview');
  });

  it('should ensure DEFAULT_FALLBACK_ORDER is a subset of ALL_MODELS', () => {
    DEFAULT_FALLBACK_ORDER.forEach((model) => {
      expect(ALL_MODELS).toContain(model);
    });
  });

  it('should not include preview models in DEFAULT_FALLBACK_ORDER', () => {
    // gemini-3-pro-preview is marked as preview/unstable in documentation
    expect(DEFAULT_FALLBACK_ORDER).not.toContain('gemini-3-pro-preview');
  });
});
