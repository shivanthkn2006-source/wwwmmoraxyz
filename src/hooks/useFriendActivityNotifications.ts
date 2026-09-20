import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { getCallActivityStatus } from '@/features/calls/callActivityStatuses';

/**
 * Tells you when a friend changes their activity status or personal message.
 * Read-only on top of the existing friend list and profile activity fields —
 * it never touches calls, media or signalling.
 */
export const useFriendActivityNotifications = () => {
  const { user } = useAuth();
  const recent = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f => (f.user1_id === user.id ? f.user2_id : f.user1_id));
      if (cancelled || friendIds.length === 0) return;

      channel = supabase
        .channel(`friend-activity:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=in.(${friendIds.join(',')})` },
          async (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
            const next = payload.new || {};
            const prev = payload.old || {};
            const status = (next.activity_status as string) || null;
            const message = ((next.activity_message as string) || '').trim() || null;
            const statusChanged = status !== ((prev.activity_status as string) || null);
            const messageChanged = message !== (((prev.activity_message as string) || '').trim() || null);
            if (!statusChanged && !messageChanged) return;

            const friendId = next.user_id as string;
            const now = Date.now();
            const last = recent.current.get(friendId) || 0;
            if (now - last < 20_000) return;
            recent.current.set(friendId, now);

            const name = (next.display_name as string) || (next.username as string) || 'A friend';
            const label = message || getCallActivityStatus(status || undefined).label;
            const announcement = `${name} is now ${label}`;

            toast(announcement, { duration: 3000 });
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'friend_activity_status',
              from_user_id: friendId,
              priority: 3,
              context_data: { friend_name: name, activity_status: status, activity_message: message, announcement },
            });
          },
        )
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {};
};
