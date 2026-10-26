/* @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

/** Harness: mounts the hook, loads the wallet, then runs one payment on click. */
function PaymentHarness({ feature, method }: { feature: string; method: 'credits' | 'karma_points' }) {
  const rails = useCDSPPaymentRails();
  const [outcome, setOutcome] = React.useState<string>('');
  React.useEffect(() => { void rails.fetchWalletBalance(); }, [rails.fetchWalletBalance]);
  return (
    <div>
      <div data-testid="wallet">{rails.wallet ? `${rails.wallet.credits}c/${rails.wallet.karmaPoints}k` : 'none'}</div>
      <button
        onClick={async () => {
          const r = await rails.processPayment(feature, method);
          setOutcome(r.success ? `ok:${r.transactionId ? 'txn' : ''}` : `err:${r.error}`);
        }}
      >
        pay
      </button>
      <div data-testid="outcome">{outcome}</div>
    </div>
  );
}

describe('CDSP payment rails', () => {
  it('spends credits through the server function, never a client balance write', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: 8_000, error: null });
    render(<PaymentHarness feature="dreams_analysis" method="credits" />);
    await screen.findByText('10c/5000k');

    fireEvent.click(screen.getByRole('button', { name: 'pay' }));
    await screen.findByText(/^ok:/, { selector: '[data-testid="outcome"]' });

    // 5 credits × 1,000 points per credit
    expect(mocks.rpc).toHaveBeenCalledWith('spend_credits', { p_credits: 5_000 });
  });

  it('fails closed with the real server reason when the credit spend is rejected', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not enough credits' } });
    render(<PaymentHarness feature="dreams_analysis" method="credits" />);
    await screen.findByText('10c/5000k');

    fireEvent.click(screen.getByRole('button', { name: 'pay' }));
    await screen.findByText('err:not enough credits', { selector: '[data-testid="outcome"]' });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('spends karma through spend_resonance_points', async () => {
    stubWalletFetch();
    mocks.rpc.mockResolvedValue({ data: 4_500, error: null });
    render(<PaymentHarness feature="dreams_analysis" method="karma_points" />);
    await screen.findByText('10c/5000k');

    fireEvent.click(screen.getByRole('button', { name: 'pay' }));
    await screen.findByText(/^ok:/, { selector: '[data-testid="outcome"]' });
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
