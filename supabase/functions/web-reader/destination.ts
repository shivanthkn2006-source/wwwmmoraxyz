/** Reader-only preflight. This does NOT pin fetch's second DNS resolution. */
export class UnsafeReaderDestination extends Error {}

export function publicReaderAddress(address: string): boolean {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(address)) {
    const [a, b, c] = address.split('.').map(Number);
    if (address.split('.').some((part) => Number(part) > 255)) return false;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 168 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  try {
    // WHATWG canonicalisation handles compressed and IPv4-embedded IPv6.
    const host = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const sides = host.split('::');
    const left = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const words = (sides.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
      : left).map((part) => parseInt(part, 16));
    const [a, b] = words;
    // Only ordinary global unicast; deny transition, documentation and special ranges.
    return words.length === 8 && (a & 0xe000) === 0x2000 &&
      !(a === 0x2001 && (b < 0x200 || b === 0xdb8)) &&
      a !== 0x2002 && !(a === 0x3fff && b < 0x1000);
  } catch {
    return false;
  }
}

export function readerTarget(raw: unknown): URL {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 8192) {
    throw new UnsafeReaderDestination('Invalid url');
  }
  let target: URL;
  try { target = new URL(raw.trim()); } catch { throw new UnsafeReaderDestination('Invalid url'); }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.port) {
    throw new UnsafeReaderDestination('Blocked destination');
  }
  const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || !host.includes('.') && !host.includes(':') ||
      /(^|\.)(localhost|local|internal|home|lan|test|invalid|example|onion)$/.test(host)) {
    throw new UnsafeReaderDestination('Blocked host');
  }
  if ((host.includes(':') || /^[\d.]+$/.test(host)) && !publicReaderAddress(host)) {
    throw new UnsafeReaderDestination('Blocked address');
  }
  return target;
}

export type ReaderResolver = (host: string, type: 'A' | 'AAAA') => Promise<string[]>;

export async function fetchReaderDestination(
  raw: unknown,
  resolve: ReaderResolver,
  fetcher: typeof fetch = fetch,
  headers: HeadersInit = {},
): Promise<{ target: URL; response: Response }> {
  const target = readerTarget(raw);
  const host = target.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const signal = AbortSignal.timeout(9000);
  if (!host.includes(':') && !/^[\d.]+$/.test(host)) {
    const answers = await Promise.race([
      Promise.all([resolve(host, 'A'), resolve(host, 'AAAA')]),
      new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
    ]);
    const addresses = answers.flat();
    if (!addresses.length || addresses.some((address) => !publicReaderAddress(address))) {
      throw new UnsafeReaderDestination('Blocked DNS destination');
    }
  }
  // No redirect authority: never resolve or contact Location, even if public/relative.
  const response = await fetcher(target.href, { signal, redirect: 'manual', headers });
  if (response.status >= 300 && response.status < 400) await response.body?.cancel();
  return { target, response };
}