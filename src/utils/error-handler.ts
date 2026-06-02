interface ErrorBody {
  message?: string;
  code?: number;
  status?: string;
}

interface ErrorResponse {
  error?: ErrorBody;
}

/**
 * Parse the JSON body that @google/genai stuffs into `error.message`.
 *
 * The SDK throws `ApiError` whose `.message` is `JSON.stringify({ error: {...} })`
 * (non-streaming) or `got status: <STATUS>. {<json>}` (streaming). This pulls
 * out the structured `{ code, message, status }` payload so classification can
 * rely on the authoritative `code` / `status` fields instead of brittle prose
 * matching. Returns `undefined` if no JSON body is present.
 */
function parseErrorBody(error: Error): ErrorBody | undefined {
  const raw = error.message;
  // Fast path: the whole message is the JSON body.
  try {
    const json = JSON.parse(raw) as ErrorResponse;
    if (json.error) return json.error;
  } catch {
    // Not pure JSON — fall through to the embedded-object path.
  }
  // Streaming form: "got status: RESOURCE_EXHAUSTED. {<json>}".
  const braceIndex = raw.indexOf('{');
  if (braceIndex !== -1) {
    try {
      const json = JSON.parse(raw.slice(braceIndex)) as ErrorResponse;
      if (json.error) return json.error;
    } catch {
      // Embedded payload wasn't parseable JSON.
    }
  }
  return undefined;
}

export function normalizeErrorMessage(error: Error): string {
  const body = parseErrorBody(error);
  if (body?.message) {
    return body.message.toLowerCase();
  }
  return error.message.toLowerCase();
}

/**
 * Resolve the numeric HTTP status code from an error.
 *
 * Prefers authoritative signals in order:
 *   1. the SDK `ApiError.status` numeric property,
 *   2. the structured `error.code` from the JSON body,
 *   3. a last-resort regex over the raw message.
 *
 * This avoids the regex misfiring on incidental 3-digit numbers (token limits,
 * durations) when the real status is available structurally.
 */
export function getErrorStatusCode(error: Error): number | undefined {
  const sdkStatus = (error as { status?: unknown }).status;
  if (typeof sdkStatus === 'number' && sdkStatus >= 100 && sdkStatus < 600) {
    return sdkStatus;
  }

  const body = parseErrorBody(error);
  if (typeof body?.code === 'number' && body.code >= 100 && body.code < 600) {
    return body.code;
  }

  const match = error.message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Resolve the canonical RPC status name (e.g. `RESOURCE_EXHAUSTED`,
 * `UNAVAILABLE`, `PERMISSION_DENIED`) from an error, when present.
 */
function getErrorStatusName(error: Error): string | undefined {
  const sdkStatus = (error as { status?: unknown }).status;
  if (typeof sdkStatus === 'string') {
    return sdkStatus.toUpperCase();
  }
  const body = parseErrorBody(error);
  if (typeof body?.status === 'string') {
    return body.status.toUpperCase();
  }
  return undefined;
}

export function isRateLimitError(error: Error): boolean {
  // Authoritative signals first: a 429 / RESOURCE_EXHAUSTED is a rate limit
  // regardless of how the human-readable message is phrased.
  if (getErrorStatusCode(error) === 429) return true;
  if (getErrorStatusName(error) === 'RESOURCE_EXHAUSTED') return true;

  const message = normalizeErrorMessage(error);
  return (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('quota') ||
    message.includes('too many requests')
  );
}

export function isAuthError(error: Error): boolean {
  const code = getErrorStatusCode(error);
  if (code === 401 || code === 403) return true;

  const status = getErrorStatusName(error);
  if (status === 'UNAUTHENTICATED' || status === 'PERMISSION_DENIED') return true;

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

export function isRetryableError(error: Error): boolean {
  // Precise 5xx detection via the resolved status code — not a bare
  // `message.includes('5')`, which matched any message containing the digit 5
  // (durations, token counts) and wrongly retried 4xx errors.
  const code = getErrorStatusCode(error);
  if (code !== undefined && code >= 500 && code < 600) return true;

  const status = getErrorStatusName(error);
  if (status === 'UNAVAILABLE' || status === 'INTERNAL' || status === 'DEADLINE_EXCEEDED') {
    return true;
  }

  const message = normalizeErrorMessage(error);
  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  ) {
    return true;
  }

  return isRateLimitError(error);
}
