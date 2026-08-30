/**
 * DHF DAILY COMPASS — client mirror of the 10 scheduled slots.
 *
 * Pure and deterministic: no network, no state. The feed uses this to decide
 * which cards are already due in the member's own wall clock and where each
 * card belongs in the chronological feed.
 */
import { deviceTimeZone, localDateIn, localHourMinute } from '@/lib/growthSlot';

export interface CompassSlotMeta {
  /** HH:MM:SS exactly as stored in `dhf_daily_posts.slot_time`. */
  time: string;
  label: string;
  category: string;
}

export const COMPASS_SLOTS: CompassSlotMeta[] = [
  { time: '05:00:00', label: '5:00 AM', category: 'Morning Ignition' },
  { time: '06:30:00', label: '6:30 AM', category: 'Energy & Habits' },
  { time: '08:00:00', label: '8:00 AM', category: 'Daily Focus' },
  { time: '09:30:00', label: '9:30 AM', category: 'Career Prediction' },
  { time: '11:00:00', label: '11:00 AM', category: 'Wealth & Decisions' },
  { time: '12:30:00', label: '12:30 PM', category: 'Philosophy' },
  { time: '14:00:00', label: '2:00 PM', category: 'Social Dynamics' },
  { time: '15:30:00', label: '3:30 PM', category: 'Genius Potential' },
  { time: '17:00:00', label: '5:00 PM', category: 'Lifestyle & Travel' },
  { time: '18:30:00', label: '6:30 PM', category: 'Night Story' },
];

export const COMPASS_SLOT_COUNT = COMPASS_SLOTS.length;

/** Normalizes `05:00`, `05:00:00` and `05:00:00+00` to `05:00:00`. */
export function normalizeSlotTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) return '00:00:00';
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function slotLabel(time: string): string {
  const key = normalizeSlotTime(time);
  const meta = COMPASS_SLOTS.find((slot) => slot.time === key);
  if (meta) return meta.label;
  const [h, m] = key.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Minutes past local midnight for a slot time. */
export function slotMinutes(time: string): number {
  const [h, m] = normalizeSlotTime(time).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Epoch ms for `post_date` + `slot_time` interpreted in `timeZone`.
 * Same two-pass zone correction used by the growth engine.
 */
export function compassSlotTimestamp(postDate: string, slotTime: string, timeZone: string): number {
  const [year, month, day] = (postDate ?? '').split('-').map(Number);
  if (!year || !month || !day) return 0;
  const [hour, minute] = normalizeSlotTime(slotTime).split(':').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredUtc;
  try {
    for (let pass = 0; pass < 2; pass += 1) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date(candidate));
      const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
      const renderedUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour') % 24, read('minute'));
      candidate += desiredUtc - renderedUtc;
    }
    return candidate;
  } catch {
    return desiredUtc;
  }
}

export interface DhfDailyPost {
  id: string;
  post_date: string;
  slot_time: string;
  category: string;
  headline: string;
  short_summary: string;
  full_story_content: string;
  image_url: string;
  /** Path inside our own `dhf-compass` bucket when a durable copy exists. */
  image_path?: string | null;
  image_source?: string | null;
  powered_by_badge: string;
  referral_cta: string;
  astrological_context?: string | null;
  created_at: string;
}


/**
 * Cards whose slot has already arrived in the member's own time zone,
 * newest first. Future slots stay hidden until their moment.
 */
export function duePosts(posts: DhfDailyPost[], now: Date = new Date(), timeZone = deviceTimeZone()): DhfDailyPost[] {
  const today = localDateIn(now, timeZone);
  const { hour, minute } = localHourMinute(now, timeZone);
  const nowMinutes = hour * 60 + minute;
  return posts
    .filter((post) => {
      if (post.post_date > today) return false;
      if (post.post_date < today) return true;
      return slotMinutes(post.slot_time) <= nowMinutes;
    })
    .sort(
      (a, b) =>
        compassSlotTimestamp(b.post_date, b.slot_time, timeZone) -
        compassSlotTimestamp(a.post_date, a.slot_time, timeZone),
    );
}

/** The next slot that has not arrived yet today, or null when the day is done. */
export function nextSlot(now: Date = new Date(), timeZone = deviceTimeZone()): CompassSlotMeta | null {
  const { hour, minute } = localHourMinute(now, timeZone);
  const nowMinutes = hour * 60 + minute;
  return COMPASS_SLOTS.find((slot) => slotMinutes(slot.time) > nowMinutes) ?? null;
}
