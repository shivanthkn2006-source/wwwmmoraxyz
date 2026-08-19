import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

/** Follow / unfollow another user (single toggle, backed by user_follows). */
export const useFollow = (targetUserId?: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSelf = !!user?.id && user.id === targetUserId;

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !targetUserId || isSelf) {
      setIsFollowing(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      if (!cancelled) setIsFollowing(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, targetUserId, isSelf]);

  const toggleFollow = useCallback(async () => {
    if (!user?.id || !targetUserId || isSelf || loading) return;
    setLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      }
    } catch (err) {
      setIsFollowing(!next);
      toast({
        title: 'Could not update follow',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, targetUserId, isSelf, isFollowing, loading, toast]);

  return { isFollowing, toggleFollow, loading, canFollow: !!user?.id && !!targetUserId && !isSelf };
};
