import { afterEach, describe, expect, it, vi } from 'vitest';
import { CASCADE_IMAGE_MAX_BYTES as MAX, CASCADE_IMAGE_TIMEOUT_MS as TIMEOUT, downloadCascadeImage } from '../../supabase/functions/_shared/cascade-image-download';
import { fetchImageCascade } from '../../supabase/functions/_shared/image-cascade';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const url = 'https://fixture.example/image';
const response = (body: BodyInit | null, headers = {}) => new Response(body, { headers: { 'content-type': 'image/jpeg', ...headers } });

describe('cascade URL image budgets: controlled streams only', () => {
  it('keeps the existing 6 MiB cap and uses a 45 second entire-download deadline', () => {
    expect(MAX).toBe(6 * 1024 * 1024);
    expect(TIMEOUT).toBe(45_000);
  });
  it.each(['follow', 'manual', 'error'] as const)('preserves headers and redirect policy %s', async redirect => {
    const bytes = new Uint8Array(1200);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(bytes));
    expect(await downloadCascadeImage(url, { Authorization: 'fixture-token' }, 1024, redirect, fetcher)).toEqual({ bytes, type: 'image/jpeg' });
    expect(fetcher).toHaveBeenCalledWith(url, { headers: { Accept: 'image/*', Authorization: 'fixture-token' }, redirect, signal: expect.any(AbortSignal) });
  });
  it('rejects oversized Content-Length before reading the stream', async () => {
    const cancel = vi.fn();
    const res = response(new ReadableStream({ cancel }), { 'content-length': String(MAX + 1) });
    const acquire = vi.spyOn(res.body as ReadableStream, 'getReader');
    expect(await downloadCascadeImage(url, {}, 1024, 'follow', vi.fn<typeof fetch>().mockResolvedValue(res))).toBe('too large');
    expect(acquire).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, '1', 'invalid'])('counts actual bytes despite length %s and stops overflow', async length => {
    const cancel = vi.fn();
    let pulls = 0;
    const res = response(new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(MAX / 2 + 1)); }, cancel }, { highWaterMark: 0 }), length ? { 'content-length': length } : {});
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(res);
    expect(await downloadCascadeImage(url, {}, 1024, 'manual', fetcher)).toBe('too large');
    expect(pulls).toBe(2);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
  it('accepts exactly 6 MiB and joins chunks without changing bytes', async () => {
    const first = new Uint8Array(MAX / 2).fill(3);
    const second = new Uint8Array(MAX / 2).fill(7);
    const out = await downloadCascadeImage(url, {}, 1024, 'manual', vi.fn<typeof fetch>().mockResolvedValue(response(new ReadableStream({ start(c) { c.enqueue(first); c.enqueue(second); c.close(); } }))));
    if (typeof out === 'string') throw new Error(out);
    expect(out.bytes.length).toBe(MAX);
    expect(out.bytes[0]).toBe(3);
    expect(out.bytes[MAX - 1]).toBe(7);
  });
  it('preserves minimum-size rejection and small SVG filler acceptance', async () => {
    expect(await downloadCascadeImage(url, {}, 1024, 'follow', vi.fn<typeof fetch>().mockResolvedValue(response(new Uint8Array(1023))))).toBe('tiny payload 1023b');
    const out = await downloadCascadeImage(url, {}, 300, 'follow', vi.fn<typeof fetch>().mockResolvedValue(response(new Uint8Array(300), { 'content-type': 'image/svg+xml' })));
    expect(typeof out).not.toBe('string');
  });
  it.each([202, 302, 503])('cancels pending/error %s without consuming bodies', async status => {
    const cancel = vi.fn();
    const res = new Response(new ReadableStream({ cancel }), { status, headers: { 'content-type': 'image/jpeg' } });
    expect(await downloadCascadeImage(url, {}, 1024, 'manual', vi.fn<typeof fetch>().mockResolvedValue(res))).toBe(status === 202 ? 'pending' : `http ${status}`);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('cancels non-images', async () => {
    const cancel = vi.fn();
    expect(await downloadCascadeImage(url, {}, 1024, 'manual', vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { 'content-type': 'text/html' } })))).toBe('not an image (text/html)');
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('bounds header wait even if mock transport ignores abort', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const result = downloadCascadeImage(url, {}, 1024, 'manual', fetcher);
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    expect(await result).toBe('image download timeout');
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('deadline covers header and body together, cancelling stalled read', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 30_000));
      return response(new ReadableStream({ cancel }));
    });
    const result = downloadCascadeImage(url, {}, 1024, 'manual', fetcher);
    await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe('image download timeout');
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('disposes late headers after the deadline', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, TIMEOUT + 1));
      return response(new ReadableStream({ cancel }));
    });
    const result = downloadCascadeImage(url, {}, 1024, 'manual', fetcher);
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    expect(await result).toBe('image download timeout');
    await vi.advanceTimersByTimeAsync(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('releases failed streams and removes timers', async () => {
    vi.useFakeTimers();
    const res = response(new ReadableStream({ start(c) { c.error(new Error('fixture read failure')); } }));
    expect(await downloadCascadeImage(url, {}, 1024, 'manual', vi.fn<typeof fetch>().mockResolvedValue(res))).toBe('fixture read failure');
    expect(res.body?.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('actual cascade fails over after oversized URL image, preserving order', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes('pollinations')
      ? response(null, { 'content-length': String(MAX + 1) })
      : response(new Uint8Array(1200)));
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    const out = await fetchImageCascade({ prompt: 'fixture garden', only: ['pollinations', 'justapi'], redirect: 'manual' });
    expect(out.provider).toBe('justapi');
    expect(out.log.map(a => [a.provider, a.ok, a.reason])).toEqual([['pollinations', false, 'too large'], ['justapi', true, undefined]]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});