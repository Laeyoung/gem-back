interface ErrorResponse {
  error?: {
    message?: string;
  };
}

export function normalizeErrorMessage(error: Error): string {
  try {
    const json = JSON.parse(error.message) as ErrorResponse;
    if (json.error?.message) {
      return json.error.message.toLowerCase();
    }
  } catch (e) {
    // Not JSON, continue
  }
  return error.message.toLowerCase();
}

export function isRateLimitError(error: Error): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('too many requests')
  );
}

export function isRetryableError(error: Error): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('5') ||
    isRateLimitError(error)
  );
}

export function isAuthError(error: Error): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('api key not valid')
  );
}

export function getErrorStatusCode(error: Error): number | undefined {
  const match = error.message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}
