import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldWriteHealthSnapshot,
  __resetHealthSnapshotThrottle,
  HEALTH_SNAPSHOT_WINDOW_MS,
} from '@/lib/safeTelemetry';

const base = { source: 'monitor', score: 90, status: 'healthy', issues_count: 0, critical_issues: 0 };

describe('health snapshot throttle', () => {
  beforeEach(() => __resetHealthSnapshotThrottle());

  it('writes the first snapshot from a source', () => {
    expect(shouldWriteHealthSnapshot(base, 0)).toBe(true);
  });

  it('drops unchanged snapshots inside the window', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot(base, 60_000)).toBe(false);
    expect(shouldWriteHealthSnapshot(base, 10 * 60_000)).toBe(false);
  });

  it('writes an unchanged snapshot again once the window elapses', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot(base, HEALTH_SNAPSHOT_WINDOW_MS)).toBe(true);
  });

  it('always writes a genuine status change immediately', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot({ ...base, status: 'critical', critical_issues: 2 }, 1_000)).toBe(true);
  });

  it('keeps sources independent', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot({ ...base, source: 'self-healer' }, 1_000)).toBe(true);
  });

  it('honours force for one-off events', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot({ ...base, force: true }, 1_000)).toBe(true);
  });

  it('ignores sub-bucket score jitter', () => {
    shouldWriteHealthSnapshot(base, 0);
    expect(shouldWriteHealthSnapshot({ ...base, score: 92 }, 1_000)).toBe(false);
  });
});
