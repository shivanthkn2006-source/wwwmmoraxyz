import { describe, it, expect, vi } from 'vitest';
import { reserveInference, withReservation, type BudgetStore } from '../../supabase/functions/_shared/inference-budget';

const cap = { max_price: { prompt: 1, completion: 2, request: 0.001 } };
function mockStore(limitLeft = 1): BudgetStore & { spent: number; held: number } {
  const s = { spent: 0, held: 0, n: 0,
    async reserve(_m: string, usd: number) { if (s.spent + s.held + usd > limitLeft) return { ok: false }; s.held += usd; return { ok: true, id: `r${++s.n}` }; },
    async settle(_id: string, a: number) { s.held = 0; s.spent += a; },
    async release() { s.held = 0; } };
  return s as never;
}
const env = (o: Record<string, string>) => (k: string) => o[k];
const set = env({ AI_MEMBER_DAILY_BUDGET_USD: '1', AI_PLATFORM_DAILY_BUDGET_USD: '10' });
const base = { memberId: 'm', estimateUsd: 0.001, priceCap: cap, promptTokens: 1000, maxCompletionTokens: 1000 };

describe('reserve-before-inference', () => {
  it('fails closed when budgets are blank', async () => {
    const v = await reserveInference({ ...base, get: env({}), store: mockStore() });
    expect(v).toEqual({ ok: false, reason: 'BUDGET_UNSET' });
  });
  it('fails closed when the price cap is unset', async () => {
    const v = await reserveInference({ ...base, get: set, store: mockStore(), priceCap: null });
    expect(v).toEqual({ ok: false, reason: 'PRICE_CAP_UNSET' });
  });
  it('rejects estimates above the price cap', async () => {
    const v = await reserveInference({ ...base, get: set, store: mockStore(), estimateUsd: 5 });
    expect(v).toEqual({ ok: false, reason: 'PRICE_CAP_EXCEEDED' });
  });
  it('reserves the worst-case cost (0.004 USD here)', async () => {
    const v = await reserveInference({ ...base, get: set, store: mockStore() });
    expect(v.ok && v.reservedUsd).toBeCloseTo(0.004);
  });
  it('denies when the budget is exhausted', async () => {
    const v = await reserveInference({ ...base, get: set, store: mockStore(0.003) });
    expect(v).toEqual({ ok: false, reason: 'BUDGET_EXCEEDED' });
  });
  it('fails closed when the store is down', async () => {
    const store = { ...mockStore(), reserve: async () => { throw new Error('down'); } };
    const v = await reserveInference({ ...base, get: set, store });
    expect(v).toEqual({ ok: false, reason: 'STORE_UNAVAILABLE' });
  });
  it('never calls inference without a hold, releases on failure', async () => {
    const store = mockStore(); const run = vi.fn();
    await expect(withReservation(store, { ok: false, reason: 'BUDGET_UNSET' }, run)).rejects.toThrow('BUDGET_UNSET');
    expect(run).not.toHaveBeenCalled();
    const v = await reserveInference({ ...base, get: set, store });
    await expect(withReservation(store, v, async () => { throw new Error('ai'); })).rejects.toThrow('ai');
    expect(store.held).toBe(0);
    expect(store.spent).toBe(0);
  });
});
