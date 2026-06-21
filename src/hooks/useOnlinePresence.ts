import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface OnlineUser {
  user_id: string;
  online_at: string;
}

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Create a presence channel
    const presenceChannel = supabase.channel('online_users');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<OnlineUser>();
        const userIds = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: OnlineUser) => {
            userIds.add(presence.user_id);
          });
        });
        
        setOnlineUsers(userIds);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: any) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user as online
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup on unmount
    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
    };
  }, [user]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  const getOnlineUsersCount = (): number => {
    return onlineUsers.size;
  };

  const getOnlineUsersList = (): string[] => {
    return Array.from(onlineUsers);
  };

  return {
    onlineUsers,
    isUserOnline,
    getOnlineUsersCount,
    getOnlineUsersList,
  };
};
