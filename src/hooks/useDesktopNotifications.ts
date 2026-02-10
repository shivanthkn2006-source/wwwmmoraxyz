import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDesktopNotifications = (userId: string | undefined) => {
  const processedNotifications = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  
  const checkPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Desktop notifications not supported');
      return false;
    }

    const preferences = localStorage.getItem('notification_preferences');
    if (!preferences) return false;

    const prefs = JSON.parse(preferences);
    if (!prefs.desktop_push) return false;

    if (Notification.permission === 'granted') {
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    const hasPermission = await checkPermission();
    if (!hasPermission) return;

    try {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [checkPermission]);

  useEffect(() => {
    if (!userId) return;

    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `desktop-notifications-${userId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const notification = payload.new;
          
          // Deduplicate notifications
          if (processedNotifications.current.has(notification.id)) {
            return;
          }
          processedNotifications.current.add(notification.id);
          
          // Only show desktop notifications for high-priority (priority >= 7)
          if (!notification.priority || notification.priority < 7) return;

          const preferences = localStorage.getItem('notification_preferences');
          if (!preferences) return;
          const prefs = JSON.parse(preferences);

          // Check if this notification type is enabled
          const typeMap: Record<string, keyof typeof prefs> = {
            'post_like': 'post_likes',
            'post_comment': 'post_comments',
            'comment_like': 'comment_likes',
            'comment_reply': 'comment_replies',
            'friend_request': 'friend_requests',
            'friend_accepted': 'friend_accepted',
            'user_online': 'user_online',
            'tier_upgrade': 'tier_upgrades',
          };

          const prefKey = typeMap[notification.type];
          if (prefKey && !prefs[prefKey]) return;

          // Get notification title and body
          let title = 'New Notification';
          let body = '';

          switch (notification.type) {
            case 'post_like':
              title = '❤️ New Like';
              body = 'Someone liked your post!';
              break;
            case 'post_comment':
              title = '💬 New Comment';
              body = 'Someone commented on your post!';
              break;
            case 'comment_like':
              title = '❤️ Comment Liked';
              body = 'Someone liked your comment!';
              break;
            case 'comment_reply':
              title = '💬 New Reply';
              body = 'Someone replied to your comment!';
              break;
            case 'friend_request':
              title = '👋 Friend Request';
              body = 'You have a new friend request!';
              break;
            case 'friend_accepted':
              title = '🎉 Friend Accepted';
              body = 'Your friend request was accepted!';
              break;
            case 'user_online':
              title = '🟢 User Online';
              body = notification.context_data?.message || 'A user came online nearby!';
              break;
            case 'tier_upgrade':
              title = '⭐ Tier Upgrade';
              body = 'Your tier has been upgraded!';
              break;
            default:
              body = 'You have a new notification';
          }

          await showNotification(title, { body, tag: notification.id });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, showNotification]);

  return { showNotification, checkPermission };
};
