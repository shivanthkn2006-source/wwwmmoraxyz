import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetConsentForTests,
  analyticsAllowed,
  getConsent,
  getRegionState,
  needsDecision,
  onConsentChange,
  resolveRegion,
  setConsent,
} from '@/lib/consent';

function mockTrace(body: string | null, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (body === null) throw new Error('network down');
    return { ok, text: async () => body } as Response;
  }));
}

beforeEach(() => {
  __resetConsentForTests();
  vi.unstubAllGlobals();
});

describe('consent region resolution', () => {
  it('treats an EU country as a consent region', async () => {
    mockTrace('loc=DE\n');
    await resolveRegion();
    expect(getRegionState()).toBe('consent-region');
    expect(needsDecision()).toBe(true);
    expect(analyticsAllowed()).toBe(false); // deny by default until the visitor decides
  });

  it('treats the US as an open region where measurement runs by default', async () => {
    mockTrace('loc=US\n');
    await resolveRegion();
    expect(getRegionState()).toBe('open-region');
    expect(needsDecision()).toBe(false);
    expect(analyticsAllowed()).toBe(true);
  });

  it('fails closed on network error, unknown (XX) and Tor (T1)', async () => {
    mockTrace(null);
    await resolveRegion();
    expect(getRegionState()).toBe('consent-region');

    __resetConsentForTests();
    mockTrace('loc=XX\n');
    await resolveRegion();
    expect(getRegionState()).toBe('consent-region');

    __resetConsentForTests();
    mockTrace('loc=T1\n');
    await resolveRegion();
    expect(getRegionState()).toBe('consent-region');
  });

  it('fails closed on a non-OK trace response', async () => {
    mockTrace('loc=US\n', false);
    await resolveRegion();
    expect(getRegionState()).toBe('consent-region');
  });
});

describe('consent choices', () => {
  it('acceptance enables measurement immediately and notifies listeners', async () => {
    mockTrace('loc=FR\n');
    await resolveRegion();
    const seen: boolean[] = [];
    onConsentChange(() => seen.push(analyticsAllowed()));
    setConsent('granted');
    expect(analyticsAllowed()).toBe(true);
    expect(seen).toEqual([true]);
    expect(getConsent()?.analytics).toBe('granted');
    expect(getConsent()?.region).toBe('FR');
  });

  it('refusal in an open region disables measurement and persists', async () => {
    mockTrace('loc=US\n');
    await resolveRegion();
    expect(analyticsAllowed()).toBe(true);
    setConsent('denied');
    expect(analyticsAllowed()).toBe(false);
    // Survives a reload (fresh module state, same localStorage).
    __resetConsentForTests();
    expect(analyticsAllowed()).toBe(false);
  });

  it('an explicit refusal is never overridden by region', async () => {
    mockTrace('loc=US\n');
    await resolveRegion();
    setConsent('denied');
    __resetConsentForTests();
    mockTrace('loc=US\n');
    await resolveRegion();
    expect(analyticsAllowed()).toBe(false);
  });

  it('a saved decision means no banner, even in a consent region', async () => {
    mockTrace('loc=DE\n');
    await resolveRegion();
    setConsent('granted');
    expect(needsDecision()).toBe(false);
  });

  it('ignores corrupt or wrong-version stored records', async () => {
    localStorage.setItem('mmora-consent-v1', JSON.stringify({ version: 999, analytics: 'granted' }));
    expect(getConsent()).toBeNull();
    localStorage.setItem('mmora-consent-v1', 'not json');
    __resetConsentForTests();
    expect(getConsent()).toBeNull();
  });
});
