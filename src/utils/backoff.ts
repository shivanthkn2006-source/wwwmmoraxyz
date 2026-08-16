/**
 * Exponential-backoff retry helper used by the Zoe memory bridge so transient
 * gateway outages (timeouts, dropped sockets, cold container) do not flip Zoe
 * into sovereign fallback on the first failure.
 */

export interface BackoffOptions<T> {
  /** Total attempts, including the first one. */
  attempts?: number;
  /** Base delay in ms; doubled each retry. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true when the result is worth retrying. */
  shouldRetry: (result: T) => boolean;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions<T>
): Promise<{ result: T; attempts: number }> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const base = opts.baseDelayMs ?? 350;
  const max = opts.maxDelayMs ?? 4000;

  let last!: T;
  for (let i = 0; i < attempts; i += 1) {
    last = await fn();
    if (!opts.shouldRetry(last) || i === attempts - 1) {
      return { result: last, attempts: i + 1 };
    }
    const delay = Math.min(max, base * 2 ** i);
    // small jitter avoids synchronised retry storms across tabs
    await wait(delay + Math.random() * 100);
  }
  return { result: last, attempts };
}

/** Failure kinds worth retrying — auth/CORS errors are deterministic. */
export const TRANSIENT_GATEWAY_KINDS = new Set(['timeout', 'unreachable', 'gateway']);
