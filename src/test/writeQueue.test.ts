// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}));

import {
  __resetWriteQueue,
  backoffDelay,
  enqueueWrite,
  flushWriteQueue,
  pendingWriteCount,
  registerWriteExecutor,
  type QueuedWrite,
} from '@/lib/data/writeQueue';
import { __resetBackendHealth, recordBackendOutcome } from '@/lib/data/backendHealth';
import { reportPlatformError } from '@/lib/enterpriseTelemetry';

const flushDue = () => flushWriteQueue({ force: true });

describe('write queue — durable buffering with exponential backoff', () => {
  beforeEach(() => {
    __resetWriteQueue();
    __resetBackendHealth();
    localStorage.clear();
    vi.clearAllMocks();
    recordBackendOutcome({ ok: true });
  });

  it('buffers writes and replays them once the executor succeeds', async () => {
    const seen: QueuedWrite[] = [];
    registerWriteExecutor('agent_interactions', async (item) => {
      seen.push(item);
      return { ok: true };
    });

    enqueueWrite({
      table: 'agent_interactions',
      op: 'insert',
      groupKey: 'agent_moksh',
      payload: { agent_id: 'agent_moksh', context_payload: { intimacy_level: 4 } },
    });
    expect(pendingWriteCount('agent_interactions')).toBe(1);

    const result = await flushDue();
    expect(result.sent).toBe(1);
    expect(pendingWriteCount('agent_interactions')).toBe(0);
    expect(seen[0].payload.agent_id).toBe('agent_moksh');
  });

  it('keeps the item queued and backs off on a transport failure', async () => {
    let attempts = 0;
    registerWriteExecutor('agent_interactions', async () => {
      attempts += 1;
      return { ok: false, code: 'TRANSPORT', error: 'Connection terminated due to timeout' };
    });

    enqueueWrite({ table: 'agent_interactions', op: 'insert', payload: { a: 1 } });
    const res = await flushDue();

    expect(attempts).toBe(1);
    expect(res.sent).toBe(0);
    expect(pendingWriteCount('agent_interactions')).toBe(1);
    const [item] = JSON.parse(localStorage.getItem('mmora.writeQueue.v1') ?? '[]');
    expect(item.attempts).toBe(1);
    expect(item.nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it('drops permanently rejected writes (RLS/constraint) and reports them', async () => {
    registerWriteExecutor('agent_interactions', async () => ({
      ok: false,
      code: '42501',
      error: 'new row violates row-level security policy',
    }));

    enqueueWrite({ table: 'agent_interactions', op: 'insert', payload: { a: 1 } });
    await flushDue();

    expect(pendingWriteCount('agent_interactions')).toBe(0);
    expect(reportPlatformError).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: 'QueuedWriteRejected' }),
    );
  });

  it('survives a reload by rehydrating from localStorage', async () => {
    registerWriteExecutor('agent_interactions', async () => ({
      ok: false,
      code: 'TRANSPORT',
      error: 'failed to fetch',
    }));
    enqueueWrite({ table: 'agent_interactions', op: 'insert', payload: { keep: true } });
    await flushDue();

    const raw = localStorage.getItem('mmora.writeQueue.v1');
    expect(raw).toContain('"keep":true');
  });

  it('grows the delay exponentially and clamps it', () => {
    const half = () => 0.5;
    const d0 = backoffDelay(0, half);
    const d1 = backoffDelay(1, half);
    const d3 = backoffDelay(3, half);
    expect(d1).toBeGreaterThan(d0);
    expect(d3).toBeGreaterThan(d1);
    expect(backoffDelay(40, half)).toBeLessThanOrEqual(5 * 60 * 1000);
    expect(backoffDelay(2, () => 0)).toBeLessThan(backoffDelay(2, () => 0.999));
  });
});
