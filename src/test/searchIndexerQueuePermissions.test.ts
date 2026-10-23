import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

type Job = { id: string; entity_type: string; entity_id: string; owner_id: string | null; attempts: number; status: string };
const job = (id: string, owner_id: string | null): Job => ({ id, owner_id, entity_id: id, entity_type: 'profile', attempts: 0, status: 'pending' });

/** Runs the actual handler; every database/provider operation is in-memory. */
function fixture(options: { system?: 'service' | 'secret'; admin?: boolean; roleError?: boolean; signedOut?: boolean; race?: boolean; backfill?: boolean; rows?: Job[] } = {}) {
  const rows = options.rows ?? [job('foreign', 'member-b'), job('shared', null), job('own', 'member-a')];
  const claims: string[] = [];
  const canonical: string[] = [];
  const writes: string[] = [];
  const sharedReads: string[] = [];
  const enqueues: Array<{ entity_type: string; entity_id: string; owner_id: string | null }> = [];
  const embed = vi.fn(async () => [0.1]);
  const media = vi.fn(async () => null);
  const rpc = vi.fn(async () => ({ data: options.admin === true, error: options.roleError ? { message: 'offline' } : null }));
  const auth = vi.fn(async () => {
    if (options.signedOut) throw new Error('UNAUTHORIZED');
    return { id: 'member-a' };
  });
  const db = {
    rpc,
    from(table: string) {
      let operation = 'read';
      let single = false;
      let cap = Infinity;
      let patch: Record<string, unknown> = {};
      const filters: Array<[string, unknown]> = [];
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        in() { return query; }, lte() { return query; }, order() { return query; }, like() { return query; },
        limit(n: number) { cap = n; return query; },
        maybeSingle() { single = true; return query; },
        update(value: Record<string, unknown>) { operation = 'update'; patch = value; return query; },
        upsert(value: typeof enqueues) { operation = 'upsert'; if (table === 'zoe_search_index_queue') enqueues.push(...value); return query; },
        insert() { operation = 'insert'; return query; },
        delete() { operation = 'delete'; return query; },
        then(resolve: (value: unknown) => unknown) {
          if (table === 'dhf_videos') {
            sharedReads.push(table);
            return resolve({ data: [{ id: 'shared-video' }], error: null });
          }
          if (table === 'zoe_search_index_queue') {
            if (operation === 'update' && patch.status === 'processing' && options.race) {
              const own = rows.find(row => row.id === 'own');
              if (own) own.owner_id = 'member-b';
            }
            const matches = rows.filter(row => filters.every(([key, value]) => row[key as keyof Job] === value)).slice(0, cap);
            if (operation === 'update') {
              for (const row of matches) {
                writes.push(row.id);
                if (patch.status === 'processing') claims.push(row.id);
                Object.assign(row, patch);
              }
            }
            return resolve({ data: single ? (matches[0] ?? null) : matches, error: null });
          }
          if (table === 'profiles') {
            if (options.backfill && !single) return resolve({ data: [{ user_id: 'member-a' }], error: null });
            const id = String(filters.find(([key]) => key === 'user_id')?.[1]);
            canonical.push(id);
            return resolve({ data: { user_id: id === 'own' ? 'member-a' : 'member-b', display_name: 'Fixture', profile_visibility: 'private' }, error: null });
          }
          return resolve({ data: [], error: null });
        },
      };
      return query;
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync('supabase/functions/zoe-search-indexer/index.ts', 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    Deno: { env: { get: (key: string) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'fixture-service' : key === 'ZOE_INDEX_DRAIN_SECRET' ? 'fixture-secret' : 'fixture-config' }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient: () => db, requireSearchUser: auth, embedText: embed, describeSearchMedia: media,
    publicGuard: async () => ({}), Request, Response, Headers, crypto, performance, Date,
  });
  if (!handler) throw new Error('Handler not registered');
  const run = handler;
  return {
    claims, canonical, writes, embed, media, rpc, auth, sharedReads, enqueues,
    async invoke(body: Record<string, unknown> = {}) {
      const headers: Record<string, string> = { authorization: options.system === 'service' ? 'Bearer fixture-service' : 'Bearer fixture-member' };
      if (options.system === 'secret') headers['x-index-drain-secret'] = 'fixture-secret';
      const response = await run(new Request('https://fixture.test/indexer', { method: 'POST', headers, body: JSON.stringify(body) }));
      return { status: response.status, body: await response.json() };
    },
  };
}

describe('search indexer shared queue permissions', () => {
  it('member backfill queues owned rows without querying or requeueing shared DHF videos', async () => {
    const f = fixture({ backfill: true, rows: [] });
    const result = await f.invoke({ backfill: true });
    expect(result.body.enqueued).toBe(1);
    expect(f.enqueues).toEqual([expect.objectContaining({ entity_type: 'profile', entity_id: 'member-a', owner_id: 'member-a' })]);
    expect(f.sharedReads).toEqual([]);
    expect(f.embed).not.toHaveBeenCalled();
  });
  it('body-supplied privileges cannot authorize shared backfill', async () => {
    const f = fixture({ backfill: true, rows: [] });
    await f.invoke({ backfill: true, canEnqueueShared: true, isAdmin: true, owner_id: null, userId: 'member-b' });
    expect(f.enqueues.map(row => row.owner_id)).toEqual(['member-a']);
    expect(f.sharedReads).toEqual([]);
  });
  it('admin role lookup failure refuses shared backfill', async () => {
    const f = fixture({ backfill: true, admin: true, roleError: true, rows: [] });
    await f.invoke({ backfill: true });
    expect(f.enqueues.map(row => row.entity_type)).toEqual(['profile']);
    expect(f.sharedReads).toEqual([]);
  });
  it('verified administrator backfill retains ownerless public DHF videos', async () => {
    const f = fixture({ backfill: true, admin: true, rows: [] });
    expect((await f.invoke({ backfill: true })).body.enqueued).toBe(2);
    expect(f.sharedReads).toEqual(['dhf_videos']);
    expect(f.enqueues).toContainEqual(expect.objectContaining({ entity_type: 'dhf_video', entity_id: 'shared-video', owner_id: null }));
    expect(f.embed).not.toHaveBeenCalled();
  });
  it.each(['service', 'secret'] as const)('scheduler %s retains draining without initiating member historical backfill', async system => {
    const f = fixture({ system, backfill: true, rows: [] });
    expect((await f.invoke({ backfill: true })).body.enqueued).toBe(0);
    expect(f.enqueues).toEqual([]);
    expect(f.auth).not.toHaveBeenCalled();
  });
  it('members process only their own job, not foreign or ownerless jobs', async () => {
    const f = fixture();
    const result = await f.invoke();
    expect(result.status).toBe(200);
    expect(result.body.completed).toBe(1);
    expect(f.claims).toEqual(['own']);
    expect(f.canonical).toEqual(['own']);
    expect(f.writes).toEqual(['own', 'own']);
    expect(f.rpc).toHaveBeenCalledWith('has_role', { _user_id: 'member-a', _role: 'admin' });
  });
  it('foreign-only queues cause zero member data writes or provider work', async () => {
    const f = fixture({ rows: [job('foreign', 'member-b'), job('shared', null)] });
    expect((await f.invoke()).body.processed).toBe(0);
    expect(f.writes).toEqual([]);
    expect(f.embed).not.toHaveBeenCalled();
    expect(f.media).not.toHaveBeenCalled();
    expect(f.canonical).toEqual([]);
  });
  it('request-body admin/owner/system claims cannot expand member scope', async () => {
    const f = fixture();
    await f.invoke({ isAdmin: true, isSystemDrain: true, userId: 'member-b', owner_id: 'member-b', limit: 25 });
    expect(f.claims).toEqual(['own']);
  });
  it('role lookup errors fail closed even when data says admin', async () => {
    const f = fixture({ admin: true, roleError: true });
    await f.invoke();
    expect(f.claims).toEqual(['own']);
  });
  it('ownership is checked again during atomic claim', async () => {
    const f = fixture({ race: true });
    expect((await f.invoke()).body.completed).toBe(0);
    expect(f.claims).toEqual([]);
    expect(f.writes).toEqual([]);
    expect(f.embed).not.toHaveBeenCalled();
  });
  it('verified admins retain shared queue processing', async () => {
    const f = fixture({ admin: true });
    expect((await f.invoke()).body.completed).toBe(3);
    expect(f.claims).toEqual(['foreign', 'shared', 'own']);
  });
  it.each(['service', 'secret'] as const)('scheduler %s credentials retain shared processing without member auth', async system => {
    const f = fixture({ system });
    expect((await f.invoke()).body.completed).toBe(3);
    expect(f.claims).toEqual(['foreign', 'shared', 'own']);
    expect(f.auth).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('expired/signed-out sessions keep idle behavior and never process', async () => {
    const f = fixture({ signedOut: true });
    const result = await f.invoke();
    expect(result.status).toBe(200);
    expect(result.body.reason).toBe('invalid_session');
    expect(f.writes).toEqual([]);
    expect(f.rpc).not.toHaveBeenCalled();
    expect(f.embed).not.toHaveBeenCalled();
  });
  it('existing stats requests remain read-only', async () => {
    const f = fixture();
    const result = await f.invoke({ stats: true });
    expect(result.status).toBe(200);
    expect(result.body.failures).toEqual([]);
    expect(f.writes).toEqual([]);
    expect(f.embed).not.toHaveBeenCalled();
  });
});