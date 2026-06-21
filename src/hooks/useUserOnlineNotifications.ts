import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * Phase 5: Enhanced user online notifications with sync integration
 */
export const useUserOnlineNotifications = () => {
  const { user } = useAuth();
  const processedFriends = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Get user's friends
    const fetchFriendsAndSubscribe = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) return;

      const friendIds = friendships.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      );

      // Subscribe to profile status changes for friends
      const channel = supabase
        .channel(`friend-status-changes:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=in.(${friendIds.join(',')})`,
          },
          async (payload: any) => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;

            // Only announce when user comes online (wasn't online before)
            if (newStatus === 'online' && oldStatus !== 'online') {
              const friendProfile = payload.new;
              
              // Prevent duplicate processing in this session
              const friendKey = `${friendProfile.user_id}_${Date.now()}`;
              if (processedFriends.current.has(friendProfile.user_id)) {
                console.log('[UserOnlineNotifications] Skipping already processed friend:', friendProfile.display_name);
                return;
              }
              
              processedFriends.current.add(friendProfile.user_id);
              
              // Clear the processed flag after 30 seconds
              setTimeout(() => {
                processedFriends.current.delete(friendProfile.user_id);
              }, 30000);
              
              // Build announcement message
              let announcement = `${friendProfile.display_name} just came online`;
              
              if (friendProfile.city) {
                announcement += ` in ${friendProfile.city}`;
              }

              // Create notification WITHOUT voice announcement (priority 3 = low, no voice)
              // Voice announcements for "friend online" are disabled per user feedback
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'friend_online',
                from_user_id: friendProfile.user_id,
                priority: 3, // Low priority - NO voice announcement
                context_data: {
                  friend_name: friendProfile.display_name,
                  city: friendProfile.city,
                  announcement: announcement
                }
              });

              // Show ONLY a subtle toast - NO voice announcement
              toast(announcement, {
                duration: 3000,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = fetchFriendsAndSubscribe();
    
    // Listen for friendship updates to refresh subscription
    const handleFriendshipUpdate = () => {
      console.log('[UserOnlineNotifications] Friendship changed, refreshing subscriptions...');
      // Re-fetch friends and re-subscribe
      fetchFriendsAndSubscribe();
    };
    
    window.addEventListener('friendship-updated', handleFriendshipUpdate);
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
      window.removeEventListener('friendship-updated', handleFriendshipUpdate);
    };
  }, [user]);

  return {};
};
