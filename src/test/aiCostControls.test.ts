import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { readFallbackPricePolicy } from '../../supabase/functions/_shared/fallback-price-policy';

function load(file: string, globals: Record<string, unknown> = {}) {
  const source = readFileSync(`supabase/functions/_shared/${file}.ts`, 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '').replace(/\bexport /g, '');
  const context = vm.createContext({ Request, Response, Headers, Date, console: { log() {}, warn() {} }, ...globals });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  return context;
}

function waf(result: unknown, configured = true) {
  const rpc = vi.fn(async () => { if (result instanceof Error) throw result; return result; });
  const context = load('waf', { Deno: { env: { get: () => configured ? 'mock' : undefined } }, createClient: () => ({ rpc }) });
  return { context, rpc };
}

describe('counter-store failures never authorize work', () => {
  it.each([{ data: null, error: {} }, { data: null }, { data: NaN }, { data: Infinity }, { data: -1 }, { data: 0 }, { data: 1.5 }, { data: '1' }, new Error('offline')])('denies unproven counter %j', async result => {
    const { context } = waf(result);
    expect(await context.consumeRateLimit('mock', 5, 60)).toEqual({ allowed: false, remaining: 0, unavailable: true });
  });
  it('denies missing configuration without an RPC', async () => {
    const { context, rpc } = waf(null, false);
    expect((await context.consumeRateLimit('mock', 5, 60)).allowed).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('allows the fifth request and denies the sixth at an unchanged limit', async () => {
    expect(await waf({ data: 5 }).context.consumeRateLimit('mock', 5, 60)).toEqual({ allowed: true, remaining: 0 });
    expect(await waf({ data: 6 }).context.consumeRateLimit('mock', 5, 60)).toEqual({ allowed: false, remaining: 0 });
  });
  it('POST and GET return 503 during outages and never reach downstream work', async () => {
    const { context } = waf({ error: {} });
    const globals = Object.fromEntries(['guardRequest', 'wafClientIp', 'readCloudflareSignals', 'evaluateCloudflareRules', 'consumeRateLimit', 'wafCorsHeaders'].map(key => [key, context[key]]));
    const pub = load('public-guard', { ...globals, isSentinelBlockedIp: async () => false, recordWafThreat: async () => {} });
    context.isSentinelBlockedIp = async () => false;
    const work = vi.fn();
    for (const method of ['POST', 'GET']) {
      const verdict = await pub.publicGuard(new Request('https://mock.test', { method, headers: { 'user-agent': 'Browser' }, ...(method === 'POST' ? { body: '{}' } : {}) }), { name: 'mock', limit: 5, windowSeconds: 60 });
      if (!verdict.response) work();
      expect(verdict.response.status).toBe(503);
    }
    expect(work).not.toHaveBeenCalled();
  });
});

describe('OpenRouter auto requires operator price ceilings', () => {
  const approved = { OPENROUTER_MAX_PROMPT_USD_PER_MILLION: '0.17', OPENROUTER_MAX_COMPLETION_USD_PER_MILLION: '0.29', OPENROUTER_MAX_REQUEST_USD: '0' };
  const policy = (values: Record<string, string>) => readFallbackPricePolicy(key => values[key]);
  it.each(['', 'NaN', 'Infinity', '-1'])('rejects invalid configured ceiling %s', value => {
    expect(policy({ ...approved, OPENROUTER_MAX_PROMPT_USD_PER_MILLION: value })).toBeNull();
  });
  it('rejects absent policy, preserves exact test-fixture prices including zero', () => {
    expect(policy({})).toBeNull();
    expect(policy(approved)).toEqual({ max_price: { prompt: 0.17, completion: 0.29, request: 0 } });
  });
  it('skips missing policy without a provider request', async () => {
    const fetch = vi.fn();
    const ctx = load('cascading-provider', { readFallbackPricePolicy, Deno: { env: { get: (key: string) => key === 'OPENROUTER_API_KEY' ? 'mock' : undefined } }, fetch });
    expect((await ctx.callOpenRouter([], {})).reasonCode).toBe('price_policy_unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends configured ceilings in the real fallback request', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'mock reply' } }] })));
    const ctx = load('cascading-provider', { readFallbackPricePolicy, setTimeout: () => 0, Deno: { env: { get: (key: string) => key === 'OPENROUTER_API_KEY' ? 'mock' : approved[key as keyof typeof approved] } }, fetch });
    expect((await ctx.callOpenRouter([], {})).content).toBe('mock reply');
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string).provider).toEqual({ max_price: { prompt: 0.17, completion: 0.29, request: 0 } });
  });
});