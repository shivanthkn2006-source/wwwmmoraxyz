/** Only the image origin emitted by useValidatedGrowthImage is accepted.
 * An exact trusted origin avoids accepting attacker-controlled DNS names.
 * Never follow redirects, even to another public destination.
 */
export class UnsafeGrowthImageUrl extends Error {
  constructor() {
    super('imageUrl must use the supported HTTPS image provider without redirects');
    this.name = 'UnsafeGrowthImageUrl';
  }
}

export function growthImageUrl(value: unknown): string {
  if (typeof value !== 'string') throw new UnsafeGrowthImageUrl();
  let url: URL;
  try { url = new URL(value); } catch { throw new UnsafeGrowthImageUrl(); }
  if (url.origin !== 'https://image.pollinations.ai'
    || url.username || url.password
    || !url.pathname.startsWith('/prompt/')) {
    throw new UnsafeGrowthImageUrl();
  }
  return url.href;
}

export async function fetchGrowthImage(
  value: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = growthImageUrl(value);
  const response = await fetcher(url, {
    headers: { Accept: 'image/*' },
    signal: AbortSignal.timeout(8_000),
    redirect: 'manual',
  });
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new UnsafeGrowthImageUrl();
  }
  return response;
}