import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { secureFetch, destroyIroncladSession } from '../components/zoe-infinity/mail/ironclad/secureFetch';
afterEach(() => { destroyIroncladSession(); vi.unstubAllGlobals(); });
it('does not claim relay protection when only a marker is sent on direct fetch', async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal('crypto', webcrypto);
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetch);
  const result = await secureFetch('https://public.publisher.com/path', { encrypt: false });
  expect(result.relayed).toBe(false); expect(result.data).toEqual({ ok: true });
  expect(fetch.mock.calls[0]?.[0]).toBe('https://public.publisher.com/path');
});
