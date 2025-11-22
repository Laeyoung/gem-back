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

    it('should detect rate limit errors as retryable', () => {
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
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
