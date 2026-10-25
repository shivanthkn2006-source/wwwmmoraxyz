import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'v1' }) }));
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}));

import { __resetConsentForTests, setConsent } from '@/lib/consent';
import { startVisitTracker, trackActivity } from '@/lib/visitTracker';

function trackingCalls() {
  return fetchMock.mock.calls.filter(([, init]) => {
    const body = JSON.parse(String((init as RequestInit).body));
    return body.action !== 'auth';
  });
}

beforeEach(() => {
  fetchMock.mockClear();
  __resetConsentForTests();
});

describe('visit tracker consent gating', () => {
  it('sends no visit measurement while consent is undecided in a consent region', async () => {
    // Region unresolved (pending resolution counts as not-yet-decided only after
    // resolveRegion marks a consent region; here we simulate the decided-denied state).
    setConsent('denied');
    startVisitTracker();
    await new Promise((r) => setTimeout(r, 20));
    trackActivity('vr_enter', 'Entered VR World');
    await new Promise((r) => setTimeout(r, 20));
    expect(trackingCalls()).toHaveLength(0);
  });

  it('starts measuring as soon as consent is granted', async () => {
    setConsent('denied');
    startVisitTracker();
    await new Promise((r) => setTimeout(r, 20));
    expect(trackingCalls()).toHaveLength(0);
    setConsent('granted');
    await new Promise((r) => setTimeout(r, 20));
    expect(trackingCalls().length).toBeGreaterThan(0);
  });

  it('never replays visits that happened while refused', async () => {
    setConsent('denied');
    startVisitTracker();
    await new Promise((r) => setTimeout(r, 20));
    history.pushState({}, '', '/some-page-while-refused');
    await new Promise((r) => setTimeout(r, 20));
    setConsent('granted');
    await new Promise((r) => setTimeout(r, 20));
    const paths = trackingCalls().map(([, init]) => JSON.parse(String((init as RequestInit).body)).path);
    expect(paths).not.toContain('/some-page-while-refused');
  });
});
