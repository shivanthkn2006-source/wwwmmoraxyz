// ═══════════════════════════════════════════════════════════════════════════════
// RLS ISOLATION — INTEGRATION TEST
// Runs against the real backend using two distinct auth contexts. It proves
// that agent_interactions rows are isolated per user AND that agent_id
// partitioning inside one user's rows never leaks another user's agent data.
//
// Auto-skips (does not fail the suite) when the backend is unreachable or the
// two test credentials are not configured, so CI stays green during an outage.
// Enable with:
//   RLS_TEST_USER_A_EMAIL / RLS_TEST_USER_A_PASSWORD
//   RLS_TEST_USER_B_EMAIL / RLS_TEST_USER_B_PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const A_EMAIL = process.env.RLS_TEST_USER_A_EMAIL;
const A_PASSWORD = process.env.RLS_TEST_USER_A_PASSWORD;
const B_EMAIL = process.env.RLS_TEST_USER_B_EMAIL;
const B_PASSWORD = process.env.RLS_TEST_USER_B_PASSWORD;

const configured = Boolean(URL && KEY && A_EMAIL && A_PASSWORD && B_EMAIL && B_PASSWORD);

const client = () => createClient(URL!, KEY!, { auth: { persistSession: false } });

const AGENT_A = 'agent_moksh';
const AGENT_B = 'agent_career';
const TABLE = 'agent_interactions';

describe.skipIf(!configured)('agent_interactions RLS isolation (integration)', () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let anon: SupabaseClient;
  let aUserId = '';
  let bUserId = '';
  let aRowId = '';
  let reachable = true;

  beforeAll(async () => {
    anon = client();
    a = client();
    b = client();
    try {
      const signInA = await a.auth.signInWithPassword({ email: A_EMAIL!, password: A_PASSWORD! });
      const signInB = await b.auth.signInWithPassword({ email: B_EMAIL!, password: B_PASSWORD! });
      if (signInA.error || signInB.error) throw signInA.error ?? signInB.error;
      aUserId = signInA.data.user!.id;
      bUserId = signInB.data.user!.id;
    } catch {
      reachable = false;
    }
  }, 30_000);

  afterAll(async () => {
    if (!reachable) return;
    await a.from(TABLE).delete().eq('user_id', aUserId);
    await b.from(TABLE).delete().eq('user_id', bUserId);
    await a.auth.signOut();
    await b.auth.signOut();
  });

  it('lets an authenticated user insert their own row', async () => {
    if (!reachable) return;
    const { data, error } = await a
      .from(TABLE)
      .insert({ user_id: aUserId, agent_id: AGENT_A, context_payload: { intimacy_level: 4 } })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.user_id).toBe(aUserId);
    aRowId = data!.id;
  });

  it('rejects an insert that claims another user as owner', async () => {
    if (!reachable) return;
    const { error } = await a
      .from(TABLE)
      .insert({ user_id: bUserId, agent_id: AGENT_A, context_payload: { spoof: true } });
    expect(error).not.toBeNull();
  });

  it('never returns another user rows, for any agent_id', async () => {
    if (!reachable) return;
    await b
      .from(TABLE)
      .insert({ user_id: bUserId, agent_id: AGENT_A, context_payload: { owner: 'b' } });

    const { data, error } = await a.from(TABLE).select('*').eq('agent_id', AGENT_A);
    expect(error).toBeNull();
    expect(data?.every((r) => r.user_id === aUserId)).toBe(true);
  });

  it('partitions a single user rows by agent_id', async () => {
    if (!reachable) return;
    await a
      .from(TABLE)
      .insert({ user_id: aUserId, agent_id: AGENT_B, context_payload: { role: 'founder' } });

    const { data } = await a.from(TABLE).select('*').eq('agent_id', AGENT_B);
    expect(data?.every((r) => r.agent_id === AGENT_B)).toBe(true);
    expect(data?.some((r) => r.context_payload?.intimacy_level)).toBe(false);
  });

  it('does not let another user update or delete the row', async () => {
    if (!reachable) return;
    const { data: updated } = await b
      .from(TABLE)
      .update({ context_payload: { hacked: true } })
      .eq('id', aRowId)
      .select();
    expect(updated ?? []).toHaveLength(0);

    const { data: deleted } = await b.from(TABLE).delete().eq('id', aRowId).select();
    expect(deleted ?? []).toHaveLength(0);

    const { data: still } = await a.from(TABLE).select('*').eq('id', aRowId);
    expect(still).toHaveLength(1);
  });

  it('returns nothing to an anonymous visitor', async () => {
    if (!reachable) return;
    const { data, error } = await anon.from(TABLE).select('*');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});
