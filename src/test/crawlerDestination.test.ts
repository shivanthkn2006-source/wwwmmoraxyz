import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { crawlerOrigin, crawlerTarget, DEFAULT_CRAWLER_ORIGIN, probeRoute } from '../../supabase/functions/zoe-synthetic-crawler/destination';

const origin = 'https://www.mmora.xyz';
afterEach(() => vi.useRealTimers());

describe('crawler configured-origin authority (no real network)', () => {
  it('preserves the existing published fallback and same-origin override', () => {
    expect(crawlerOrigin(undefined, undefined)).toBe(DEFAULT_CRAWLER_ORIGIN);
    expect(crawlerOrigin(origin + '/', origin)).toBe(origin);
    expect(crawlerOrigin(origin, origin + '/')).toBe(origin);
  });
  it.each([null, '', 42, 'https://attacker.example', 'https://www.mmora.xyz.attacker.example',
    'https://127.0.0.1', 'https://169.254.169.254', 'https://[::1]',
    'https://user:pass@www.mmora.xyz', origin + ':8443', origin + '/path', origin + '?q=x',
    origin + '#fragment', 'http://www.mmora.xyz', '//www.mmora.xyz', origin + '\\@evil.example'])('rejects caller origin %s', raw => {
    expect(() => crawlerOrigin(origin, raw)).toThrow();
  });
  it.each(['https://localhost', 'https://service.internal', 'https://127.0.0.1', 'https://[::1]',
    origin + '/path', origin + '?x=y', ' https://www.mmora.xyz', 'https://www.mmora.xyz.', 'http://www.mmora.xyz'])('fails closed on invalid configured origin %s', raw => {
    expect(() => crawlerOrigin(raw, undefined)).toThrow();
  });
  it.each(['/', '/home', '/auth', '/profile?tab=privacy', '/music#queue'])('retains permitted route %s', path => {
    expect(crawlerTarget(origin, path).href).toBe(origin + path);
  });
  it.each(['//169.254.169.254/latest/meta-data/', '//attacker.example/', '/\\attacker.example/',
    'https://attacker.example/', 'relative', '/\n/evil.example', '/%5cattacker.example', '/%0d%0aHost:evil'])('blocks route %s before fetch', async path => {
    const network = vi.fn<typeof fetch>();
    expect(await probeRoute(origin, path, network)).toMatchObject({ finding_type: 'dead_link', http_status: null });
    expect(network).not.toHaveBeenCalled();
  });
  for (const location of ['http://169.254.169.254/latest/meta-data/', 'https://other.example/a', '/home']) {
    it.each([301, 302, 303, 307, 308])(`refuses redirect %s to ${location}`, async status => {
      const cancel = vi.fn();
      const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel }), { status, headers: { Location: location } }));
      expect(await probeRoute(origin, '/auth', network)).toMatchObject({ finding_type: 'dead_link', http_status: status });
      expect(network).toHaveBeenCalledTimes(1);
      expect(network).toHaveBeenCalledWith(origin + '/auth', { redirect: 'manual', signal: expect.any(AbortSignal) });
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  }
  it('disposes successful bodies without reading them', async () => {
    const cancel = vi.fn();
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel })));
    expect(await probeRoute(origin, '/home', network)).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('preserves HTTP failures and slow-route findings', async () => {
    expect(await probeRoute(origin, '/missing', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 })))).toMatchObject({ http_status: 404, finding_type: 'dead_link' });
    vi.useFakeTimers();
    const network = vi.fn<typeof fetch>().mockImplementation(async () => { vi.setSystemTime(Date.now() + 2501); return new Response(null); });
    expect(await probeRoute(origin, '/home', network)).toMatchObject({ finding_type: 'slow_route' });
  });
  it('aborts a stalled request at the existing 12 second deadline', async () => {
    vi.useFakeTimers();
    const network = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = probeRoute(origin, '/home', network);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await result).toMatchObject({ finding_type: 'dead_link', http_status: null });
  });
});

function fixture(mode: 'admin' | 'member' | 'signed-out' | 'cron' = 'admin', configured = origin) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(null));
  const writes = vi.fn();
  const service = { from: (table: string) => {
    if (table === 'platform_routes') return { select: () => ({ eq: () => ({ order: async () => ({ data: [{ path: '/home' }], error: null }) }) }) };
    if (table === 'zoe_crawl_runs') return {
      insert: (value: unknown) => { writes(value); return { select: () => ({ single: async () => ({ data: { id: 'fixture-run' }, error: null }) }) }; },
      update: (value: unknown) => { writes(value); return { eq: async () => ({ error: null }) }; },
    };
    return { select: async () => ({ count: 1, error: null }) };
  } };
  const caller = { auth: { getUser: async () => ({ data: { user: mode === 'signed-out' ? null : { id: 'fixture-member' } } }) }, rpc: async () => ({ data: mode === 'admin' }) };
  const source = readFileSync('supabase/functions/zoe-synthetic-crawler/index.ts', 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: (key: string) => key === 'SITE_URL' ? configured : key === 'CRAWLER_SECRET' ? 'fixture-secret' : 'fixture-value' } },
    createClient: (_url: string, _key: string, options?: unknown) => options ? caller : service,
    publicGuard: async (req: Request) => ({ body: await req.json() }), crawlerOrigin,
    probeRoute: (site: string, path: string) => probeRoute(site, path, network), Response, console: { error: vi.fn() },
  });
  if (!handler) throw new Error('Crawler handler not registered');
  const run = handler;
  return { network, writes, invoke: (body: unknown) => run(new Request('https://fixture.example/crawler', { method: 'POST', headers: mode === 'cron' ? { 'x-crawler-secret': 'fixture-secret' } : { Authorization: 'Bearer fixture-token' }, body: JSON.stringify(body) })) };
}

describe('actual crawler handler with fake identities and in-memory rows', () => {
  it.each(['admin', 'cron'] as const)('preserves %s caller envelope and summary', async mode => {
    const f = fixture(mode);
    const response = await f.invoke({ trigger: mode === 'admin' ? 'manual' : 'cron' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, routesChecked: 1, summary: { origin, dead_links: 0 } });
    expect(f.network).toHaveBeenCalledTimes(1);
  });
  it.each(['member', 'signed-out'] as const)('denies %s before probes or writes', async mode => {
    const f = fixture(mode);
    expect((await f.invoke({})).status).toBe(mode === 'member' ? 403 : 401);
    expect(f.network).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
  it('denies arbitrary override before probes or writes', async () => {
    const f = fixture();
    expect((await f.invoke({ origin: 'https://169.254.169.254' })).status).toBe(400);
    expect(f.network).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
  it('invalid server configuration fails before probes or writes', async () => {
    const f = fixture('admin', origin + '/path');
    expect((await f.invoke({})).status).toBe(500);
    expect(f.network).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
});