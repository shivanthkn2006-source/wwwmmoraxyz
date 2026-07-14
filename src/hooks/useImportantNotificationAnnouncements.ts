import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe } from '@/utils/zoeVoice';
import { useAuth } from '@/lib/auth';

const PRIORITY_CATEGORIES = ['family', 'friends', 'office', 'colleagues', 'important', 'priority_one'];

export const useImportantNotificationAnnouncements = () => {
  const { user } = useAuth();
  const announcedIds = useRef<Set<string>>(new Set());
  const pendingAcknowledgement = useRef<Map<string, any>>(new Map());

  const isImportantNotification = useCallback((notification: any) => {
    const priority = notification.priority;
    const type = notification.type?.toLowerCase() || '';
    const contextData = notification.context_data || {};
    
    // Check if marked as important or priority one
    if (priority === 1 || priority === 0) return true;
    if (contextData.marked_important || contextData.priority_one) return true;
    
    // Check if from family/friends/office
    const category = contextData.category?.toLowerCase() || '';
    if (PRIORITY_CATEGORIES.some(c => category.includes(c) || type.includes(c))) return true;
    
    // Check sender relationship
    const relationship = contextData.relationship?.toLowerCase() || '';
    if (PRIORITY_CATEGORIES.some(c => relationship.includes(c))) return true;

    return false;
  }, []);

  const announceNotification = useCallback(async (notification: any, senderName: string) => {
    if (announcedIds.current.has(notification.id)) return;
    
    announcedIds.current.add(notification.id);
    pendingAcknowledgement.current.set(notification.id, notification);

    // Build announcement text
    let text = '';
    const type = notification.type;
    
    if (type === 'message') {
      text = `Important message from ${senderName}. ${notification.context_data?.preview || 'Tap to view.'}`;
    } else if (type === 'friend_request') {
      text = `${senderName} sent you a friend request.`;
    } else if (type === 'like') {
      text = `${senderName} liked your post.`;
    } else if (type === 'comment') {
      text = `${senderName} commented on your post.`;
    } else {
      text = `Important notification from ${senderName}.`;
    }

    // Speak via Zoe voice
    speakAsZoe(text);

    // Also show system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Zoe DHF - Important', {
        body: text,
        icon: '/icon-192.png',
        tag: notification.id,
        requireInteraction: true,
      });
    }

    // Dispatch event for UI
    window.dispatchEvent(new CustomEvent('zoe-important-notification', {
      detail: { notification, text }
    }));
  }, []);

  const acknowledgeNotification = useCallback((notificationId: string) => {
    pendingAcknowledgement.current.delete(notificationId);
    console.log('[ZoeDHF] Notification acknowledged:', notificationId);
  }, []);

  const acknowledgeAll = useCallback(() => {
    pendingAcknowledgement.current.clear();
    console.log('[ZoeDHF] All notifications acknowledged');
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel(`important-notifications:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new;
          
          if (!isImportantNotification(notification)) return;

          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', notification.from_user_id)
            .single();

          const senderName = sender?.display_name || sender?.username || 'Someone';
          announceNotification(notification, senderName);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isImportantNotification, announceNotification]);

  return {
    acknowledgeNotification,
    acknowledgeAll,
    getPendingCount: () => pendingAcknowledgement.current.size,
  };
};
