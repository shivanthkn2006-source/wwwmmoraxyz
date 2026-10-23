import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

const api = 'https://gateway.pixazo.ai/flux-1-schnell/v1/getData';
const fixtureImage = 'https://provider-output.example/fixture.jpg';
const bytes = new Uint8Array(1200);
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());
function fixture(apiResponse: () => Response) {
  const network = vi.fn<typeof fetch>().mockImplementation(async input => {
    if (String(input) === api) return apiResponse();
    if (String(input) === fixtureImage) return new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
    if (String(input).startsWith('https://photos.justapi.dev/')) return new Response(bytes, { headers: { 'content-type': 'image/webp' } });
    throw new Error('Unexpected destination');
  });
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'PIXAZO_API_KEY' ? 'fixture-key' : undefined } });
  return network;
}

describe('Pixazo API redirect boundary (not an image destination policy)', () => {
  for (const location of ['http://169.254.169.254/latest/meta-data/', 'https://attacker.example/api', '/other']) {
    it.each([301, 302, 303, 307, 308])(`refuses API redirect %s to ${location} without download or forwarding credentials`, async status => {
      const cancel = vi.fn();
      const network = fixture(() => new Response(new ReadableStream({ cancel }), { status, headers: { Location: location } }));
      const result = await fetchImageCascade({ prompt: 'garden', only: ['pixazo', 'justapi'], redirect: 'follow' });
      expect(result.provider).toBe('justapi');
      expect(result.log.map(a => [a.provider, a.ok])).toEqual([['pixazo', false], ['justapi', true]]);
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(network).toHaveBeenCalledTimes(2);
      expect(network.mock.calls[0]?.[0]).toBe(api);
      expect(network.mock.calls[0]?.[1]?.redirect).toBe('manual');
      expect(network.mock.calls.some(([url]) => String(url) === location || String(url) === fixtureImage)).toBe(false);
      expect(network.mock.calls[1]?.[1]?.headers).toEqual({ Accept: 'image/*' });
    });
  }
  it.each(['output', 'imageUrl', 'url'])('preserves existing %s parsing and image bytes (mock compatibility, not a verified origin)', async field => {
    const network = fixture(() => json({ [field]: fixtureImage }));
    const result = await fetchImageCascade({ prompt: 'garden', only: ['pixazo'] });
    expect(result.provider).toBe('pixazo');
    expect(result.bytes).toEqual(bytes);
    expect(result.contentType).toBe('image/jpeg');
    expect(network).toHaveBeenCalledTimes(2);
    const init = network.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('manual');
    expect(init?.headers).toEqual({ 'Ocp-Apim-Subscription-Key': 'fixture-key', 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    expect(JSON.parse(String(init?.body))).toMatchObject({ prompt: 'garden', num_steps: 4, height: 1024, width: 1024 });
    expect(network.mock.calls[1]?.[1]?.redirect).toBe('follow');
    expect(network.mock.calls[1]?.[1]?.headers).toEqual({ Accept: 'image/*' });
  });
  it.each(['follow', 'error', 'manual'] as const)('preserves caller image redirect option %s, separately from API protection', async redirect => {
    const network = fixture(() => json({ output: fixtureImage }));
    expect((await fetchImageCascade({ prompt: 'garden', only: ['pixazo'], redirect })).provider).toBe('pixazo');
    expect(network.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(network.mock.calls[1]?.[1]?.redirect).toBe(redirect);
  });
  it.each([404, 503])('preserves ordinary API error %s fallback', async status => {
    const network = fixture(() => new Response(null, { status }));
    expect((await fetchImageCascade({ prompt: 'garden', only: ['pixazo', 'justapi'] })).provider).toBe('justapi');
    expect(network).toHaveBeenCalledTimes(2);
  });
  it('preserves missing image fallback', async () => {
    const network = fixture(() => json({}));
    expect((await fetchImageCascade({ prompt: 'garden', only: ['pixazo', 'justapi'] })).provider).toBe('justapi');
    expect(network).toHaveBeenCalledTimes(2);
  });
});