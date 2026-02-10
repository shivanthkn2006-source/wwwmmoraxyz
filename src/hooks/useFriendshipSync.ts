import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * Hook for friendship synchronization with real-time updates
 * Phase 5: Database Synchronization - Friend Sync
 */
export const useFriendshipSync = (onFriendshipChange?: () => void) => {
  const { user } = useAuth();

  /**
   * Dispatch a friendship-updated event to trigger UI refreshes
   */
  const dispatchFriendshipUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent('friendship-updated', {
      detail: { userId: user?.id, timestamp: Date.now() }
    }));
    onFriendshipChange?.();
  }, [user?.id, onFriendshipChange]);

  // Subscribe to real-time friendship changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friendship-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        (payload) => {
          const { new: newRow, old: oldRow } = payload as any;
          // Check if this change involves the current user
          if (
            newRow?.user1_id === user.id || 
            newRow?.user2_id === user.id ||
            oldRow?.user1_id === user.id ||
            oldRow?.user2_id === user.id
          ) {
            console.log('[FriendshipSync] Friendship change detected:', payload.eventType);
            dispatchFriendshipUpdate();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        (payload) => {
          const { new: newRow, old: oldRow } = payload as any;
          // Check if this change involves the current user
          if (
            newRow?.sender_id === user.id || 
            newRow?.receiver_id === user.id ||
            oldRow?.sender_id === user.id ||
            oldRow?.receiver_id === user.id
          ) {
            console.log('[FriendshipSync] Friend request change detected:', payload.eventType);
            dispatchFriendshipUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dispatchFriendshipUpdate]);

  return {
    dispatchFriendshipUpdate,
  };
};
