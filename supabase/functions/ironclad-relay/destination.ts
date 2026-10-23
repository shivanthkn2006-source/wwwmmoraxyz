/** Relay-only HTTPS policy; DNS answers are handed directly to literal TCP. */
import type { RelayTransport } from './connection.ts';
export class UnsafeRelayDestination extends Error {}
export function publicRelayAddress(address: string): boolean {
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


export function relayTarget(raw: unknown): URL {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 8192) throw new UnsafeRelayDestination('Invalid URL');
  let target: URL;
  try { target = new URL(raw); } catch { throw new UnsafeRelayDestination('Invalid URL'); }
  if (target.protocol !== 'https:' || target.username || target.password || target.port) throw new UnsafeRelayDestination('HTTPS without credentials or non-standard ports required');
  const host = target.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(':')) throw new UnsafeRelayDestination('IP addresses not allowed');
  if (!host.includes('.') || /(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example|onion)$/.test(host)) throw new UnsafeRelayDestination('Internal host');
  return target;
}
export type RelayResolver = (host: string, type: 'A' | 'AAAA') => Promise<string[]>;
export async function fetchRelayDestination(raw: unknown, resolve: RelayResolver, transport: RelayTransport,
  init: { signal: AbortSignal; headers: HeadersInit; method: string; body?: string }): Promise<Response> {
  const target = relayTarget(raw);
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(init.method) ||
      (['GET', 'HEAD'].includes(init.method) && init.body !== undefined)) throw new UnsafeRelayDestination('Unsupported method or body');
  if (init.signal.aborted) throw init.signal.reason;
  let abort: () => void = () => {};
  let answers: string[][];
  try {
    answers = await Promise.race([
      Promise.all(['A', 'AAAA'].map(type => resolve(target.hostname.replace(/\.$/, ''), type as 'A' | 'AAAA'))),
      new Promise<never>((_, reject) => { abort = () => reject(init.signal.reason); init.signal.addEventListener('abort', abort, { once: true }); }),
    ]);
  } finally { init.signal.removeEventListener('abort', abort); }
  const addresses = answers.flat();
  const address = addresses[0];
  if (!address || addresses.some(ip => !publicRelayAddress(ip))) throw new UnsafeRelayDestination('Blocked DNS destination');
  // No fetch/hostname retry/redirect target: connect to this checked literal only.
  return await transport(target, address, init);
}
