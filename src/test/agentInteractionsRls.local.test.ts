// Actual PostgreSQL RLS, in memory only. Identity claims are controlled mocks.
// This is NOT hosted Auth/PostgREST proof; the six live integration cases stay separate.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const ROW_A = '00000000-0000-4000-8000-000000000011';
const ROW_B = '00000000-0000-4000-8000-000000000012';
const OTHER = '00000000-0000-4000-8000-000000000013';
const SPOOF = '00000000-0000-4000-8000-000000000014';
const migration = readFileSync('supabase/migrations/20260902044748_10425a5c-01a4-4c09-b10c-22d4af7d91c5.sql', 'utf8');
let db: PGlite;

async function asMember<T>(owner: string | null, action: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE ${owner ? 'authenticated' : 'anon'}`);
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [owner || '']);
  try { return await action(); }
  finally { await db.exec('RESET ROLE'); }
}
const select = () => db.query<{ id: string; user_id: string }>('SELECT id,user_id FROM public.agent_interactions ORDER BY id');

beforeEach(async () => {
  // Any accidental HTTP escape is a failure. PGlite uses packaged WASM files.
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden in local privacy proof'); }));
  db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${A}'), ('${B}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
  `);
  // Execute the unmodified application migration, not a hand-written policy model.
  await db.exec(migration);
  for (const [owner, id, agent, payload] of [
    [A, ROW_A, 'agent-a', { owner: 'a', intimacy_level: 4 }],
    [B, ROW_B, 'agent-a', { owner: 'b' }],
    [A, OTHER, 'agent-b', { role: 'founder' }],
  ] as const) {
    await asMember(owner, () => db.query('INSERT INTO public.agent_interactions(id,user_id,agent_id,context_payload) VALUES ($1,$2,$3,$4)', [id, owner, agent, JSON.stringify(payload)]));
  }
}, 30_000);
afterEach(async () => { await db?.close(); vi.unstubAllGlobals(); });

describe('agent_interactions local PostgreSQL isolation (mock identities, no network)', () => {
  it('allows own insert and read under a non-owner non-superuser role', async () => {
    const identity = await asMember(A, () => db.query<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>('SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user'));
    expect(identity.rows).toEqual([{ current_user: 'authenticated', rolsuper: false, rolbypassrls: false }]);
    const result = await asMember(A, () => db.query('SELECT id,user_id FROM public.agent_interactions WHERE id=$1', [ROW_A]));
    expect(result.rows).toEqual([{ id: ROW_A, user_id: A }]);
  });
  it('rejects forged ownership with SQLSTATE 42501', async () => {
    await expect(asMember(A, () => db.query('INSERT INTO public.agent_interactions(id,user_id,agent_id) VALUES ($1,$2,$3)', [SPOOF, B, 'agent-a']))).rejects.toMatchObject({ code: '42501' });
    expect((await asMember(B, select)).rows).toEqual([{ id: ROW_B, user_id: B }]);
  });
  it('filters foreign rows in both directions', async () => {
    expect((await asMember(A, select)).rows).toEqual([{ id: ROW_A, user_id: A }, { id: OTHER, user_id: A }]);
    expect((await asMember(B, select)).rows).toEqual([{ id: ROW_B, user_id: B }]);
  });
  it('partitions own rows by agent_id', async () => {
    const result = await asMember(A, () => db.query('SELECT id,agent_id,context_payload FROM public.agent_interactions WHERE agent_id=$1', ['agent-b']));
    expect(result.rows).toEqual([{ id: OTHER, agent_id: 'agent-b', context_payload: { role: 'founder' } }]);
  });
  it('prevents foreign update/delete and reads unchanged payload back', async () => {
    const updated = await asMember(B, () => db.query('UPDATE public.agent_interactions SET context_payload=$1 WHERE id=$2 RETURNING id', [JSON.stringify({ hacked: true }), ROW_A]));
    const deleted = await asMember(B, () => db.query('DELETE FROM public.agent_interactions WHERE id=$1 RETURNING id', [ROW_A]));
    expect(updated.rows).toEqual([]);
    expect(deleted.rows).toEqual([]);
    expect((await asMember(A, () => db.query('SELECT context_payload FROM public.agent_interactions WHERE id=$1', [ROW_A]))).rows).toEqual([{ context_payload: { owner: 'a', intimacy_level: 4 } }]);
  });
  it('denies anonymous reads even when a claim is forged', async () => {
    await expect(asMember(null, select)).rejects.toMatchObject({ code: '42501' });
    await db.exec('SET ROLE anon');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [A]);
    try { await expect(select()).rejects.toMatchObject({ code: '42501' }); }
    finally { await db.exec('RESET ROLE'); }
  });
  it('rejects owner transfer by UPDATE and retains original owner', async () => {
    await expect(asMember(A, () => db.query('UPDATE public.agent_interactions SET user_id=$1 WHERE id=$2', [B, ROW_A]))).rejects.toMatchObject({ code: '42501' });
    expect((await asMember(A, () => db.query('SELECT user_id FROM public.agent_interactions WHERE id=$1', [ROW_A]))).rows).toEqual([{ user_id: A }]);
  });
  it('allows owner update/readback, refreshes timestamp and allows owner deletion', async () => {
    const result = await asMember(A, () => db.query<{ context_payload: { owner: string }; touched: boolean }>("UPDATE public.agent_interactions SET context_payload=$1, updated_at='2000-01-01'::timestamptz WHERE id=$2 RETURNING context_payload, updated_at > '2000-01-01'::timestamptz AS touched", [JSON.stringify({ owner: 'updated-a' }), ROW_A]));
    expect(result.rows).toEqual([{ context_payload: { owner: 'updated-a' }, touched: true }]);
    const readback = await asMember(A, () => db.query('SELECT context_payload FROM public.agent_interactions WHERE id=$1', [ROW_A]));
    expect(readback.rows).toEqual([{ context_payload: { owner: 'updated-a' } }]);
    const deleted = await asMember(A, () => db.query('DELETE FROM public.agent_interactions WHERE id=$1 RETURNING id', [ROW_A]));
    expect(deleted.rows).toEqual([{ id: ROW_A }]);
    expect((await asMember(A, () => db.query('SELECT id FROM public.agent_interactions WHERE id=$1', [ROW_A]))).rows).toEqual([]);
    expect((await asMember(B, select)).rows).toEqual([{ id: ROW_B, user_id: B }]);
  });
  it('detects a deliberately permissive policy rather than yielding false-green evidence', async () => {
    await db.exec('CREATE POLICY fixture_bad_read ON public.agent_interactions FOR SELECT TO authenticated USING (true)');
    const leaked = await asMember(A, select);
    expect(leaked.rows.some(row => row.id === ROW_B)).toBe(true);
    await db.exec('DROP POLICY fixture_bad_read ON public.agent_interactions');
    expect((await asMember(A, select)).rows.some(row => row.id === ROW_B)).toBe(false);
  });
});