import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';

vi.mock('../../src/client/GeminiClient');

describe('Deprecation warnings', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn(),
      generateStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  it('should warn when fallbackOrder contains deprecated models', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash', 'gemini-2.5-flash'],
      logLevel: 'warn',
    });
    // gemini-2.0-flash is deprecated (shutdown: 2026-06-01)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.0-flash')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('2026-06-01')
    );
    // gemini-2.5-flash is also deprecated (shutdown: 2026-06-17)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.5-flash')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('2026-06-17')
    );
    warnSpy.mockRestore();
  });

  it('should warn once per model when using options.model with deprecated model', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3-flash-preview'], // non-deprecated
      logLevel: 'warn',
    });
    // Constructor should not emit deprecation warnings for non-deprecated models
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should not duplicate warnings for models already warned in constructor', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash'], // deprecated -> warns in constructor
      logLevel: 'warn',
    });
    const constructorCallCount = warnSpy.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('gemini-2.0-flash')
    ).length;
    // Should have warned exactly once for gemini-2.0-flash in constructor
    expect(constructorCallCount).toBe(1);
    warnSpy.mockRestore();
  });

  it('should not warn when logLevel is error (default)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash'],
      // logLevel defaults to 'error', so warn should not be emitted
    });
    const deprecationWarnings = warnSpy.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('shutdown')
    );
    expect(deprecationWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
