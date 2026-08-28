import { describe, it, expect } from 'vitest';
import {
  elapsedSlots, sanitizeStyles, slotOrder, slotsForFrequency,
  currentSlot, missingElapsedSlots, ALL_REFLECTION_STYLES,
} from '@/lib/growthSlot';

const at = (iso: string) => new Date(iso);

describe('growth slot catch-up', () => {
  it('returns every window already passed today, in order', () => {
    // 20:00 in Kolkata
    const slots = elapsedSlots(at('2026-08-28T14:30:00Z'), 'Asia/Kolkata');
    expect(slots).toEqual(['morning', 'midday', 'afternoon', 'evening']);
  });

  it('returns nothing before the first window', () => {
    // 05:00 Kolkata
    expect(elapsedSlots(at('2026-08-27T23:30:00Z'), 'Asia/Kolkata')).toEqual([]);
  });

  it('honours the frequency subset', () => {
    const enabled = slotsForFrequency(2); // morning + evening
    const slots = elapsedSlots(at('2026-08-28T14:30:00Z'), 'Asia/Kolkata', enabled);
    expect(slots).toEqual(['morning', 'evening']);
  });

  it('keeps chronological ordering stable', () => {
    expect(slotOrder('morning')).toBeLessThan(slotOrder('night'));
  });

  it('returns every missing elapsed slot in one catch-up pass', () => {
    const missing = missingElapsedSlots(
      at('2026-08-28T14:30:00Z'),
      'Asia/Kolkata',
      ['midday'],
    );
    expect(missing).toEqual(['morning', 'afternoon', 'evening']);
  });

  it('still resolves a current slot after midnight', () => {
    expect(currentSlot(at('2026-08-28T20:30:00Z'), 'Asia/Kolkata')).toBe('night');
  });
});

describe('multi-select reflection styles', () => {
  it('accepts all four', () => {
    expect(sanitizeStyles(ALL_REFLECTION_STYLES)).toHaveLength(4);
  });

  it('drops unknown values and dedupes', () => {
    expect(sanitizeStyles(['actionable', 'actionable', 'hack', null])).toEqual(['actionable']);
  });

  it('never returns empty', () => {
    expect(sanitizeStyles([])).toEqual(['actionable']);
    expect(sanitizeStyles(undefined)).toEqual(['actionable']);
  });
});
