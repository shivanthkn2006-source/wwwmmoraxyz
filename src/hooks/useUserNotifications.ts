import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserNotificationData {
  symbolId: string;
  count?: number;
  timestamp: Date;
}

/**
 * Hook to fetch user notification indicators for Huddle map display
 * Tracks recent activity: posts, likes, messages, badges, etc.
 */
export const useUserNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<UserNotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    fetchUserNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`user-notifications-${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUserNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUserNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchUserNotifications = async () => {
    try {
      setLoading(true);
      const notificationData: UserNotificationData[] = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for unread messages
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);

      if (messageCount && messageCount > 0) {
        notificationData.push({
          symbolId: 'message',
          count: messageCount,
          timestamp: new Date(),
        });
      }

      // Check for recent posts (last 24 hours)
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', last24Hours.toISOString());

      if (postCount && postCount > 0) {
        notificationData.push({
          symbolId: 'new_post',
          count: postCount,
          timestamp: new Date(),
        });
      }

      // Check for recent likes received
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id);
        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
          .gte('created_at', last24Hours.toISOString());

        if (likeCount && likeCount > 0) {
          notificationData.push({
            symbolId: 'like',
            count: likeCount,
            timestamp: new Date(),
          });
        }
      }

      // Check for pending friend requests
      const { count: friendRequestCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (friendRequestCount && friendRequestCount > 0) {
        notificationData.push({
          symbolId: 'friend_request',
          count: friendRequestCount,
          timestamp: new Date(),
        });
      }

      // Check for recent badges
      const { count: badgeCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('earned_at', last24Hours.toISOString());

      if (badgeCount && badgeCount > 0) {
        notificationData.push({
          symbolId: 'badge_earned',
          count: badgeCount,
          timestamp: new Date(),
        });
      }

      // Check for birthday
      const { data: profile } = await supabase
        .from('profiles')
        .select('event_date, event_type')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.event_type === 'birthday' && profile.event_date) {
        const eventDate = new Date(profile.event_date);
        const today = new Date();
        if (
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getDate() === today.getDate()
        ) {
          notificationData.push({
            symbolId: 'birthday',
            timestamp: new Date(),
          });
        }
      }

      setNotifications(notificationData);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return { notifications, loading, refetch: fetchUserNotifications };
};
