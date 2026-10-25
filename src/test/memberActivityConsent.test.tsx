// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetConsentForTests, setConsent } from '@/lib/consent';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'consent-test-member' } }) }));
vi.mock('@/components/ActivityTracker', () => ({ ActivityTracker: () => <div data-testid="member-measurement" /> }));
import LightActivityTracker from '@/components/LightActivityTracker';

beforeEach(() => { __resetConsentForTests(); vi.useFakeTimers(); });

describe('member activity consent', () => {
  it('does not mount optional measurement before consent, and removes it on refusal', async () => {
    const view = render(<LightActivityTracker />);
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(view.queryByTestId('member-measurement')).toBeNull();
    act(() => { setConsent('granted'); });
    expect(view.queryByTestId('member-measurement')).not.toBeNull();
    act(() => { setConsent('denied'); });
    expect(view.queryByTestId('member-measurement')).toBeNull();
    view.unmount();
    vi.useRealTimers();
  });
});