/**
 * Guards the DHF essay scheduling helpers: the wall-clock conversion the
 * `datetime-local` input depends on, the default slot, and the fact that an
 * unparseable time is rejected before it ever reaches the database.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
const update = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: (...args: unknown[]) => {
        upsert(...args);
        return Promise.resolve({ error: null });
      },
      update: (...args: unknown[]) => {
        update(...args);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));

import {
  cancelEssaySchedule,
  defaultEssayTime,
  scheduleEssay,
  toLocalInputValue,
} from '@/lib/dhfEssaySchedule';

describe('dhfEssaySchedule', () => {
  beforeEach(() => {
    upsert.mockClear();
    update.mockClear();
  });

  it('renders a datetime-local value in the viewer wall clock', () => {
    const value = toLocalInputValue(new Date(2026, 8, 1, 7, 5));
    expect(value).toBe('2026-09-01T07:05');
  });

  it('defaults to 07:00 the next day', () => {
    const next = defaultEssayTime(new Date(2026, 8, 1, 22, 43));
    expect(next.getDate()).toBe(2);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);
  });

  it('refuses an unparseable time without touching the database', async () => {
    const result = await scheduleEssay({
      userId: 'u1',
      postId: 'p1',
      scheduledFor: 'not-a-date',
    });
    expect(result.error).toMatch(/valid date/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('re-arms a delivered essay when it is rescheduled', async () => {
    const result = await scheduleEssay({
      userId: 'u1',
      postId: 'p1',
      scheduledFor: '2026-09-02T07:00',
      createdBy: 'admin-1',
    });
    expect(result.error).toBeNull();
    const [payload, options] = upsert.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(payload.status).toBe('scheduled');
    expect(payload.delivered_at).toBeNull();
    expect(payload.created_by).toBe('admin-1');
    expect(String(payload.scheduled_for)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(options.onConflict).toBe('user_id,post_id');
  });

  it('cancels by flipping status rather than deleting history', async () => {
    const result = await cancelEssaySchedule('s1');
    expect(result.error).toBeNull();
    expect(update).toHaveBeenCalledWith({ status: 'cancelled' });
  });
});
