import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const refreshSession = vi.fn();
const liveAccessToken = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    auth: { refreshSession: (...args: unknown[]) => refreshSession(...args) },
  },
}));

vi.mock('@/lib/edgeSession', () => ({
  liveAccessToken: (...args: unknown[]) => liveAccessToken(...args),
}));

import { invokeGrowthDispatch } from '@/lib/growthDispatch';

describe('growth dispatch session handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveAccessToken.mockResolvedValue('old-token');
    refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } } });
  });

  it('does not call the worker without a live session', async () => {
    liveAccessToken.mockResolvedValue(null);
    await expect(invokeGrowthDispatch({ action: 'me-status' })).resolves.toEqual({
      data: null, error: null, signedOut: true,
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('refreshes once after a rejected stale token', async () => {
    invoke
      .mockResolvedValueOnce({ data: null, error: { context: { status: 401 }, message: 'FunctionsHttpError' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    await expect(invokeGrowthDispatch({ action: 'catchup-me' })).resolves.toEqual({
      data: { ok: true }, error: null, signedOut: false,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'growth-dispatch', expect.objectContaining({
      headers: { Authorization: 'Bearer fresh-token' },
    }));
  });

  it('turns the worker signed-out payload into a quiet result', async () => {
    invoke.mockResolvedValue({
      data: { ok: false, signedOut: true, error: 'sign in required' }, error: null,
    });
    await expect(invokeGrowthDispatch({ action: 'me-status' })).resolves.toEqual({
      data: null, error: null, signedOut: true,
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('soft-fails when both the old and refreshed tokens are rejected', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Invalid session') });
    await expect(invokeGrowthDispatch({ action: 'me-status' })).resolves.toEqual({
      data: null, error: null, signedOut: true,
    });
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});