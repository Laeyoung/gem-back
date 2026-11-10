import { describe, it, expect } from 'vitest';
import {
  detectLatestVersion,
  extractVersion,
  isGeneralTextModel,
  selectLibraryModels,
} from '../../scripts/model-filters';

// Snapshot of the generateContent-capable IDs returned by v1beta/models on 2026-11-10.
const API_MODELS = [
  'antigravity-preview-05-2026',
  'antigravity-preview-latest',
  'deep-research-preview-04-2026',
  'gemini-2.5-computer-use-preview-10-2025',
  'gemini-2.5-flash',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview-tts',
  'gemini-3-flash-preview',
  'gemini-3-pro-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-transcribe',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-4-argon',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-nano-banana-2.1',
  'gemini-omni-1.1-flash',
  'gemini-omni-1.2-flash',
  'gemini-omni-flash-preview',
  'gemini-pro-latest',
  'gemini-robotics-er-2-preview',
  'gemma-4-31b-it',
  'lyria-3.5',
  'nano-banana-pro-preview',
];

// What gemback 0.7.1 shipped.
const SHIPPED = new Set([
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
]);

describe('isGeneralTextModel', () => {
  it.each([
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-4-argon',
  ])('accepts %s', (name) => {
    expect(isGeneralTextModel(name)).toBe(true);
  });

  it.each([
    // `-tts` as a suffix (previously slipped through the `-tts-` pattern)
    'gemini-3.8-flash-tts',
    'gemini-3.8-flash-lite-tts',
    'gemini-2.5-flash-preview-tts',
    // `-tts-` infix and custom tools
    'gemini-3.1-flash-tts-preview',
    'gemini-3.1-pro-preview-customtools',
    // non-text families
    'gemini-3.5-transcribe',
    'gemini-nano-banana-2.1',
    'gemini-omni-1.1-flash',
    'gemini-omni-1.2-flash',
    'gemini-omni-flash-preview',
    'gemini-robotics-er-2-preview',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image-preview',
    'gemini-2.5-computer-use-preview-10-2025',
    // aliases without a version and non-Gemini models
    'gemini-flash-latest',
    'gemma-4-31b-it',
    'lyria-3.5',
  ])('rejects %s', (name) => {
    expect(isGeneralTextModel(name)).toBe(false);
  });
});

describe('extractVersion / detectLatestVersion', () => {
  it('parses major and minor', () => {
    expect(extractVersion('gemini-3.1-flash-lite')).toEqual([3, 1]);
    expect(extractVersion('gemini-4-argon')).toEqual([4, 0]);
    expect(extractVersion('gemini-omni-1.1-flash')).toEqual([0, 0]);
  });

  it('detects Gemini 4.0 as the latest version and ignores non-text families', () => {
    expect(detectLatestVersion(API_MODELS)).toEqual([4, 0]);
    expect(detectLatestVersion(['gemini-3.1-flash-lite', 'gemini-3.8-flash-tts'])).toEqual([3, 1]);
    expect(detectLatestVersion([])).toEqual([0, 0]);
  });
});

describe('selectLibraryModels', () => {
  it('keeps shipped previews the API still serves even when a newer major exists', () => {
    const selected = selectLibraryModels(API_MODELS, SHIPPED);
    expect(selected).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-pro-preview',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-4-argon',
    ]);
  });

  it('does not pick up previews of older majors that the library never shipped', () => {
    const selected = selectLibraryModels(API_MODELS, new Set());
    expect(selected).not.toContain('gemini-3-flash-preview');
    expect(selected).not.toContain('gemini-3.1-pro-preview');
    expect(selected).toContain('gemini-3.8-flash');
    expect(selected).toContain('gemini-4-argon');
  });

  it('allows new previews of the latest major', () => {
    const selected = selectLibraryModels(
      ['gemini-4-argon', 'gemini-4-flash-preview', 'gemini-3.9-flash-preview'],
      new Set()
    );
    expect(selected).toEqual(['gemini-4-argon', 'gemini-4-flash-preview']);
  });

  it('never selects a model the API no longer serves, even if shipped', () => {
    const selected = selectLibraryModels(API_MODELS, SHIPPED);
    expect(selected).not.toContain('gemini-2.0-flash');
    expect(selected).not.toContain('gemini-2.0-flash-lite');
  });

  it('drops -latest aliases and pinned snapshots', () => {
    const selected = selectLibraryModels(
      ['gemini-3.8-flash', 'gemini-3.8-flash-latest', 'gemini-3.8-flash-001', 'gemini-3.8-flash-09-2026'],
      new Set()
    );
    expect(selected).toEqual(['gemini-3.8-flash']);
  });
});
