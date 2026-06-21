/**
 * New User Sign-up/Sign-in Notifications Hook
 * Provides real-time notifications when new users join the platform
 * For Zoe Orb chat integration and admin notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface NewUserEvent {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  profilePhotoUrl?: string;
  eventType: 'signup' | 'signin';
  timestamp: string;
  isNew: boolean;
}

interface UseNewUserNotificationsReturn {
  newUserEvents: NewUserEvent[];
  unreadCount: number;
  markAsRead: (eventId: string) => void;
  markAllAsRead: () => void;
  getLatestForChat: () => string;
  isSubscribed: boolean;
}

export const useNewUserNotifications = (): UseNewUserNotificationsReturn => {
  const { user } = useAuth();
  const [newUserEvents, setNewUserEvents] = useState<NewUserEvent[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to profile inserts (new sign-ups)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-user-signups')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const newProfile = payload.new as any;
          
          // Don't notify about the current user
          if (newProfile.user_id === user.id) return;
          
          const event: NewUserEvent = {
            id: `signup-${newProfile.user_id}-${Date.now()}`,
            userId: newProfile.user_id,
            displayName: newProfile.display_name || 'New User',
            username: newProfile.username || 'user',
            profilePhotoUrl: newProfile.profile_photo_url,
            eventType: 'signup',
            timestamp: new Date().toISOString(),
            isNew: true,
          };
          
          setNewUserEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
          console.log('[NewUserNotifications] New user signed up:', event.displayName);
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const markAsRead = useCallback((eventId: string) => {
    setNewUserEvents(prev => 
      prev.map(e => e.id === eventId ? { ...e, isNew: false } : e)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNewUserEvents(prev => prev.map(e => ({ ...e, isNew: false })));
  }, []);

  // Get summary for Zoe chat context
  const getLatestForChat = useCallback((): string => {
    const recentNew = newUserEvents.filter(e => e.isNew).slice(0, 3);
    
    if (recentNew.length === 0) return '';
    
    if (recentNew.length === 1) {
      return `New user "${recentNew[0].displayName}" (@${recentNew[0].username}) just joined the platform!`;
    }
    
    const names = recentNew.map(e => e.displayName).join(', ');
    return `${recentNew.length} new users joined recently: ${names}. Welcome them to the community!`;
  }, [newUserEvents]);

  const unreadCount = newUserEvents.filter(e => e.isNew).length;

  return {
    newUserEvents,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getLatestForChat,
    isSubscribed,
  };
};

export default useNewUserNotifications;
