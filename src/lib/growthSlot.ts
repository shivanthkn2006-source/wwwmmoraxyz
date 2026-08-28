/**
 * Client-side delivery-window resolution for the Personal Growth Engine.
 *
 * Mirrors supabase/functions/_shared/growth-content.ts exactly. The client
 * never generates content — it only resolves which window is current so it can
 * read the right row. All resolution uses wall-clock parts for an explicit
 * IANA zone (tz database handles DST), never UTC arithmetic.
 */

export type GrowthSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
export type ReflectionStyle = 'actionable' | 'philosophical' | 'biographical' | 'strategic';

export const GROWTH_SLOTS: GrowthSlot[] = ['morning', 'midday', 'afternoon', 'evening', 'night'];

export const SLOT_LOCAL_TIME: Record<GrowthSlot, { hour: number; minute: number }> = {
  morning: { hour: 7, minute: 0 },
  midday: { hour: 12, minute: 30 },
  afternoon: { hour: 16, minute: 0 },
  evening: { hour: 19, minute: 30 },
  night: { hour: 22, minute: 0 },
};

export const SLOT_LABEL: Record<GrowthSlot, string> = {
  morning: 'Morning Focus',
  midday: 'Midday Strategy',
  afternoon: 'Afternoon Recharge',
  evening: 'Evening Reflection',
  night: 'Night Review',
};

/** Priority order when a member asks for fewer than five insights a day. */
export const SLOT_PRIORITY: GrowthSlot[] = ['morning', 'evening', 'midday', 'night', 'afternoon'];

export function slotsForFrequency(frequency: number): GrowthSlot[] {
  const n = Math.max(1, Math.min(5, Math.round(Number(frequency) || 1)));
  const chosen = new Set(SLOT_PRIORITY.slice(0, n));
  return GROWTH_SLOTS.filter((s) => chosen.has(s));
}

export const FOCUS_AREAS = [
  'Deep Focus & Productivity',
  'Career & Strategic Thinking',
  'Financial Discipline',
  'Emotional Resilience',
  'Health & Physical Habits',
  'Creativity & Problem Solving',
] as const;

export const REFLECTION_STYLE_OPTIONS: Array<{
  id: ReflectionStyle;
  title: string;
  description: string;
}> = [
  { id: 'actionable', title: 'Actionable Steps', description: 'Concrete, daily bite-sized tactics' },
  { id: 'biographical', title: 'Real-World Biographies', description: 'Lessons from historical and modern achievers' },
  { id: 'strategic', title: 'Mental Models & Frameworks', description: 'High-level systems thinking' },
  { id: 'philosophical', title: 'Reflection & Mindset', description: 'Mindfulness and perspective shifts' },
];

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** YYYY-MM-DD for the given instant in the given zone. */
export function localDateIn(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

export function localHourMinute(instant: Date, timeZone: string): { hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(instant);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
    return { hour: get('hour') % 24, minute: get('minute') };
  } catch {
    return { hour: instant.getUTCHours(), minute: instant.getUTCMinutes() };
  }
}

/**
 * The window whose local time has most recently passed among the enabled ones.
 * Wraps past midnight, so a 02:00 login shows the previous night review rather
 * than an empty card.
 */
export function currentSlot(
  now: Date,
  timeZone: string,
  enabled: GrowthSlot[] = GROWTH_SLOTS,
): GrowthSlot | null {
  if (!enabled.length) return null;
  const { hour, minute } = localHourMinute(now, timeZone);
  const nowMin = hour * 60 + minute;
  let best: GrowthSlot | null = null;
  let bestAge = Infinity;
  for (const slot of enabled) {
    const s = SLOT_LOCAL_TIME[slot];
    let age = nowMin - (s.hour * 60 + s.minute);
    if (age < 0) age += 1440;
    if (age < bestAge) { best = slot; bestAge = age; }
  }
  return best;
}
