import { describe, expect, it, vi } from 'vitest';
import { fetchRelayDestination, relayTarget, publicRelayAddress } from '../../supabase/functions/ironclad-relay/destination';
const init = () => ({ signal: AbortSignal.timeout(9000), method: 'POST', headers: {}, body: '{"ok":true}' });
describe('Ironclad destination checks (no real DNS/network)', () => {
  it.each(['http://public.publisher.com/', 'https://localhost/', 'https://x.local/', 'https://x.internal/', 'https://x.corp/', 'https://127.0.0.1/', 'https://169.254.169.254/', 'https://[::1]/', 'https://u:p@public.publisher.com/', 'https://public.publisher.com:444/', 'ftp://public.publisher.com/', '', null])('blocks %s before DNS/dial', async url => {
    const resolve = vi.fn(); const transport = vi.fn();
    await expect(fetchRelayDestination(url, resolve, transport, init())).rejects.toThrow();
    expect(resolve).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
  });
  it.each(['10.0.0.1', '127.0.0.1', '169.254.169.254', '192.168.1.1', '100.64.0.1', '198.18.0.1', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2002:0808:0808::1', '2001:db8::1'])('rejects mixed public/private DNS answer %s without transport', async address => {
    const transport = vi.fn();
    await expect(fetchRelayDestination('https://public.publisher.com/', vi.fn(async (_host, type) => type === 'A' ? ['8.8.8.8'] : [address]), transport, init())).rejects.toThrow('Blocked DNS');
    expect(transport).not.toHaveBeenCalled(); expect(publicRelayAddress(address)).toBe(false);
  });
  it('fails closed on DNS family error even if another family is public', async () => {
    const transport = vi.fn();
    await expect(fetchRelayDestination('https://public.publisher.com/', async (_host, type) => { if (type === 'AAAA') throw new Error('fixture outage'); return ['8.8.8.8']; }, transport, init())).rejects.toThrow('fixture outage');
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects empty DNS answers', async () => {
    const transport = vi.fn();
    await expect(fetchRelayDestination('https://public.publisher.com/', async () => [], transport, init())).rejects.toThrow('Blocked DNS');
    expect(transport).not.toHaveBeenCalled();
  });
  it.each(['CONNECT', 'TRACE', 'GET\r\nHost: evil', 'post'])('blocks invalid method %s before DNS', async method => {
    const resolve = vi.fn();
    await expect(fetchRelayDestination('https://public.publisher.com/', resolve, vi.fn(), { ...init(), method })).rejects.toThrow('Unsupported method');
    expect(resolve).not.toHaveBeenCalled();
  });
  it.each(['GET', 'HEAD'])('refuses a %s body before DNS', async method => {
    const resolve = vi.fn();
    await expect(fetchRelayDestination('https://public.publisher.com/', resolve, vi.fn(), { ...init(), method })).rejects.toThrow('Unsupported method');
    expect(resolve).not.toHaveBeenCalled();
  });
  it('handles DNS timeout with no connection', async () => {
    const controller = new AbortController(); const transport = vi.fn();
    const work = fetchRelayDestination('https://public.publisher.com/', vi.fn(() => new Promise<string[]>(() => {})), transport, { ...init(), signal: controller.signal });
    controller.abort(new Error('fixture deadline'));
    await expect(work).rejects.toThrow('fixture deadline'); expect(transport).not.toHaveBeenCalled();
  });
  it('preserves standard 443 normalization', () => expect(relayTarget('https://public.publisher.com:443/path').href).toBe('https://public.publisher.com/path'));
});
