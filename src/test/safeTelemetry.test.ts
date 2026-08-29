// @vitest-environment jsdom
// Telemetry writes must never fire without a live session (that is what caused
// the RLS error storms) and must always stamp the live auth uid.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const insert = vi.fn();
const from = vi.fn((_table: string) => ({ insert }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: () => getSession() }, from: (t: string) => from(t) },
}));

const { logTelemetry, __resetTelemetryAuthCache } = await import('@/lib/safeTelemetry');

describe('safeTelemetry', () => {
  beforeEach(() => {
    __resetTelemetryAuthCache();
    from.mockClear();
    insert.mockReset().mockResolvedValue({ error: null });
    getSession.mockReset();
  });

  it('drops the write when signed out, without touching the API', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const res = await logTelemetry('behavioral_events', { event_type: 'x' });
    expect(res).toEqual({ ok: false, skipped: 'signed-out' });
    expect(from).not.toHaveBeenCalled();
  });

  it('stamps the live uid and overrides a caller-supplied user_id', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'live-uid' } } } });
    const res = await logTelemetry('feed_diagnostics_log', { user_id: null, status: 'error' });
    expect(res.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({ status: 'error', user_id: 'live-uid' });
  });

  it('reports RLS denials without throwing and re-resolves the session next time', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    insert.mockResolvedValueOnce({ error: { message: 'denied', code: '42501' } });
    const res = await logTelemetry('behavioral_events', { event_type: 'x' });
    expect(res.ok).toBe(false);
    await logTelemetry('behavioral_events', { event_type: 'y' });
    expect(getSession).toHaveBeenCalledTimes(2);
  });
});
