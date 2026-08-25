import { describe, it, expect } from 'vitest';
import {
  currentSlot,
  localDateKey,
  localClock,
  pickSlotRow,
  slotPreferenceOrder,
  type AstroSlot,
} from '@/lib/astroSlot';

/** Build a UTC instant from an ISO string. */
const utc = (iso: string) => new Date(iso);

describe('astroSlot — slot mapping across IANA zones', () => {
  const cases: Array<{ iso: string; tz: string; slot: AstroSlot; date: string; clock: string }> = [
    // 05:19 IST — the original bug: UTC date said "yesterday", slot said "night".
    { iso: '2026-08-24T23:49:00Z', tz: 'Asia/Kolkata', slot: 'morning', date: '2026-08-25', clock: '05:19' },
    { iso: '2026-08-25T09:00:00Z', tz: 'Asia/Kolkata', slot: 'noon', date: '2026-08-25', clock: '14:30' },
    { iso: '2026-08-25T13:00:00Z', tz: 'Asia/Kolkata', slot: 'evening', date: '2026-08-25', clock: '18:30' },
    { iso: '2026-08-25T17:00:00Z', tz: 'Asia/Kolkata', slot: 'night', date: '2026-08-25', clock: '22:30' },
    { iso: '2026-08-25T10:00:00Z', tz: 'America/New_York', slot: 'morning', date: '2026-08-25', clock: '06:00' },
    { iso: '2026-08-25T20:00:00Z', tz: 'America/New_York', slot: 'noon', date: '2026-08-25', clock: '16:00' },
    { iso: '2026-08-25T23:00:00Z', tz: 'America/New_York', slot: 'evening', date: '2026-08-25', clock: '19:00' },
    { iso: '2026-08-25T08:00:00Z', tz: 'Australia/Sydney', slot: 'night', date: '2026-08-25', clock: '18:00' },
    { iso: '2026-08-25T12:00:00Z', tz: 'Pacific/Kiritimati', slot: 'morning', date: '2026-08-26', clock: '02:00' },
    { iso: '2026-08-25T12:00:00Z', tz: 'UTC', slot: 'morning', date: '2026-08-25', clock: '12:00' },
    { iso: '2026-08-25T05:00:00Z', tz: 'Asia/Kathmandu', slot: 'morning', date: '2026-08-25', clock: '10:45' },
  ];

  for (const c of cases) {
    it(`${c.tz} @ ${c.iso} → ${c.slot}`, () => {
      const d = utc(c.iso);
      expect(localClock(d, c.tz)).toBe(c.clock);
      expect(localDateKey(d, c.tz)).toBe(c.date);
      expect(currentSlot(d, c.tz)).toBe(c.slot);
    });
  }
});

describe('astroSlot — boundary minutes', () => {
  const tz = 'Europe/London';
  it('one minute before the morning slot still reads night', () => {
    // 00:01 BST = 23:01 UTC previous day
    expect(currentSlot(utc('2026-08-24T23:01:00Z'), tz)).toBe('night');
  });
  it('exactly at the morning slot reads morning', () => {
    expect(currentSlot(utc('2026-08-24T23:02:00Z'), tz)).toBe('morning');
  });
  it('one minute before noon slot still reads morning', () => {
    expect(currentSlot(utc('2026-08-25T11:01:00Z'), tz)).toBe('morning');
  });
  it('exactly at the noon slot reads noon', () => {
    expect(currentSlot(utc('2026-08-25T11:02:00Z'), tz)).toBe('noon');
  });
  it('exactly at the evening slot reads evening', () => {
    expect(currentSlot(utc('2026-08-25T16:00:00Z'), tz)).toBe('evening');
  });
  it('one minute before the night slot still reads evening', () => {
    expect(currentSlot(utc('2026-08-25T20:29:00Z'), tz)).toBe('evening');
  });
  it('exactly at the night slot reads night', () => {
    expect(currentSlot(utc('2026-08-25T20:30:00Z'), tz)).toBe('night');
  });
});

describe('astroSlot — daylight saving transitions', () => {
  it('US spring forward: 03:00 EDT after the 02:00 skip still maps to morning', () => {
    // 2026-03-08 07:00Z = 03:00 EDT (the hour 02:00–03:00 does not exist)
    const d = utc('2026-03-08T07:00:00Z');
    expect(localClock(d, 'America/New_York')).toBe('03:00');
    expect(localDateKey(d, 'America/New_York')).toBe('2026-03-08');
    expect(currentSlot(d, 'America/New_York')).toBe('morning');
  });

  it('US fall back: both repeated 01:30 local hours map to morning of the same date', () => {
    const first = utc('2026-11-01T05:30:00Z');  // 01:30 EDT
    const second = utc('2026-11-01T06:30:00Z'); // 01:30 EST (repeat)
    for (const d of [first, second]) {
      expect(localClock(d, 'America/New_York')).toBe('01:30');
      expect(localDateKey(d, 'America/New_York')).toBe('2026-11-01');
      expect(currentSlot(d, 'America/New_York')).toBe('morning');
    }
  });

  it('EU autumn change keeps evening/night boundaries on local wall clock', () => {
    // 2026-10-25 is the EU fall-back date; 17:00 local must still be "evening".
    const d = utc('2026-10-25T17:00:00Z'); // 17:00 GMT after the change
    expect(localClock(d, 'Europe/London')).toBe('17:00');
    expect(currentSlot(d, 'Europe/London')).toBe('evening');
  });

  it('Southern-hemisphere spring forward (Sydney) resolves without slot drift', () => {
    const d = utc('2026-10-03T16:30:00Z'); // 03:30 AEDT on 2026-10-04
    expect(localDateKey(d, 'Australia/Sydney')).toBe('2026-10-04');
    expect(currentSlot(d, 'Australia/Sydney')).toBe('morning');
  });
});

describe('astroSlot — year-end rollover', () => {
  it('Kolkata just after local midnight on 1 Jan uses the new year date', () => {
    const d = utc('2026-12-31T18:35:00Z'); // 00:05 IST on 2027-01-01
    expect(localDateKey(d, 'Asia/Kolkata')).toBe('2027-01-01');
    expect(currentSlot(d, 'Asia/Kolkata')).toBe('morning');
  });

  it('New York just before local midnight stays on 31 Dec night slot', () => {
    const d = utc('2027-01-01T04:59:00Z'); // 23:59 EST on 2026-12-31
    expect(localDateKey(d, 'America/New_York')).toBe('2026-12-31');
    expect(currentSlot(d, 'America/New_York')).toBe('night');
  });
});

describe('astroSlot — row selection', () => {
  const rows = [
    { id: 'night', slot: 'night', created_at: '2026-08-24T16:00:00Z' },
    { id: 'morning', slot: 'morning', created_at: '2026-08-24T18:35:00Z' },
    { id: 'noon', slot: 'noon', created_at: '2026-08-25T06:35:00Z' },
  ];

  it('picks the morning row at 05:19 IST even though the night row is newer in UTC terms', () => {
    const picked = pickSlotRow(rows, utc('2026-08-24T23:49:00Z'), 'Asia/Kolkata');
    expect(picked?.id).toBe('morning');
  });

  it('degrades to an earlier slot of the same day when the current slot is missing', () => {
    const picked = pickSlotRow(
      rows.filter((r) => r.slot !== 'evening' && r.slot !== 'night'),
      utc('2026-08-25T13:00:00Z'), // 18:30 IST → evening
      'Asia/Kolkata',
    );
    expect(picked?.id).toBe('noon');
  });

  it('returns null for an empty set', () => {
    expect(pickSlotRow([], new Date(), 'UTC')).toBeNull();
  });

  it('preference order walks backwards then wraps', () => {
    expect(slotPreferenceOrder(utc('2026-08-25T13:00:00Z'), 'Asia/Kolkata'))
      .toEqual(['evening', 'noon', 'morning', 'night']);
  });
});
