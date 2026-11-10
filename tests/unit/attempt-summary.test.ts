import { describe, it, expect } from 'vitest';
import {
  buildAllModelsFailedMessage,
  MAX_FAILURE_MESSAGE_LENGTH,
  redactSecrets,
} from '../../src/utils/attempt-summary';
import type { AttemptRecord } from '../../src/types/errors';

const PREFIX = 'All models failed. Please try again later.';
// Shaped like a Google API key but not a real one.
const FAKE_KEY = 'AIzaSyD-FAKE_fake_FAKE_fake_FAKE_fake_0123';

function attempt(model: string, error: string, extra: Partial<AttemptRecord> = {}): AttemptRecord {
  return { model: model as AttemptRecord['model'], error, timestamp: new Date(), ...extra };
}

describe('buildAllModelsFailedMessage', () => {
  it('returns the bare prefix when there are no attempts', () => {
    expect(buildAllModelsFailedMessage(PREFIX, [])).toBe(PREFIX);
  });

  it('summarizes structured SDK errors as "<code> <STATUS>"', () => {
    const quota = JSON.stringify({
      error: {
        code: 429,
        message: 'You exceeded your current quota, please check your plan and billing details.',
        status: 'RESOURCE_EXHAUSTED',
      },
    });
    const unavailable = `got status: UNAVAILABLE. ${JSON.stringify({
      error: { code: 503, message: 'The model is overloaded.', status: 'UNAVAILABLE' },
    })}`;

    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('gemini-3.6-flash', quota, { statusCode: 429 }),
      attempt('gemini-3.5-flash-lite', unavailable, { statusCode: 503 }),
    ]);

    expect(message).toBe(
      `${PREFIX} [gemini-3.6-flash: 429 RESOURCE_EXHAUSTED; gemini-3.5-flash-lite: 503 UNAVAILABLE]`
    );
  });

  it('falls back to a truncated message for unstructured errors', () => {
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('gemini-3.6-flash', '500 Internal Server Error', { statusCode: 500 }),
      attempt('gemini-3.5-flash-lite', 'Request   timeout\nafter 30000ms'),
      attempt('gemini-3.8-flash', 'x'.repeat(500)),
    ]);

    expect(message).toContain('gemini-3.6-flash: 500 Internal Server Error;');
    // whitespace/newlines collapsed
    expect(message).toContain('gemini-3.5-flash-lite: Request timeout after 30000ms;');
    // long free text is cut to 80 chars with an ellipsis
    expect(message).toContain(`gemini-3.8-flash: ${'x'.repeat(79)}…]`);
  });

  it('prepends the status code when the message does not carry it', () => {
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('gemini-3.6-flash', 'Service Unavailable', { statusCode: 503 }),
    ]);
    expect(message).toBe(`${PREFIX} [gemini-3.6-flash: 503 Service Unavailable]`);
  });

  it('labels skipped removed models and empty streams', () => {
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('gemini-2.0-flash', 'Model removed from upstream API', {
        reason: 'removed_from_api',
      }),
      attempt('gemini-3.6-flash', 'Empty stream response (no chunks yielded)'),
    ]);
    expect(message).toBe(
      `${PREFIX} [gemini-2.0-flash: removed from API; gemini-3.6-flash: Empty stream response (no chunks yielded)]`
    );
  });

  it('never leaks an API key from the error text', () => {
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt(
        'gemini-3.6-flash',
        `fetch failed: https://generativelanguage.googleapis.com/v1beta/models?key=${FAKE_KEY}&alt=sse`
      ),
      attempt('gemini-3.5-flash-lite', `API key ${FAKE_KEY} is not authorized`),
      attempt('gemini-3.8-flash', 'bad request KEY=plain-secret-value'),
    ]);

    expect(message).not.toContain(FAKE_KEY);
    expect(message).not.toContain('AIza');
    expect(message).not.toContain('plain-secret-value');
    expect(message).toContain('key=***');
  });

  it('does not leak a key that straddles the truncation boundary', () => {
    const padding = 'e'.repeat(70);
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('gemini-3.6-flash', `${padding} ${FAKE_KEY}`),
    ]);
    expect(message).not.toContain('AIza');
  });

  it('caps the total length and reports how many causes were omitted', () => {
    const attempts = Array.from({ length: 40 }, (_, i) =>
      attempt(`model-${i}`, `network failure number ${i} ${'y'.repeat(100)}`)
    );
    const message = buildAllModelsFailedMessage(PREFIX, attempts);

    expect(message.length).toBeLessThanOrEqual(MAX_FAILURE_MESSAGE_LENGTH);
    expect(message.startsWith(`${PREFIX} [model-0: `)).toBe(true);
    const omitted = Number(message.match(/; \+(\d+) more\]$/)?.[1]);
    const shown = (message.match(/model-\d+: /g) ?? []).length;
    expect(omitted).toBeGreaterThan(0);
    expect(shown + omitted).toBe(40);
  });

  it('stays within the cap even when a single cause is oversized', () => {
    const message = buildAllModelsFailedMessage(PREFIX, [
      attempt('m'.repeat(2000), 'boom'),
    ]);
    expect(message.length).toBeLessThanOrEqual(MAX_FAILURE_MESSAGE_LENGTH);
    expect(message.startsWith(PREFIX)).toBe(true);
  });

  it('keeps the streaming prefix verbatim', () => {
    const prefix = 'All models failed for streaming. Please try again later.';
    const message = buildAllModelsFailedMessage(prefix, [attempt('gemini-3.6-flash', '429 Rate limit')]);
    expect(message).toBe(`${prefix} [gemini-3.6-flash: 429 Rate limit]`);
  });
});

describe('redactSecrets', () => {
  it('redacts key= parameters and AIza-style keys, leaving other text intact', () => {
    expect(redactSecrets(`GET /v1beta/models?key=${FAKE_KEY}&pageSize=5`)).toBe(
      'GET /v1beta/models?key=***&pageSize=5'
    );
    expect(redactSecrets(`header x-goog-api-key: ${FAKE_KEY}`)).toBe('header x-goog-api-key: ***');
    expect(redactSecrets('quota exceeded for model')).toBe('quota exceeded for model');
  });
});
