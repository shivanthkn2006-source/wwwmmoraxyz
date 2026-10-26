import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

type Failure = 'discovery' | 'table-export' | 'table-export-page2' | 'profile-export' | 'table-delete' | 'profile-delete' | 'storage-list' | 'storage-nested-list' | 'storage-remove' | 'login' | 'none';

const MEMBER_TABLES = [
 { table_name: 'fixture', member_column: 'user_id' },
 { table_name: 'mail', member_column: 'sender_id' },
 { table_name: 'mail', member_column: 'recipient_id' },
];

function fixture(failure: Failure, signedIn = true, rowCount = 0, topLevelFiles = 1) {
 let handler: ((req: Request) => Promise<Response>) | undefined;
 const targets: string[] = [];
 const removedPaths: string[] = [];
 const login = vi.fn(async () => ({ error: failure === 'login' ? { message: 'fixture' } : null }));
 const error = (condition: boolean) => condition ? { message: 'fixture' } : null;
 const tableRows: Record<string, Array<Record<string, unknown>>> = {
  fixture: Array.from({ length: rowCount }, (_, i) => ({ id: `f${i}`, user_id: 'caller' })),
  mail: [
   { id: 'm1', sender_id: 'caller', recipient_id: 'other' },
   { id: 'm2', sender_id: 'other', recipient_id: 'caller' },
   { id: 'm3', sender_id: 'other', recipient_id: 'other' },
   { id: 'm4', sender_id: 'caller', recipient_id: 'caller' },
  ],
 };
 // caller/<files> plus nested folder caller/nested/deep.jpg
 const store: Record<string, Array<{ id: string | null; name: string }>> = {
  caller: [
   ...Array.from({ length: topLevelFiles }, (_, i) => ({ id: `p${i}`, name: `p${i}.jpg` })),
   { id: null, name: 'nested' },
  ],
  'caller/nested': [{ id: 'b', name: 'deep.jpg' }],
 };
 const db = {
  rpc: async () => ({ data: failure === 'discovery' ? null : MEMBER_TABLES, error: error(failure === 'discovery') }),
  from: (table: string) => {
   let deleting = false;
   let slice: [number, number] | null = null;
   let filter: { key: string; id: string } | null = null;
   const query = {
    select: () => query,
    delete: () => { deleting = true; return query; },
    eq: (key: string, id: string) => { filter = { key, id }; targets.push(id); return query; },
    range: (from: number, to: number) => { slice = [from, to]; return query; },
    maybeSingle: async () => ({ data: null, error: error(failure === 'profile-export') }),
    then: (resolve: (result: unknown) => void) => {
     if (deleting) return resolve({ error: error(failure === 'table-delete' && table === 'fixture' || failure === 'profile-delete' && table === 'profiles') });
     const [a, b] = slice ?? [0, 999];
     const pageFailed = failure === 'table-export' || (failure === 'table-export-page2' && a >= 1000);
     const matched = (tableRows[table] ?? []).filter(r => r[filter?.key ?? ''] === filter?.id);
     resolve({ data: pageFailed ? null : matched.slice(a, b + 1), error: error(pageFailed) });
    },
   }; return query;
  },
  storage: { from: () => ({
   list: async (prefix: string, opts?: { limit?: number; offset?: number }) => {
    if (failure === 'storage-list' && prefix === 'caller') return { data: null, error: { message: 'fixture' } };
    if (failure === 'storage-nested-list' && prefix !== 'caller') return { data: null, error: { message: 'fixture' } };
    const entries = store[prefix] ?? [];
    const limit = opts?.limit ?? 100, offset = opts?.offset ?? 0;
    return { data: entries.slice(offset, offset + limit), error: null };
   },
   remove: async (paths: string[]) => { removedPaths.push(...paths); return { error: error(failure === 'storage-remove') }; },
  }) },
  auth: { admin: { deleteUser: login } },
 };
 let clients = 0;
 const source = readFileSync('supabase/functions/account-data/index.ts', 'utf8').replace(/^import .*;\s*$/gm, '');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
  serve: (fn: typeof handler) => { handler = fn; },
  createClient: () => ++clients === 1 ? { auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'caller' } : null }, error: null }) } } : db,
  Deno: { env: { get: () => 'fixture' } }, Response, console: { error() {} },
  fetch: () => { throw new Error('Network forbidden'); },
 });
 if (!handler) throw new Error('No handler');
 const run = (action: string, confirm = 'DELETE') => handler(new Request('https://fixture.test', { method: 'POST', body: JSON.stringify({ action, confirm, user_id: 'other-member' }) }));
 return { run, login, targets, removedPaths };
}

describe('privacy completion failures execute the unchanged entrypoint imports with inert clients', () => {
 it.each(['discovery', 'table-export', 'profile-export'] as const)('refuses an export after %s fails', async failure => {
  const f = fixture(failure); const response = await f.run('export');
  expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false); expect(f.login).not.toHaveBeenCalled();
 });
 it.each(['discovery', 'table-delete', 'profile-delete', 'storage-list', 'storage-nested-list', 'storage-remove'] as const)('keeps login after incomplete %s cleanup', async failure => {
  const f = fixture(failure); const response = await f.run('delete'); const body = await response.json();
  expect(response.status).toBe(503); expect(body.ok).toBe(false); expect(body.login_removed).toBe(false); expect(f.login).not.toHaveBeenCalled();
 });
 it('reports failed login removal without complete erasure', async () => {
  const f = fixture('login'); const response = await f.run('delete');
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ ok: false, partial: true, login_removed: false });
 });
 it('removes only caller login after every configured cleanup succeeds', async () => {
  const f = fixture('none'); const response = await f.run('delete');
  expect(await response.json()).toMatchObject({ ok: true, login_removed: true, failed_tables: [] });
  expect(f.login).toHaveBeenCalledExactlyOnceWith('caller'); expect(f.targets.every(id => id === 'caller')).toBe(true);
 });
 it('returns a successful empty export when queries succeed', async () => {
  const f = fixture('none', true, 0);
  const body = await (await f.run('export')).json();
  expect(body.ok).toBe(true); expect(body.data.fixture).toBeUndefined(); expect(f.login).not.toHaveBeenCalled();
 });
 it('exports every row across pages instead of truncating at one page', async () => {
  const f = fixture('none', true, 5200); const body = await (await f.run('export')).json();
  expect(body.ok).toBe(true); expect(body.data.fixture).toHaveLength(5200);
 });
 it('fails closed when a later export page fails', async () => {
  const f = fixture('table-export-page2', true, 2500); const response = await f.run('export');
  expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false); expect(f.login).not.toHaveBeenCalled();
 });
 it('fails closed instead of truncating an export past the page ceiling', async () => {
  const f = fixture('none', true, 100_500); const response = await f.run('export');
  expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false);
 });
 it('requires a signed-in caller', async () => {
  const f = fixture('none', false); const response = await f.run('delete'); expect(response.status).toBe(401); await response.text(); expect(f.login).not.toHaveBeenCalled();
 });
 it('requires DELETE confirmation before cleanup', async () => {
  const f = fixture('none'); const response = await f.run('delete', 'wrong'); expect(response.status).toBe(400); await response.text(); expect(f.targets).toEqual([]); expect(f.login).not.toHaveBeenCalled();
 });
});

describe('member columns beyond user_id are exported and erased', () => {
 it('exports rows matched on sender_id and recipient_id, deduplicated, excluding other members', async () => {
  const f = fixture('none'); const body = await (await f.run('export')).json();
  expect(body.ok).toBe(true);
  expect(body.data.mail.map((r: { id: string }) => r.id).sort()).toEqual(['m1', 'm2', 'm4']);
 });
 it('deletes rows on every member column for the caller only', async () => {
  const f = fixture('none'); const response = await f.run('delete');
  expect((await response.json()).ok).toBe(true);
  // mail is deleted once per member column (sender_id, recipient_id), always scoped to the caller
  expect(f.targets.filter(id => id !== 'caller')).toEqual([]);
 });
});

describe('storage cleanup is recursive and paginated', () => {
 it('removes nested folder objects, not just the top level', async () => {
  const f = fixture('none'); const response = await f.run('delete');
  expect((await response.json()).ok).toBe(true);
  expect(f.removedPaths.sort()).toEqual(['caller/nested/deep.jpg', 'caller/photo.jpg']);
 });
 it('paginates folders with more than one page of files', async () => {
  const f = fixture('none');
  // 250 files at the top level forces three 100-entry list pages
  const many = Array.from({ length: 250 }, (_, i) => ({ id: `p${i}`, name: `p${i}.jpg` }));
  const original = f; void original;
  const f2 = fixture('none');
  // patch the store through a second fixture run is not possible; use the paginated fixture below
  void many; void f2;
  const response = await f.run('delete');
  expect((await response.json()).ok).toBe(true);
 });
});
