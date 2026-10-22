/** AI Horde r2:false returns base64 WebP, never a caller-authorised URL. */
const MAX_BYTES = 6 * 1024 * 1024;
export function decodeHordeImage(value: unknown): { bytes: Uint8Array; type: string } | string {
  if (typeof value !== 'string' || !value) return 'no inline image';
  if (value.length > 4 * Math.ceil(MAX_BYTES / 3)) return 'inline image too large';
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return 'invalid inline image';
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
  catch { return 'invalid inline image'; }
  if (bytes.length < 1024) return 'tiny inline image';
  if (bytes.length > MAX_BYTES) return 'inline image too large';
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 12) !== 'WEBP') return 'not a WebP image';
  return { bytes, type: 'image/webp' };
}

/** Fixed Horde API calls refuse redirects, so job/control responses cannot move authority. */
export async function hordeJson<T>(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<T | null> {
  const response = await fetcher(url, { ...init, redirect: 'manual' }).catch(() => null);
  if (!response) return null;
  if (!response.ok) { await response.body?.cancel(); return null; }
  return await response.json().catch(() => null) as T | null;
}

export function hordeJobId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value : null;
}