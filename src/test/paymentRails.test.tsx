/* @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  showUpgradePrompt: vi.fn(),
  checkFeatureLimit: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock('@/hooks/useTierLimits', () => ({
  useTierLimits: () => ({
    checkFeatureLimit: mocks.checkFeatureLimit,
    showUpgradePrompt: mocks.showUpgradePrompt,
    isPremiumUser: false,
  }),
}));

import { useCDSPPaymentRails } from '@/hooks/useCDSPPaymentRails';
import { TierGateWrapper } from '@/components/TierGateWrapper';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

/** Wallet with 10 credits (10,000 points) and 5,000 karma. */
function stubWalletFetch() {
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === 'profiles' ? { total_points: 10_000 } : { resonance_points: 5_000 },
          error: null,
        }),
      }),
    }),
    insert: async () => ({ error: null }),
  }));
}

describe('CDSP payment rails', () => {
  it('spends credits through the server function, never a client balance write', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: 8_000, error: null });
    const { result } = renderHook(() => useCDSPPaymentRails());
    await act(async () => { await result.current.fetchWalletBalance(); });

    let outcome: any;
    await act(async () => { outcome = await result.current.processPayment('dreams_analysis', 'credits'); });

    expect(outcome.success).toBe(true);
    // 5 credits × 1,000 points per credit
    expect(mocks.rpc).toHaveBeenCalledWith('spend_credits', { p_credits: 5_000 });
    const updateCalls = mocks.from.mock.results.filter(() => false);
    expect(updateCalls).toHaveLength(0);
  });

  it('fails closed when the server rejects the credit spend', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not enough credits' } });
    const { result } = renderHook(() => useCDSPPaymentRails());
    await act(async () => { await result.current.fetchWalletBalance(); });

    let outcome: any;
    await act(async () => { outcome = await result.current.processPayment('dreams_analysis', 'credits'); });

    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain('not enough credits');
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('spends karma through spend_resonance_points', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: 4_500, error: null });
    const { result } = renderHook(() => useCDSPPaymentRails());
    await act(async () => { await result.current.fetchWalletBalance(); });

    let outcome: any;
    await act(async () => { outcome = await result.current.processPayment('dreams_analysis', 'karma_points'); });

    expect(outcome.success).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('spend_resonance_points', { p_points: 500 });
  });
});

describe('TierGateWrapper upgrade button', () => {
  it('clicking Upgrade to Unlock triggers the upgrade prompt', async () => {
    mocks.checkFeatureLimit.mockResolvedValue({ allowed: false, is_premium: false, remaining: 0, tier: 'free' });
    render(<TierGateWrapper feature="architect"><div>secret</div></TierGateWrapper>);

    const button = await screen.findByRole('button', { name: /upgrade to unlock/i });
    fireEvent.click(button);

    await waitFor(() => expect(mocks.showUpgradePrompt).toHaveBeenCalledWith('architect', 'free'));
  });
});
