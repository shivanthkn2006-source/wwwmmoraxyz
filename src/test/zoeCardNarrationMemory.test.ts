import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasNarratedCard,
  hasStartedDailyNarration,
  markDailyNarrationStarted,
  markNarratedCard,
  narrationDayKey,
} from '@/lib/zoeCardNarrationMemory';

describe('Zoe card narration persistence', () => {
  beforeEach(() => localStorage.clear());

  it('tracks completion per user and card', () => {
    expect(hasNarratedCard('user-a', 'card-1')).toBe(false);
    markNarratedCard('user-a', 'card-1');
    expect(hasNarratedCard('user-a', 'card-1')).toBe(true);
    expect(hasNarratedCard('user-b', 'card-1')).toBe(false);
  });

  it('tracks the daily sequence independently by date', () => {
    markDailyNarrationStarted('user-a', '2026-08-31');
    expect(hasStartedDailyNarration('user-a', '2026-08-31')).toBe(true);
    expect(hasStartedDailyNarration('user-a', '2026-09-01')).toBe(false);
  });

  it('creates a stable local calendar key', () => {
    expect(narrationDayKey(new Date(2026, 7, 31, 23, 59))).toBe('2026-08-31');
  });
});