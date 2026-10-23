/** HTTP/1 relay adapter: only checked literal IPs reach the TCP dialer. */
import { Buffer } from 'node:buffer';
export interface RelaySocket {
  remoteAddr: { hostname: string };
  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  close(): void;
}
export interface RelayNetwork {
  connect(options: { hostname: string; port: number }): Promise<RelaySocket>;
  startTls(socket: RelaySocket, options: { hostname: string; alpnProtocols: string[] }): Promise<RelaySocket>;
}
interface ParserInfo {
  statusCode: number; headers: string[]; upgrade: boolean;
  versionMajor: number; versionMinor: number; method: number; url: string;
  statusMessage: string; shouldKeepAlive: boolean;
}
interface Parser {
  maxHeaderSize: number;
  2: (info: ParserInfo) => number | void;
  3: (buffer: Buffer, offset: number, length: number) => void;
  4: () => void;
  execute(buffer: Buffer): number | Error;
  finish(): void | Error;
}
export interface ParserConstructor {
  new(type: 'RESPONSE'): Parser;
  RESPONSE: 'RESPONSE';
  kOnHeadersComplete: 2;
  kOnBody: 3;
  kOnMessageComplete: 4;
}
export type RelayTransport = (target: URL, address: string, init: { signal: AbortSignal; headers: HeadersInit; method: string; body?: string }) => Promise<Response>;

const MAX_BYTES = 1_500_000;
const close = (socket: RelaySocket) => { try { socket.close(); } catch { /* already consumed/closed */ } };

async function abortable<T>(work: Promise<T>, signal: AbortSignal, late?: (value: T) => void): Promise<T> {
  if (signal.aborted) { if (late) void work.then(late, () => {}); throw signal.reason; }
  let aborted = false;
  let abort: () => void = () => {};
  try {
    return await Promise.race([
      work.then((value) => { if (aborted) late?.(value); return value; }),
      new Promise<never>((_, reject) => {
        abort = () => { aborted = true; reject(signal.reason); };
        signal.addEventListener('abort', abort, { once: true });
      }),
    ]);
  } finally { signal.removeEventListener('abort', abort); }
}

/** No fetch, proxy, agent pool, redirect retry or second hostname resolution. */
export function pinnedRelayTransport(network: RelayNetwork, HTTPParser: ParserConstructor): RelayTransport {
  return async (target, address, { signal, headers: requested, method, body }) => {
    let socket: RelaySocket | undefined;
    const stop = () => { if (socket) close(socket); };
    signal.addEventListener('abort', stop, { once: true });
    try {
      socket = await abortable(network.connect({ hostname: address, port: target.protocol === 'https:' ? 443 : 80 }), signal, close);
      // Compare canonical literals; an unexpected socket peer fails closed.
      const canonical = (ip: string) => new URL(ip.includes(':') ? `http://[${ip}]/` : `http://${ip}/`).hostname;
      if (canonical(socket.remoteAddr.hostname) !== canonical(address)) throw new Error('Relay peer mismatch');
      if (target.protocol === 'https:') {
        socket = await abortable(network.startTls(socket, {
          hostname: target.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, ''),
          alpnProtocols: ['http/1.1'],
        }), signal, close);
      }
      const headers = new Headers(requested);
      headers.set('Host', target.host);
      headers.set('Connection', 'close');
      headers.set('Accept-Encoding', 'gzip, deflate');
      // Framing and routing headers belong to this adapter, never the caller.
      for (const name of ['transfer-encoding', 'content-length', 'expect', 'upgrade', 'trailer', 'proxy-authorization', 'proxy-connection']) headers.delete(name);
      const payload = new TextEncoder().encode(body ?? '');
      if (body !== undefined) headers.set('Content-Length', String(payload.length));
      const head = new TextEncoder().encode(`${method} ${target.pathname}${target.search} HTTP/1.1\r\n${Array.from(headers, ([key, value]) => `${key}: ${value}\r\n`).join('')}\r\n`);
      const request = new Uint8Array(head.length + payload.length);
      request.set(head); request.set(payload, head.length);
      let written = 0;
      while (written < request.length) {
        const count = await abortable(socket.write(request.subarray(written)), signal);
        if (count <= 0) throw new Error('Relay write failed');
        written += count;
      }
      const parser = new HTTPParser(HTTPParser.RESPONSE);
      parser.maxHeaderSize = 32 * 1024;
      let status = 0;
      let responseHeaders = new Headers();
      let complete = false;
      let skip = false;
      let size = 0;
      let wireSize = 0;
      const chunks: Uint8Array[] = [];
      parser[HTTPParser.kOnHeadersComplete] = (info: ParserInfo) => {
        if (info.upgrade || info.statusCode === 101) throw new Error('Relay upgrade refused');
        if (info.statusCode < 200) return 1;
        status = info.statusCode;
        responseHeaders = new Headers();
        for (let i = 0; i < info.headers.length; i += 2) responseHeaders.append(info.headers[i], info.headers[i + 1]);
        skip = method === 'HEAD' || [204, 205, 304].includes(status);
        const length = responseHeaders.get('content-length');
        if (!skip && length && Number(length) > MAX_BYTES) throw new Error('Relay body too large');
        return skip ? 1 : 0;
      };
      parser[HTTPParser.kOnBody] = (buffer: Uint8Array, offset: number, length: number) => {
        size += length;
        if (size > MAX_BYTES) throw new Error('Relay body too large');
        chunks.push(buffer.slice(offset, offset + length));
      };
      parser[HTTPParser.kOnMessageComplete] = () => { if (status >= 200) complete = true; };
      while (!complete) {
        const buffer = new Uint8Array(16 * 1024);
        const count = await abortable(socket.read(buffer), signal);
        if (count === null) {
          const error = parser.finish();
          if (error || !complete) throw error ?? new Error('Incomplete relay response');
          break;
        }
        wireSize += count;
        if (wireSize > MAX_BYTES + 64 * 1024) throw new Error('Relay response too large');
        const result = parser.execute(Buffer.from(buffer.subarray(0, count)));
        if (result instanceof Error) throw result;
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let body = bytes;
      const encoding = responseHeaders.get('content-encoding');
      if (!skip && encoding && encoding !== 'identity') {
        if (encoding !== 'gzip' && encoding !== 'deflate') throw new Error('Unsupported relay encoding');
        const relay = new Response(bytes).body?.pipeThrough(new DecompressionStream(encoding)).getReader();
        if (!reader) throw new Error('Missing relay body');
        const decoded: Uint8Array[] = [];
        let total = 0;
        try {
          while (true) {
            const { done, value } = await abortable(reader.read(), signal);
            if (done) break;
            total += value.length;
            if (total > MAX_BYTES) throw new Error('Decoded relay body too large');
            decoded.push(value);
          }
        } finally { void reader.cancel().catch(() => {}); }
        body = new Uint8Array(total);
        let at = 0;
        for (const chunk of decoded) { body.set(chunk, at); at += chunk.length; }
      }
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('content-length');
      responseHeaders.delete('transfer-encoding');
      return new Response(skip || [204, 205, 304].includes(status) ? null : body, { status, headers: responseHeaders });
    } finally {
      signal.removeEventListener('abort', stop);
      stop();
    }
  };
}