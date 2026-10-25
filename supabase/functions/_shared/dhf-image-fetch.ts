import { downloadCascadeImage } from './cascade-image-download.ts';

/** DHF rows are generated with this exact provider origin, never arbitrary URLs. */
export class UnsafeDhfImageUrl extends Error {
  constructor() {
    super('Unsupported DHF image destination or redirect');
    this.name = 'UnsafeDhfImageUrl';
  }
}

export function dhfImageUrl(value: unknown): string {
  if (typeof value !== 'string') throw new UnsafeDhfImageUrl();
  let url: URL;
  try { url = new URL(value); } catch { throw new UnsafeDhfImageUrl(); }
  if (url.origin !== 'https://image.pollinations.ai' || url.username || url.password
    || !url.pathname.startsWith('/prompt/')) throw new UnsafeDhfImageUrl();
  return url.href;
}

export async function fetchDhfImage(value: unknown, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = dhfImageUrl(value);
  let unsafeRedirect = false;
  let status = 200;
  const guarded: typeof fetch = async (input, init) => {
    const response = await fetcher(input, init);
    status = response.status;
    if (status >= 300 && status < 400) {
      unsafeRedirect = true;
      void response.body?.cancel().catch(() => {});
      throw new UnsafeDhfImageUrl();
    }
    return response;
  };
  // One deadline spans headers and body; bytes are counted before allocation.
  const image = await downloadCascadeImage(url, {}, 0, 'manual', guarded);
  if (unsafeRedirect) throw new UnsafeDhfImageUrl();
  if (typeof image === 'string') {
    if (status < 200 || status >= 300) return new Response(null, { status });
    throw new Error(image);
  }
  return new Response(new Uint8Array(image.bytes).buffer, { status, headers: { 'content-type': image.type } });
}