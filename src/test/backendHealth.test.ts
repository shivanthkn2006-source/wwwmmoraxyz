import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
}));

const getSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}));

import {
  __resetBackendHealth,
  checkBackendHealth,
  getBackendHealth,
  isBackendUsable,
  isTransportFailure,
  recordBackendOutcome,
  subscribeBackendHealth,
} from '@/lib/data/backendHealth';
import { reportPlatformError } from '@/lib/enterpriseTelemetry';

describe('backend health check', () => {
  beforeEach(() => {
    __resetBackendHealth();
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('marks the backend online after a successful probe', async () => {
    const health = await checkBackendHealth(true);
    expect(health.status).toBe('online');
    expect(isBackendUsable()).toBe(true);
  });

  it('escalates degraded → offline and reports to telemetry', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Connection terminated due to connection timeout' },
    });

    expect((await checkBackendHealth(true)).status).toBe('degraded');
    await checkBackendHealth(true);
    const health = await checkBackendHealth(true);

    expect(health.status).toBe('offline');
    expect(isBackendUsable()).toBe(false);
    expect(reportPlatformError).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: 'BackendUnreachable', severity: 'critical' }),
    );
  });

  it('reports recovery exactly once when the backend comes back', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: { message: 'timeout' } });
    await checkBackendHealth(true);
    await checkBackendHealth(true);
    await checkBackendHealth(true);

    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await checkBackendHealth(true);
    await checkBackendHealth(true);

    const recoveries = (reportPlatformError as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([e]) => (e as { errorType: string }).errorType === 'BackendRecovered',
    );
    expect(recoveries).toHaveLength(1);
    expect(getBackendHealth().status).toBe('online');
  });

  it('classifies transport failures but ignores policy denials', () => {
    expect(isTransportFailure('TRANSPORT', 'failed to fetch')).toBe(true);
    expect(isTransportFailure(undefined, 'Connection terminated due to connection timeout')).toBe(
      true,
    );
    expect(isTransportFailure('42501', 'new row violates row-level security policy')).toBe(false);
    expect(isTransportFailure('PGRST116', 'no rows returned')).toBe(false);
  });

  it('does not degrade health on an RLS denial', async () => {
    await checkBackendHealth(true);
    recordBackendOutcome({ ok: false, code: '42501', message: 'row-level security' });
    expect(getBackendHealth().status).toBe('online');
  });

  it('notifies subscribers on every transition', async () => {
    const seen: string[] = [];
    subscribeBackendHealth((h) => seen.push(h.status));
    await checkBackendHealth(true);
    expect(seen[0]).toBe('unknown');
    expect(seen.at(-1)).toBe('online');
  });
});
