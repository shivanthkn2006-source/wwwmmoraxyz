// Live privacy proof requires a separately configured disposable backend and two members.
// No configuration: six explicit skips. Partial configuration or backend failure: fail.
// Required: RLS_TEST_URL, RLS_TEST_PUBLISHABLE_KEY, RLS_TEST_ISOLATED=true,
// RLS_TEST_USER_A_EMAIL/PASSWORD and RLS_TEST_USER_B_EMAIL/PASSWORD.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupIsolationRows, isolationConfig, isolationRequested } from './rlsIsolationSafety';

const TABLE = 'agent_interactions';
const runId = crypto.randomUUID();
const AGENT_A = `rls-a-${runId}`;
const AGENT_B = `rls-b-${runId}`;
const aRowId = crypto.randomUUID();
const bRowId = crypto.randomUUID();
const aOtherId = crypto.randomUUID();
const spoofId = crypto.randomUUID();

describe.skipIf(!isolationRequested(process.env))('agent_interactions RLS isolation (integration)', () => {
  let a: SupabaseClient | undefined;
  let b: SupabaseClient | undefined;
  let anon: SupabaseClient | undefined;
  let aUserId = '';
  let bUserId = '';
  const aIds: string[] = [];
  const bIds: string[] = [];

  beforeAll(async () => {
    const config = isolationConfig(process.env); // Guard before any auth or database request.
    const client = () => createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    a = client(); b = client(); anon = client();
    const [signInA, signInB] = await Promise.all([
      a.auth.signInWithPassword({ email: config.aEmail, password: config.aPassword }),
      b.auth.signInWithPassword({ email: config.bEmail, password: config.bPassword }),
    ]);
    aUserId = signInA.data.user?.id || '';
    bUserId = signInB.data.user?.id || '';
    if (signInA.error || signInB.error || !aUserId || !bUserId || aUserId === bUserId) {
      throw new Error('Privacy fixture authentication failed or identities are not distinct');
    }
    // Register predetermined IDs before each insert: a lost response cannot cause broad cleanup.
    for (const [db, owner, ids, id, agent, payload] of [
      [a, aUserId, aIds, aRowId, AGENT_A, { owner: 'a', intimacy_level: 4 }],
      [b, bUserId, bIds, bRowId, AGENT_A, { owner: 'b' }],
      [a, aUserId, aIds, aOtherId, AGENT_B, { role: 'founder' }],
    ] as const) {
      ids.push(id);
      const { data, error } = await db.from(TABLE).insert({ id, user_id: owner, agent_id: agent, context_payload: payload }).select('id,user_id').single();
      if (error || data?.id !== id || data?.user_id !== owner) throw new Error('Privacy fixture seed failed');
    }
  }, 30_000);

  afterAll(async () => {
    const results = await Promise.allSettled([
      ...(a ? [cleanupIsolationRows(a, aUserId, aIds)] : []),
      ...(b ? [cleanupIsolationRows(b, bUserId, bIds)] : []),
    ]);
    // Sign out even when cleanup failed; never suppress the cleanup failure.
    await Promise.allSettled([...(a ? [a.auth.signOut()] : []), ...(b ? [b.auth.signOut()] : [])]);
    if (results.some(result => result.status === 'rejected')) throw new Error('Privacy fixture cleanup failed');
  });

  function clients() {
    if (!a || !b || !anon || !aUserId || !bUserId) throw new Error('Privacy fixture unavailable');
    return { a, b, anon };
  }

  it('lets an authenticated user insert and read their own row', async () => {
    const { data, error } = await clients().a.from(TABLE).select('id,user_id').eq('id', aRowId).single();
    expect(error).toBeNull();
    expect(data).toEqual({ id: aRowId, user_id: aUserId });
  });

  it('rejects an insert that claims another user as owner', async () => {
    // Both cleanup attempts remain scoped to this exact ID if a broken policy accepts it.
    aIds.push(spoofId); bIds.push(spoofId);
    const { error } = await clients().a.from(TABLE).insert({ id: spoofId, user_id: bUserId, agent_id: AGENT_A, context_payload: { spoof: true } });
    expect(error?.code).toBe('42501');
  });

  it('never returns another user rows, for any agent_id', async () => {
    const { data, error } = await clients().a.from(TABLE).select('id,user_id').eq('agent_id', AGENT_A).in('id', [aRowId, bRowId]);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: aRowId, user_id: aUserId }]);
  });

  it('partitions a single user rows by agent_id', async () => {
    const { data, error } = await clients().a.from(TABLE).select('id,agent_id,context_payload').eq('agent_id', AGENT_B).in('id', [aRowId, aOtherId]);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: aOtherId, agent_id: AGENT_B, context_payload: { role: 'founder' } }]);
  });

  it('does not let another user update or delete the row', async () => {
    const { a, b } = clients();
    const updated = await b.from(TABLE).update({ context_payload: { hacked: true } }).eq('id', aRowId).select('id');
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual([]);
    const deleted = await b.from(TABLE).delete().eq('id', aRowId).select('id');
    expect(deleted.error).toBeNull();
    expect(deleted.data).toEqual([]);
    const still = await a.from(TABLE).select('id,context_payload').eq('id', aRowId).single();
    expect(still.error).toBeNull();
    expect(still.data).toEqual({ id: aRowId, context_payload: { owner: 'a', intimacy_level: 4 } });
  });

  it('returns nothing to an anonymous visitor', async () => {
    const { data, error } = await clients().anon.from(TABLE).select('id').in('id', [aRowId, bRowId, aOtherId]);
    if (error) expect(error.code).toBe('42501');
    else expect(data).toEqual([]);
  });
});
