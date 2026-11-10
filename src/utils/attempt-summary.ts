import type { AttemptRecord } from '../types/errors';
import { getErrorDetailMessage, getErrorStatusCode, getErrorStatusName } from './error-handler';

/** Upper bound for the whole "all models failed" error message. */
export const MAX_FAILURE_MESSAGE_LENGTH = 600;

/** Upper bound for the free-text part of a single per-model cause. */
const MAX_DETAIL_LENGTH = 80;

/**
 * Remove anything that could be an API key from text that ends up in an error
 * message: `key=<value>` query parameters and Google API keys (`AIza...`).
 */
export function redactSecrets(text: string): string {
  return text.replace(/key=[^\s&"'\]]+/gi, 'key=***').replace(/AIza[0-9A-Za-z_-]+/g, '***');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * One short cause for a failed attempt, e.g. `429 RESOURCE_EXHAUSTED`,
 * `503 UNAVAILABLE`, `removed from API`, or a truncated message when the
 * error carries no structured status.
 */
function describeAttempt(attempt: AttemptRecord): string {
  if (attempt.reason === 'removed_from_api') return 'removed from API';

  const error = new Error(attempt.error);
  const code = attempt.statusCode ?? getErrorStatusCode(error);
  const status = getErrorStatusName(error);
  if (status) return code !== undefined ? `${code} ${status}` : status;

  const detail = truncate(
    redactSecrets(getErrorDetailMessage(error)).replace(/\s+/g, ' ').trim(),
    MAX_DETAIL_LENGTH
  );
  // Plain errors often already lead with the status ("429 Rate limit"); don't repeat it.
  if (code === undefined || detail.startsWith(String(code))) return detail || 'unknown error';
  return detail ? `${code} ${detail}` : String(code);
}

/**
 * Build the message for an `ALL_MODELS_FAILED` error: `prefix` followed by a
 * bounded, secret-free summary of the per-model causes, e.g.
 *
 *   All models failed. Please try again later. [gemini-3.6-flash: 429 RESOURCE_EXHAUSTED; gemini-3.5-flash-lite: 503 UNAVAILABLE]
 *
 * The message always starts with `prefix` verbatim (downstream code matches on
 * it) and never exceeds `MAX_FAILURE_MESSAGE_LENGTH`; causes that do not fit
 * are replaced by a `+N more` marker. The full, unmodified records remain
 * available on `GeminiBackError.allAttempts`.
 */
export function buildAllModelsFailedMessage(prefix: string, attempts: AttemptRecord[]): string {
  if (attempts.length === 0) return prefix;

  const causes = attempts.map(
    (attempt) => `${redactSecrets(String(attempt.model))}: ${describeAttempt(attempt)}`
  );

  for (let shown = causes.length; shown > 0; shown--) {
    const omitted = causes.length - shown;
    const summary = causes.slice(0, shown).join('; ') + (omitted > 0 ? `; +${omitted} more` : '');
    const message = `${prefix} [${summary}]`;
    if (message.length <= MAX_FAILURE_MESSAGE_LENGTH) return message;
  }
  return truncate(`${prefix} [${causes[0]}]`, MAX_FAILURE_MESSAGE_LENGTH);
}
