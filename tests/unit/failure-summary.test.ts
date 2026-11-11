import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GeminiBackError } from '../../src/types/errors';

vi.mock('../../src/client/GeminiClient');

// Shaped like a Google API key but not a real one.
const FAKE_KEY = 'AIzaSyD-FAKE_fake_FAKE_fake_FAKE_fake_0123';

const QUOTA_ERROR = JSON.stringify({
  error: { code: 429, message: 'You exceeded your current quota.', status: 'RESOURCE_EXHAUSTED' },
});
const UNAVAILABLE_ERROR = JSON.stringify({
  error: { code: 503, message: 'The model is overloaded.', status: 'UNAVAILABLE' },
});

const SUMMARY =
  '[gemini-3.5-flash-lite: 429 RESOURCE_EXHAUSTED; gemini-3.6-flash: 503 UNAVAILABLE; gemini-3.8-flash: 503 UNAVAILABLE]';
const CONTENTS = [{ role: 'user' as const, parts: [{ text: 'Hello' }] }];

function failingStream(message: string) {
  // eslint-disable-next-line require-yield
  return (async function* () {
    throw new Error(message);
  })();
}

async function drain(stream: AsyncGenerator<unknown>): Promise<GeminiBackError> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of stream) {
      // consume
    }
  } catch (e) {
    return e as GeminiBackError;
  }
  throw new Error('stream should have thrown');
}

describe('ALL_MODELS_FAILED message carries a per-model cause summary', () => {
  let mockGeminiClient: any;
  let client: GemBack;

  const byModel = (model: string) =>
    model === 'gemini-3.5-flash-lite' ? QUOTA_ERROR : UNAVAILABLE_ERROR;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn((_p: string, model: string) => Promise.reject(new Error(byModel(model)))),
      generateContent: vi.fn((_c: unknown, model: string) =>
        Promise.reject(new Error(byModel(model)))
      ),
      generateStream: vi.fn((_p: string, model: string) => failingStream(byModel(model))),
      generateContentStream: vi.fn((_c: unknown, model: string) => failingStream(byModel(model))),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
    // Default fallback order: gemini-3.5-flash-lite → gemini-3.6-flash → gemini-3.8-flash
    client = new GemBack({ apiKey: FAKE_KEY, maxRetries: 0, logLevel: 'silent' });
  });

  it('generate()', async () => {
    const err = await client.generate('Hello').catch((e) => e as GeminiBackError);
    expect(err).toBeInstanceOf(GeminiBackError);
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(`All models failed. Please try again later. ${SUMMARY}`);
  });

  it('chat()', async () => {
    const err = await client
      .chat([{ role: 'user', content: 'Hello' }])
      .catch((e) => e as GeminiBackError);
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(`All models failed. Please try again later. ${SUMMARY}`);
  });

  it('generateContent()', async () => {
    const err = await client
      .generateContent({ contents: CONTENTS })
      .catch((e) => e as GeminiBackError);
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(`All models failed. Please try again later. ${SUMMARY}`);
  });

  it('generateStream()', async () => {
    const err = await drain(client.generateStream('Hello'));
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(`All models failed for streaming. Please try again later. ${SUMMARY}`);
  });

  it('generateContentStream()', async () => {
    const err = await drain(client.generateContentStream({ contents: CONTENTS }));
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(`All models failed for streaming. Please try again later. ${SUMMARY}`);
  });

  it('keeps the prefix that downstream code regex-matches', async () => {
    const err = await client.generate('Hello').catch((e) => e as GeminiBackError);
    expect(err.message).toMatch(/^All models failed/);
    const streamErr = await drain(client.generateStream('Hello'));
    expect(streamErr.message).toMatch(/^All models failed for streaming/);
  });

  it('leaves allAttempts untouched (full raw error text, one record per model)', async () => {
    const err = await client.generate('Hello').catch((e) => e as GeminiBackError);
    expect(err.allAttempts.map((a) => [a.model, a.error, a.statusCode])).toEqual([
      ['gemini-3.5-flash-lite', QUOTA_ERROR, 429],
      ['gemini-3.6-flash', UNAVAILABLE_ERROR, 503],
      ['gemini-3.8-flash', UNAVAILABLE_ERROR, 503],
    ]);
  });

  it('never puts the API key into the message, for any operation', async () => {
    const leaky = `request to https://example.invalid/v1beta/models?key=${FAKE_KEY} failed (${FAKE_KEY})`;
    mockGeminiClient.generate.mockRejectedValue(new Error(leaky));
    mockGeminiClient.generateContent.mockRejectedValue(new Error(leaky));
    mockGeminiClient.generateStream.mockImplementation(() => failingStream(leaky));
    mockGeminiClient.generateContentStream.mockImplementation(() => failingStream(leaky));

    const errors = [
      await client.generate('Hello').catch((e) => e as GeminiBackError),
      await client.chat([{ role: 'user', content: 'Hello' }]).catch((e) => e as GeminiBackError),
      await client.generateContent({ contents: CONTENTS }).catch((e) => e as GeminiBackError),
      await drain(client.generateStream('Hello')),
      await drain(client.generateContentStream({ contents: CONTENTS })),
    ];

    for (const err of errors) {
      expect(err.code).toBe('ALL_MODELS_FAILED');
      expect(err.message).not.toContain(FAKE_KEY);
      expect(err.message).not.toContain('AIza');
      expect(err.message.length).toBeLessThanOrEqual(600);
    }
  });
});

describe('Removed Gemini 2.0 models degrade gracefully (real REMOVED_MODELS)', () => {
  let mockGeminiClient: any;
  const ok = (model: string) => ({ text: 'ok', model, finishReason: 'STOP' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn((_p: string, model: string) => Promise.resolve(ok(model))),
      generateContent: vi.fn((_c: unknown, model: string) => Promise.resolve(ok(model))),
      generateStream: vi.fn(),
      generateContentStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  it.each(['gemini-2.0-flash', 'gemini-2.0-flash-lite'])(
    'skips %s in fallbackOrder without an SDK call and serves from the next model',
    async (removed) => {
      const client = new GemBack({
        apiKey: 'test-key',
        // Callers upgrading from <=0.7 may still pass the old IDs (JS, or `as any` in TS).
        fallbackOrder: [removed as any, 'gemini-3.6-flash'],
        enableMonitoring: true,
        logLevel: 'silent',
      });

      const response = await client.generate('Hello');

      expect(response.model).toBe('gemini-3.6-flash');
      expect(mockGeminiClient.generate).toHaveBeenCalledTimes(1);
      expect(mockGeminiClient.generate.mock.calls[0][1]).toBe('gemini-3.6-flash');

      const stats = client.getFallbackStats();
      expect(stats.modelUsage['gemini-3.6-flash']).toBe(1);
      expect(stats.failureCount).toBe(0);
    }
  );

  it('logs the removal once, naming the recommended replacement', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash' as any, 'gemini-3.6-flash'],
      logLevel: 'error',
    });

    await client.generate('Hello');
    await client.generateContent({ contents: CONTENTS });

    const removalErrors = errorSpy.mock.calls
      .map((c) => c[0])
      .filter((m): m is string => typeof m === 'string' && m.includes('gemini-2.0-flash'));
    expect(removalErrors).toHaveLength(1);
    expect(removalErrors[0]).toContain('removed from the Gemini API');
    expect(removalErrors[0]).toContain('Migrate to "gemini-3.6-flash"');
    errorSpy.mockRestore();
  });

  it('fails with ALL_MODELS_FAILED (not a crash) when every configured model was removed', async () => {
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash' as any, 'gemini-2.0-flash-lite' as any],
      enableMonitoring: true,
      logLevel: 'silent',
    });

    const err = await client.generate('Hello').catch((e) => e);

    expect(err).toBeInstanceOf(GeminiBackError);
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toBe(
      'All models failed. Please try again later. ' +
        '[gemini-2.0-flash: removed from API; gemini-2.0-flash-lite: removed from API]'
    );
    expect(err.allAttempts.map((a: any) => a.reason)).toEqual([
      'removed_from_api',
      'removed_from_api',
    ]);
    expect(mockGeminiClient.generate).not.toHaveBeenCalled();
  });

  it('fails cleanly when a removed model is requested explicitly via options.model', async () => {
    const client = new GemBack({ apiKey: 'test-key', logLevel: 'silent' });

    const err = await client
      .generate('Hello', { model: 'gemini-2.0-flash' as any })
      .catch((e) => e);

    expect(err).toBeInstanceOf(GeminiBackError);
    expect(err.code).toBe('ALL_MODELS_FAILED');
    expect(err.message).toContain('[gemini-2.0-flash: removed from API]');
    expect(mockGeminiClient.generate).not.toHaveBeenCalled();
  });

  it('does not emit deprecation or free-tier warnings for removed models', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash' as any, 'gemini-3.6-flash'],
      logLevel: 'warn',
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('Model IDs unknown to this release do not crash the client', () => {
  it('serves a forward-compat ID with monitoring enabled and counts its usage', async () => {
    const mockGeminiClient = {
      generate: vi.fn((_p: string, model: string) =>
        Promise.resolve({ text: 'ok', model, finishReason: 'STOP' })
      ),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient as any);

    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-9-future' as any],
      enableMonitoring: true,
      logLevel: 'silent',
    });

    const response = await client.generate('Hello');
    await client.generate('Hello');

    expect(response.text).toBe('ok');
    expect(client.getFallbackStats().modelUsage['gemini-9-future' as never]).toBe(2);
  });
});
