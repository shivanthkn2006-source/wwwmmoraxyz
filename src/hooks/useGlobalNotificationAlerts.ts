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
import { playNotificationSound, armAudioUnlock, initializeAudio } from '@/utils/notificationSounds';
import { triggerVibration } from '@/utils/vibrationPatterns';

const SEEN_LIMIT = 200;

export interface AlertableNotification {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
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

  useEffect(() => {
    armAudioUnlock();
    initializeAudio();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`global-notification-alerts:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as AlertableNotification;
          if (!shouldAlert(row, seen.current)) return;

          seen.current.add(row.id);
          if (seen.current.size > SEEN_LIMIT) {
            seen.current = new Set(Array.from(seen.current).slice(-SEEN_LIMIT / 2));
          }

          const type = row.type || 'post_like';
          try { void playNotificationSound(type); } catch { /* never break the app for a sound */ }
          try { triggerVibration(type); } catch { /* haptics optional */ }

          toast(row.title || 'New notification', {
            description: row.message || undefined,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
}

export default useGlobalNotificationAlerts;
