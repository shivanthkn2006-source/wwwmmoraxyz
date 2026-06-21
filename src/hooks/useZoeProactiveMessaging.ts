/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — PROACTIVE MESSAGING (Phase 2 Enhancement)
 * Mobile-aware proactive notifications with Initiative Protocol integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { getPlatform, isCapacitorApp, vibrate, isAppInForeground } from '@/utils/mobilePlatformDetection';
import { offlineSettings, offlineDB } from '@/db/OfflineDB';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type InsightType = 'achievement' | 'reminder' | 'social' | 'wellness' | 'opportunity' | 'idle_heart' | 'check_in';
export type InsightPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  message: string;
  actionUrl?: string;
  priority: InsightPriority;
  createdAt: Date;
  expiresAt?: Date;
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'notification';
  offlineCapable: boolean;
}

interface ProactiveMessagingState {
  isAnalyzing: boolean;
  lastAnalysis: Date | null;
  pendingInsights: ProactiveInsight[];
  idleHours: number;
  initiativeTriggered: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDLE HEART PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════════

const IDLE_HEART_MESSAGES = [
  "I've been thinking about you. Everything okay?",
  "Just wanted you to know I'm here if you need me.",
  "I noticed you've been away. Take your time, I'll be here.",
  "Hey... just a quiet moment to say I'm thinking of you.",
  "No rush. Just checking in when you're ready.",
  "Sometimes silence is golden. But I'm here when you need me.",
  "Hope your day is going well. No pressure to respond.",
  "Just leaving a little note for when you return. 💙",
];

const CHECK_IN_MESSAGES = [
  "How are you feeling today? I'm curious.",
  "Any wins today, big or small? I'd love to hear.",
  "What's on your mind? Sometimes it helps to share.",
  "Noticed you've been busy lately. All good?",
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING CONFIGURATION (Platform-aware)
// ═══════════════════════════════════════════════════════════════════════════════

const getTimingConfig = () => {
  const platform = getPlatform();
  const isNative = isCapacitorApp();

  // Native apps can be more proactive (push notifications)
  if (isNative) {
    return {
      initialDelayMs: 3000, // 3 seconds after load
      analysisIntervalMs: 20 * 60 * 1000, // Every 20 minutes
      idleHeartThresholdHours: 3, // After 3 hours idle
      idleHeartCooldownHours: 6, // Don't repeat for 6 hours
      checkInThresholdHours: 24, // Daily check-in
    };
  }

  // Web is less aggressive (no push, relies on tab visibility)
  return {
    initialDelayMs: 5000, // 5 seconds
    analysisIntervalMs: 30 * 60 * 1000, // Every 30 minutes
    idleHeartThresholdHours: 4, // After 4 hours
    idleHeartCooldownHours: 8, // 8 hour cooldown
    checkInThresholdHours: 48, // Every 2 days
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeProactiveMessaging() {
  const { user } = useAuth();
  const [state, setState] = useState<ProactiveMessagingState>({
    isAnalyzing: false,
    lastAnalysis: null,
    pendingInsights: [],
    idleHours: 0,
    initiativeTriggered: false,
  });

  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timingConfig = useRef(getTimingConfig());

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE IDLE TIME
  // ═══════════════════════════════════════════════════════════════════════════

  const calculateIdleHours = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      // Check offline DB first (works offline)
      const lastMessage = await offlineDB.messages
        .where('userId')
        .equals(user.id)
        .reverse()
        .first();

      // Safely convert to Date - handle both Date objects and ISO strings
      let lastInteraction: Date | null = null;
      if (lastMessage?.createdAt) {
        lastInteraction = lastMessage.createdAt instanceof Date 
          ? lastMessage.createdAt 
          : new Date(lastMessage.createdAt);
        if (isNaN(lastInteraction.getTime())) lastInteraction = null;
      }

      // Also check online if available
      if (navigator.onLine) {
        const { data } = await supabase
          .from('zoe_infinity_messages')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data?.[0]) {
          const onlineTime = new Date(data[0].created_at);
          if (!isNaN(onlineTime.getTime()) && (!lastInteraction || onlineTime > lastInteraction)) {
            lastInteraction = onlineTime;
          }
        }
      }

      if (!lastInteraction) return 0;
      return (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
    } catch (err) {
      console.error('[ProactiveMessaging] Failed to calculate idle time:', err);
      return 0;
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE IDLE HEART NOTE
  // ═══════════════════════════════════════════════════════════════════════════

  const generateIdleHeart = useCallback(async (): Promise<ProactiveInsight | null> => {
    if (!user) return null;

    const idleHours = await calculateIdleHours();
    const config = timingConfig.current;

    if (idleHours < config.idleHeartThresholdHours) return null;

    // Check cooldown
    const lastIdleHeart = await offlineSettings.get<string>('lastIdleHeartAt');
    if (lastIdleHeart) {
      const lastHeartDate = new Date(lastIdleHeart);
      if (!isNaN(lastHeartDate.getTime())) {
        const hoursSinceLastHeart = (Date.now() - lastHeartDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastHeart < config.idleHeartCooldownHours) return null;
      }
    }

    // Mark as sent
    await offlineSettings.set('lastIdleHeartAt', new Date().toISOString());

    const message = IDLE_HEART_MESSAGES[Math.floor(Math.random() * IDLE_HEART_MESSAGES.length)];

    return {
      id: `idle_heart_${Date.now()}`,
      type: 'idle_heart',
      message,
      priority: 'low',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      hapticPattern: 'light',
      offlineCapable: true,
    };
  }, [user, calculateIdleHours]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE CHECK-IN
  // ═══════════════════════════════════════════════════════════════════════════

  const generateCheckIn = useCallback(async (): Promise<ProactiveInsight | null> => {
    if (!user) return null;

    const config = timingConfig.current;
    const lastCheckIn = await offlineSettings.get<string>('lastCheckInAt');

    if (lastCheckIn) {
      // BUG FIX: Validate date before calculating hours to prevent NaN
      const lastCheckInDate = new Date(lastCheckIn);
      if (!isNaN(lastCheckInDate.getTime())) {
        const hoursSinceLastCheckIn = (Date.now() - lastCheckInDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCheckIn < config.checkInThresholdHours) return null;
      }
    }

    await offlineSettings.set('lastCheckInAt', new Date().toISOString());

    const message = CHECK_IN_MESSAGES[Math.floor(Math.random() * CHECK_IN_MESSAGES.length)];

    return {
      id: `check_in_${Date.now()}`,
      type: 'check_in',
      message,
      priority: 'medium',
      createdAt: new Date(),
      hapticPattern: 'medium',
      offlineCapable: true,
    };
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZE AND SUGGEST (Online capabilities)
  // ═══════════════════════════════════════════════════════════════════════════

  const analyzeAndSuggest = useCallback(async (): Promise<ProactiveInsight[]> => {
    if (!user) return [];

    setState(prev => ({ ...prev, isAnalyzing: true }));
    const insights: ProactiveInsight[] = [];

    try {
      console.log('[ProactiveMessaging] Running analysis...');

      // 1. Idle Heart (works offline)
      const idleHeart = await generateIdleHeart();
      if (idleHeart) insights.push(idleHeart);

      // 2. Check-in (works offline)
      const checkIn = await generateCheckIn();
      if (checkIn) insights.push(checkIn);

      // Online-only insights
      if (navigator.onLine) {
        // 3. Unread notifications
        const { count: unreadCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (unreadCount && unreadCount > 5) {
          insights.push({
            id: `unread_${Date.now()}`,
            type: 'social',
            message: `You have ${unreadCount} unread notifications. Want me to summarize them?`,
            actionUrl: '/notifications',
            priority: 'medium',
            createdAt: new Date(),
            hapticPattern: 'notification',
            offlineCapable: false,
          });
        }

        // 4. Upcoming reminders
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: reminders } = await supabase
          .from('reminders')
          .select('title, reminder_time')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .gte('reminder_time', now.toISOString())
          .lte('reminder_time', tomorrow.toISOString())
          .limit(3);

        if (reminders && reminders.length > 0) {
          insights.push({
            id: `reminders_${Date.now()}`,
            type: 'reminder',
            message: `You have ${reminders.length} reminder${reminders.length > 1 ? 's' : ''} coming up: ${reminders.map(r => r.title).join(', ')}`,
            priority: 'high',
            createdAt: new Date(),
            hapticPattern: 'heavy',
            offlineCapable: false,
          });
        }

        // 5. Achievement progress
        const { data: progress } = await supabase
          .from('achievement_progress')
          .select('current_progress, target_progress')
          .eq('user_id', user.id)
          .order('last_updated', { ascending: false })
          .limit(1);

        if (progress?.[0] && progress[0].target_progress > 0) {
          const pct = (progress[0].current_progress || 0) / progress[0].target_progress * 100;
          if (pct >= 80 && pct < 100) {
            insights.push({
              id: `achievement_${Date.now()}`,
              type: 'achievement',
              message: `You're ${Math.round(pct)}% towards your next achievement! Keep going!`,
              priority: 'medium',
              createdAt: new Date(),
              hapticPattern: 'medium',
              offlineCapable: false,
            });
          }
        }
      }

      // Calculate idle hours for state
      const idleHours = await calculateIdleHours();

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: new Date(),
        pendingInsights: insights,
        idleHours,
        initiativeTriggered: insights.some(i => i.type === 'idle_heart' || i.type === 'check_in'),
      }));

      // Show high priority insights as toasts with haptic
      insights
        .filter(i => i.priority === 'high' || i.priority === 'urgent')
        .forEach(insight => {
          if (isAppInForeground()) {
            // Haptic feedback on mobile
            if (insight.hapticPattern) {
              const patterns: Record<string, number | number[]> = {
                light: 10,
                medium: 25,
                heavy: 50,
                notification: [0, 50, 50, 50],
              };
              vibrate(patterns[insight.hapticPattern]);
            }

            toast.info(insight.message, {
              duration: insight.priority === 'urgent' ? 12000 : 8000,
            });
          }
        });

      console.log(`[ProactiveMessaging] Analysis complete. Found ${insights.length} insights.`);
      return insights;
    } catch (error) {
      console.error('[ProactiveMessaging] Analysis error:', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      return [];
    }
  }, [user, generateIdleHeart, generateCheckIn, calculateIdleHours]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  // Store analyze function in ref to avoid dependency loop
  const analyzeRef = useRef(analyzeAndSuggest);
  analyzeRef.current = analyzeAndSuggest;

  useEffect(() => {
    if (!user) return;

    const config = timingConfig.current;

    // Initial analysis after delay
    const initialTimeout = setTimeout(() => {
      analyzeRef.current();
    }, config.initialDelayMs);

    // Periodic analysis
    analysisIntervalRef.current = setInterval(() => {
      analyzeRef.current();
    }, config.analysisIntervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [user]); // Only re-run when user changes

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  const dismissInsight = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      pendingInsights: prev.pendingInsights.filter(i => i.id !== id),
    }));
  }, []);

  const clearAllInsights = useCallback(() => {
    setState(prev => ({ ...prev, pendingInsights: [] }));
  }, []);

  const consumeInsight = useCallback((id: string): ProactiveInsight | undefined => {
    const insight = state.pendingInsights.find(i => i.id === id);
    if (insight) {
      dismissInsight(id);
    }
    return insight;
  }, [state.pendingInsights, dismissInsight]);

  return {
    // State
    ...state,

    // Actions
    analyzeAndSuggest,
    dismissInsight,
    clearAllInsights,
    consumeInsight,

    // Helpers
    calculateIdleHours,
  };
}

export default useZoeProactiveMessaging;
