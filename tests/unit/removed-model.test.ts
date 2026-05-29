import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inject a synthetic REMOVED_MODELS entry while preserving every other export
// from deprecated.ts. The list is `readonly string[]` and intentionally empty
// in production; tests need a controlled non-empty list to exercise the skip
// path in FallbackClient.
vi.mock('../../src/config/deprecated', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/config/deprecated')>();
  return {
    ...original,
    REMOVED_MODELS: ['legacy-removed-model'] as readonly string[],
  };
});

import { GemBack } from '../../src/client/FallbackClient';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GeminiBackError } from '../../src/types/errors';

vi.mock('../../src/client/GeminiClient');

describe('REMOVED_MODELS skip path', () => {
  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      generate: vi.fn().mockResolvedValue({
        text: 'ok',
        model: 'gemini-3.5-flash',
        finishReason: 'STOP',
      }),
      generateStream: vi.fn(),
      generateContent: vi.fn().mockResolvedValue({
        text: 'ok',
        model: 'gemini-3.5-flash',
        finishReason: 'STOP',
      }),
      generateContentStream: vi.fn(),
    };
    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
  });

  it('falls back without invoking SDK when fallbackOrder contains a removed model', async () => {
    const client = new GemBack({
      apiKey: 'test-key',
      // `as any` because removed model IDs are by definition no longer in GeminiModel union.
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'silent',
    });

    const response = await client.generate('Hello');

    expect(response.text).toBe('ok');
    expect(mockGeminiClient.generate).toHaveBeenCalledTimes(1);
    expect(mockGeminiClient.generate).toHaveBeenCalledWith(
      'Hello',
      'gemini-3.5-flash',
      expect.any(String),
      undefined
    );
  });

  it('records AttemptRecord with reason=removed_from_api when all models fail', async () => {
    mockGeminiClient.generate.mockRejectedValue(new Error('upstream failure'));

    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'silent',
      maxRetries: 0,
    });

    const err = await client.generate('Hello').catch((e) => e as GeminiBackError);
    expect(err).toBeInstanceOf(GeminiBackError);
    const removedAttempt = err.allAttempts.find(
      (a) => (a.model as string) === 'legacy-removed-model'
    );
    expect(removedAttempt).toBeDefined();
    expect(removedAttempt?.reason).toBe('removed_from_api');
    expect(removedAttempt?.error).toBeTruthy();
  });

  it('skips SDK call in generateStream() for a removed model', async () => {
    async function* mockStream() {
      yield { text: 'ok' };
    }
    mockGeminiClient.generateStream.mockReturnValue(mockStream());

    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'silent',
    });

    const chunks: any[] = [];
    for await (const chunk of client.generateStream('Hello')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(mockGeminiClient.generateStream).toHaveBeenCalledTimes(1);
    // The single call must target the fallback model, not the removed one.
    expect(mockGeminiClient.generateStream).toHaveBeenCalledWith(
      'Hello',
      'gemini-3.5-flash',
      expect.any(String),
      undefined
    );
  });

  it('skips SDK call in generateContent() for a removed model', async () => {
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'silent',
    });

    const response = await client.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });

    expect(response.text).toBe('ok');
    expect(mockGeminiClient.generateContent).toHaveBeenCalledTimes(1);
    expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
      [{ role: 'user', parts: [{ text: 'Hello' }] }],
      'gemini-3.5-flash',
      expect.any(String),
      expect.any(Object)
    );
  });

  it('skips SDK call in generateContentStream() for a removed model', async () => {
    async function* mockStream() {
      yield { text: 'ok' };
    }
    mockGeminiClient.generateContentStream.mockReturnValue(mockStream());

    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'silent',
    });

    const chunks: any[] = [];
    for await (const chunk of client.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(mockGeminiClient.generateContentStream).toHaveBeenCalledTimes(1);
    expect(mockGeminiClient.generateContentStream).toHaveBeenCalledWith(
      [{ role: 'user', parts: [{ text: 'Hello' }] }],
      'gemini-3.5-flash',
      expect.any(String),
      expect.any(Object)
    );
  });

  it('logs an error exactly once even when the removed model is hit repeatedly', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['legacy-removed-model' as any, 'gemini-3.5-flash'],
      logLevel: 'error',
    });

    await client.generate('Hello');
    await client.generate('Hello');
    await client.generate('Hello');

    const removalErrors = errorSpy.mock.calls.filter(
      (c) =>
        typeof c[0] === 'string' &&
        c[0].includes('legacy-removed-model') &&
        c[0].includes('removed from the Gemini API')
    );
    expect(removalErrors).toHaveLength(1);
    errorSpy.mockRestore();
  });
});
