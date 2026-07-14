import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { playTimelineNotificationSound, getActivityDescription, type TimelineActivityType } from '@/utils/timelineNotificationSounds';
import { speakAsZoe } from '@/utils/zoeVoice';

/**
 * Hook to handle real-time timeline activity notifications
 * with ultra-rich sound feedback and voice announcements
 */
export const useTimelineNotifications = () => {
  const { user } = useAuth();

  const handleActivityNotification = useCallback(async (payload: any) => {
    const activity = payload.new;
    const activityType = activity.activity_type as TimelineActivityType;
    
    // Play cosmic notification sound
    await playTimelineNotificationSound(activityType);
    
    // Show toast notification
    const description = getActivityDescription(activityType);
    toast.success(description, {
      description: activity.activity_data?.description || '',
      duration: 4000,
    });
    
    // Voice announcement for important activities
    if (activityType === 'future_proposal_analyzed' || activityType === 'threshold_explored') {
      const voiceMessage = activity.activity_data?.voice_message || description;
      speakAsZoe(voiceMessage);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to timeline activities
    const channel = supabase
      .channel(`timeline-activities:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'timeline_activities',
          filter: `user_id=eq.${user.id}`,
        },
        handleActivityNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, handleActivityNotification]);

  const trackActivity = useCallback(async (
    activityType: TimelineActivityType,
    data?: {
      thresholdId?: number;
      contentId?: string;
      description?: string;
      voiceMessage?: string;
    }
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from('timeline_activities').insert({
        user_id: user.id,
        activity_type: activityType,
        threshold_id: data?.thresholdId,
        content_id: data?.contentId,
        activity_data: {
          description: data?.description,
          voice_message: data?.voiceMessage,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to track timeline activity:', error);
    }
  }, [user?.id]);

  return { trackActivity };
};
