// @vitest-environment jsdom
// ═══════════════════════════════════════════════════════════════════════════════
// RLS WRITE REGRESSION SUITE
// Guards the platform-wide contract every write path must satisfy:
//   1. signed out  → the write is silently skipped BEFORE any network call
//   2. signed in   → the row is stamped with the live auth uid (caller values
//                    for the owner column are never trusted)
//   3. update/delete on owner-scoped tables are always constrained to auth.uid()
//   4. a server-side RLS denial (42501) degrades quietly, never throws
// Runs fully offline against a fake Supabase client, so it is a real CI gate
// rather than an environment-dependent integration test.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Fake Supabase client ─────────────────────────────────────────────────────
type Denial = { message: string; code?: string } | null;

const calls: Array<{ table: string; op: string; payload?: unknown; filters: Record<string, unknown> }> = [];
let session: { user: { id: string } } | null = null;
let nextError: Denial = null;

const makeBuilder = (table: string, op: string, payload?: unknown) => {
  const entry = { table, op, payload, filters: {} as Record<string, unknown> };
  calls.push(entry);
  const result = { data: op === 'select' ? [] : payload, error: nextError };
  const builder: Record<string, unknown> = {
    eq: (column: string, value: unknown) => {
      entry.filters[column] = value;
      return builder;
    },
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    select: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (table: string) => ({
      select: () => makeBuilder(table, 'select'),
      insert: (payload: unknown) => makeBuilder(table, 'insert', payload),
      update: (payload: unknown) => makeBuilder(table, 'update', payload),
      delete: () => makeBuilder(table, 'delete'),
    }),
  },
}));

vi.mock('@/lib/platformErrorReporter', () => ({ reportPlatformError: () => {} }), { virtual: true });

const dataAccess = await import('@/lib/data/dataAccess');
const telemetry = await import('@/lib/safeTelemetry');

const OWNER_TABLES = [
  'agent_interactions',
  'growth_saved_items',
  'growth_card_events',
  'feed_diagnostics_log',
] as const;

const TELEMETRY_TABLES = [
  'behavioral_events',
  'platform_health_logs',
  'dhf_soul_codex',
  'zoe_black_box_ledger',
  'feed_diagnostics_log',
] as const;

const signIn = (id: string) => {
  session = { user: { id } };
  dataAccess.__setCachedUserId(id);
  telemetry.__resetTelemetryAuthCache();
};

const signOut = () => {
  session = null;
  dataAccess.__setCachedUserId(null);
  telemetry.__resetTelemetryAuthCache();
};

beforeEach(() => {
  calls.length = 0;
  nextError = null;
  signOut();
});

describe('RLS regression — signed-out writes are skipped, never sent', () => {
  it.each(TELEMETRY_TABLES)('telemetry write to %s is dropped locally', async (table) => {
    const res = await telemetry.logTelemetry(table, { note: 'x', user_id: 'someone-else' });
    expect(res).toEqual({ ok: false, skipped: 'signed-out' });
    expect(calls).toHaveLength(0);
  });

  it.each(OWNER_TABLES)('owner-scoped insert into %s is refused before the request', async (table) => {
    const res = await dataAccess.insertRow(
      { table, scope: 'owner', ownerColumn: 'user_id' },
      { payload: 1 },
    );
    expect(res.error).toBeTruthy();
    expect(res.error?.message).toMatch(/authenticated session/i);
    expect(calls).toHaveLength(0);
  });

  it('owner-scoped update and delete are refused while signed out', async () => {
    const ctx = { table: 'agent_interactions', scope: 'owner' as const, ownerColumn: 'user_id' };
    const upd = await dataAccess.updateRows(ctx, { id: 'row-1' }, { agent_id: 'agent_moksh' });
    const del = await dataAccess.deleteRows(ctx, { id: 'row-1' });
    expect(upd.error).toBeTruthy();
    expect(del.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('service-scoped tables are never reachable from the browser', async () => {
    const res = await dataAccess.insertRow({ table: 'notification_attempts', scope: 'service' }, {});
    expect(res.error?.message).toMatch(/service-role only/i);
    expect(calls).toHaveLength(0);
  });
});

describe('RLS regression — authorized writes are owner-stamped', () => {
  beforeEach(() => signIn('user-alpha'));

  it.each(TELEMETRY_TABLES)('telemetry write to %s stamps the live uid', async (table) => {
    const res = await telemetry.logTelemetry(table, { note: 'x', user_id: 'attacker' });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe(table);
    expect((calls[0].payload as Record<string, unknown>).user_id).toBe('user-alpha');
  });

  it.each(OWNER_TABLES)('insert into %s overrides a spoofed owner id', async (table) => {
    const res = await dataAccess.insertRow(
      { table, scope: 'owner', ownerColumn: 'user_id' },
      { user_id: 'victim-user', payload: 1 },
    );
    expect(res.error).toBeNull();
    expect((calls[0].payload as Record<string, unknown>).user_id).toBe('user-alpha');
  });

  it('update and delete are constrained to the caller uid', async () => {
    const ctx = { table: 'agent_interactions', scope: 'owner' as const, ownerColumn: 'user_id' };
    await dataAccess.updateRows(ctx, { id: 'row-1' }, { agent_id: 'agent_moksh' });
    await dataAccess.deleteRows(ctx, { id: 'row-1' });
    for (const call of calls) {
      expect(call.filters.user_id).toBe('user-alpha');
      expect(call.filters.id).toBe('row-1');
    }
  });

  it('owner-scoped selects filter by the caller uid too', async () => {
    await dataAccess.selectRows(
      { table: 'agent_interactions', scope: 'owner', ownerColumn: 'user_id' },
      { eq: { agent_id: 'agent_moksh' } },
    );
    expect(calls[0].filters.user_id).toBe('user-alpha');
    expect(calls[0].filters.agent_id).toBe('agent_moksh');
  });

  it('public-scoped reads do not require a session', async () => {
    signOut();
    const res = await dataAccess.selectRows({ table: 'posts', scope: 'public' }, {});
    expect(res.error).toBeNull();
    expect(calls).toHaveLength(1);
  });
});

describe('RLS regression — server-side denials degrade quietly', () => {
  beforeEach(() => signIn('user-alpha'));

  it('a 42501 telemetry denial resolves to an error result without throwing', async () => {
    nextError = { message: 'new row violates row-level security policy', code: '42501' };
    const res = await telemetry.logTelemetry('behavioral_events', { note: 'x' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/row-level security/i);
  });

  it('a 42501 data-access denial returns a typed error instead of throwing', async () => {
    nextError = { message: 'new row violates row-level security policy', code: '42501' };
    const res = await dataAccess.insertRow(
      { table: 'agent_interactions', scope: 'owner', ownerColumn: 'user_id' },
      { agent_id: 'a' },
    );
    expect(res.data).toBeNull();
    expect(res.error?.name).toBe('DataAccessError');
  });
});
