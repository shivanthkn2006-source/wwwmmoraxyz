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
import { featureLabelForType, formatAlertStamp } from '@/lib/notificationFeatureMap';
import { buildAnnouncementSpeech, isZoeAnnouncementsEnabled } from '@/lib/zoeAnnouncements';
import { speakAsZoe } from '@/utils/zoeVoice';

const SEEN_LIMIT = 200;

export interface AlertableNotification {
  id: string;
  type?: string | null;
  context_data?: Record<string, unknown> | null;
  from_user_id?: string | null;
  created_at?: string | null;
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
  growth_card: 'New growth insight',
  growth_insight: 'New growth insight',
  dhf_compass: "New Zoe's DHF card",
  dhf_unlock: "Zoe's DHF unlocked",
  new_loop: 'New Loop',
  loop_like: 'New Loop like',
  loop_comment: 'New Loop comment',
  friend_badge_earned: 'A friend earned a badge',
  friend_challenge_completed: 'A friend completed a challenge',
  friend_music_listen: 'A friend is playing a song you love',
};

/**
 * Exported for tests: human title + description for a notification row.
 * Every alert reads: WHAT happened (title) and
 * "date · time · feature · who · content" (description).
 */
export function alertCopy(row: AlertableNotification, actorName?: string | null) {
  const ctx = (row.context_data ?? {}) as Record<string, unknown>;
  const title = (typeof ctx.title === 'string' && ctx.title)
    || TITLES[row.type ?? '']
    || 'New notification';

  const content = [ctx.message, ctx.preview, ctx.body, ctx.content]
    .find((v) => typeof v === 'string' && v) as string | undefined;
  const who = actorName
    || (typeof ctx.actor_name === 'string' && ctx.actor_name ? ctx.actor_name : undefined)
    || (typeof ctx.from_name === 'string' && ctx.from_name ? ctx.from_name : undefined);

  const parts = [
    formatAlertStamp(row.created_at ?? new Date()),
    featureLabelForType(row.type),
    who ? `from ${who}` : undefined,
    content,
  ].filter(Boolean) as string[];

  return { title, description: parts.join(' · ') };
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
  const pending = useRef<Set<number>>(new Set());


  useEffect(() => {
    armAudioUnlock();
    initializeAudio();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let disposed = false;

    const nameCache = new Map<string, string>();
    const resolveActor = async (id?: string | null): Promise<string | null> => {
      if (!id || id === user.id) return null;
      if (nameCache.has(id)) return nameCache.get(id) ?? null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', id)
          .maybeSingle();
        const name = (data?.display_name || data?.username || '') as string;
        if (name) nameCache.set(id, name);
        return name || null;
      } catch {
        return null;
      }
    };

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
        void resolveActor(row.from_user_id).then((actorName) => {
          const { title, description } = alertCopy(row, actorName);
          toast(title, { description, duration: 6000 });
          // Zoe announces the event out loud. Best-effort: any voice failure
          // must never break the visual alert.
          if (isZoeAnnouncementsEnabled()) {
            try {
              void speakAsZoe(buildAnnouncementSpeech(title, description), {
                messageId: `notification:${row.id}`,
              });
            } catch { /* speech is best-effort */ }
          }
        });
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
        .select('id, type, context_data, created_at, from_user_id')
        .eq('user_id', user.id)
        .gt('created_at', since.current)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error || !data?.length) return;
      since.current = data[data.length - 1].created_at as string;
      data.forEach((row) => raise(row as unknown as AlertableNotification));
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return; // resumed by onVisible
      void poll();
    }, 20_000);

    const onVisible = () => { if (document.visibilityState === 'visible') void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    void poll();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      pending.current.forEach((t) => window.clearTimeout(t));
      pending.current.clear();
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };

  }, [user?.id]);
}


export default useGlobalNotificationAlerts;
