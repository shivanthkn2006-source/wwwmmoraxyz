import { describe, expect, it, vi } from 'vitest';
import { HTTPParser } from 'http-parser-js';
import { gzipSync } from 'node:zlib';
import { pinnedRelayTransport, type RelaySocket, type RelayNetwork } from '../../supabase/functions/ironclad-relay/connection';
import { fetchRelayDestination } from '../../supabase/functions/ironclad-relay/destination';

const encoder = new TextEncoder();
const target = new URL('https://news.publisher.com/story?q=hello');
const address = '93.184.216.34';
const html = '<title>Article</title><p>A real-sized fixture paragraph returned without contacting any network.</p>';
const responseBytes = (text: string) => encoder.encode(text);
function fixture(bytes = responseBytes(`HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${encoder.encode(html).length}\r\n\r\n${html}`), options: { peer?: string; fragmented?: boolean; tlsError?: boolean } = {}) {
  let at = 0;
  const writes: Uint8Array[] = [];
  const socket: RelaySocket = {
    remoteAddr: { hostname: options.peer ?? address },
    read: vi.fn(async (buffer: Uint8Array) => {
      if (at === bytes.length) return null;
      const size = Math.min(buffer.length, bytes.length - at, options.fragmented ? 3 : Infinity);
      buffer.set(bytes.subarray(at, at + size)); at += size;
      return size;
    }),
    write: vi.fn(async (buffer: Uint8Array) => { const size = Math.min(buffer.length, 13); writes.push(buffer.slice(0, size)); return size; }),
    close: vi.fn(),
  };
  const network: RelayNetwork = {
    connect: vi.fn(async () => socket),
    startTls: vi.fn(async () => { if (options.tlsError) throw new Error('Certificate hostname mismatch'); return socket; }),
  };
  return { socket, network, transport: pinnedRelayTransport(network, HTTPParser), request: () => writes.map(bytes => new TextDecoder().decode(bytes)).join('') };
}
const init = () => ({ signal: AbortSignal.timeout(9000), method: 'GET', headers: { 'User-Agent': 'relay-fixture', Accept: 'text/html' } });

describe('web-relay literal connection (all sockets are controlled mocks)', () => {
  it('uses the checked literal for TCP, original host for TLS/Host, no second DNS lookup', async () => {
    const f = fixture();
    let calls = 0;
    const dns = vi.fn(async (_host: string, type: string) => { calls++; return type === 'A' ? [calls > 2 ? '127.0.0.1' : address] : []; });
    const result = await fetchRelayDestination(target.href, dns, f.transport, init());
    expect(await result.text()).toBe(html);
    expect(dns).toHaveBeenCalledTimes(2);
    expect(f.network.connect).toHaveBeenCalledExactlyOnceWith({ hostname: address, port: 443 });
    expect(f.network.startTls).toHaveBeenCalledExactlyOnceWith(f.socket, { hostname: 'news.publisher.com', alpnProtocols: ['http/1.1'] });
    expect(f.request()).toContain('GET /story?q=hello HTTP/1.1\r\n');
    expect(f.request()).toContain('host: news.publisher.com\r\n');
    expect(f.request()).toContain('connection: close\r\n');
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('refuses an unexpected socket peer before TLS or writing a request', async () => {
    const f = fixture(undefined, { peer: '10.0.0.1' });
    await expect(f.transport(target, address, init())).rejects.toThrow('Relay peer mismatch');
    expect(f.network.startTls).not.toHaveBeenCalled();
    expect(f.socket.write).not.toHaveBeenCalled();
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('fails closed on certificate errors without downgrade or retry', async () => {
    const f = fixture(undefined, { tlsError: true });
    await expect(f.transport(target, address, init())).rejects.toThrow('Certificate hostname mismatch');
    expect(f.network.connect).toHaveBeenCalledTimes(1);
    expect(f.socket.write).not.toHaveBeenCalled();
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('supports IPv6 literal peers while keeping original hostname TLS', async () => {
    const ip = '2606:4700:4700::1111';
    const f = fixture(undefined, { peer: ip });
    await f.transport(target, ip, init());
    expect(f.network.connect).toHaveBeenCalledExactlyOnceWith({ hostname: ip, port: 443 });
  });
  it.each([301, 302, 303, 307, 308])('returns redirect %s without contacting Location', async (status) => {
    const f = fixture(responseBytes(`HTTP/1.1 ${status} Redirect\r\nLocation: http://169.254.169.254/latest/meta-data/\r\nContent-Length: 0\r\n\r\n`));
    const response = await f.transport(target, address, init());
    expect(response.status).toBe(status);
    expect(await response.text()).toBe('');
    expect(f.network.connect).toHaveBeenCalledTimes(1);
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('parses fragmented headers/body and partial writes', async () => {
    const f = fixture(undefined, { fragmented: true });
    expect(await (await f.transport(target, address, init())).text()).toBe(html);
    expect(f.request().endsWith('\r\n\r\n')).toBe(true);
  });
  it('parses chunk framing and trailers using the established parser', async () => {
    const f = fixture(responseBytes('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n6\r\n world\r\n0\r\nX-Fixture: yes\r\n\r\n'));
    expect(await (await f.transport(target, address, init())).text()).toBe('hello world');
  });
  it('parses EOF-framed response bodies', async () => {
    const f = fixture(responseBytes('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello'));
    expect(await (await f.transport(target, address, init())).text()).toBe('hello');
  });
  it('handles an informational response followed by the final response', async () => {
    const f = fixture(responseBytes('HTTP/1.1 100 Continue\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nhello'));
    expect(await (await f.transport(target, address, init())).text()).toBe('hello');
  });
  it('decodes gzip with a decoded-byte cap', async () => {
    const gzip = gzipSync(html);
    const header = responseBytes(`HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Encoding: gzip\r\nContent-Length: ${gzip.length}\r\n\r\n`);
    const bytes = new Uint8Array(header.length + gzip.length); bytes.set(header); bytes.set(gzip, header.length);
    const f = fixture(bytes);
    const response = await f.transport(target, address, init());
    expect(await response.text()).toBe(html);
    expect(response.headers.has('content-encoding')).toBe(false);
  });
  it('rejects compressed expansion above the byte cap', async () => {
    const gzip = gzipSync('a'.repeat(1_500_001));
    const header = responseBytes(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\nContent-Length: ${gzip.length}\r\n\r\n`);
    const bytes = new Uint8Array(header.length + gzip.length); bytes.set(header); bytes.set(gzip, header.length);
    const f = fixture(bytes);
    await expect(f.transport(target, address, init())).rejects.toThrow('Decoded relay body too large');
    expect(f.socket.close).toHaveBeenCalled();
  });
  it.each([
    'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 1500001\r\n\r\n',
    'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 10\r\n\r\nshort',
    'HTTP/1.1 101 Switching Protocols\r\nConnection: upgrade\r\nUpgrade: websocket\r\n\r\n',
    'not HTTP at all\r\n\r\n',
  ])('fails closed on oversized, truncated, upgraded or malformed response', async (text) => {
    const f = fixture(responseBytes(text));
    await expect(f.transport(target, address, init())).rejects.toThrow();
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('closes a pending read when aborted', async () => {
    const f = fixture();
    f.socket.read = vi.fn(() => new Promise<number | null>(() => {}));
    const controller = new AbortController();
    const result = f.transport(target, address, { ...init(), signal: controller.signal });
    await vi.waitFor(() => expect(f.socket.read).toHaveBeenCalled());
    controller.abort(new Error('fixture deadline'));
    await expect(result).rejects.toThrow('fixture deadline');
    expect(f.socket.close).toHaveBeenCalled();
  });
  it('closes a TCP connection that completes after the deadline', async () => {
    const f = fixture();
    let finish: ((socket: RelaySocket) => void) | undefined;
    f.network.connect = vi.fn(() => new Promise<RelaySocket>(resolve => { finish = resolve; }));
    const controller = new AbortController();
    const result = f.transport(target, address, { ...init(), signal: controller.signal });
    controller.abort(new Error('fixture deadline'));
    await expect(result).rejects.toThrow('fixture deadline');
    finish?.(f.socket);
    await vi.waitFor(() => expect(f.socket.close).toHaveBeenCalled());
    expect(f.network.startTls).not.toHaveBeenCalled();
  });
});
describe('relay request compatibility and framing', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('keeps %s JSON body and public HTTPS origin', async method => {
    const f = fixture(responseBytes('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11\r\n\r\n{"ok":true}'));
    const body = JSON.stringify({ message: 'hello ☀' });
    const res = await f.transport(target, address, { ...init(), method, body, headers: {
      Host: '169.254.169.254', 'Content-Length': '1', 'Transfer-Encoding': 'chunked', Connection: 'upgrade',
      Upgrade: 'websocket', Expect: '100-continue', 'Proxy-Authorization': 'secret-fixture',
      Authorization: 'Bearer fixture-only', 'Content-Type': 'application/json',
    } });
    expect(await res.json()).toEqual({ ok: true });
    expect(f.request()).toContain(`${method} /story?q=hello HTTP/1.1\r\n`);
    expect(f.request()).toContain(`content-length: ${encoder.encode(body).length}\r\n`);
    expect(f.request()).toContain('host: news.publisher.com\r\n');
    expect(f.request()).toContain('authorization: Bearer fixture-only\r\n');
    expect(f.request()).not.toMatch(/transfer-encoding:|upgrade:|expect:|proxy-authorization:/i);
    expect(f.request().endsWith(body)).toBe(true);
  });
  it('returns error body and status unchanged', async () => {
    const f = fixture(responseBytes('HTTP/1.1 422 Invalid\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\n{"error":"bad"}'));
    const res = await f.transport(target, address, init());
    expect(res.status).toBe(422); expect(await res.json()).toEqual({ error: 'bad' });
  });
  it('HEAD skips the declared body', async () => {
    const f = fixture(responseBytes('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n'));
    expect(await (await f.transport(target, address, { ...init(), method: 'HEAD' })).text()).toBe('');
  });
  it('does not follow public, private or relative Location values', async () => {
    for (const location of ['https://next.publisher.com/', 'http://127.0.0.1/', '/next']) {
      const f = fixture(responseBytes(`HTTP/1.1 302 Redirect\r\nLocation: ${location}\r\nContent-Length: 4\r\n\r\nmove`));
      const res = await f.transport(target, address, init());
      expect(res.status).toBe(302); expect(await res.text()).toBe('move');
      expect(f.network.connect).toHaveBeenCalledTimes(1);
    }
  });
});
