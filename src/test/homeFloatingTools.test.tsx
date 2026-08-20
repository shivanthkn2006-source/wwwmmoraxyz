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

const invokeCalls: Array<{ name: string; options: any }> = [];
let ambientResponse: any = {
  data: {
    requestId: 'as-test',
    synthesis: 'Here is what I found on your loops.',
    intent: { intent: 'informational', requiresAction: false, normalizedQuery: 'zoe' },
    nodesEvaluated: 1,
    records: [
      {
        id: 'idx-1',
        entity_type: 'loop_video',
        entity_id: 'loop-9',
        content_synthesis: 'Skateboarding loop at sunset',
        metadata: {},
        social_weight: 1,
        score: 0.9,
      },
    ],
    timings: { routeMs: 40, retrievalMs: 12, synthesisMs: 300, totalMs: 360 },
  },
  error: null,
};

const TEST_JWT = 'test-jwt-token';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u-me' } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: TEST_JWT, user: { id: 'u-me' } } } })),
    },
    functions: {
      invoke: vi.fn(async (name: string, options: any) => {
        invokeCalls.push({ name, options });
        return ambientResponse;
      }),
    },
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
    invokeCalls.length = 0;
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

  it('routes submission through zoe-ambient-search with the authenticated client', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'sunset loops' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(invokeCalls.length).toBe(1), { timeout: 3000 });
    expect(invokeCalls[0].name).toBe('zoe-ambient-search');
    expect(invokeCalls[0].options.body.queryText).toBe('sunset loops');
    expect(typeof invokeCalls[0].options.body.requestId).toBe('string');

    // The shared client carries the current user's JWT for the edge call.
    const { data } = await (supabase as any).auth.getSession();
    expect(data.session.access_token).toBe(TEST_JWT);

    await waitFor(() => expect(screen.getByText(/Here is what I found/)).toBeTruthy());
  });

  it('navigates to the entity route when an ambient record is chosen', async () => {
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'sunset loops' } });
    fireEvent.submit(input.closest('form')!);

    const record = await screen.findByText('Skateboarding loop at sunset', undefined, { timeout: 3000 });
    fireEvent.click(record.closest('button')!);
    expect(navigateSpy).toHaveBeenCalledWith('/home?post=loop-9');
  });

  it('follows a <zoe_dispatch> action returned by the orchestrator', async () => {
    ambientResponse = {
      data: {
        synthesis: 'Opening your profile.\n<zoe_dispatch>{"action":"OPEN_PROFILE","payload":{"userId":"u-42"}}</zoe_dispatch>',
        intent: { intent: 'actionable', requiresAction: true, normalizedQuery: 'open my profile' },
        nodesEvaluated: 0,
        records: [],
      },
      error: null,
    };
    render(<Harness />);
    toggleSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'open my profile' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/profile/u-42'), { timeout: 3000 });
  });
});
