import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadEditReference, REFERENCE_MAX_BYTES as MAX, REFERENCE_TIMEOUT_MS as TIMEOUT } from '../../supabase/functions/edit-image/reference-download';

const url = 'https://lh3.googleusercontent.com/a/fixture';
const response = (body: BodyInit | null, headers = {}) => new Response(body, { headers });
afterEach(() => { vi.useRealTimers(); });

describe('reference download budgets — no real network', () => {
  it('sets reference-local 6 MiB and 45 second limits', () => {
    expect(MAX).toBe(6 * 1024 * 1024);
    expect(TIMEOUT).toBe(45_000);
  });
  it('preserves bytes, MIME and redirect refusal', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(bytes, { 'content-type': 'image/webp' }));
    expect(await downloadEditReference(url, fetcher)).toEqual({ bytes, mime: 'image/webp' });
    expect(fetcher).toHaveBeenCalledWith(url, { redirect: 'error', signal: expect.any(AbortSignal) });
  });
  it('preserves missing-MIME fallback', async () => {
    expect((await downloadEditReference(url, vi.fn<typeof fetch>().mockResolvedValue(response(new Uint8Array([1]))))).mime).toBe('image/jpeg');
  });
  it('rejects declared oversize before acquiring body', async () => {
    const cancel = vi.fn();
    const res = response(new ReadableStream({ cancel }), { 'content-length': String(MAX + 1) });
    const acquire = vi.spyOn(res.body as ReadableStream, 'getReader');
    await expect(downloadEditReference(url, vi.fn<typeof fetch>().mockResolvedValue(res))).rejects.toMatchObject({ status: 413, code: 'REFERENCE_TOO_LARGE' });
    expect(acquire).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([undefined, '1', 'invalid'])('stops actual stream overflow despite length %s', async length => {
    const cancel = vi.fn();
    let pulls = 0;
    const res = response(new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(MAX / 2 + 1)); }, cancel }, { highWaterMark: 0 }), length ? { 'content-length': length } : {});
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(res);
    await expect(downloadEditReference(url, fetcher)).rejects.toMatchObject({ status: 413 });
    expect(pulls).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(res.body?.locked).toBe(false);
  });
  it('accepts exactly the ceiling without changing chunk order', async () => {
    const res = response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX / 2).fill(3)); c.enqueue(new Uint8Array(MAX / 2).fill(7)); c.close(); } }));
    const out = await downloadEditReference(url, vi.fn<typeof fetch>().mockResolvedValue(res));
    expect(out.bytes.length).toBe(MAX);
    expect(out.bytes[0]).toBe(3);
    expect(out.bytes[MAX - 1]).toBe(7);
  });
  it.each([302, 503])('discards unsuccessful response %s', async status => {
    const cancel = vi.fn();
    await expect(downloadEditReference(url, vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel }), { status })))).rejects.toThrow('Reference image could not be loaded');
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('does not retry rejected redirects', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('redirect refused'));
    await expect(downloadEditReference(url, fetcher)).rejects.toThrow('redirect refused');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('bounds stalled headers even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const result = expect(downloadEditReference(url, fetcher)).rejects.toMatchObject({ status: 504, code: 'REFERENCE_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    await result;
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('uses one deadline for delayed headers and stalled body', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const res = response(new ReadableStream({ cancel }));
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { await new Promise(r => setTimeout(r, 30_000)); return res; });
    const result = expect(downloadEditReference(url, fetcher)).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(cancel).toHaveBeenCalledOnce();
    expect(res.body?.locked).toBe(false);
  });
  it('disposes late responses without reading them', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { await new Promise(r => setTimeout(r, TIMEOUT + 1)); return response(new ReadableStream({ cancel })); });
    const result = expect(downloadEditReference(url, fetcher)).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    await result;
    await vi.advanceTimersByTimeAsync(1);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('releases errored bodies and clears timer', async () => {
    vi.useFakeTimers();
    const res = response(new ReadableStream({ start(c) { c.error(new Error('read failure')); } }));
    await expect(downloadEditReference(url, vi.fn<typeof fetch>().mockResolvedValue(res))).rejects.toThrow('read failure');
    expect(res.body?.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});