// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED ADAPTIVE LEARNING HOOK
// Zero-Friction Data Collection for DHF & ECN
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface BehavioralEvent {
  event_type: string;
  event_category: string;
  context_snippet?: string;
  metadata?: Record<string, any>;
  sentiment_score?: number;
}

interface SyncStatus {
  event_count: number;
  sync_percentage: number;
  finetuning_ready: boolean;
  last_sync_at: string | null;
}

interface ActivityFreshness {
  recent_posts: number;
  recent_events: number;
  last_activity: string | null;
  requires_context_refresh: boolean;
}

export const useAdaptiveLearning = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    event_count: 0,
    sync_percentage: 0,
    finetuning_ready: false,
    last_sync_at: null,
  });
  const [activityFreshness, setActivityFreshness] = useState<ActivityFreshness | null>(null);
  const eventBuffer = useRef<BehavioralEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());

  // Load initial sync status
  useEffect(() => {
    if (!user) return;
    
    const loadSyncStatus = async () => {
      const { data } = await supabase
        .from('zoe_settings')
        .select('event_count, sync_percentage, finetuning_ready, last_event_sync_at')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSyncStatus({
          event_count: data.event_count || 0,
          sync_percentage: data.sync_percentage || 0,
          finetuning_ready: data.finetuning_ready || false,
          last_sync_at: data.last_event_sync_at,
        });
      }
    };

    loadSyncStatus();
    checkActivityFreshness();
  }, [user]);

  // Real-time sync status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adaptive-learning-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zoe_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setSyncStatus(prev => ({
            ...prev,
            event_count: newData.event_count || prev.event_count,
            sync_percentage: newData.sync_percentage || prev.sync_percentage,
            finetuning_ready: newData.finetuning_ready || prev.finetuning_ready,
          }));

          // Show notification for sync milestones
          if (newData.sync_percentage > syncStatus.sync_percentage && 
              newData.sync_percentage % 5 === 0) {
            toast.success(`Adaptive Learning: +${newData.sync_percentage - syncStatus.sync_percentage}% Synced`, {
              duration: 2000,
            });
          }

          // Notify when SFT is ready
          if (newData.finetuning_ready && !syncStatus.finetuning_ready) {
            toast.success('🎉 Fine-Tuning Ready!', {
              description: '10,000+ high-quality events collected. Personalized AI unlocked!',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, syncStatus.sync_percentage, syncStatus.finetuning_ready]);

  // Check user activity freshness
  const checkActivityFreshness = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('check_user_activity_freshness', {
        p_user_id: user.id,
        p_days: 7,
      });

      if (error) {
        console.error('[Adaptive Learning] Freshness check error:', error);
        return null;
      }

      const freshness = data as unknown as ActivityFreshness;
      setActivityFreshness(freshness);
      return freshness;
    } catch (err) {
      console.error('[Adaptive Learning] Freshness check failed:', err);
      return null;
    }
  }, [user]);

  // Flush buffered events to backend
  const flushEvents = useCallback(async () => {
    if (!user || eventBuffer.current.length === 0) return;

    const eventsToSend = [...eventBuffer.current];
    eventBuffer.current = [];

    try {
      const { data, error } = await supabase.functions.invoke('behavioral-event-stream', {
        body: {
          events: eventsToSend.map(e => ({
            ...e,
            session_id: sessionId.current,
          })),
          process_ecn: eventsToSend.length >= 5,
        },
      });

      if (error) {
        console.error('[Adaptive Learning] Flush error:', error);
        // Re-add events to buffer for retry
        eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
      } else if (data?.sync_status) {
        setSyncStatus(data.sync_status);
      }
    } catch (err) {
      console.error('[Adaptive Learning] Flush failed:', err);
      eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
    }
  }, [user]);

  // Track a behavioral event
  const trackEvent = useCallback((event: BehavioralEvent) => {
    if (!user) return;

    // Add to buffer
    eventBuffer.current.push(event);

    // Clear existing timeout
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }

    // Flush immediately if buffer is large, otherwise debounce
    if (eventBuffer.current.length >= 10) {
      flushEvents();
    } else {
      flushTimeout.current = setTimeout(flushEvents, 3000);
    }
  }, [user, flushEvents]);

  // Convenience methods for specific event types
  const trackAIInteraction = useCallback((
    type: 'chat' | 'voice' | 'generation' | 'analysis',
    context: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent({
      event_type: 'ai_interaction',
      event_category: type,
      context_snippet: context.substring(0, 50),
      metadata: { ...metadata, interaction_type: type },
    });
  }, [trackEvent]);

  const trackSocialActivity = useCallback((
    type: 'post' | 'comment' | 'like' | 'share' | 'notification',
    context: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent({
      event_type: 'social_activity',
      event_category: type,
      context_snippet: context.substring(0, 50),
      metadata: { ...metadata, activity_type: type },
    });
  }, [trackEvent]);

  const trackNavigation = useCallback((
    feature: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent({
      event_type: 'navigation',
      event_category: 'feature_usage',
      context_snippet: feature.substring(0, 50),
      metadata: { ...metadata, feature },
    });
  }, [trackEvent]);

  const trackContentCreation = useCallback((
    type: 'text' | 'image' | 'video' | 'audio',
    context: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent({
      event_type: 'content_creation',
      event_category: type,
      context_snippet: context.substring(0, 50),
      metadata: { ...metadata, content_type: type },
    });
  }, [trackEvent]);

  // Record sentiment tapback for Zoe responses
  const recordSentimentTapback = useCallback(async (
    sentiment: 'helpful' | 'confused' | 'perfect',
    responseId: string,
    responseSnippet: string,
    featureContext?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('zoe_response_sentiment')
        .insert({
          user_id: user.id,
          response_id: responseId,
          sentiment,
          response_snippet: responseSnippet.substring(0, 100),
          feature_context: featureContext,
        });

      if (error) throw error;

      // Also track as behavioral event
      trackEvent({
        event_type: 'feedback',
        event_category: 'ecn_response_validation',
        context_snippet: `${sentiment}: ${responseSnippet.substring(0, 30)}`,
        sentiment_score: sentiment === 'perfect' ? 1 : sentiment === 'helpful' ? 0.5 : 0,
        metadata: { sentiment, response_id: responseId },
      });

      toast.success('Thanks for your feedback!', { duration: 1500 });
    } catch (err) {
      console.error('[Adaptive Learning] Sentiment recording failed:', err);
    }
  }, [user, trackEvent]);

  // Record VETO disruption feedback
  const recordVetoFeedback = useCallback(async (
    vetoInterventionId: string,
    helpedOrHindered: 'helped' | 'hindered' | 'neutral',
    timingRating: number,
    contextSnippet?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('veto_feedback')
        .insert({
          user_id: user.id,
          veto_intervention_id: vetoInterventionId,
          helped_or_hindered: helpedOrHindered,
          timing_rating: Math.max(1, Math.min(5, timingRating)),
          context_snippet: contextSnippet?.substring(0, 100),
        });

      if (error) throw error;

      // Also log to DHF learning history
      await supabase
        .from('dhf_learning_history')
        .upsert({
          user_id: user.id,
          behavioral_shifts: {
            veto_feedback: {
              intervention_id: vetoInterventionId,
              result: helpedOrHindered,
              timing: timingRating,
              timestamp: new Date().toISOString(),
            },
          },
          last_refinement_at: new Date().toISOString(),
        });

      toast.success('VETO feedback recorded', { duration: 1500 });
    } catch (err) {
      console.error('[Adaptive Learning] VETO feedback failed:', err);
    }
  }, [user]);

  // Get context refresh alert if needed
  const getContextRefreshAlert = useCallback(() => {
    if (!activityFreshness?.requires_context_refresh) return null;

    return {
      message: 'Zoe requires fresh context',
      description: 'Please create a post or update your profile to maintain High-IQ learning and prevent pattern drift.',
      action: 'refresh_context',
    };
  }, [activityFreshness]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      // Flush remaining events
      if (eventBuffer.current.length > 0) {
        flushEvents();
      }
    };
  }, [flushEvents]);

  return {
    syncStatus,
    activityFreshness,
    trackEvent,
    trackAIInteraction,
    trackSocialActivity,
    trackNavigation,
    trackContentCreation,
    recordSentimentTapback,
    recordVetoFeedback,
    checkActivityFreshness,
    getContextRefreshAlert,
    flushEvents,
  };
};

export default useAdaptiveLearning;