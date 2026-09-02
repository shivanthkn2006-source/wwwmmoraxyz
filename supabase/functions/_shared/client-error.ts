/**
 * Client-error classification for edge functions.
 *
 * Many functions validate input by throwing (zod `.parse()` or a plain
 * `throw new Error('X is required')`) and then catch everything in one handler
 * that answers 500. That is wrong HTTP semantics: a caller that forgot a field
 * gets a server error, which pollutes error dashboards, trips retry/backoff
 * logic on the client and hides genuine outages.
 *
 * `clientErrorResponse` returns a 400 Response when the thrown value is clearly
 * the caller's fault, and `null` when it is a real server failure that should
 * stay a 500.
 */

const CLIENT_ERROR_PATTERNS: RegExp[] = [
  /\bis required\b/i,
  /\bare required\b/i,
  /\brequired fields?\b/i,
  /\bmissing\b/i,
  /\bno .*(provided|supplied|given)\b/i,
  /\binvalid (request|action|input|payload|body|format|json|regional style)\b/i,
  /\bunknown action\b/i,
  /\bmust be (provided|supplied)\b/i,
  /\bnot iterable\b/i,
  /\bcannot read properties of undefined\b/i,
];

export function isClientError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name;
  if (name === 'ZodError') return true;
  const message = error instanceof Error ? error.message : String(error);
  return CLIENT_ERROR_PATTERNS.some((re) => re.test(message));
}

export function clientErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  extra: Record<string, unknown> = {},
): Response | null {
  if (!isClientError(error)) return null;

  const isZod = (error as { name?: string }).name === 'ZodError';
  const issues = isZod ? (error as { issues?: unknown[] }).issues ?? [] : undefined;
  const message = isZod
    ? 'Invalid request payload'
    : error instanceof Error
      ? error.message
      : 'Invalid request';

  return new Response(
    JSON.stringify({
      error: message,
      code: 'BAD_REQUEST',
      ...(issues ? { details: issues } : {}),
      ...extra,
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
