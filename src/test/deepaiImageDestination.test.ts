import { afterEach, describe, expect, it, vi } from 'vitest';
import { deepaiImageUrl } from '../../supabase/functions/_shared/deepai-image-destination';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

const api = 'https://api.deepai.org/api/text2img';
const imageUrl = 'https://api.deepai.org/job-view-file/fixture/outputs/output.jpg';
const image = new Uint8Array(1200);
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const denied: unknown[] = [
  'http://169.254.169.254/latest/meta-data/', 'https://127.0.0.1/x', 'https://10.0.0.1/x',
  'https://172.16.0.1/x', 'https://192.168.1.1/x', 'https://[::1]/x', 'https://[fd00::1]/x',
  'https://localhost/x', 'https://service.internal/x', 'https://attacker.example/x',
  'https://api.deepai.org.attacker.example/job-view-file/x', 'https://api.deepai.org@attacker.example/job-view-file/x',
  'https://user:pass@api.deepai.org/job-view-file/x', 'https://api.deepai.org:8443/job-view-file/x',
  'http://api.deepai.org/job-view-file/x', 'https://api.deepai.org/api/text2img',
  'https://api.deepai.org/job-view-file/', 'https://api.deepai.org/job-view-file/../../api/text2img',
  'https://api.deepai.org/job-view-file/%2e%2e/api/text2img', 'https://api.deepai.org/job-view-file/x#fragment',
  '//api.deepai.org/job-view-file/x', 'file:///etc/passwd', 'https:\\api.deepai.org\\job-view-file\\x',
  ' https://api.deepai.org/job-view-file/x', '', null, 42, {},
];
afterEach(() => vi.unstubAllGlobals());

function fixture(response: () => Response, download: () => Response = () => new Response(image, { headers: { 'content-type': 'image/jpeg' } })) {
  const network = vi.fn<typeof fetch>().mockImplementation(async input => {
    if (String(input) === api) return response();
    if (String(input) === imageUrl) return download();
    if (String(input).startsWith('https://photos.justapi.dev/')) return new Response(image, { headers: { 'content-type': 'image/webp' } });
    throw new Error('Unexpected destination');
  });
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'DEEPAI_API_KEY' ? 'fixture-key' : undefined } });
  return network;
}

describe('DeepAI output destination boundary', () => {
  it.each(denied)('refuses %s before image download and keeps ordinary fallback', async output => {
    expect(deepaiImageUrl(output)).toBeNull();
    const network = fixture(() => json({ output_url: output }));
    const result = await fetchImageCascade({ prompt: 'garden', only: ['deepai', 'justapi'] });
    expect(result.provider).toBe('justapi');
    expect(result.log.map(a => [a.provider, a.ok])).toEqual([['deepai', false], ['justapi', true]]);
    expect(network).toHaveBeenCalledTimes(2);
    expect(network.mock.calls[0]?.[0]).toBe(api);
    expect(String(network.mock.calls[1]?.[0])).toMatch(/^https:\/\/photos\.justapi\.dev\//);
  });
  it.each([undefined, 'follow', 'error'] as const)('preserves documented bytes and rejects redirects independently of caller %s', async redirect => {
    expect(deepaiImageUrl(imageUrl)).toBe(imageUrl);
    const network = fixture(() => json({ output_url: imageUrl }));
    const result = await fetchImageCascade({ prompt: 'garden', only: ['deepai'], redirect });
    expect(result.provider).toBe('deepai');
    expect(result.bytes).toEqual(image);
    expect(result.contentType).toBe('image/jpeg');
    expect(network).toHaveBeenCalledTimes(2);
    expect(network.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(network.mock.calls[0]?.[1]?.headers).toEqual({ 'api-key': 'fixture-key' });
    expect(network.mock.calls[1]?.[1]).toEqual({ headers: { Accept: 'image/*' }, redirect: 'manual' });
  });
  for (const phase of ['api', 'image'] as const) {
    it.each([301, 302, 303, 307, 308])(`refuses ${phase} redirect %s and cancels body without following Location`, async status => {
      for (const location of ['http://169.254.169.254/x', 'https://attacker.example/x', '/job-view-file/other']) {
        const cancel = vi.fn();
        const response = () => new Response(new ReadableStream({ cancel }), { status, headers: { Location: location } });
        const network = fixture(phase === 'api' ? response : () => json({ output_url: imageUrl }), response);
        const result = await fetchImageCascade({ prompt: 'garden', only: ['deepai', 'justapi'], redirect: 'follow' });
        expect(result.provider).toBe('justapi');
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(network).toHaveBeenCalledTimes(phase === 'api' ? 2 : 3);
        expect(network.mock.calls.some(([url]) => String(url) === location)).toBe(false);
        expect(network.mock.calls[phase === 'api' ? 0 : 1]?.[1]?.redirect).toBe('manual');
      }
    });
  }
  it.each([503, 404])('retains API failure fallback %s', async status => {
    const network = fixture(() => new Response(null, { status }));
    const result = await fetchImageCascade({ prompt: 'garden', only: ['deepai', 'justapi'] });
    expect(result.provider).toBe('justapi');
    expect(network).toHaveBeenCalledTimes(2);
  });
  it('treats malformed API JSON as an ordinary provider failure', async () => {
    const network = fixture(() => new Response('invalid JSON'));
    expect((await fetchImageCascade({ prompt: 'garden', only: ['deepai', 'justapi'] })).provider).toBe('justapi');
    expect(network).toHaveBeenCalledTimes(2);
  });
});