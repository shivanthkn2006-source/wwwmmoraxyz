import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface HomeDockBadges {
  /** Likes received on my posts in the last 24h. */
  likes: number;
  /** Total posts I have saved. */
  saved: number;
}

/**
 * Lightweight counts for the home glass dock icons (likes + saved).
 * Notification and message counts already live in HomePage state.
 */
export const useHomeDockBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<HomeDockBadges>({ likes: 0, saved: 0 });

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setBadges({ likes: 0, saved: 0 });
      return;
    }
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: myPosts }, { count: savedCount }] = await Promise.all([
        supabase.from('posts').select('id').eq('user_id', user.id).limit(200),
        supabase.from('saved_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      let likes = 0;
      const ids = (myPosts ?? []).map((row: any) => row.id);
      if (ids.length > 0) {
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', ids)
          .gte('created_at', since);
        likes = count ?? 0;
      }

      setBadges({ likes, saved: savedCount ?? 0 });
    } catch (error) {
      console.warn('[useHomeDockBadges] failed', error);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;

    const channel = supabase
      .channel(`home-dock-badges:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => void refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return { badges, refresh };
};

export default useHomeDockBadges;
