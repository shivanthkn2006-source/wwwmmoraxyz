import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '@/features/calls/callPush';

describe('call ring registration', () => {
  it('decodes the ring key into the byte form browsers require', () => {
    const bytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4); // uncompressed public key marker
  });
});
