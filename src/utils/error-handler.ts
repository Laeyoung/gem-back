export function isRateLimitError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('too many requests')
  );
}

export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
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
  const message = error.message.toLowerCase();
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key')
  );
}

export function getErrorStatusCode(error: Error): number | undefined {
  const match = error.message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}
