import type { GemBackOptions, LogLevel } from '../types/config';
import { DEFAULT_FALLBACK_ORDER } from '../types/models';

export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_LOG_LEVEL: LogLevel = 'error';

export const DEFAULT_CLIENT_OPTIONS: Partial<GemBackOptions> = {
  fallbackOrder: DEFAULT_FALLBACK_ORDER,
  maxRetries: DEFAULT_MAX_RETRIES,
  timeout: DEFAULT_TIMEOUT,
  retryDelay: DEFAULT_RETRY_DELAY,
  debug: false,
  logLevel: DEFAULT_LOG_LEVEL,
  apiKeyRotationStrategy: 'round-robin',
};
