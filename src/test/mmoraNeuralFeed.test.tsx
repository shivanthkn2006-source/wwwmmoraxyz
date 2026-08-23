// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const invokeMock = vi.fn();
const feedRows: unknown[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1' } } } })) },
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: feedRows, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

import MmoraNeuralFeed from '@/components/home/MmoraNeuralFeed';

describe('MmoraNeuralFeed', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    feedRows.length = 0;
  });

  it('populates the feed via GOOGLE_API_KEY when YOUTUBE_API_KEY is unset', async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        usedQuery: 'Sun energy',
        dailyTelemetry: { dayName: 'Sunday', rulingPlanet: 'Sun' },
        memoryStored: true,
        feed: { injected: 5, keySource: 'GOOGLE_API_KEY' },
        degraded: [],
      },
      error: null,
    });

    render(<MmoraNeuralFeed />);
    await waitFor(() => expect(screen.getByText(/Refresh Neural Feed/i)).toBeInTheDocument());

    feedRows.push({
      id: '1',
      video_id: 'abc',
      title: 'Solar focus',
      channel_title: 'Zoe',
      thumbnail_url: '',
      triggered_by_query: 'Sun energy',
      astrological_tag: 'Sun_Surya',
      is_viewed: false,
    });

    fireEvent.click(screen.getByText(/Refresh Neural Feed/i));
    await waitFor(() => expect(screen.getByText('Solar focus')).toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledWith('zoe-dhf-brain', expect.anything());
  });

  it('shows a keyboard-navigable retry control when YouTube quota is exhausted', async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        dailyTelemetry: { dayName: 'Sunday', rulingPlanet: 'Sun' },
        memoryStored: true,
        feed: { injected: 0, reason: 'quota_quotaExceeded', retryable: true },
        degraded: ['feed_quota_quotaExceeded'],
      },
      error: null,
    });

    render(<MmoraNeuralFeed />);
    await waitFor(() => expect(screen.getByText(/Refresh Neural Feed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Refresh Neural Feed/i));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/quota or rate limit/i);
    const retry = screen.getByRole('button', { name: /retry/i });
    retry.focus();
    expect(retry).toHaveFocus();
  });

  it('surfaces a recoverable error when the brain function fails', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge_function_failed' } });
    render(<MmoraNeuralFeed />);
    await waitFor(() => expect(screen.getByText(/Refresh Neural Feed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Refresh Neural Feed/i));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload cached feed/i })).toBeInTheDocument();
  });
});
