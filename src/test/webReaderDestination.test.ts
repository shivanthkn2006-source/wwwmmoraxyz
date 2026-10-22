import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { fetchReaderDestination, publicReaderAddress, readerTarget, UnsafeReaderDestination } from '../../supabase/functions/web-reader/destination';

const article = 'https://news.publisher.com/story?q=hello';
const publicDns = async (_host: string, type: 'A' | 'AAAA') => type === 'A' ? ['93.184.216.34'] : ['2606:4700:4700::1111'];

describe('web-reader destination preflight (no real network)', () => {
  it.each([
    '', 42, null, 'file:///etc/passwd', 'ftp://site.com/a', '//site.com/a',
    'http://localhost/a', 'https://localhost./a', 'https://service.internal/a',
    'https://service.local/a', 'https://intranet/a', 'https://service.lan/a',
    'https://127.0.0.1/a', 'http://2130706433/a', 'http://0x7f000001/a',
    'https://10.0.0.1/a', 'https://172.16.0.1/a', 'https://192.168.1.1/a',
    'http://169.254.169.254/latest/meta-data/', 'https://100.64.0.1/a',
    'https://0.0.0.0/a', 'https://224.0.0.1/a', 'https://240.0.0.1/a',
    'https://198.18.0.1/a', 'https://192.0.0.1/a', 'https://192.0.2.1/a',
    'https://198.51.100.1/a', 'https://203.0.113.1/a',
    'https://[::1]/a', 'https://[::]/a', 'https://[fc00::1]/a',
    'https://[fe90::1]/a', 'https://[::ffff:127.0.0.1]/a',
    'https://[64:ff9b::a00:1]/a', 'https://[2002:a00:1::]/a',
    'https://[2001:db8::1]/a', 'https://[3fff::1]/a',
    'https://user:pass@news.publisher.com/a', 'https://news.publisher.com:8443/a',
    'https://news.publisher.com/' + 'a'.repeat(8192),
  ])('rejects %s before DNS and fetch', async (raw) => {
    const dns = vi.fn(publicDns);
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchReaderDestination(raw, dns, fetcher)).rejects.toBeInstanceOf(UnsafeReaderDestination);
    expect(dns).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '172.31.1.1',
    '192.168.1.1', '0.0.0.0', '198.19.0.1', '224.0.0.1', '::1', 'fd00::1',
    'febf::1', '::ffff:a00:1', '2001:db8::1', 'not-an-ip'])('refuses a hostname resolving to %s', async (address) => {
    const fetcher = vi.fn<typeof fetch>();
    const dns = vi.fn(async (_host: string, type: string) => type === 'A' ? ['93.184.216.34'] : [address]);
    await expect(fetchReaderDestination(article, dns, fetcher)).rejects.toBeInstanceOf(UnsafeReaderDestination);
    expect(fetcher).not.toHaveBeenCalled();
    expect(dns).toHaveBeenCalledTimes(2);
  });

  it('checks every answer rather than accepting the first public address', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchReaderDestination(article, async () => ['93.184.216.34', '10.1.1.1'], fetcher)).rejects.toBeInstanceOf(UnsafeReaderDestination);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails closed on empty DNS answers', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchReaderDestination(article, async () => [], fetcher)).rejects.toBeInstanceOf(UnsafeReaderDestination);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not treat a resolver error as a safe empty address family', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchReaderDestination(article, async (_host, type) => {
      if (type === 'AAAA') throw new Error('DNS unavailable');
      return ['93.184.216.34'];
    }, fetcher)).rejects.toThrow('DNS unavailable');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([301, 302, 303, 307, 308])('never follows redirect %s to private, public or relative targets', async (status) => {
    for (const location of ['http://169.254.169.254/latest/meta-data/', 'https://other.publisher.com/a', '/next']) {
      const cancel = vi.fn();
      const response = new Response(new ReadableStream({ cancel }), { status, headers: { Location: location } });
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      const dns = vi.fn(publicDns);
      const result = await fetchReaderDestination(article, dns, fetcher);
      expect(result.response.status).toBe(status);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith(article, expect.objectContaining({ redirect: 'manual' }));
      expect(dns).toHaveBeenCalledTimes(2);
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });
  it.each([article, 'http://news.publisher.com/story', 'https://93.184.216.34/story', 'https://[2606:4700:4700::1111]/a'])('keeps ordinary HTTP(S) destination %s', async (raw) => {
    const response = new Response('unchanged article bytes', { headers: { 'Content-Type': 'text/plain' } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const result = await fetchReaderDestination(raw, publicDns, fetcher, { Accept: 'text/html' });
    expect(result.target.href).toBe(readerTarget(raw).href);
    expect(await result.response.text()).toBe('unchanged article bytes');
    expect(fetcher).toHaveBeenCalledWith(result.target.href, expect.objectContaining({ redirect: 'manual', headers: { Accept: 'text/html' } }));
  });
  it('accepts public IPv4/IPv6, rejects malformed addresses', () => {
    expect(publicReaderAddress('8.8.8.8')).toBe(true);
    expect(publicReaderAddress('2606:4700::1111')).toBe(true);
    expect(publicReaderAddress('999.1.1.1')).toBe(false);
    expect(publicReaderAddress('bad')).toBe(false);
  });
});

/** Actual reader handler; auth, guard, DNS and all HTTP responses are fakes. */
function handlerFixture(options: { signedOut?: boolean; address?: string; redirect?: boolean } = {}) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => options.redirect
    ? new Response('redirect', { status: 302, headers: { Location: 'http://127.0.0.1/' } })
    : new Response('<title>Fixture article</title><p>This is a fixture paragraph long enough to be returned by the unchanged reader.</p>', { headers: { 'Content-Type': 'text/html' } }));
  const source = readFileSync('supabase/functions/web-reader/index.ts', 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, errors: { NotFound: class extends Error {} },
      resolveDns: async (_host: string, type: string) => type === 'A' ? [options.address ?? '93.184.216.34'] : [] },
    requireCaller: async () => options.signedOut ? new Response('{}', { status: 401 }) : { kind: 'member' },
    publicGuard: async (req: Request) => ({ body: await req.json() }),
    fetchReaderDestination, UnsafeReaderDestination, fetch: fetcher, Response, URL,
    corsHeaders: { 'Access-Control-Allow-Origin': '*' }, console: { error: vi.fn() },
  });
  if (!handler) throw new Error('Handler not registered');
  const run = handler;
  return { fetcher, invoke: (url: unknown) => run(new Request('https://fixture.test/reader', { method: 'POST', body: JSON.stringify({ url }) })) };
}

describe('web-reader actual handler boundary', () => {
  it('preserves signed-out refusal before any fetch', async () => {
    const f = handlerFixture({ signedOut: true });
    expect((await f.invoke(article)).status).toBe(401);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('returns 400 for blocked URL before fetching', async () => {
    const f = handlerFixture();
    const response = await f.invoke('http://169.254.169.254/');
    expect(response.status).toBe(400);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('returns 400 for a private DNS answer before fetching', async () => {
    const f = handlerFixture({ address: '10.0.0.1' });
    expect((await f.invoke(article)).status).toBe(400);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('keeps existing redirect failure payload, without following it', async () => {
    const f = handlerFixture({ redirect: true });
    expect(await (await f.invoke(article)).json()).toMatchObject({ ok: false, status: 302, paragraphs: [] });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps successful readable title and paragraph output', async () => {
    const f = handlerFixture();
    const response = await f.invoke(article);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, title: 'Fixture article', paragraphs: ['This is a fixture paragraph long enough to be returned by the unchanged reader.'] });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
});