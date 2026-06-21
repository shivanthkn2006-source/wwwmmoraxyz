import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { voiceQueue } from '@/utils/voiceAnnouncementQueue';

interface VoiceNotificationSettings {
  enabled: boolean;
  voiceStyle: 'friendly' | 'professional' | 'enthusiastic';
}

export const useVoiceNotifications = () => {
  const { user } = useAuth();
  const lastNotificationId = useRef<string | null>(null);
  const isAnnouncingRef = useRef(false);
  const processedNotifications = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const announcementQueue = useRef<string[]>([]);

  // Get user's voice notification settings
  const getSettings = useCallback(async (): Promise<VoiceNotificationSettings> => {
    if (!user) return { enabled: false, voiceStyle: 'friendly' };

    const { data } = await supabase
      .from('profiles')
      .select('voice_notifications_enabled, notification_voice_style')
      .eq('user_id', user.id)
      .single();

    return {
      enabled: data?.voice_notifications_enabled ?? true,
      voiceStyle: (data?.notification_voice_style as any) ?? 'friendly',
    };
  }, [user]);

  // Generate context-aware announcement text
  const generateAnnouncementText = useCallback((notification: any): string => {
    const { type, from_user, context_data, suggestion_type } = notification;
    const fromName = from_user?.display_name || 'Someone';

    // Context-aware announcements based on type
    switch (type) {
      case 'like':
        return `${fromName} liked your post!`;
      
      case 'comment':
        return `${fromName} commented on your post.`;
      
      case 'friend_request':
        return `You have a new friend request from ${fromName}.`;
      
      case 'friend_accepted':
        return `${fromName} accepted your friend request! You're now connected.`;
      
      case 'message':
        return `New message from ${fromName}.`;
      
      case 'interest_match':
        const sharedInterests = context_data?.shared_interests || [];
        const interestsText = sharedInterests.slice(0, 2).join(' and ');
        
        if (context_data?.location_match) {
          return `${fromName} is nearby and shares your interests in ${interestsText}! ${context_data.conversation_starter || 'Why not start a conversation?'}`;
        }
        return `${fromName} shares your passion for ${interestsText}. ${context_data.conversation_starter || 'Reach out to connect!'}`;
      
      case 'event_reminder':
        return `Reminder: Your event is coming up soon!`;
      
      case 'status_update':
        // Don't announce online status changes
        return '';
      
      case 'friend_online':
        // Don't announce friend online status
        return '';
      
      default:
        return `You have a new notification from ${fromName}.`;
    }
  }, []);

  // Announce notification with Zoe's calm, soothing voice
  const announceNotification = useCallback(async (notification: any) => {
    if (isAnnouncingRef.current) {
      console.log('[VoiceNotifications] Already announcing, queueing:', notification.id);
      return;
    }
    
    const settings = await getSettings();
    if (!settings.enabled) {
      console.log('[VoiceNotifications] Voice notifications disabled in settings');
      return;
    }

    const announcementText = generateAnnouncementText(notification);
    
    // Check global queue to prevent duplicates
    if (!voiceQueue.shouldAnnounce(notification.id, announcementText)) {
      console.log('[VoiceNotifications] Blocked duplicate by global queue:', notification.id);
      return;
    }

    isAnnouncingRef.current = true;

    try {
      // Add voice style prefix
      const styledText = {
        friendly: `Hey! ${announcementText}`,
        professional: `Notification: ${announcementText}`,
        enthusiastic: `Exciting news! ${announcementText}`,
      }[settings.voiceStyle] || announcementText;

      console.log('[VoiceNotifications] Announcing with Zoe voice:', notification.id, styledText);

      // Use Zoe's calm, soothing voice for announcements with proper callbacks
      const { speakAsZoe } = await import('@/utils/zoeVoice');
      speakAsZoe(
        styledText,
        undefined,
        () => console.log('[VoiceNotifications] Started speaking'),
        () => {
          console.log('[VoiceNotifications] Finished speaking');
          isAnnouncingRef.current = false;
        },
        (error) => {
          console.error('[VoiceNotifications] Speech error:', error);
          isAnnouncingRef.current = false;
        }
      );

      // Visual feedback
      const visualEvent = new CustomEvent('notification-announced', {
        detail: { notification },
      });
      window.dispatchEvent(visualEvent);
    } catch (error) {
      console.error('[VoiceNotifications] Error announcing notification:', error);
      isAnnouncingRef.current = false;
    }
  }, [getSettings, generateAnnouncementText]);

  // Listen for new notifications in real-time
  useEffect(() => {
    if (!user) return;

    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create unique channel name to prevent duplicates
    const channelName = `voice-notifications-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
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
          
          console.log('[VoiceNotifications] Received notification:', notification.id, notification.type);
          
          // Deduplicate by notification ID (component-level)
          if (processedNotifications.current.has(notification.id)) {
            console.log('[VoiceNotifications] Skipping duplicate (component cache):', notification.id);
            return;
          }
          
          processedNotifications.current.add(notification.id);
          
          // Clean up old IDs (keep last 50)
          if (processedNotifications.current.size > 50) {
            const entries = Array.from(processedNotifications.current);
            processedNotifications.current = new Set(entries.slice(-50));
          }

          // Fetch user details if needed
          if (notification.from_user_id) {
            const { data: fromUser } = await supabase
              .from('profiles')
              .select('display_name, status')
              .eq('user_id', notification.from_user_id)
              .single();
            
            if (fromUser) {
              notification.from_user = fromUser;
            }
          }

          // Announce high-priority notifications with slight delay to prevent conflicts
          if (notification.priority >= 7) {
            setTimeout(() => {
              announceNotification(notification);
            }, 500);
          } else {
            // Queue lower priority for later announcement
            setTimeout(() => {
              announceNotification(notification);
            }, 3000);
          }
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
  }, [user, announceNotification]);

  // Announce Huddle activity - COMPLETELY DISABLED per user preference
  // Users found automatic voice announcements disruptive during page load
  const announceHuddleActivity = useCallback(async (activity: {
    type: 'friend_online' | 'interest_match' | 'nearby_friend';
    friendName: string;
    details?: string;
  }) => {
    // ALL huddle activity announcements disabled per user request
    console.log('[VoiceNotifications] All huddle activity announcements disabled');
    return;
  }, []);

  return {
    announceNotification,
    announceHuddleActivity,
    getSettings,
  };
};
