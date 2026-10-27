/**
 * Reserve-before-inference spending control. Pure module: the store is injected so
 * the hosted version can use one atomic database call (row-locked reserve) and tests
 * can use a mock. Operator budget values are deliberately BLANK; when unset, every
 * request fails closed.
 *
 * OPERATOR BLANKS (Marc to decide):
 *   AI_MEMBER_DAILY_BUDGET_USD   = ____
 *   AI_PLATFORM_DAILY_BUDGET_USD = ____
 */
export type BudgetVerdict =
  | { ok: true; reservationId: string; reservedUsd: number }
  | { ok: false; reason: 'BUDGET_UNSET' | 'PRICE_CAP_UNSET' | 'PRICE_CAP_EXCEEDED' | 'BUDGET_EXCEEDED' | 'STORE_UNAVAILABLE' | 'BAD_ESTIMATE' };

export interface BudgetStore {
  /** Must be atomic: check remaining and record the hold in one step. */
  reserve(memberId: string, usd: number, memberLimit: number, platformLimit: number): Promise<{ ok: boolean; id?: string }>;
  settle(id: string, actualUsd: number): Promise<void>;
  release(id: string): Promise<void>;
}

function readLimit(get: (k: string) => string | undefined, key: string): number | null {
  const raw = get(key);
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Worst-case cost from the fallback price ceiling (USD per million tokens + per request). */
export function worstCaseUsd(cap: { prompt: number; completion: number; request: number }, promptTokens: number, maxCompletionTokens: number): number {
  return (cap.prompt * promptTokens + cap.completion * maxCompletionTokens) / 1_000_000 + cap.request;
}

export async function reserveInference(opts: {
  get: (k: string) => string | undefined;
  store: BudgetStore;
  memberId: string;
  estimateUsd: number;
  priceCap: { max_price: { prompt: number; completion: number; request: number } } | null;
  promptTokens: number;
  maxCompletionTokens: number;
}): Promise<BudgetVerdict> {
  const memberLimit = readLimit(opts.get, 'AI_MEMBER_DAILY_BUDGET_USD');
  const platformLimit = readLimit(opts.get, 'AI_PLATFORM_DAILY_BUDGET_USD');
  if (memberLimit === null || platformLimit === null) return { ok: false, reason: 'BUDGET_UNSET' };
  if (!opts.priceCap) return { ok: false, reason: 'PRICE_CAP_UNSET' };
  if (!Number.isFinite(opts.estimateUsd) || opts.estimateUsd < 0) return { ok: false, reason: 'BAD_ESTIMATE' };
  const ceiling = worstCaseUsd(opts.priceCap.max_price, opts.promptTokens, opts.maxCompletionTokens);
  if (opts.estimateUsd > ceiling) return { ok: false, reason: 'PRICE_CAP_EXCEEDED' };
  // Reserve the worst case, never the optimistic estimate.
  try {
    const r = await opts.store.reserve(opts.memberId, ceiling, memberLimit, platformLimit);
    if (!r.ok || !r.id) return { ok: false, reason: 'BUDGET_EXCEEDED' };
    return { ok: true, reservationId: r.id, reservedUsd: ceiling };
  } catch {
    return { ok: false, reason: 'STORE_UNAVAILABLE' };
  }
}

/** Run inference only after a successful hold; settle on success, release on failure. */
export async function withReservation<T>(store: BudgetStore, verdict: BudgetVerdict, run: () => Promise<{ value: T; actualUsd: number }>): Promise<T> {
  if (verdict.ok === false) throw new Error(verdict.reason);
  try {
    const { value, actualUsd } = await run();
    await store.settle(verdict.reservationId, Math.min(actualUsd, verdict.reservedUsd));
    return value;
  } catch (e) {
    await store.release(verdict.reservationId).catch(() => {});
    throw e;
  }
}
