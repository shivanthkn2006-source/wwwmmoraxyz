import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface HomeDockBadges {
  /** Likes received on my posts in the last 24h. */
  likes: number;
  /** Total posts I have saved. */
  saved: number;
}

const EMPTY: HomeDockBadges = { likes: 0, saved: 0 };
const STALE_AFTER_MS = 5 * 60 * 1000;
const POLL_MS = 45_000;

/**
 * Lightweight counts for the home glass dock icons (likes + saved).
 * Degrades gracefully: on fetch failure the last known counts are kept and
 * flagged stale; when signed out the badges are cleared rather than frozen.
 */
export const useHomeDockBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<HomeDockBadges>(EMPTY);
  const [stale, setStale] = useState(false);
  const lastSuccess = useRef(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      // Unauthenticated (or session dropped): never show another user's counts.
      setBadges(EMPTY);
      setStale(false);
      lastSuccess.current = 0;
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [postsResult, savedResult] = await Promise.all([
        supabase.from('posts').select('id').eq('user_id', user.id).limit(200),
        supabase.from('saved_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (postsResult.error || savedResult.error) {
        throw postsResult.error ?? savedResult.error;
      }

      let likes = 0;
      const ids = (postsResult.data ?? []).map((row: { id: string }) => row.id);
      if (ids.length > 0) {
        const { count, error } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', ids)
          .gte('created_at', since);
        if (error) throw error;
        likes = count ?? 0;
      }

      setBadges({ likes, saved: savedResult.count ?? 0 });
      lastSuccess.current = Date.now();
      setStale(false);
    } catch (error) {
      console.warn('[useHomeDockBadges] refresh failed', error);
      // Keep the last known counts, but mark them stale once they age out.
      setStale(!lastSuccess.current || Date.now() - lastSuccess.current > STALE_AFTER_MS);
    } finally {
      inFlight.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;

    let cancelled = false;
    const channel = supabase
      .channel(`home-dock-badges:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => void refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        // Realtime dropped — polling below keeps the badges from going stale.
        if (!cancelled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
          setStale(true);
        }
      });

    // Fallback polling + focus/online recovery so counts survive realtime loss.
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onWake = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      document.removeEventListener('visibilitychange', onWake);
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return { badges, refresh, stale, updatedAt };
};

export default useHomeDockBadges;
