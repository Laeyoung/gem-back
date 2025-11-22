export interface RetryOptions {
  maxRetries: number;
  delay: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, delay, shouldRetry } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      const backoffDelay = delay * Math.pow(2, attempt);
      await sleep(backoffDelay);
    }
  }

  throw lastError!;
}
