import { describe, it, expect, beforeEach } from 'vitest';
import {
  cotStart,
  cotFinish,
  cotTrack,
  getCotWiringSnapshot,
  subscribeCotWiring,
  resetCotWiring,
} from '@/utils/cotWiringBus';

describe('cotWiringBus', () => {
  beforeEach(() => resetCotWiring());

  it('marks a service active on start', () => {
    cotStart('zoe-chat');
    const [row] = getCotWiringSnapshot();
    expect(row.service).toBe('zoe-chat');
    expect(row.status).toBe('active');
    expect(row.lastRequestAt).toBeTypeOf('number');
  });

  it('records success with latency', () => {
    const t = cotStart('zoe-core-intelligence');
    cotFinish(t, { ok: true });
    const [row] = getCotWiringSnapshot();
    expect(row.status).toBe('ok');
    expect(row.okCount).toBe(1);
    expect(row.errorCount).toBe(0);
    expect(row.lastLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('records errors with a readable message', () => {
    const t = cotStart('zoe-chat');
    cotFinish(t, { error: new Error('boom') });
    const [row] = getCotWiringSnapshot();
    expect(row.status).toBe('error');
    expect(row.errorCount).toBe(1);
    expect(row.lastError).toBe('boom');
  });

  it('ignores unknown or duplicate finish tokens', () => {
    const t = cotStart('zoe-chat');
    cotFinish(t, { ok: true });
    cotFinish(t, { error: new Error('late') });
    cotFinish('bogus#1', { ok: true });
    const [row] = getCotWiringSnapshot();
    expect(row.okCount).toBe(1);
    expect(row.errorCount).toBe(0);
  });

  it('notifies subscribers immediately and on change', () => {
    const seen: number[] = [];
    const unsub = subscribeCotWiring((rows) => seen.push(rows.length));
    expect(seen[0]).toBe(0);
    cotStart('zoe-chat');
    expect(seen[seen.length - 1]).toBe(1);
    unsub();
    cotStart('zoe-agent');
    expect(seen[seen.length - 1]).toBe(1);
  });

  it('cotTrack resolves and marks ok', async () => {
    await cotTrack('zoe-agent', async () => 'done');
    const [row] = getCotWiringSnapshot();
    expect(row.status).toBe('ok');
  });

  it('cotTrack rethrows and marks error', async () => {
    await expect(cotTrack('zoe-agent', async () => { throw new Error('nope'); })).rejects.toThrow('nope');
    const [row] = getCotWiringSnapshot();
    expect(row.status).toBe('error');
    expect(row.lastError).toBe('nope');
  });

  it('sorts most recent request first', () => {
    cotFinish(cotStart('zoe-chat'), { ok: true });
    cotFinish(cotStart('zoe-core-intelligence'), { ok: true });
    expect(getCotWiringSnapshot()[0].service).toBe('zoe-core-intelligence');
  });
});
