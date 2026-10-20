import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveClaims } from '../../supabase/functions/_shared/auth-claims';

/** Execute the real entrypoint with inert storage/providers, not a duplicate gate. */
function brain(auth: unknown) {
  const source = readFileSync('supabase/functions/zoe-infinity-brain/index.ts', 'utf8')
    .replace(/^import\s[\s\S]*?;\s*$/gm, '');
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const provider = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Verified reply' }] } }] }), { headers: { 'Content-Type': 'application/json' } }));
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    serve: (fn: typeof handler) => { handler = fn; },
    Request, Response, Headers, crypto, performance, console: { log() {}, warn() {}, error() {} },
    Deno: { env: { get: (key: string) => key === 'GOOGLE_AI_STUDIO_KEY' ? 'test-provider' : 'test-config' } },
    createClient: () => ({ auth }), resolveClaims, fetch: provider,
    safeChatMessages: (messages: unknown) => messages,
    omniRecall: async () => [], buildOmniRecallBlock: () => '', buildRecallSources: () => [],
    compressMemories: () => '', buildRelationshipSystemPrompt: () => '', parseRelationshipStyle: () => 'companion',
    CLARIFICATION_PROTOCOL: '', buildPlatformStateBlock: () => '', PLATFORM_STATE_VERSION: 'test',
    clientErrorResponse: () => null, sovereignFetch: provider,
  });
  if (!handler) throw new Error('Entrypoint did not register');
  return { handler, provider };
}

describe('paid inference verifies identity before work', () => {
  it.each([undefined, 'Bearer ', 'Bearer forged', 'Bearer expired'])('rejects %s without parsing the body or calling a provider', async (authorization) => {
    const lookup = vi.fn(async () => ({ data: { user: null }, error: { message: 'invalid session' } }));
    const { handler, provider } = brain({ getUser: lookup });
    const req = new Request('https://app.test/brain', { method: 'POST', headers: authorization ? { authorization } : {}, body: '{malformed' });
    const parse = vi.spyOn(req, 'json');
    expect((await handler(req)).status).toBe(401);
    expect(parse).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });
  it('rejects auth outages without paid work', async () => {
    const { handler, provider } = brain({ getUser: async () => { throw new Error('offline'); } });
    expect((await handler(new Request('https://app.test', { method: 'POST', headers: { authorization: 'Bearer unavailable' }, body: '{}' }))).status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
  });
  it('allows a verified member through to a provider reply', async () => {
    const { handler, provider } = brain({ getUser: async () => ({ data: { user: { id: 'member', role: 'authenticated' } }, error: null }) });
    const response = await handler(new Request('https://app.test', { method: 'POST', headers: { authorization: 'Bearer verified' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }], mode: 'lite', enableGrounding: false }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).response).toBe('Verified reply');
    expect(provider).toHaveBeenCalled();
  });
});