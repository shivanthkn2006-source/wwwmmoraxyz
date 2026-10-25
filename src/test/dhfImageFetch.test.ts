import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { dhfImageUrl, fetchDhfImage, UnsafeDhfImageUrl } from '../../supabase/functions/_shared/dhf-image-fetch';
import { buildDhfImageBrief } from '../../supabase/functions/_shared/dhf-compass-image';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';
import { downloadCascadeImage } from '../../supabase/functions/_shared/cascade-image-download';

const supported = 'https://image.pollinations.ai/prompt/garden?width=1200&height=800&seed=5';

/** Execute the actual storage function with fake downloads and fake storage. */
function storageFixture(download: typeof fetchDhfImage) {
  const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
  const cascade = vi.fn().mockResolvedValue(new Response(new Uint8Array(1200), { headers: { 'content-type': 'image/png' } }));
  const source = readFileSync('supabase/functions/_shared/dhf-compass-runner.ts', 'utf8');
  const start = source.indexOf('export async function storeImage(');
  const end = source.indexOf('export interface RunOptions', start);
  if (start < 0 || end < 0) throw new Error('Storage function missing');
  const context = { dhfImageUrl, fetchDhfImage: download, UnsafeDhfImageUrl, cascadeFetch: cascade, downloadCascadeImage,
    fetch: network, SUPABASE_URL: 'https://storage.fixture.test', SERVICE_KEY: 'fixture', COMPASS_BUCKET: 'dhf-compass',
    Uint8Array, Response, AbortSignal };
  const compiled = ts.transpileModule(source.slice(start, end).replace('export async', 'async'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const store = vm.runInNewContext(`${compiled}\nstoreImage;`, context) as
    (user: string, date: string, slot: string, url: string) => Promise<string | null>;
  return { store, network, cascade };
}

describe('DHF storage destination boundary', () => {
  it.each([
    'http://127.0.0.1/image', 'https://10.0.0.1/image', 'https://172.16.0.1/image',
    'https://192.168.1.1/image', 'http://169.254.169.254/latest/meta-data/',
    'https://localhost/image', 'https://service.internal/image', 'https://[::1]/image',
    'https://[fd00::1]/image', 'https://[::ffff:127.0.0.1]/image',
    'http://2130706433/image', 'http://0x7f000001/image', 'https://attacker.example/image',
    'https://image.pollinations.ai.attacker.example/prompt/image',
    'https://image.pollinations.ai@attacker.example/prompt/image',
    'https://user:pass@image.pollinations.ai/prompt/image',
    'https://image.pollinations.ai:8443/prompt/image', 'http://image.pollinations.ai/prompt/image',
    'https://image.pollinations.ai/other', 'file:///etc/passwd', '//image.pollinations.ai/prompt/image', '',
  ])('rejects %s before download, cascade or storage', async url => {
    const direct = vi.fn<typeof fetchDhfImage>();
    const f = storageFixture(direct);
    expect(await f.store('fixture-user', '2026-10-22', '06:00', url)).toBeNull();
    expect(direct).not.toHaveBeenCalled();
    expect(f.cascade).not.toHaveBeenCalled();
    expect(f.network).not.toHaveBeenCalled();
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchDhfImage(url, fetcher)).rejects.toBeInstanceOf(UnsafeDhfImageUrl);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('accepts the actual DHF generator URL and preserves response bytes', async () => {
    const url = buildDhfImageBrief({ category: 'Daily Compass', headline: 'Quiet garden', shortSummary: 'Peace',
      fullStory: 'A person tends flowers in the garden.', astrologicalContext: 'moon', seed: 5 }).url;
    expect(dhfImageUrl(url)).toBe(url);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }));
    const response = await fetchDhfImage(url, fetcher);
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(fetcher).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: 'manual', signal: expect.any(AbortSignal) }));
  });
  it.each([301, 302, 303, 307, 308])('rejects redirect %s without fallback jobs or writes', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
      status, headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }));
    const f = storageFixture(url => fetchDhfImage(url, fetcher));
    expect(await f.store('fixture-user', '2026-10-22', '06:00', supported)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(f.cascade).not.toHaveBeenCalled();
    expect(f.network).not.toHaveBeenCalled();
  });
  it('retains ordered cascade fallback on ordinary provider failure with strict redirects', async () => {
    const f = storageFixture(vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    expect(await f.store('fixture-user', '2026-10-22', '06:00', supported)).toBe('fixture-user/2026-10-22/06-00.jpg');
    expect(f.cascade).toHaveBeenCalledWith(supported, { redirect: 'error' });
    expect(f.network).toHaveBeenCalledTimes(1);
    expect(f.network.mock.calls[0]?.[0]).toBe('https://storage.fixture.test/storage/v1/object/dhf-compass/fixture-user/2026-10-22/06-00.jpg');
  });
  it('preserves direct storage bytes and does not invoke fallback on success', async () => {
    const f = storageFixture(vi.fn().mockResolvedValue(new Response(new Uint8Array(1200), { headers: { 'content-type': 'image/png' } })));
    expect(await f.store('fixture-user', '2026-10-22', '06:00', supported)).toBe('fixture-user/2026-10-22/06-00.jpg');
    expect(f.cascade).not.toHaveBeenCalled();
    expect(f.network.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST', body: expect.any(Uint8Array) }));
  });
  it.each([undefined, 'error'] as const)('cascade image downloads preserve opt-in redirect setting %s', async redirect => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array(1200), { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', network);
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    try {
      const result = await fetchImageCascade({ prompt: 'garden', only: ['pollinations'], redirect });
      expect(result.provider).toBe('pollinations');
      expect(network).toHaveBeenCalledTimes(1);
      expect(network.mock.calls[0]?.[1]?.redirect).toBe(redirect ?? 'follow');
    } finally { vi.unstubAllGlobals(); }
  });
});