/** Resource budgets for cascade URL images only; destination policy stays with each provider. */
export const CASCADE_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const CASCADE_IMAGE_TIMEOUT_MS = 45_000;

/** Budgets for provider JSON/text API responses (separate from image bodies). */
export const CASCADE_JSON_MAX_BYTES = 1024 * 1024;
export const CASCADE_JSON_TIMEOUT_MS = 30_000;

/**
 * Stream-counted text read with a combined header/body deadline. Returns null
 * on oversize, timeout or read failure so callers fall over to the next
 * provider instead of allocating an unbounded body.
 */
export async function readTextBounded(
  res: Response,
  maxBytes: number,
  timeoutMs = CASCADE_JSON_TIMEOUT_MS,
): Promise<string | null> {
  const length = res.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    void res.body?.cancel().catch(() => {});
    return null;
  }
  if (!res.body) return null;
  const controller = new AbortController();
  const reader = res.body.getReader();
  const timer = setTimeout(() => { controller.abort(); void reader.cancel().catch(() => {}); }, timeoutMs);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (controller.signal.aborted) return null;
      if (done) break;
      if (value.byteLength > maxBytes - total) { controller.abort(); void reader.cancel().catch(() => {}); return null; }
      total += value.byteLength;
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

/** Bounded JSON.parse over readTextBounded; null on any failure. */
export async function readJsonBounded<T = unknown>(
  res: Response,
  maxBytes = CASCADE_JSON_MAX_BYTES,
): Promise<T | null> {
  const text = await readTextBounded(res, maxBytes);
  if (text === null) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

export async function downloadCascadeImage(
  url: string,
  headers: Record<string, string> = {},
  minBytes = 1024,
  redirect: RequestRedirect = 'follow',
  fetcher: typeof fetch = fetch,
  outerSignal?: AbortSignal,
): Promise<{ bytes: Uint8Array; type: string } | string> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  if (outerSignal) {
    if (outerSignal.aborted) return 'aborted';
    outerSignal.addEventListener('abort', () => { controller.abort(); cancel(); }, { once: true });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      cancel();
      reject(new Error('image download timeout'));
    }, CASCADE_IMAGE_TIMEOUT_MS);
  });
  const work = async () => {
    const res = await fetcher(url, { headers: { Accept: 'image/*', ...headers }, redirect, signal: controller.signal });
    // A non-cooperative transport may resolve after the deadline. Never consume it.
    if (controller.signal.aborted) { void res.body?.cancel().catch(() => {}); throw new Error('image download timeout'); }
    const type = res.headers.get('content-type') || '';
    const discard = () => { void res.body?.cancel().catch(() => {}); };
    if (!res.ok) { discard(); return `http ${res.status}`; }
    if (!type.startsWith('image/')) { discard(); return `not an image (${type})`; }
    if (res.status === 202) { discard(); return 'pending'; }
    const length = res.headers.get('content-length');
    if (length && /^\d+$/.test(length) && Number(length) > CASCADE_IMAGE_MAX_BYTES) {
      discard(); return 'too large';
    }
    if (!res.body) return 'tiny payload 0b';
    reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) throw new Error('image download timeout');
        if (done) break;
        if (value.byteLength > CASCADE_IMAGE_MAX_BYTES - total) {
          controller.abort(); cancel(); return 'too large';
        }
        total += value.byteLength;
        chunks.push(value);
      }
      if (total < minBytes) return `tiny payload ${total}b`;
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return { bytes, type };
    } catch (e) {
      cancel();
      throw e;
    } finally {
      reader.releaseLock();
    }
  };
  try {
    return await Promise.race([work(), deadline]);
  } catch (e) {
    return String((e as Error)?.message ?? e);
  } finally {
    clearTimeout(timer);
  }
}