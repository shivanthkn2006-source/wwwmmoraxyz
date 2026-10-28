import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRpcBudgetStore, guardedPaidCall, type Rpc } from '../../supabase/functions/_shared/budget-store';

const cap = { max_price: { prompt: 1, completion: 2, request: 0.001 } };
const env = (o: Record<string, string>) => (k: string) => o[k];
const set = env({ AI_MEMBER_DAILY_BUDGET_USD: '0.01', AI_PLATFORM_DAILY_BUDGET_USD: '1' });

/** Mock of the SQL functions: reserve is serialised like the advisory lock. */
function mockDb(down = false) {
  const rows = new Map<string, { m: string; r: number; a?: number; s: string }>();
  let lock = Promise.resolve(); let n = 0;
  const used = (m?: string) => [...rows.values()].filter(x => x.s !== 'released' && (!m || x.m === m)).reduce((t, x) => t + (x.s === 'settled' ? x.a! : x.r), 0);
  const rpc: Rpc = async (fn, a: any) => {
    if (down) return { data: null, error: 503 };
    if (fn === 'reserve_ai_budget') {
      const run = lock.then(async () => { await new Promise(r => setTimeout(r, 1));
        if (used(a.p_member) + a.p_usd > a.p_member_limit || used() + a.p_usd > a.p_platform_limit) return null;
        const id = `r${++n}`; rows.set(id, { m: a.p_member, r: a.p_usd, s: 'held' }); return id; });
      lock = run.then(() => undefined); return { data: await run, error: null };
    }
    const row = rows.get(a.p_id);
    if (row && row.s === 'held') { if (fn === 'settle_ai_budget') { row.s = 'settled'; row.a = Math.min(a.p_actual, row.r); } else row.s = 'released'; }
    return { data: true, error: null };
  };
  return { rpc, rows, used };
}
// ~0.0031 USD worst case per call (1000 completion tokens), so 3 fit under 0.01.
const call = (db: ReturnType<typeof mockDb>, run: () => Promise<{ value: string; actualUsd: number }>, get = set) =>
  guardedPaidCall({ get, store: createRpcBudgetStore(db.rpc), memberId: 'm1', priceCap: cap, messages: [{ role: 'user', content: 'hi' }], maxCompletionTokens: 1000, run });

describe('atomic budget reservations (mock DB)', () => {
  it('10 concurrent requests: only 3 get a hold, AI runs only 3 times', async () => {
    const db = mockDb(); let ran = 0;
    const res = await Promise.all(Array.from({ length: 10 }, () => call(db, async () => { ran++; return { value: 'ok', actualUsd: 999 }; })));
    expect(res.filter(r => 'value' in r).length).toBe(3);
    expect(ran).toBe(3);
    expect(db.used('m1')).toBeLessThanOrEqual(0.01);
  });
  it('settles actual cost below the hold, freeing budget', async () => {
    const db = mockDb();
    await call(db, async () => ({ value: 'ok', actualUsd: 0.0005 }));
    expect([...db.rows.values()][0]).toMatchObject({ s: 'settled', a: 0.0005 });
  });
  it('releases the hold when the AI call fails', async () => {
    const db = mockDb();
    await expect(call(db, async () => { throw new Error('provider 500'); })).rejects.toThrow('provider 500');
    expect([...db.rows.values()][0].s).toBe('released');
    expect(db.used()).toBe(0);
  });
  it('fails closed (AI never runs) when the ledger is down', async () => {
    let ran = false;
    const r = await call(mockDb(true), async () => { ran = true; return { value: 'x', actualUsd: 0 }; });
    expect(r).toEqual({ skipped: 'STORE_UNAVAILABLE' }); expect(ran).toBe(false);
  });
  it('fails closed when budgets are blank', async () => {
    let ran = false;
    const r = await call(mockDb(), async () => { ran = true; return { value: 'x', actualUsd: 0 }; }, env({}));
    expect(r).toEqual({ skipped: 'BUDGET_UNSET' }); expect(ran).toBe(false);
  });
});

describe('Zoe fallback paths are wired to the hold', () => {
  for (const f of ['cascading-provider.ts', 'sovereign-ai.ts']) {
    it(`${f}: OpenRouter fetch happens only inside guardedPaidCall`, () => {
      const src = readFileSync(`supabase/functions/_shared/${f}`, 'utf8');
      const fn = src.slice(src.indexOf('async function callOpenRouter('));
      const body = fn.slice(0, fn.indexOf('\n}\n'));
      expect(body.indexOf('guardedPaidCall')).toBeGreaterThan(-1);
      expect(body.indexOf('guardedPaidCall')).toBeLessThan(body.indexOf('fetch('));
    });
  }
  it('migration is staged, not applied', () => {
    const sql = readFileSync('supabase/pending-migrations/20261028_ai_budget_reservations.sql', 'utf8');
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public.reserve_ai_budget/);
  });
});
