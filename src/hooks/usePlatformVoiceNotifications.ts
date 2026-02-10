/**
 * Platform-Wide Voice Notifications Hook
 * Enables voice announcements for ALL notification types across the entire platform
 * Uses Zoe's calm, soothing voice (default Mmora platform voice) for consistent user experience
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopSpeaking, isAssistantSpeaking } from '@/utils/assistantVoice';

interface VoiceNotificationConfig {
  enabled: boolean;
  voiceStyle: 'friendly' | 'professional' | 'calm';
  announceTypes: string[];
}

const DEFAULT_CONFIG: VoiceNotificationConfig = {
  enabled: true,
  voiceStyle: 'calm',
  // IMPORTANT: Removed friend_online, nearby_friend, status_update, huddle_activity
  // These were causing unwanted "X just came online" announcements
  announceTypes: [
    'like', 'comment', 'reply', 'mention',
    'friend_request', 'friend_accepted',
    'message', 'post', 'interest_match',
    'event_reminder', 'achievement', 'badge',
    'timeline_update', 'system', 'zoe'
  ]
};

// Global queue to prevent duplicate announcements
const announcedIds = new Set<string>();
const MAX_CACHE_SIZE = 100;

export const usePlatformVoiceNotifications = () => {
  const { user } = useAuth();
  const configRef = useRef<VoiceNotificationConfig>(DEFAULT_CONFIG);
  const isAnnouncingRef = useRef(false);
  const queueRef = useRef<{ id: string; text: string; priority: number }[]>([]);
  const processIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user preferences
  useEffect(() => {
    const loadConfig = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('voice_notifications_enabled, notification_voice_style')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          configRef.current = {
            ...DEFAULT_CONFIG,
            enabled: data.voice_notifications_enabled ?? true,
            voiceStyle: (data.notification_voice_style as any) ?? 'calm',
          };
        }
      } catch (err) {
        console.error('[PlatformVoice] Failed to load config:', err);
      }
    };
    
    loadConfig();
  }, [user]);

  // Generate announcement text based on notification type
  const generateAnnouncement = useCallback((
    type: string,
    fromName: string,
    contextData?: any
  ): string => {
    const style = configRef.current.voiceStyle;
    const prefix = style === 'friendly' ? 'Hey! ' : style === 'professional' ? '' : '';
    
    switch (type) {
      // Social interactions
      case 'like':
        return `${prefix}${fromName} liked your post`;
      case 'comment':
        return `${prefix}${fromName} commented on your post`;
      case 'reply':
        return `${prefix}${fromName} replied to your comment`;
      case 'mention':
        return `${prefix}${fromName} mentioned you`;
      
      // Friend actions
      case 'friend_request':
        return `${prefix}New friend request from ${fromName}`;
      case 'friend_accepted':
        return `${prefix}${fromName} accepted your friend request. You're now connected`;
      case 'friend_online':
        return `${prefix}${fromName} is now online`;
      case 'friend_offline':
        return `${prefix}${fromName} went offline`;
      
      // Messages
      case 'message':
        return `${prefix}New message from ${fromName}`;
      case 'voice_message':
        return `${prefix}${fromName} sent you a voice message`;
      
      // Posts
      case 'post':
        return `${prefix}${fromName} shared a new post`;
      case 'post_share':
        return `${prefix}${fromName} shared your post`;
      
      // Matching & Discovery
      case 'interest_match':
        const interests = contextData?.shared_interests?.slice(0, 2).join(' and ') || 'similar interests';
        return `${prefix}${fromName} shares your interest in ${interests}`;
      case 'nearby_friend':
        return `${prefix}${fromName} is nearby`;
      
      // Events & Reminders
      case 'event_reminder':
        return `${prefix}Reminder: ${contextData?.event_name || 'Your event'} is coming up`;
      case 'reminder':
        return `${prefix}Reminder: ${contextData?.title || 'You have a reminder'}`;
      
      // Status
      case 'status_update':
        return `${prefix}${fromName} updated their status`;
      
      // Achievements
      case 'achievement':
        return `${prefix}Congratulations! You earned a new achievement: ${contextData?.achievement_name || 'achievement'}`;
      case 'badge':
        return `${prefix}You earned a new badge: ${contextData?.badge_name || 'badge'}`;
      case 'milestone':
        return `${prefix}You've reached a milestone: ${contextData?.milestone_name || 'milestone'}`;
      
      // Timeline
      case 'timeline_update':
        return `${prefix}New activity on your timeline`;
      case 'timeline_share':
        return `${prefix}${fromName} shared timeline content with you`;
      
      // Huddle
      case 'huddle_activity':
        return `${prefix}Activity detected in your Huddle area`;
      case 'huddle_join':
        return `${prefix}${fromName} joined your Huddle`;
      
      // Zoe AI
      case 'zoe':
      case 'zoe_insight':
        return contextData?.message || `${prefix}Zoe has something to share with you`;
      case 'zoe_suggestion':
        return `${prefix}Zoe has a suggestion for you`;
      
      // System
      case 'system':
        return contextData?.message || `${prefix}System notification`;
      case 'update':
        return `${prefix}Platform update available`;
      
      default:
        return `${prefix}You have a new notification from ${fromName}`;
    }
  }, []);

  // Process announcement queue
  const processQueue = useCallback(() => {
    if (isAnnouncingRef.current || queueRef.current.length === 0) return;
    if (isAssistantSpeaking()) return;
    
    // Sort by priority (higher first)
    queueRef.current.sort((a, b) => b.priority - a.priority);
    
    const item = queueRef.current.shift();
    if (!item) return;
    
    isAnnouncingRef.current = true;
    
    // Use Zoe voice (default Mmora platform voice)
    speakAsZoe(
      item.text,
      undefined,
      () => console.log('[PlatformVoice] Speaking:', item.text.substring(0, 40)),
      () => {
        isAnnouncingRef.current = false;
        // Process next item after a small delay
        setTimeout(processQueue, 500);
      },
      (error) => {
        console.error('[PlatformVoice] Speech error:', error);
        isAnnouncingRef.current = false;
        setTimeout(processQueue, 500);
      }
    );
  }, []);

  // Start queue processor
  useEffect(() => {
    processIntervalRef.current = setInterval(processQueue, 1000);
    
    return () => {
      if (processIntervalRef.current) {
        clearInterval(processIntervalRef.current);
      }
    };
  }, [processQueue]);

  // Announce a notification
  const announce = useCallback((
    id: string,
    type: string,
    fromName: string,
    contextData?: any,
    priority: number = 5
  ) => {
    if (!configRef.current.enabled) return;
    if (!configRef.current.announceTypes.includes(type)) return;
    
    // Check for duplicates
    if (announcedIds.has(id)) return;
    
    // Clean old cache
    if (announcedIds.size > MAX_CACHE_SIZE) {
      const entries = Array.from(announcedIds);
      entries.slice(0, 50).forEach(e => announcedIds.delete(e));
    }
    
    announcedIds.add(id);
    
    const text = generateAnnouncement(type, fromName, contextData);
    queueRef.current.push({ id, text, priority });
    
    console.log('[PlatformVoice] Queued:', type, text);
  }, [generateAnnouncement]);

  // Direct speak method (for immediate announcements)
  const speakNow = useCallback((text: string, priority: number = 10) => {
    if (!configRef.current.enabled) return;
    
    // Stop current speech if lower priority
    if (isAssistantSpeaking()) {
      stopSpeaking();
    }
    
    // Use Zoe voice (default Mmora platform voice)
    speakAsZoe(
      text,
      undefined,
      () => console.log('[PlatformVoice] Immediate:', text.substring(0, 40)),
      () => {},
      (error) => console.error('[PlatformVoice] Error:', error)
    );
  }, []);

  // Listen for platform-wide notification events
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const { id, type, fromName, contextData, priority } = event.detail;
      announce(id || `${Date.now()}`, type, fromName || 'Someone', contextData, priority);
    };
    
    const handleZoeSpeak = (event: CustomEvent) => {
      const { text, priority } = event.detail || {};
      if (text) {
        speakNow(text, priority || 5);
      }
    };
    
    window.addEventListener('platform-notification', handleNotification as EventListener);
    window.addEventListener('zoe-announce', handleZoeSpeak as EventListener);
    window.addEventListener('lisa-response', handleZoeSpeak as EventListener);
    
    return () => {
      window.removeEventListener('platform-notification', handleNotification as EventListener);
      window.removeEventListener('zoe-announce', handleZoeSpeak as EventListener);
      window.removeEventListener('lisa-response', handleZoeSpeak as EventListener);
    };
  }, [announce, speakNow]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`platform-voice-${user.id}`)
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
          
          // Get sender info
          let fromName = 'Someone';
          if (notification.from_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', notification.from_user_id)
              .single();
            
            if (profile) {
              fromName = profile.display_name;
            }
          }
          
          announce(
            notification.id,
            notification.type,
            fromName,
            notification.context_data,
            notification.priority || 5
          );
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, announce]);

  return {
    announce,
    speakNow,
    isEnabled: configRef.current.enabled,
    config: configRef.current,
  };
};

// Helper to dispatch platform notification events
export const dispatchPlatformNotification = (
  type: string,
  fromName: string,
  contextData?: any,
  priority?: number
) => {
  window.dispatchEvent(new CustomEvent('platform-notification', {
    detail: {
      id: `${type}-${Date.now()}`,
      type,
      fromName,
      contextData,
      priority: priority || 5,
    }
  }));
};

// Helper to make Zoe speak immediately
export const zoeAnnounce = (text: string, priority?: number) => {
  window.dispatchEvent(new CustomEvent('zoe-announce', {
    detail: { text, priority: priority || 5 }
  }));
};
