import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

afterEach(() => vi.unstubAllGlobals());
function setup(path: string, redirect = false) {
  const network = vi.fn<typeof fetch>(async input => {
    if (String(input).includes('/search?')) return new Response(JSON.stringify({ results: [{ url: path, relevance: 5 }] }));
    return redirect
      ? new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } })
      : new Response(new Uint8Array(1200), { headers: { 'content-type': 'image/jpeg' } });
  });
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('Deno', { env: { get: () => undefined } });
  return network;
}
describe('backup image destination authority', () => {
  it.each(['/\\attacker.example/a.jpg', '/%2e%2e/secret', '/%5cattacker.example/a', '/%2f%2fattacker.example/a', '/bad\npath', '/bad%00path', '/bad%3fpath', '/%invalid'])('rejects unsafe Kaleido path %j before image fetch', async path => {
    const network = setup(path);
    const result = await fetchImageCascade({ prompt: 'sunset', keywords: ['sunset'], only: ['kaleido'] });
    expect(result.provider).toBeNull();
    expect(network.mock.calls.every(([url]) => String(url).startsWith('https://kaleidoimages.ai/search?'))).toBe(true);
  });
  it.each(['kaleido', 'justapi', 'imagenow'] as const)('%s refuses image redirects even if caller requests follow', async provider => {
    const network = setup('/img/1.jpg', true);
    const result = await fetchImageCascade({ prompt: 'sunset', keywords: ['sunset'], only: [provider], redirect: 'follow' });
    expect(result.provider).toBeNull();
    const downloads = network.mock.calls.filter(([url]) => !String(url).includes('/search?'));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.[1]?.redirect).toBe('manual');
    expect(network.mock.calls.some(([url]) => String(url).includes('169.254.169.254'))).toBe(false);
  });
  it.each(['kaleido', 'justapi', 'imagenow'] as const)('%s preserves normal image bytes', async provider => {
    setup('/img/1.jpg');
    const result = await fetchImageCascade({ prompt: 'sunset', keywords: ['sunset'], only: [provider] });
    expect(result.provider).toBe(provider);
    expect(result.bytes?.byteLength).toBe(1200);
  });
  it('Infinity retains active cascade without a dormant returned-URL fetch path', () => {
    const source = readFileSync('supabase/functions/zoe-infinity-image-gen/index.ts', 'utf8');
    expect(source).not.toMatch(/fetchImageAsDataUrl|tryGemini|sovereignFetch/);
    expect(source).toContain('await tryPollinations(enhancedPrompt)');
  });
});