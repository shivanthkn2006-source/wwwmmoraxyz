import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

type Failure = 'discovery' | 'table-export' | 'table-export-page2' | 'profile-export' | 'table-delete' | 'profile-delete' | 'storage-list' | 'storage-remove' | 'login' | 'full-page' | 'directory' | 'none';
function fixture(failure: Failure, signedIn = true, rowCount = 0) {
 let handler: ((req: Request) => Promise<Response>) | undefined;
 const targets: string[] = [];
 const login = vi.fn(async () => ({ error: failure === 'login' ? { message: 'fixture' } : null }));
 const error = (condition: boolean) => condition ? { message: 'fixture' } : null;
 const allRows = Array.from({ length: rowCount }, (_, i) => ({ id: i, user_id: 'caller' }));
 const db = {
  rpc: async () => ({ data: failure === 'discovery' ? null : [{ table_name: 'fixture' }], error: error(failure === 'discovery') }),
  from: (table: string) => {
   let deleting = false;
   let slice: [number, number] | null = null;
   const query = {
    select: () => query,
    delete: () => { deleting = true; return query; },
    eq: (_key: string, id: string) => { targets.push(id); return query; },
    range: (from: number, to: number) => { slice = [from, to]; return query; },
    limit: async () => ({ data: [], error: error(failure === 'table-export') }),
    maybeSingle: async () => ({ data: null, error: error(failure === 'profile-export') }),
    then: (resolve: (result: unknown) => void) => {
     if (deleting) return resolve({ error: error(failure === 'table-delete' && table === 'fixture' || failure === 'profile-delete' && table === 'profiles') });
     const [a, b] = slice ?? [0, 999];
     const pageFailed = failure === 'table-export' || (failure === 'table-export-page2' && a >= 1000);
     resolve({ data: pageFailed ? null : allRows.slice(a, b + 1), error: error(pageFailed) });
    },
   }; return query;
  },
  storage: { from: () => ({
   list: async () => ({ data: failure === 'full-page' ? Array.from({ length: 1000 }, (_, i) => ({ id: String(i), name: String(i) })) : failure === 'directory' ? [{ id: null, name: 'nested' }] : [{ id: 'file', name: 'photo.jpg' }], error: error(failure === 'storage-list') }),
   remove: async () => ({ error: error(failure === 'storage-remove') }),
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
 return { run, login, targets };
}

describe('privacy completion failures execute the unchanged entrypoint imports with inert clients', () => {
 it.each(['discovery', 'table-export', 'profile-export'] as const)('refuses an export after %s fails', async failure => {
  const f = fixture(failure); const response = await f.run('export');
  expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false); expect(f.login).not.toHaveBeenCalled();
 });
 it.each(['discovery', 'table-delete', 'profile-delete', 'storage-list', 'storage-remove', 'full-page', 'directory'] as const)('keeps login after incomplete %s cleanup', async failure => {
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
  const f = fixture('none'); expect((await (await f.run('export')).json()).ok).toBe(true); expect(f.login).not.toHaveBeenCalled();
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
