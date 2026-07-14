import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';
import { useVoiceNotifications } from './useVoiceNotifications';

interface SmartNotification {
  id: string;
  type: string;
  from_user_id: string;
  priority: number;
  suggestion_type?: string;
  context_data?: {
    shared_interests?: string[];
    location_match?: boolean;
    activity_suggestion?: string;
    friend_status?: string;
    conversation_starter?: string;
  };
  created_at: string;
  expires_at?: string;
  from_user?: {
    display_name: string;
    profile_photo_url?: string;
    city?: string;
    hobbies?: string[];
    status?: string;
  };
}

export const useSmartNotifications = () => {
  const { user } = useAuth();
  const [contextAwareNotifications, setContextAwareNotifications] = useState<SmartNotification[]>([]);
  const { announceHuddleActivity } = useVoiceNotifications();

  // Analyze and generate smart notifications based on context
  const analyzeAndGenerateNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's profile with interests and location
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('hobbies, city, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userProfile) return;

      // Get user's friends who are online
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) return;

      const friendIds = friendships.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      );

      // Get friends' profiles with context
      const { data: friendProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, profile_photo_url, hobbies, city, status')
        .in('user_id', friendIds)
        .eq('status', 'online'); // Only online friends

      if (!friendProfiles || friendProfiles.length === 0) return;

      // Find friends with shared interests and location matches
      const suggestions: SmartNotification[] = [];

      for (const friend of friendProfiles) {
        const sharedInterests = userProfile.hobbies?.filter(
          (hobby: string) => friend.hobbies?.includes(hobby)
        ) || [];

        const locationMatch = userProfile.city && friend.city && 
          userProfile.city.toLowerCase() === friend.city.toLowerCase();

        // Generate context-aware suggestions
        if (sharedInterests.length > 0) {
          // Check if notification already exists recently
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('from_user_id', friend.user_id)
            .eq('suggestion_type', 'interest_match')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingNotif && sharedInterests.length >= 2) {
            // Create smart suggestion notification
            const conversationStarters = [
              `Start a conversation about ${sharedInterests[0]}`,
              `Share your thoughts on ${sharedInterests[1]}`,
              `Discuss ${sharedInterests[0]} together`,
            ];

            const contextData: {
              shared_interests: string[];
              location_match: boolean;
              friend_status: string;
              conversation_starter: string;
              activity_suggestion?: string;
            } = {
              shared_interests: sharedInterests,
              location_match: locationMatch,
              friend_status: friend.status,
              conversation_starter: conversationStarters[Math.floor(Math.random() * conversationStarters.length)],
            };

            // If location match and shared interests, suggest meetup
            if (locationMatch && sharedInterests.length >= 2) {
              contextData.activity_suggestion = `Meet up for ${sharedInterests[0]} in ${userProfile.city}`;
            }

            // Insert notification
            await supabase.from('notifications').insert({
              user_id: user.id,
              from_user_id: friend.user_id,
              type: 'interest_match',
              suggestion_type: 'interest_match',
              priority: locationMatch ? 9 : 7,
              context_data: contextData,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              read: false,
            });

            // NOTE: Voice announcements disabled - EAP handles welcome message
            // Users found automatic voice notifications disruptive
          }
        }

        // NOTE: friend_online announcements disabled per user preference
      }

      // Cleanup expired notifications
      await supabase.rpc('cleanup_expired_notifications');

    } catch (error) {
      console.error('Error analyzing notifications:', error);
    }
  }, [user]);

  // Monitor friend status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friend-status-changes:${user.id}:smart:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `status=eq.online`,
        },
        () => {
          // When a friend comes online, check for context-aware notifications
          analyzeAndGenerateNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, analyzeAndGenerateNotifications]);

  // Periodic check for context-aware opportunities
  useEffect(() => {
    if (!user) return;

    // Check every 30 minutes
    const interval = setInterval(() => {
      analyzeAndGenerateNotifications();
    }, 30 * 60 * 1000);

    // Initial check
    analyzeAndGenerateNotifications();

    return () => clearInterval(interval);
  }, [user, analyzeAndGenerateNotifications]);

  // Fetch context-aware notifications
  const fetchSmartNotifications = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .not('suggestion_type', 'is', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const fromUserIds = Array.from(new Set(data.map((n: any) => n.from_user_id).filter(Boolean)));
      const { data: profiles } = fromUserIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, display_name, profile_photo_url, city, hobbies, status')
            .in('user_id', fromUserIds)
        : { data: [] as any[] };

      const profilesById = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
      setContextAwareNotifications(data.map((notification: any) => ({
        ...notification,
        from_user: profilesById.get(notification.from_user_id) || null,
      })) as any);
    }
  }, [user]);

  useEffect(() => {
    fetchSmartNotifications();
  }, [fetchSmartNotifications]);

  return {
    contextAwareNotifications,
    analyzeAndGenerateNotifications,
    fetchSmartNotifications,
  };
};
