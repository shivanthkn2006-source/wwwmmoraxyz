/**
 * Controlled tests for provider API response budgets, Kaleido destination
 * validation and caller-signal forwarding in the shared image cascade.
 * All network is mocked; no provider is contacted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CASCADE_IMAGE_MAX_BYTES,
  downloadCascadeImage,
  readBytesBounded,
  readJsonBounded,
  readTextBounded,
} from '../../supabase/functions/_shared/cascade-image-download';
import { cascadeFetch, fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

function streamResponse(chunks: Uint8Array[], headers: Record<string, string> = {}, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>((controller) => {
    for (const chunk of chunks) controller.enqueue(chunk);
    controller.close();
  });
  return new Response(stream, { status, headers });
}

function stalledResponse(): Response {
  return new Response(new ReadableStream<Uint8Array>(() => {}), { status: 200 });
}

const realFetch = globalThis.fetch;

beforeEach(() => {
  // Edge modules read Deno.env; stub it so provider branches are reachable.
  (globalThis as any).Deno = { env: { get: (k: string) => (k.startsWith('CLOUDFLARE_') ? 'test' : undefined) } };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete (globalThis as any).Deno;
  vi.restoreAllMocks();
});

describe('bounded API body readers', () => {
  it('rejects an oversized declared content-length before reading', async () => {
    const res = streamResponse([new Uint8Array(8)], { 'content-length': String(2 * 1024 * 1024) });
    expect(await readTextBounded(res, 1024)).toBeNull();
  });
  it('rejects a streamed body that grows past the cap', async () => {
    const res = streamResponse([new Uint8Array(600), new Uint8Array(600)]);
    expect(await readBytesBounded(res, 1024)).toBeNull();
  });
  it('parses a valid JSON body within the cap', async () => {
    const res = streamResponse([new TextEncoder().encode('{"ok":true}')]);
    expect(await readJsonBounded<{ ok: boolean }>(res)).toEqual({ ok: true });
  });
  it('returns null on invalid JSON instead of throwing', async () => {
    const res = streamResponse([new TextEncoder().encode('not json')]);
    expect(await readJsonBounded(res)).toBeNull();
  });
  it('times out a stalled body instead of hanging', async () => {
    expect(await readTextBounded(stalledResponse(), 1024, 50)).toBeNull();
  });
});

describe('downloadCascadeImage outer signal', () => {
  it('returns aborted without fetching when the caller signal is already aborted', async () => {
    const fetcher = vi.fn();
    const out = await downloadCascadeImage('https://example.com/x.png', {}, 1, 'follow', fetcher as any, AbortSignal.abort());
    expect(out).toBe('aborted');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('cloudflare inline image budget', () => {
  it('refuses an inline base64 image larger than the image budget', async () => {
    const huge = 'A'.repeat(Math.ceil(CASCADE_IMAGE_MAX_BYTES / 3) * 4 + 4);
    globalThis.fetch = vi.fn(async () => streamResponse([new TextEncoder().encode(JSON.stringify({ result: { image: huge } }))])) as any;
    const out = await fetchImageCascade({ prompt: 'test', only: ['cloudflare'] });
    expect(out.provider).toBeNull();
    expect(out.log[0]?.reason).toBe('image too large');
  });
  it('refuses API redirects instead of following them', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/x' } })) as any;
    const out = await fetchImageCascade({ prompt: 'test', only: ['cloudflare'] });
    expect(out.provider).toBeNull();
    expect(out.log[0]?.reason).toBe('http 302');
  });
});

describe('kaleido destination validation', () => {
  const searchWith = (results: unknown) =>
    vi.fn(async (url: any) =>
      String(url).includes('/search')
        ? streamResponse([new TextEncoder().encode(JSON.stringify({ results }))])
        : streamResponse([new Uint8Array(2048)], { 'content-type': 'image/jpeg' }));

  it('rejects protocol-relative, absolute and traversal result paths', async () => {
    globalThis.fetch = searchWith([
      { url: '//evil.example/x.jpg', relevance: 5 },
      { url: 'https://evil.example/x.jpg', relevance: 5 },
      { url: '/../secret', relevance: 5 },
    ]) as any;
    const out = await fetchImageCascade({ prompt: 'warm sunset', keywords: ['sunset'], only: ['kaleido'] });
    expect(out.provider).toBeNull();
    expect(out.log[0]?.reason).toBe('no keyword match');
  });
  it('accepts a root-relative path on the configured origin', async () => {
    const mock = searchWith([{ url: '/img/1.jpg', relevance: 5 }]);
    globalThis.fetch = mock as any;
    const out = await fetchImageCascade({ prompt: 'warm sunset', keywords: ['sunset'], only: ['kaleido'] });
    expect(out.provider).toBe('kaleido');
    expect(mock).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/kaleidoimages\.ai\/img\/1\.jpg/), expect.anything());
  });
});

describe('cascadeFetch signal forwarding', () => {
  it('a pre-aborted caller signal stops the cascade instead of running providers', async () => {
    const fetcher = vi.fn();
    globalThis.fetch = fetcher as any;
    const res = await cascadeFetch('https://image.pollinations.ai/prompt/test?width=256&height=256', { signal: AbortSignal.abort() });
    expect(res.status).toBe(502);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('non-pollinations URLs pass through with the caller signal intact', async () => {
    const signal = AbortSignal.timeout(1000);
    const fetcher = vi.fn(async (_url: any, init: any) => {
      expect(init.signal).toBe(signal);
      return new Response('ok');
    });
    globalThis.fetch = fetcher as any;
    const res = await cascadeFetch('https://api.example.com/chat', { method: 'POST', signal });
    expect(res.status).toBe(200);
  });
});
