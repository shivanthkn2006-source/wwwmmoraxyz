// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

const profilesResult = {
  data: [
    { user_id: 'u-1', display_name: 'Zoe Fan', username: 'zoefan', profile_photo_url: null },
  ],
  error: null,
};
const postsResult = { data: [], error: null };

const selectCalls: string[] = [];

function makeBuilder(table: string) {
  const result = table === 'public_profiles' ? profilesResult : postsResult;
  const builder: any = {};
  const chain = () => builder;
  ['select', 'or', 'eq', 'ilike', 'order'].forEach((m) => {
    builder[m] = vi.fn(chain);
  });
  builder.limit = vi.fn(chain);
  builder.abortSignal = vi.fn((signal: AbortSignal) => {
    selectCalls.push(`${table}:${signal ? 'signal' : 'none'}`);
    return Promise.resolve(result);
  });
  builder.insert = vi.fn(() => Promise.resolve({ error: null }));
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
  },
}));

vi.mock('@/data/appFeatures', () => ({
  searchFeatures: vi.fn(() => [
    { id: 'zoe', name: 'Zoe AI Assistant', description: 'Talk to Zoe', location: '/zoe-infinity' },
  ]),
}));

import HomeFloatingTools from '@/components/home/HomeFloatingTools';

function Harness() {
  const [query, setQuery] = React.useState('');
  return (
    <MemoryRouter>
      <HomeFloatingTools query={query} onQueryChange={setQuery} onOpenEditor={() => {}} />
    </MemoryRouter>
  );
}

function toggleSearch() {
  const trigger = screen.getByRole('button', { name: /search home|close home search/i });
  fireEvent.pointerDown(trigger, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(trigger, { pointerId: 1, clientX: 10, clientY: 10 });
}

describe('HomeFloatingTools sideways search', () => {
  beforeEach(() => {
    selectCalls.length = 0;
    navigateSpy.mockReset();
    vi.useRealTimers();
  });
  afterEach(() => cleanup());

  it('toggles open and closed on touch/click of the icon', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /search home/i })).toBeTruthy();
    toggleSearch();
    expect(screen.getByRole('button', { name: /close home search/i })).toBeTruthy();
    toggleSearch();
    expect(screen.getByRole('button', { name: /search home/i })).toBeTruthy();
  });

  it('opens via keyboard Enter and closes on Escape', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /search home/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /close home search/i })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /search home/i })).toBeTruthy();
  });

  it('calls the search backend and renders loading then results', async () => {
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zoe' } });

    expect(screen.getByRole('status').textContent).toContain('Searching');

    await waitFor(() => {
      expect(screen.getByText('Zoe Fan')).toBeTruthy();
    }, { timeout: 3000 });

    expect(selectCalls.some((c) => c.startsWith('public_profiles'))).toBe(true);
    expect(selectCalls.every((c) => c.endsWith('signal'))).toBe(true);
    expect(screen.getByText('Zoe AI Assistant')).toBeTruthy();
  });

  it('navigates with arrow keys + Enter', async () => {
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zoe' } });
    await waitFor(() => expect(screen.getByText('Zoe Fan')).toBeTruthy(), { timeout: 3000 });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/profile/u-1'));
  });

  it('debounces rapid typing into a single backend round trip', async () => {
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    ['z', 'zo', 'zoe', 'zoei'].forEach((v) => fireEvent.change(input, { target: { value: v } }));

    await waitFor(() => expect(selectCalls.length).toBeGreaterThan(0), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    // one profiles + one posts query only
    expect(selectCalls.length).toBe(2);
  });
});
