/**
 * PLATFORM-WIDE UNREAD BADGES, GROUPED BY FEATURE
 *
 * Powers the bottom-right home dock: a single count on the home trigger itself
 * (so the user sees "there is something new" from any page) plus per-feature
 * counts so opening the dock shows WHICH menu entry has the notification.
 *
 * Realtime first, with a cheap poll + wake refresh so the badge can never go
 * dead when the socket drops.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  EMPTY_FEATURE_COUNTS,
  countByFeature,
  type FeatureCounts,
} from '@/lib/notificationFeatureMap';

const POLL_MS = 30_000;

export interface NotificationFeatureBadges {
  counts: FeatureCounts;
  total: number;
  refresh: () => Promise<void>;
}

export function useNotificationFeatureBadges(): NotificationFeatureBadges {
  const { user } = useAuth();
  const [counts, setCounts] = useState<FeatureCounts>(EMPTY_FEATURE_COUNTS);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCounts(EMPTY_FEATURE_COUNTS);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [notifications, messages] = await Promise.all([
        supabase
          .from('notifications')
          .select('type')
          .eq('user_id', user.id)
          .eq('read', false)
          .limit(500),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('read', false),
      ]);

      const next = countByFeature((notifications.data ?? []) as Array<{ type?: string | null }>);
      // Unread chat rows are authoritative for Messages.
      next.messages = Math.max(next.messages, messages.count ?? 0);
      setCounts(next);
    } catch (error) {
      console.warn('[useNotificationFeatureBadges] refresh failed', error);
    } finally {
      inFlight.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;

    const channel = supabase
      .channel(`dock-feature-badges:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onWake = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      document.removeEventListener('visibilitychange', onWake);
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, total, refresh };
}

export default useNotificationFeatureBadges;
