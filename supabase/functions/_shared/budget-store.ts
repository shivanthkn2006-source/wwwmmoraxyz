/**
 * Database-backed BudgetStore + guard for paid fallback inference.
 * Pure: the RPC caller and env reader are injected. Until the pending
 * ai_budget_reservations migration is applied and budgets are set, every
 * paid call fails closed (BUDGET_UNSET / STORE_UNAVAILABLE) and is skipped.
 */
import { reserveInference, withReservation, type BudgetStore, type BudgetVerdict } from './inference-budget.ts';

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export function createRpcBudgetStore(rpc: Rpc): BudgetStore {
  return {
    async reserve(memberId, usd, memberLimit, platformLimit) {
      const { data, error } = await rpc('reserve_ai_budget', { p_member: memberId, p_usd: usd, p_member_limit: memberLimit, p_platform_limit: platformLimit });
      if (error) throw new Error('store_error');
      return typeof data === 'string' && data ? { ok: true, id: data } : { ok: false };
    },
    async settle(id, actualUsd) {
      const { error } = await rpc('settle_ai_budget', { p_id: id, p_actual: actualUsd });
      if (error) throw new Error('store_error');
    },
    async release(id) {
      const { error } = await rpc('release_ai_budget', { p_id: id });
      if (error) throw new Error('store_error');
    },
  };
}

/** Service-role RPC over fetch; returns an error (never throws) when config is missing. */
export function serviceRpc(get: (k: string) => string | undefined, fetchImpl: typeof fetch = fetch): Rpc {
  return async (fn, args) => {
    const url = get('SUPABASE_URL'); const key = get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return { data: null, error: 'config_missing' };
    try {
      const r = await fetchImpl(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', redirect: 'manual',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
      if (!r.ok) return { data: null, error: r.status };
      return { data: await r.json(), error: null };
    } catch (e) { return { data: null, error: e }; }
  };
}

/** Rough prompt-token count (4 chars/token, rounded up) for the worst-case hold. */
export function estimatePromptTokens(messages: unknown): number {
  return Math.ceil(JSON.stringify(messages ?? '').length / 4);
}

/**
 * Hold worst-case cost, run the paid call, settle actual usage or release on failure.
 * Returns { skipped: reason } without running when the hold is refused.
 */
export async function guardedPaidCall<T>(opts: {
  get: (k: string) => string | undefined;
  store: BudgetStore;
  memberId: string;
  priceCap: { max_price: { prompt: number; completion: number; request: number } } | null;
  messages: unknown;
  maxCompletionTokens: number;
  run: () => Promise<{ value: T; actualUsd: number }>;
}): Promise<{ value: T } | { skipped: string }> {
  const promptTokens = estimatePromptTokens(opts.messages);
  const verdict: BudgetVerdict = await reserveInference({
    get: opts.get, store: opts.store, memberId: opts.memberId, estimateUsd: 0,
    priceCap: opts.priceCap, promptTokens, maxCompletionTokens: opts.maxCompletionTokens,
  });
  if (verdict.ok === false) return { skipped: verdict.reason };
  return { value: await withReservation(opts.store, verdict, opts.run) };
}

/** Actual cost from provider usage, bounded by the cap; unknown usage bills the full hold. */
export function actualUsdFromUsage(cap: { prompt: number; completion: number; request: number }, usage: any, reservedFallback: number): number {
  const p = Number(usage?.prompt_tokens), c = Number(usage?.completion_tokens);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return reservedFallback;
  return (cap.prompt * p + cap.completion * c) / 1_000_000 + cap.request;
}
