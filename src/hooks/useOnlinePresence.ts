import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface OnlineUser {
  user_id: string;
  online_at: string;
}

/*
 * One shared presence channel for the whole app. Every FriendCard, map and
 * call panel used to call supabase.channel('online_users') itself; the client
 * returns the same already-subscribed channel, and adding presence listeners
 * to it threw "cannot add presence callbacks after subscribe()", which
 * crashed the Friends list ("Module offline").
 */
let shared: { channel: RealtimeChannel; userId: string; refs: number } | null = null;
let onlineIds = new Set<string>();
const listeners = new Set<(ids: Set<string>) => void>();

const emit = () => listeners.forEach((l) => l(onlineIds));

const acquire = (userId: string) => {
  if (shared && shared.userId !== userId) {
    void supabase.removeChannel(shared.channel);
    shared = null;
  }
  if (!shared) {
    const channel = supabase.channel(`online_users_shared`);
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineUser>();
        const ids = new Set<string>();
        Object.values(state).forEach((presences) =>
          (presences as unknown as OnlineUser[]).forEach((p) => p.user_id && ids.add(p.user_id)),
        );
        onlineIds = ids;
        emit();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });
    shared = { channel, userId, refs: 0 };
  }
  shared.refs += 1;
};

const release = () => {
  if (!shared) return;
  shared.refs -= 1;
  if (shared.refs <= 0) {
    void supabase.removeChannel(shared.channel);
    shared = null;
    onlineIds = new Set();
    emit();
  }
};

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(onlineIds);

  useEffect(() => {
    if (!user) return;
    listeners.add(setOnlineUsers);
    acquire(user.id);
    setOnlineUsers(onlineIds);
    return () => {
      listeners.delete(setOnlineUsers);
      release();
    };
  }, [user?.id]);

  const isUserOnline = (userId: string): boolean => onlineUsers.has(userId);
  const getOnlineUsersCount = (): number => onlineUsers.size;
  const getOnlineUsersList = (): string[] => Array.from(onlineUsers);

  return { onlineUsers, isUserOnline, getOnlineUsersCount, getOnlineUsersList };
};
