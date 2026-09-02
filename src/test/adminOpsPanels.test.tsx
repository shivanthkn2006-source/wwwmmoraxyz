// @vitest-environment jsdom
/**
 * Render coverage for the admin operations panels added to /admin/overview:
 * edge function health, DHF link health, load tests and the growth onboarding
 * wizard. Each panel must surface its data (or a clear empty state) rather than
 * crashing when the backend returns nothing.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const probeRows = [
  { fn: 'zoe-chat', status: 401, ok: true, category: 'auth_required', note: null, duration_ms: 120, checked_at: '2026-09-02T05:00:00Z' },
  { fn: 'opensky-states', status: 504, ok: false, category: 'timeout', note: 'upstream_timeout', duration_ms: 8000, checked_at: '2026-09-02T05:00:00Z' },
];

const linkRuns = [
  { id: 'r1', checked: 64, dead: 0, deactivated: 0, errors: 0, detail: [], started_at: '2026-09-02T03:35:00Z', finished_at: '2026-09-02T03:36:00Z' },
];

const loadTests = [
  { id: 'l1', target: 'sentinel-guard', concurrency: 500, total_requests: 500, succeeded: 500, failed: 0, p50_ms: 377, p95_ms: 506, p99_ms: 555, max_ms: 636, notes: null, ran_at: '2026-09-02T05:20:00Z' },
];

const tableData: Record<string, unknown[]> = {
  edge_function_probes: probeRows,
  dhf_link_health_runs: linkRuns,
  platform_load_tests: loadTests,
};

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const result = { data: tableData[table] ?? [], error: null, count: 64 };
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'eq', 'in', 'limit']) {
      chain[method] = () => chain;
    }
    (chain as { then: unknown }).then = (resolve: (value: unknown) => unknown) => resolve(result);
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => builder(table),
      auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
      functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    },
  };
});

import EdgeFunctionHealthPanel from '@/components/admin/EdgeFunctionHealthPanel';
import DhfLinkHealthPanel from '@/components/admin/DhfLinkHealthPanel';
import LoadTestPanel from '@/components/admin/LoadTestPanel';
import GrowthOnboardingWizard from '@/components/admin/GrowthOnboardingWizard';

describe('admin operations panels', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { ok: true, users: [], notOnboardedCount: 0 }, error: null });
  });

  it('flags failing edge functions from the latest probe batch', async () => {
    render(<EdgeFunctionHealthPanel />);
    await waitFor(() => expect(screen.getByText(/1 need attention/)).toBeTruthy());
    expect(screen.getByText('opensky-states')).toBeTruthy();
  });

  it('shows the latest DHF link-health sweep', async () => {
    render(<DhfLinkHealthPanel />);
    await waitFor(() => expect(screen.getByText('64', { selector: 'p' })).toBeTruthy());
    expect(screen.getByText('deactivated')).toBeTruthy();
  });

  it('lists persisted load-test results', async () => {
    render(<LoadTestPanel />);
    await waitFor(() => expect(screen.getByText('sentinel-guard')).toBeTruthy());
    expect(screen.getByText('500/500')).toBeTruthy();
  });

  it('reports full growth-preference coverage when nothing is missing', async () => {
    render(<GrowthOnboardingWizard />);
    await waitFor(() => expect(screen.getByText('Every member has growth preferences.')).toBeTruthy());
    expect(invokeMock).toHaveBeenCalledWith('growth-onboarding-backfill', expect.objectContaining({
      body: { action: 'list' },
    }));
  });
});
