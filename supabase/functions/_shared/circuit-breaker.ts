/**
 * Part 1 — FallbackCircuitBreaker (Zoe Evolution Engine spec §3.1).
 * Tries providers in priority order; after 3 consecutive failures a provider's
 * circuit opens for 30s and it is skipped. Never throws past the caller's
 * fallback: returns { ok:false, trace } when every tier is exhausted.
 * Rule: no Lovable, Microsoft/Azure, OpenAI or paid providers are ever listed.
 */
export interface ProviderTask<T> { name: string; execute: () => Promise<T | null> }
export interface BreakerTrace { provider: string; status: 'ok' | 'failed' | 'skipped' | 'no_key'; ms?: number; error?: string }
export interface BreakerResult<T> { ok: boolean; value: T | null; provider: string | null; trace: BreakerTrace[] }

const FAILURE_THRESHOLD = 3;
const RESET_MS = 30_000;
const failures = new Map<string, number>();
const openUntil = new Map<string, number>();

export function isOpen(name: string) { return Date.now() < (openUntil.get(name) ?? 0); }
export function breakerState() {
  const out: Record<string, { failures: number; open: boolean }> = {};
  for (const [k, v] of failures) out[k] = { failures: v, open: isOpen(k) };
  return out;
}
function fail(name: string) {
  const n = (failures.get(name) ?? 0) + 1;
  failures.set(name, n);
  if (n >= FAILURE_THRESHOLD) openUntil.set(name, Date.now() + RESET_MS);
}

export async function executeWithFallback<T>(providers: (ProviderTask<T> | null)[], timeoutMs = 12_000): Promise<BreakerResult<T>> {
  const trace: BreakerTrace[] = [];
  for (const p of providers) {
    if (!p) continue;
    if (isOpen(p.name)) { trace.push({ provider: p.name, status: 'skipped' }); continue; }
    const t0 = Date.now();
    try {
      const value = await Promise.race([
        p.execute(),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
      ]);
      if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) throw new Error('empty');
      failures.set(p.name, 0);
      trace.push({ provider: p.name, status: 'ok', ms: Date.now() - t0 });
      return { ok: true, value, provider: p.name, trace };
    } catch (e) {
      fail(p.name);
      trace.push({ provider: p.name, status: 'failed', ms: Date.now() - t0, error: String((e as Error)?.message ?? e).slice(0, 160) });
    }
  }
  return { ok: false, value: null, provider: null, trace };
}
