import { describe, it, expect } from 'vitest';
import {
  isRateLimitError,
  isRetryableError,
  isAuthError,
  getErrorStatusCode,
} from '../../src/utils/error-handler';

describe('error-handler utility', () => {
  describe('isRateLimitError', () => {
    it('should detect 429 errors', () => {
      const error = new Error('429 Too Many Requests');
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should detect rate limit messages', () => {
      expect(isRateLimitError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isRateLimitError(new Error('RATE LIMIT hit'))).toBe(true);
      expect(isRateLimitError(new Error('Quota exceeded'))).toBe(true);
      expect(isRateLimitError(new Error('Too many requests'))).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      expect(isRateLimitError(new Error('500 Internal Server Error'))).toBe(false);
      expect(isRateLimitError(new Error('Network error'))).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should detect timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
    });

    it('should detect network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
    });

    it('should detect 5xx errors', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true);
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    });

    it('should NOT mark rate-limit errors as retryable (429 triggers immediate fallback, not retry)', () => {
      // By design a 429 must fall back to the next model rather than retry the
      // exhausted one; FallbackClient gates on isRateLimitError before ever
      // consulting isRetryableError, so this helper must report 429 as non-retryable.
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(false);
      expect(
        isRetryableError(
          new Error(JSON.stringify({ error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } }))
        )
      ).toBe(false);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError(new Error('400 Bad Request'))).toBe(false);
      expect(isRetryableError(new Error('401 Unauthorized'))).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should detect 401 errors', () => {
      expect(isAuthError(new Error('401 Unauthorized'))).toBe(true);
    });

    it('should detect 403 errors', () => {
      expect(isAuthError(new Error('403 Forbidden'))).toBe(true);
    });

    it('should detect auth-related messages', () => {
      expect(isAuthError(new Error('Invalid API key'))).toBe(true);
      expect(isAuthError(new Error('Unauthorized access'))).toBe(true);
      expect(isAuthError(new Error('Forbidden resource'))).toBe(true);
    });

    it('should return false for non-auth errors', () => {
      expect(isAuthError(new Error('429 Too Many Requests'))).toBe(false);
      expect(isAuthError(new Error('500 Internal Server Error'))).toBe(false);
    });
  });

  describe('real Gemini API error shapes (regression)', () => {
    // The base `error.message` field Gemini returns for a free-tier quota 429.
    // Note it does NOT contain "429", "rate limit", "quota exceeded", or
    // "too many requests" as substrings — the authoritative signals are the
    // structured `code` (429) and `status` ("RESOURCE_EXHAUSTED") fields.
    const baseQuotaBody = JSON.stringify({
      error: {
        code: 429,
        message:
          'You exceeded your current quota, please check your plan and billing details. ' +
          'For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. ' +
          'To monitor your current usage, head to: https://ai.dev/rate-limit.',
        status: 'RESOURCE_EXHAUSTED',
      },
    });

    // The richer form, where Gemini appends the metric detail line that happens
    // to contain "Quota exceeded for metric".
    const detailedQuotaBody = JSON.stringify({
      error: {
        code: 429,
        message:
          'You exceeded your current quota, please check your plan and billing details. ' +
          '\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, ' +
          'limit: 20, model: gemini-3.5-flash\nPlease retry in 29.6s.',
        status: 'RESOURCE_EXHAUSTED',
      },
    });

    it('classifies a structured 429 RESOURCE_EXHAUSTED as a rate-limit error (base message)', () => {
      const error = new Error(baseQuotaBody);
      expect(getErrorStatusCode(error)).toBe(429);
      expect(isRateLimitError(error)).toBe(true);
      expect(isAuthError(error)).toBe(false);
    });

    it('classifies the detailed quota message as a rate-limit error', () => {
      const error = new Error(detailedQuotaBody);
      expect(isRateLimitError(error)).toBe(true);
    });

    it('honors the numeric `status` property the @google/genai ApiError exposes', () => {
      const apiError = Object.assign(new Error(baseQuotaBody), { status: 429 });
      expect(getErrorStatusCode(apiError)).toBe(429);
      expect(isRateLimitError(apiError)).toBe(true);
    });

    it('classifies a string `.status` of RESOURCE_EXHAUSTED as a rate-limit (non-retryable) error', () => {
      // Mirrors the UNAVAILABLE/INTERNAL retryable cases: the SDK string status
      // path must drive isRateLimitError even when no HTTP code is present.
      const apiError = Object.assign(new Error('quota hit'), { status: 'RESOURCE_EXHAUSTED' });
      expect(isRateLimitError(apiError)).toBe(true);
      expect(isRetryableError(apiError)).toBe(false);
    });

    it('classifies the streaming-form RESOURCE_EXHAUSTED error as a rate-limit error', () => {
      // The streaming path prefixes the JSON with "got status: <STATUS>."
      const streamMsg = `got status: RESOURCE_EXHAUSTED. ${baseQuotaBody}`;
      const error = new Error(streamMsg);
      // The embedded-brace parse path must still recover the structured code.
      expect(getErrorStatusCode(error)).toBe(429);
      expect(isRateLimitError(error)).toBe(true);
    });

    it('recovers the structured body even with trailing text after the JSON', () => {
      const streamMsg = `got status: RESOURCE_EXHAUSTED. ${baseQuotaBody} (request id: abc-123)`;
      expect(getErrorStatusCode(new Error(streamMsg))).toBe(429);
      expect(isRateLimitError(new Error(streamMsg))).toBe(true);
    });

    it('returns undefined status code when the embedded brace is not valid JSON', () => {
      expect(getErrorStatusCode(new Error('got status: UNKNOWN. {not json}'))).toBeUndefined();
    });

    it('classifies structured 401/403 bodies and gRPC auth status names as auth errors', () => {
      const unauthenticated = new Error(
        JSON.stringify({ error: { code: 401, message: 'Request had invalid credentials.', status: 'UNAUTHENTICATED' } })
      );
      const permissionDenied = new Error(
        JSON.stringify({ error: { code: 403, message: 'The caller does not have permission.', status: 'PERMISSION_DENIED' } })
      );
      expect(isAuthError(unauthenticated)).toBe(true);
      expect(isAuthError(permissionDenied)).toBe(true);
      // Status name alone (no parseable HTTP code in prose) must still classify.
      expect(isAuthError(Object.assign(new Error('credentials rejected'), { status: 'PERMISSION_DENIED' }))).toBe(true);
    });

    it('treats UNAVAILABLE / INTERNAL / DEADLINE_EXCEEDED status names as retryable', () => {
      for (const status of ['UNAVAILABLE', 'INTERNAL', 'DEADLINE_EXCEEDED']) {
        const structured = new Error(JSON.stringify({ error: { message: 'transient', status } }));
        expect(isRetryableError(structured)).toBe(true);
        // And via the SDK ApiError-style string `.status` property.
        expect(isRetryableError(Object.assign(new Error('transient'), { status }))).toBe(true);
      }
    });

    it('does NOT retry a 4xx error just because its message contains the digit 5', () => {
      // A 400 whose prose mentions a "512" token limit must not be treated as a
      // retryable 5xx error (the old `includes("5")` heuristic wrongly did this).
      const badRequest = new Error(
        JSON.stringify({
          error: { code: 400, message: 'Input exceeds 512 token limit', status: 'INVALID_ARGUMENT' },
        })
      );
      expect(isRetryableError(badRequest)).toBe(false);
    });

    it('does NOT treat a non-auth error as auth just because its prose contains a "401"/"403" digit run', () => {
      // A 400 whose prose mentions a "4013 token" count must not be misread as a
      // 401 auth error (which would abort the whole fallback chain).
      const badRequest = new Error(
        JSON.stringify({
          error: { code: 400, message: 'Input has 4013 tokens, exceeds the 403-token cap', status: 'INVALID_ARGUMENT' },
        })
      );
      expect(getErrorStatusCode(badRequest)).toBe(400);
      expect(isAuthError(badRequest)).toBe(false);
    });

    it('still classifies prose auth errors (unauthorized / forbidden / invalid api key) without a status code', () => {
      expect(isAuthError(new Error('Request was Unauthorized'))).toBe(true);
      expect(isAuthError(new Error('Forbidden: caller lacks access'))).toBe(true);
      expect(isAuthError(new Error('API key not valid. Please pass a valid API key.'))).toBe(true);
    });

    it('does NOT misclassify a structured 503 as auth even though no "503" prose is present', () => {
      const unavailable = new Error(
        JSON.stringify({ error: { code: 503, message: 'The service is currently unavailable.', status: 'UNAVAILABLE' } })
      );
      expect(getErrorStatusCode(unavailable)).toBe(503);
      expect(isRetryableError(unavailable)).toBe(true);
      expect(isAuthError(unavailable)).toBe(false);
    });
  });

  describe('getErrorStatusCode', () => {
    it('should extract 4xx status codes', () => {
      expect(getErrorStatusCode(new Error('400 Bad Request'))).toBe(400);
      expect(getErrorStatusCode(new Error('401 Unauthorized'))).toBe(401);
      expect(getErrorStatusCode(new Error('429 Too Many Requests'))).toBe(429);
    });

    it('should extract 5xx status codes', () => {
      expect(getErrorStatusCode(new Error('500 Internal Server Error'))).toBe(500);
      expect(getErrorStatusCode(new Error('502 Bad Gateway'))).toBe(502);
      expect(getErrorStatusCode(new Error('503 Service Unavailable'))).toBe(503);
    });

    it('should return undefined for errors without status codes', () => {
      expect(getErrorStatusCode(new Error('Network error'))).toBeUndefined();
      expect(getErrorStatusCode(new Error('Timeout'))).toBeUndefined();
      expect(getErrorStatusCode(new Error('Something went wrong'))).toBeUndefined();
    });

    it('should extract first status code from message', () => {
      expect(getErrorStatusCode(new Error('Request failed with 404 not found'))).toBe(404);
    });
  });
});
