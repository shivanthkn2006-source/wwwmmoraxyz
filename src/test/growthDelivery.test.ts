import { describe, expect, it } from 'vitest';
import { missingWindows } from '@/hooks/useGrowthDelivery';
import type { ScheduleEntry } from '@/hooks/useGrowthStatus';

const entry = (slot: string, passed: boolean, hasItem: boolean): ScheduleEntry => ({
  slot: slot as ScheduleEntry['slot'],
  label: slot,
  local_time: '08:00',
  passed,
  status: hasItem ? 'delivered' : passed ? 'pending' : 'scheduled',
  item: hasItem
    ? { id: slot, slot: slot as ScheduleEntry['slot'], title: 't', category: 'c', status: 'delivered', source: 'worker', created_at: '' }
    : null,
});

describe('Growth delivery gaps', () => {
  it('reports only elapsed windows with no card', () => {
    const gaps = missingWindows([
      entry('morning', true, true),
      entry('midday', true, false),
      entry('evening', false, false),
    ]);
    expect(gaps.map((g) => g.slot)).toEqual(['midday']);
  });

  it('reports nothing when every elapsed window is delivered', () => {
    expect(missingWindows([entry('morning', true, true)])).toEqual([]);
  });

  it('tolerates a missing schedule', () => {
    expect(missingWindows(undefined)).toEqual([]);
  });
});
