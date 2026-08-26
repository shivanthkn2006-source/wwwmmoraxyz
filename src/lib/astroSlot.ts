/**
 * Local-time slot resolution for M'Mora Zoe alignment cards.
 *
 * The dispatch engine writes one row per member per LOCAL date per slot
 * (morning 00:02, noon 12:02, evening 17:00, night 21:30 in the member's own
 * timezone). The client must therefore read using the DEVICE's local date and
 * pick the slot whose local time has most recently passed — never the UTC date
 * and never simply "the newest row", which is why a 5 AM login used to show
 * the previous evening's night card.
 *
 * All resolution goes through `Intl` wall-clock parts for an explicit IANA
 * zone, so daylight-saving transitions and year-end rollover are handled by
 * the platform's tz database rather than by manual offset arithmetic.
 */

import { simulatedNow, simulatedTimeZone } from './astroSimulation';

export type AstroSlot = 'morning' | 'noon' | 'evening' | 'night';

export const SLOT_LOCAL_TIME: Record<AstroSlot, { hour: number; minute: number }> = {
  morning: { hour: 0, minute: 2 },
  noon: { hour: 12, minute: 2 },
  evening: { hour: 17, minute: 0 },
  night: { hour: 21, minute: 30 },
};

export const SLOT_LABEL: Record<AstroSlot, { cycle: string; badge: string }> = {
  morning: { cycle: 'Dawn cycle', badge: "M'Mora Zoe • Dawn Alignment" },
  noon: { cycle: 'Midday cycle', badge: "M'Mora Zoe • Midday Recalibration" },
  evening: { cycle: 'Evening cycle', badge: "M'Mora Zoe • Evening Reflection" },
  night: { cycle: 'Night cycle', badge: "M'Mora Zoe • Goodnight Alignment" },
};

export const SLOT_ORDER: AstroSlot[] = ['morning', 'noon', 'evening', 'night'];

/**
 * The device's own IANA timezone (falls back to UTC on exotic runtimes).
 * In dev builds a simulation override wins, so slot selection can be verified
 * for any zone without changing the system clock. No-op in production.
 */
export function deviceTimeZone(): string {
  const simulated = simulatedTimeZone();
  if (simulated) return simulated;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** "Now" for alignment purposes — the simulated instant in dev, else real. */
export function astroNow(): Date {
  return simulatedNow() ?? new Date();
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  const cached = partsCache.get(timeZone);
  if (cached) return cached;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    partsCache.set(timeZone, fmt);
    return fmt;
  } catch {
    return null;
  }
}

/**
 * Wall-clock parts of `d` in `timeZone`. Because this reads the actual local
 * clock (not a fixed offset), DST shifts and 31 Dec → 1 Jan rollovers resolve
 * correctly with no special-casing.
 */
export function zonedParts(d: Date = new Date(), timeZone: string = deviceTimeZone()): ZonedParts {
  const fmt = formatterFor(timeZone);
  if (!fmt) {
    return {
      year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
      hour: d.getHours(), minute: d.getMinutes(),
    };
  }
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  // Intl renders midnight as hour 24 in some ICU builds under hourCycle h23.
  const hour = out.hour === 24 ? 0 : (out.hour ?? 0);
  return {
    year: out.year ?? d.getFullYear(),
    month: out.month ?? d.getMonth() + 1,
    day: out.day ?? d.getDate(),
    hour,
    minute: out.minute ?? 0,
  };
}

/** YYYY-MM-DD in the given zone's local calendar (NOT the UTC calendar). */
export function localDateKey(d: Date = new Date(), timeZone: string = deviceTimeZone()): string {
  const p = zonedParts(d, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Local wall-clock time as HH:MM in the given zone. */
export function localClock(d: Date = new Date(), timeZone: string = deviceTimeZone()): string {
  const p = zonedParts(d, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Slot whose local time most recently passed on the member's local clock. */
export function currentSlot(d: Date = new Date(), timeZone: string = deviceTimeZone()): AstroSlot {
  const { hour, minute } = zonedParts(d, timeZone);
  const nowMin = hour * 60 + minute;
  let best: AstroSlot = 'night'; // before 00:02 we are still in last night's slot
  let bestAge = Infinity;
  for (const slot of SLOT_ORDER) {
    const s = SLOT_LOCAL_TIME[slot];
    let age = nowMin - (s.hour * 60 + s.minute);
    if (age < 0) age += 1440;
    if (age < bestAge) { bestAge = age; best = slot; }
  }
  return best;
}

/** Slots ordered from the current one backwards through today's earlier slots. */
export function slotPreferenceOrder(d: Date = new Date(), timeZone: string = deviceTimeZone()): AstroSlot[] {
  const idx = SLOT_ORDER.indexOf(currentSlot(d, timeZone));
  const preferred: AstroSlot[] = [];
  for (let i = idx; i >= 0; i--) preferred.push(SLOT_ORDER[i]);
  for (const s of SLOT_ORDER) if (!preferred.includes(s)) preferred.push(s);
  return preferred;
}

/**
 * Pick the row that belongs to the member's current local moment: the newest
 * row for the most recently passed slot, degrading to earlier slots of the
 * same local day.
 */
export function pickSlotRow<T extends { slot?: string | null; created_at?: string | null }>(
  rows: T[],
  d: Date = new Date(),
  timeZone: string = deviceTimeZone(),
): T | null {
  if (!rows?.length) return null;
  for (const slot of slotPreferenceOrder(d, timeZone)) {
    const match = rows
      .filter((r) => (r.slot ?? '') === slot)
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0];
    if (match) return match;
  }
  return rows[0];
}
