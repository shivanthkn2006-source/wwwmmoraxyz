/**
 * GLOBAL NOTIFICATION ALERTS
 *
 * Platform-wide audible + haptic + toast alerting for `notifications` inserts.
 * Previously sounds only fired while the notification panel was OPEN, which is
 * why alerts were never heard. This hook runs on every route, for the signed-in
 * user only, and is de-duplicated by notification id.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  playNotificationSound,
  armAudioUnlock,
  initializeAudio,
  playIncomingCue,
  INCOMING_CUE_LEAD_MS,
} from '@/utils/notificationSounds';

import { triggerVibration } from '@/utils/vibrationPatterns';

const SEEN_LIMIT = 200;

export interface AlertableNotification {
  id: string;
  type?: string | null;
  context_data?: Record<string, unknown> | null;
}

const TITLES: Record<string, string> = {
  post_like: 'New like',
  post_comment: 'New comment',
  comment_like: 'Someone liked your comment',
  comment_reply: 'New reply',
  friend_request: 'New friend request',
  friend_request_accepted: 'Friend request accepted',
  post_tag: 'You were tagged',
  message: 'New message',
};

/** Exported for tests: human title + description for a notification row. */
export function alertCopy(row: AlertableNotification) {
  const ctx = (row.context_data ?? {}) as Record<string, unknown>;
  const title = (typeof ctx.title === 'string' && ctx.title)
    || TITLES[row.type ?? '']
    || 'New notification';
  const description = [ctx.message, ctx.preview, ctx.body]
    .find((v) => typeof v === 'string' && v) as string | undefined;
  return { title, description };
}

/** Exported for tests: decides whether a row should raise an alert. */
export function shouldAlert(row: AlertableNotification | null | undefined, seen: Set<string>) {
  if (!row?.id) return false;
  if (seen.has(row.id)) return false;
  return true;
}

export function useGlobalNotificationAlerts() {
  const { user } = useAuth();
  const seen = useRef<Set<string>>(new Set());
  const since = useRef<string>(new Date().toISOString());

  useEffect(() => {
    armAudioUnlock();
    initializeAudio();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let disposed = false;

    const raise = (row: AlertableNotification) => {
      if (!shouldAlert(row, seen.current)) return;
      seen.current.add(row.id);
      if (seen.current.size > SEEN_LIMIT) {
        seen.current = new Set(Array.from(seen.current).slice(-SEEN_LIMIT / 2));
      }

      const type = row.type || 'post_like';

      // Heads-up cue FIRST, then the alert itself — the user hears the rising
      // cue and knows a notification is about to land.
      try { playIncomingCue(); } catch { /* never break the app for a sound */ }

      const timer = window.setTimeout(() => {
        try { void playNotificationSound(type); } catch { /* sound is best-effort */ }
        try { triggerVibration(type as never); } catch { /* haptics optional */ }
        const { title, description } = alertCopy(row);
        toast(title, { description, duration: 5000 });
      }, INCOMING_CUE_LEAD_MS);
      pending.current.add(timer);
    };


    // Fast path: realtime.
    const channel = supabase
      .channel(`global-notification-alerts:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => raise(payload.new as AlertableNotification)
      )
      .subscribe();

    // Durable path: realtime channels can time out (socket limits, sleeping
    // tabs, flaky networks). A cheap indexed poll guarantees the user still
    // hears every alert — this is why alerts previously appeared "dead".
    const poll = async () => {
      if (disposed || document.visibilityState === 'hidden') return;
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, context_data, created_at')
        .eq('user_id', user.id)
        .gt('created_at', since.current)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error || !data?.length) return;
      since.current = data[data.length - 1].created_at as string;
      data.forEach((row) => raise(row as unknown as AlertableNotification));
    };

    const timer = window.setInterval(() => { void poll(); }, 20_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    void poll();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}


export default useGlobalNotificationAlerts;
