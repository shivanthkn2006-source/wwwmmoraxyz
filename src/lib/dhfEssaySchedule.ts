/**
 * DHF ESSAY SCHEDULING — shared client helpers.
 *
 * The reader page and the admin dashboard both write to the same table, so the
 * upsert lives here once. `dhf_essay_schedules` holds a unique (user, post)
 * pair, which makes rescheduling an idempotent upsert rather than a duplicate.
 */
import { supabase } from '@/integrations/supabase/client';

export type EssayScheduleStatus = 'scheduled' | 'delivered' | 'cancelled';

export interface EssaySchedule {
  id: string;
  user_id: string;
  post_id: string;
  scheduled_for: string;
  status: EssayScheduleStatus;
  delivered_at: string | null;
  note: string | null;
  created_at: string;
}

/** `datetime-local` value (local wall clock) for an ISO instant. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Sensible default: tomorrow at 07:00 in the viewer's own wall clock. */
export function defaultEssayTime(now: Date = new Date()): Date {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(7, 0, 0, 0);
  return next;
}

export interface ScheduleEssayInput {
  userId: string;
  postId: string;
  /** Any parseable local/ISO datetime string. */
  scheduledFor: string;
  note?: string | null;
  createdBy?: string | null;
}

export async function scheduleEssay(input: ScheduleEssayInput): Promise<{ error: string | null }> {
  const when = new Date(input.scheduledFor);
  if (Number.isNaN(when.getTime())) return { error: 'Pick a valid date and time.' };

  const { error } = await supabase
    .from('dhf_essay_schedules')
    .upsert(
      {
        user_id: input.userId,
        post_id: input.postId,
        scheduled_for: when.toISOString(),
        note: input.note?.trim() || null,
        created_by: input.createdBy ?? null,
        // Rescheduling a delivered or cancelled essay re-arms it.
        status: 'scheduled',
        delivered_at: null,
      },
      { onConflict: 'user_id,post_id' },
    );

  return { error: error ? error.message : null };
}

export async function cancelEssaySchedule(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('dhf_essay_schedules')
    .update({ status: 'cancelled' })
    .eq('id', id);
  return { error: error ? error.message : null };
}

export async function fetchEssaySchedule(
  userId: string,
  postId: string,
): Promise<EssaySchedule | null> {
  const { data } = await supabase
    .from('dhf_essay_schedules')
    .select('id, user_id, post_id, scheduled_for, status, delivered_at, note, created_at')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();
  return (data as EssaySchedule) ?? null;
}
