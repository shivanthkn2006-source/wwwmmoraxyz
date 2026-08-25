/**
 * Local-time slot resolution for M'Mora Zoe alignment cards.
 *
 * The dispatch engine writes one row per member per LOCAL date per slot
 * (morning 00:02, noon 12:02, evening 17:00, night 21:30 in the member's own
 * timezone). The client must therefore read using the DEVICE's local date and
 * pick the slot whose local time has most recently passed — never the UTC date
 * and never simply "the newest row", which is why a 5 AM login used to show
 * the previous evening's night card.
 */

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

/** The device's own IANA timezone (falls back to UTC on exotic runtimes). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** YYYY-MM-DD in the device's local calendar (NOT the UTC calendar). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Slot whose local time most recently passed on the device clock. */
export function currentSlot(d: Date = new Date()): AstroSlot {
  const nowMin = d.getHours() * 60 + d.getMinutes();
  let best: AstroSlot = 'night'; // before 00:02 we are still in last night's slot
  let bestAge = Infinity;
  (Object.keys(SLOT_LOCAL_TIME) as AstroSlot[]).forEach((slot) => {
    const s = SLOT_LOCAL_TIME[slot];
    let age = nowMin - (s.hour * 60 + s.minute);
    if (age < 0) age += 1440;
    if (age < bestAge) { bestAge = age; best = slot; }
  });
  return best;
}

/** Slots ordered from the current one backwards through today's earlier slots. */
export function slotPreferenceOrder(d: Date = new Date()): AstroSlot[] {
  const order: AstroSlot[] = ['morning', 'noon', 'evening', 'night'];
  const idx = order.indexOf(currentSlot(d));
  const preferred: AstroSlot[] = [];
  for (let i = idx; i >= 0; i--) preferred.push(order[i]);
  for (const s of order) if (!preferred.includes(s)) preferred.push(s);
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
): T | null {
  if (!rows?.length) return null;
  for (const slot of slotPreferenceOrder(d)) {
    const match = rows
      .filter((r) => (r.slot ?? '') === slot)
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0];
    if (match) return match;
  }
  return rows[0];
}
