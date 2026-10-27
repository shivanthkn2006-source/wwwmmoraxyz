import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function schedulerGuard(isAdmin = false, storedName = '', storedToken = '') {
  const source = readFileSync('supabase/functions/_shared/caller-guard.ts', 'utf8')
    .replace(/^import .*;$/gm, '').replace(/export /g, '');
  const getUser = vi.fn(async () => ({ data: { user: { id: 'disposable-fixture' } }, error: null }));
  const lookup = vi.fn(async () => ({ data: storedName === selectedName ? { token: storedToken } : null }));
  let selectedName = '';
  const context = vm.createContext({
    Request, Response, Headers, corsHeaders: {},
    Deno: { env: { get: (key: string) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'fixture-service-key' : 'https://backend.invalid' } },
    createClient: () => ({
      auth: { getUser }, rpc: async () => ({ data: isAdmin }),
      from: () => ({ select: () => ({ eq: (_column: string, name: string) => {
        selectedName = name;
        return { maybeSingle: lookup };
      } }) }),
    }),
  });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  const guard = vm.runInContext('requireCronOrAdmin', context) as (req: Request, name: string) => Promise<Response | { kind: string }>;
  return { guard, lookup, getUser };
}

describe.each(['generate-humor-drops', 'execute-scheduled-macros'])('%s scheduler authority', (name) => {
  it('accepts the existing service-role scheduler path without a cron token', async () => {
    const { guard, lookup, getUser } = schedulerGuard();
    expect(await guard(new Request('https://fixture.invalid', { headers: { Authorization: 'Bearer fixture-service-key' } }), name)).toEqual({ kind: 'service' });
    expect(lookup).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
  it('accepts a token provisioned for the exact function name', async () => {
    const { guard } = schedulerGuard(false, name, 'fixture-cron-token');
    expect(await guard(new Request('https://fixture.invalid', { headers: { 'x-cron-token': 'fixture-cron-token' } }), name)).toEqual({ kind: 'service' });
  });
  it('rejects a token belonging to another scheduled function', async () => {
    const { guard } = schedulerGuard(false, 'another-function', 'fixture-cron-token');
    const result = await guard(new Request('https://fixture.invalid', { headers: { 'x-cron-token': 'fixture-cron-token' } }), name);
    expect(result instanceof Response && result.status).toBe(401);
  });
  it('rejects missing credentials', async () => {
    const { guard } = schedulerGuard();
    const result = await guard(new Request('https://fixture.invalid'), name);
    expect(result instanceof Response && result.status).toBe(401);
  });
  it('rejects an ordinary member', async () => {
    const { guard } = schedulerGuard();
    const result = await guard(new Request('https://fixture.invalid', { headers: { Authorization: 'Bearer fixture-member' } }), name);
    expect(result instanceof Response && result.status).toBe(403);
  });
  it('accepts a verified admin', async () => {
    const { guard } = schedulerGuard(true);
    const result = await guard(new Request('https://fixture.invalid', { headers: { Authorization: 'Bearer fixture-admin' } }), name);
    expect(result).toMatchObject({ kind: 'member', isAdmin: true });
  });
});