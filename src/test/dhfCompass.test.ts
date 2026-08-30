import { describe, expect, it } from 'vitest';
import {
  COMPASS_SLOTS, compassSlotTimestamp, duePosts, nextSlot, normalizeSlotTime, slotLabel, slotMinutes,
  type DhfDailyPost,
} from '@/lib/dhfCompass';

const post = (id: string, post_date: string, slot_time: string): DhfDailyPost => ({
  id, post_date, slot_time,
  category: 'Daily Focus', headline: `h-${id}`, short_summary: 's', full_story_content: 'f',
  image_url: '', powered_by_badge: 'Zoe', referral_cta: 'cta', created_at: '2026-08-30T00:00:00Z',
});

describe('DHF compass slots', () => {
  it('defines exactly ten ordered slots', () => {
    expect(COMPASS_SLOTS).toHaveLength(10);
    const minutes = COMPASS_SLOTS.map((s) => slotMinutes(s.time));
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
  });

  it('normalizes stored slot times', () => {
    expect(normalizeSlotTime('5:00')).toBe('05:00:00');
    expect(normalizeSlotTime('18:30:00+00')).toBe('18:30:00');
    expect(normalizeSlotTime('')).toBe('00:00:00');
  });

  it('labels known and unknown slots', () => {
    expect(slotLabel('18:30:00')).toBe('6:30 PM');
    expect(slotLabel('21:15:00')).toBe('9:15 PM');
  });

  it('resolves a slot timestamp in the member wall clock', () => {
    const utc = compassSlotTimestamp('2026-08-30', '05:00:00', 'UTC');
    expect(new Date(utc).toISOString()).toBe('2026-08-30T05:00:00.000Z');
    const ist = compassSlotTimestamp('2026-08-30', '05:00:00', 'Asia/Kolkata');
    expect(new Date(ist).toISOString()).toBe('2026-08-29T23:30:00.000Z');
  });
});

describe('DHF due-slot filtering', () => {
  const now = new Date('2026-08-30T12:00:00Z'); // noon UTC

  it('hides slots that have not arrived yet', () => {
    const out = duePosts([post('a', '2026-08-30', '05:00:00'), post('b', '2026-08-30', '18:30:00')], now, 'UTC');
    expect(out.map((p) => p.id)).toEqual(['a']);
  });

  it('returns due cards newest first and keeps yesterday visible', () => {
    const out = duePosts([
      post('yesterday', '2026-08-29', '18:30:00'),
      post('morning', '2026-08-30', '05:00:00'),
      post('late-morning', '2026-08-30', '11:00:00'),
      post('evening', '2026-08-30', '17:00:00'),
    ], now, 'UTC');
    expect(out.map((p) => p.id)).toEqual(['late-morning', 'morning', 'yesterday']);
  });

  it('never returns future-dated cards', () => {
    expect(duePosts([post('tomorrow', '2026-08-31', '05:00:00')], now, 'UTC')).toEqual([]);
  });

  it('reports the next upcoming slot and null after the last one', () => {
    expect(nextSlot(now, 'UTC')?.time).toBe('12:30:00');
    expect(nextSlot(new Date('2026-08-30T23:00:00Z'), 'UTC')).toBeNull();
  });
});
