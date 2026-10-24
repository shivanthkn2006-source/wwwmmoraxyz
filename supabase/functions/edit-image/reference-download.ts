/** Reference-only resource budgets; URL authority remains in reference-url.ts. */
export const REFERENCE_MAX_BYTES = 6 * 1024 * 1024;
export const REFERENCE_TIMEOUT_MS = 45_000;

export class ReferenceDownloadError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export async function downloadEditReference(url: string, fetcher: typeof fetch = fetch): Promise<{ bytes: Uint8Array; mime: string }> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  const timedOut = () => new ReferenceDownloadError(504, 'REFERENCE_TIMEOUT', 'Reference photo took too long to load. Please try again.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); cancel(); reject(timedOut()); }, REFERENCE_TIMEOUT_MS);
  });
  const work = async () => {
    const response = await fetcher(url, { redirect: 'error', signal: controller.signal });
    const discard = () => { void response.body?.cancel().catch(() => {}); };
    if (controller.signal.aborted) { discard(); throw timedOut(); }
    if (!response.ok) { discard(); throw new Error('Reference image could not be loaded'); }
    const tooLarge = () => new ReferenceDownloadError(413, 'REFERENCE_TOO_LARGE', 'Reference photo is too large. Please use a photo under 6 MiB.');
    const length = response.headers.get('content-length');
    if (length && /^\d+$/.test(length) && Number(length) > REFERENCE_MAX_BYTES) {
      controller.abort(); discard(); throw tooLarge();
    }
    const mime = response.headers.get('content-type') || 'image/jpeg';
    if (!response.body) return { bytes: new Uint8Array(), mime };
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (controller.signal.aborted) throw timedOut();
        if (done) break;
        if (value.byteLength > REFERENCE_MAX_BYTES - total) {
          controller.abort(); throw tooLarge();
        }
        total += value.byteLength;
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return { bytes, mime };
    } catch (error) {
      cancel();
      throw error;
    } finally {
      reader.releaseLock();
    }
  };
  try { return await Promise.race([work(), deadline]); }
  finally { clearTimeout(timer); }
}