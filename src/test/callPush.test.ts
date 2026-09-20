import { describe, expect, it } from 'vitest';
import { getCallPushRegistration, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '@/features/calls/callPush';

describe('call ring registration', () => {
  it('decodes the ring key into the byte form browsers require', () => {
    const bytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4); // uncompressed public key marker
  });

  it('waits for the production worker when registration is still starting', async () => {
    const ready = { pushManager: {} } as ServiceWorkerRegistration;
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: async () => undefined, ready: Promise.resolve(ready) },
    });
    await expect(getCallPushRegistration()).resolves.toBe(ready);
  });
});
