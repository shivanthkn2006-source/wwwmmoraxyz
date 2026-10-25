import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDhfImage } from '../../supabase/functions/_shared/dhf-image-fetch';
import { CASCADE_IMAGE_MAX_BYTES as MAX, CASCADE_IMAGE_TIMEOUT_MS as TIMEOUT } from '../../supabase/functions/_shared/cascade-image-download';

const url = 'https://image.pollinations.ai/prompt/fixture';
const image = (body: BodyInit | null, headers = {}) => new Response(body, { headers: { 'content-type': 'image/jpeg', ...headers } });
afterEach(() => vi.useRealTimers());

describe('DHF direct image budgets with controlled transports', () => {
  it('accepts exactly 6 MiB without changing image bytes', async () => {
    const bytes = new Uint8Array(MAX).fill(7);
    const result = await fetchDhfImage(url, vi.fn<typeof fetch>().mockResolvedValue(image(bytes)));
    const actual = new Uint8Array(await result.arrayBuffer());
    expect(actual.byteLength).toBe(MAX);
    expect(actual.every(byte => byte === 7)).toBe(true);
    expect(MAX).toBe(6 * 1024 * 1024);
  });
  it('rejects oversized declared length before body reads', async () => {
    const cancel = vi.fn();
    const response = image(new ReadableStream({ cancel }), { 'content-length': String(MAX + 1) });
    const reader = vi.spyOn(response.body as ReadableStream, 'getReader');
    await expect(fetchDhfImage(url, vi.fn<typeof fetch>().mockResolvedValue(response))).rejects.toThrow('too large');
    expect(reader).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, '1', 'invalid'])('rejects actual stream overflow despite length %s', async length => {
    const cancel = vi.fn();
    let pulls = 0;
    const body = new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(MAX / 2 + 1)); }, cancel }, { highWaterMark: 0 });
    await expect(fetchDhfImage(url, vi.fn<typeof fetch>().mockResolvedValue(image(body, length ? { 'content-length': length } : {})))).rejects.toThrow('too large');
    expect(pulls).toBe(2);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('bounds header wait even when transport ignores abort', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const result = expect(fetchDhfImage(url, fetcher)).rejects.toThrow('image download timeout');
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    await result;
    expect(TIMEOUT).toBe(45_000);
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
  it('uses one 45-second deadline across headers and a stalled body', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 30_000));
      return image(new ReadableStream({ cancel }));
    });
    const result = expect(fetchDhfImage(url, fetcher)).rejects.toThrow('image download timeout');
    await vi.advanceTimersByTimeAsync(44_999);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels a non-image response rather than storing it', async () => {
    const cancel = vi.fn();
    await expect(fetchDhfImage(url, vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { 'content-type': 'text/html' } })))).rejects.toThrow('not an image');
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});