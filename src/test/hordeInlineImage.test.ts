import { describe, expect, it, vi, afterEach } from 'vitest';
import { decodeHordeImage, hordeJson, hordeJobId } from '../../supabase/functions/_shared/horde-inline-image';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

const id = '12345678-1234-1234-1234-123456789abc';
const image = new Uint8Array(1200);
image.set(new TextEncoder().encode('RIFF'), 0);
image.set(new TextEncoder().encode('WEBP'), 8);
const base64 = btoa(String.fromCharCode(...image));
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('AI Horde inline destination removal', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/', 'https://127.0.0.1/x', 'https://10.0.0.1/x',
    'https://[::1]/x', 'https://service.internal/x', 'https://attacker.example/x',
    'https://public-cdn.com/image.webp', '//cdn.example/image.webp',
    'data:image/webp;base64,AAAA', '', null, 42, 'not base64!!',
  ])('rejects URL or invalid output %s without downloading it', (value) => {
    expect(typeof decodeHordeImage(value)).toBe('string');
  });
  it('preserves inline WebP bytes and image type', () => {
    const result = decodeHordeImage(base64);
    expect(result).toEqual({ bytes: image, type: 'image/webp' });
  });
  it('rejects tiny or non-WebP decoded payloads', () => {
    expect(decodeHordeImage(btoa('RIFF'))).toBe('tiny inline image');
    expect(decodeHordeImage(btoa('x'.repeat(1200)))).toBe('not a WebP image');
  });
  it('rejects encoded payloads beyond the existing six MiB image cap', () => {
    expect(decodeHordeImage('A'.repeat(8 * 1024 * 1024 + 4))).toBe('inline image too large');
  });
  it.each(['../../other', 'https://attacker.example/x', '123?redirect=x', '', 42])('rejects invalid job path %s', value => {
    expect(hordeJobId(value)).toBeNull();
  });
  it('accepts UUID job ID', () => { expect(hordeJobId(id)).toBe(id); });
  it.each([301, 302, 303, 307, 308])('refuses API redirect %s and cancels the response', async status => {
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel }), {
      status, headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }));
    expect(await hordeJson('https://aihorde.net/api/v2/generate/async', { method: 'POST' }, fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://aihorde.net/api/v2/generate/async', { method: 'POST', redirect: 'manual' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('treats network and malformed JSON as provider failures', async () => {
    expect(await hordeJson('https://aihorde.net/api/v2/generate/check/x', {}, vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).toBeNull();
    expect(await hordeJson('https://aihorde.net/api/v2/generate/check/x', {}, vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')))).toBeNull();
  });

  function cascadeFixture(output: unknown) {
    vi.useFakeTimers();
    const network = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/async')) return json({ id });
      if (url.includes('/check/')) return json({ done: true });
      if (url.includes('/status/')) return json({ generations: [{ img: output }] });
      if (url.startsWith('https://photos.justapi.dev/')) return new Response(image, { headers: { 'content-type': 'image/webp' } });
      throw new Error('Unexpected network destination');
    });
    vi.stubGlobal('fetch', network);
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    return network;
  }
  it('actual Horde branch submits inline mode and makes no fourth image download', async () => {
    const network = cascadeFixture(base64);
    const pending = fetchImageCascade({ prompt: 'garden', only: ['horde'] });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.provider).toBe('horde');
    expect(result.bytes).toEqual(image);
    expect(result.contentType).toBe('image/webp');
    expect(network).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(network.mock.calls[0]?.[1]?.body))).toMatchObject({ r2: false, params: { width: 512, height: 512, steps: 20 } });
    expect(network.mock.calls.every(([, init]) => init?.redirect === 'manual')).toBe(true);
  });
  it.each(['http://169.254.169.254/x', 'https://attacker.example/image.webp'])('actual branch never fetches returned address %s and retains ordered fallback', async output => {
    const network = cascadeFixture(output);
    const pending = fetchImageCascade({ prompt: 'garden', only: ['horde', 'justapi'] });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.provider).toBe('justapi');
    expect(result.log.map(attempt => [attempt.provider, attempt.ok])).toEqual([['horde', false], ['justapi', true]]);
    expect(network.mock.calls.some(([url]) => String(url) === output)).toBe(false);
    expect(network).toHaveBeenCalledTimes(4);
  });
  it.each([301, 302, 303, 307, 308])('actual branch refuses submit redirect %s without polls or target fetch', async status => {
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status, headers: { Location: 'https://attacker.example/x' } }));
    vi.stubGlobal('fetch', network);
    const result = await fetchImageCascade({ prompt: 'garden', only: ['horde'] });
    expect(result.bytes).toBeNull();
    expect(network).toHaveBeenCalledTimes(1);
  });
});