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
  const response = await fetcher(url, { signal: AbortSignal.timeout(45_000), redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new UnsafeDhfImageUrl();
  }
  return response;
}