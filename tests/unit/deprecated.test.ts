import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import { DEPRECATED_MODELS } from '../../src/config/deprecated';

vi.mock('../../src/client/GeminiClient');

describe('Deprecation warnings', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn().mockResolvedValue({
        text: 'ok',
        model: 'gemini-2.0-flash',
        finishReason: 'STOP',
      }),
      generateStream: vi.fn(),
      generateContent: vi.fn().mockResolvedValue({
        text: 'ok',
        model: 'gemini-2.0-flash',
        finishReason: 'STOP',
      }),
      generateContentStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  describe('constructor warnings', () => {
    it('should warn when fallbackOrder contains deprecated models', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.0-flash', 'gemini-2.5-flash'],
        logLevel: 'warn',
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.0-flash')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('2026-06-01')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-flash')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('2026-06-17')
      );
      warnSpy.mockRestore();
    });

    it('should include replacement model in deprecation warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.0-flash'],
        logLevel: 'warn',
      });
      const deprecation = DEPRECATED_MODELS.find(d => d.model === 'gemini-2.0-flash')!;
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(deprecation.replacement)
      );
      warnSpy.mockRestore();
    });

    it('should not warn for non-deprecated models in fallbackOrder', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should not warn when logLevel is error (default)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.0-flash'],
      });
      const deprecationWarnings = warnSpy.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('shutdown')
      );
      expect(deprecationWarnings).toHaveLength(0);
      warnSpy.mockRestore();
    });
  });

  describe('runtime warnings via options.model', () => {
    it('should warn when generate() is called with a deprecated model', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });
      expect(warnSpy).not.toHaveBeenCalled();

      await client.generate('Hello', { model: 'gemini-2.0-flash' });
      const warnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(warnings).toHaveLength(1);
      warnSpy.mockRestore();
    });

    it('should warn only once when generate() is called twice with same deprecated model', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });

      await client.generate('Hello', { model: 'gemini-2.0-flash' });
      await client.generate('Hello', { model: 'gemini-2.0-flash' });

      const warnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(warnings).toHaveLength(1);
      warnSpy.mockRestore();
    });

    it('should warn when generateStream() is called with a deprecated model', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      async function* mockStream() {
        yield { text: 'ok' };
      }
      mockGeminiClient.generateStream.mockReturnValue(mockStream());

      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });

      for await (const _ of client.generateStream('Hello', { model: 'gemini-2.0-flash' })) {
        // consume
      }

      const warnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(warnings).toHaveLength(1);
      warnSpy.mockRestore();
    });

    it('should warn when generateContent() is called with a deprecated model', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });

      await client.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        model: 'gemini-2.0-flash',
      });

      const warnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(warnings).toHaveLength(1);
      warnSpy.mockRestore();
    });

    it('should warn when generateContentStream() is called with a deprecated model', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      async function* mockStream() {
        yield { text: 'ok' };
      }
      mockGeminiClient.generateContentStream = vi.fn().mockReturnValue(mockStream());

      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-3.1-flash-lite'],
        logLevel: 'warn',
      });

      for await (const _ of client.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        model: 'gemini-2.0-flash',
      })) {
        // consume
      }

      const warnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(warnings).toHaveLength(1);
      warnSpy.mockRestore();
    });
  });

  describe('deduplication across paths', () => {
    it('should not duplicate warnings for models already warned in constructor', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const client = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.0-flash'],
        logLevel: 'warn',
      });

      const constructorWarnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(constructorWarnings).toHaveLength(1);

      // generate() with same model should NOT produce additional warning
      await client.generate('Hello', { model: 'gemini-2.0-flash' });

      const totalWarnings = warnSpy.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('shutdown')
      );
      expect(totalWarnings).toHaveLength(1);
      warnSpy.mockRestore();
    });
  });
});

describe('Non-free-tier warning', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn().mockResolvedValue({ text: 'ok', model: 'gemini-2.0-flash', finishReason: 'STOP' }),
      generateStream: vi.fn(),
      generateContent: vi.fn().mockResolvedValue({ text: 'ok', model: 'gemini-2.0-flash', finishReason: 'STOP' }),
      generateContentStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  it('fires exactly once per instance even across multiple generate() calls', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3.1-flash-lite'],
      logLevel: 'warn',
    });

    // Three calls referencing the same paid-only model
    await client.generate('Hello', { model: 'gemini-2.0-flash' });
    await client.generate('Hello', { model: 'gemini-2.0-flash' });
    await client.generate('Hello', { model: 'gemini-2.0-flash' });

    const nonFreeTierWarnings = warnSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('not on the free tier')
    );
    expect(nonFreeTierWarnings).toHaveLength(1);
    warnSpy.mockRestore();
  });

  it('fires at construction time when a non-free-tier model is in fallbackOrder', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash'],
      logLevel: 'warn',
    });

    const nonFreeTierWarnings = warnSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('gemini-2.0-flash') && c[0].includes('not on the free tier')
    );
    expect(nonFreeTierWarnings).toHaveLength(1);
    warnSpy.mockRestore();
  });

  it('does not fire for free-tier models', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3.1-flash-lite'],
      logLevel: 'warn',
    });

    await client.generate('Hello', { model: 'gemini-3.5-flash' });

    const nonFreeTierWarnings = warnSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('not on the free tier')
    );
    expect(nonFreeTierWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });
});

describe('customRateLimits wiring (GemBack ↔ RateLimitTracker)', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn().mockResolvedValue({ text: 'ok', model: 'gemini-3.5-flash', finishReason: 'STOP' }),
      generateStream: vi.fn(),
      generateContent: vi.fn().mockResolvedValue({ text: 'ok', model: 'gemini-3.5-flash', finishReason: 'STOP' }),
      generateContentStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  it('flows customRateLimits through to the tracker (visible in monitoring stats)', () => {
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3.5-flash'],
      enableMonitoring: true,
      customRateLimits: { 'gemini-3.5-flash': { rpm: 77 } },
      logLevel: 'silent',
    });

    const stats = client.getFallbackStats();
    const status = stats.monitoring?.rateLimitStatus?.find(s => s.model === 'gemini-3.5-flash');
    expect(status?.maxRPM).toBe(77);
    expect(status?.maxTPM).toBe(250_000); // tpm preserved via partial-field merge
  });

  it('warns when customRateLimits is set but enableMonitoring is false, and tracker stays uninitialized', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3.5-flash'],
      enableMonitoring: false,
      customRateLimits: { 'gemini-3.5-flash': { rpm: 99 } },
      logLevel: 'warn',
    });

    const warnings = warnSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('customRateLimits') && c[0].includes('ignored')
    );
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    // Monitoring must be truly off — the warn is informational, not cosmetic.
    expect(client.getFallbackStats().monitoring).toBeUndefined();
    warnSpy.mockRestore();
  });
});
