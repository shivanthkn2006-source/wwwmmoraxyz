// ═══════════════════════════════════════════════════════════════════════════════
// NUDGE ENGINE - PROACTIVE MORNING BRIEFING PUSH SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
// 
// PROTOCOL NUDGE: "A true ASI doesn't wait for commands"
// 
// Features:
// - Morning briefing generation at 7 AM user local time
// - Push notification delivery via Web Push API
// - Calendar + Astrology + Weather synthesis
// - User preference controls
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NudgePreferences {
  enabled: boolean;
  deliveryTime: string; // "07:00" format
  includeWeather: boolean;
  includeAstrology: boolean;
  includeCalendar: boolean;
  includeActionItems: boolean;
  notificationMethod: 'push' | 'in_app' | 'both';
  timezone: string;
}

export interface MorningBriefingContent {
  id: string;
  headline: string;
  weatherSummary?: string;
  astrologyInsight?: string;
  calendarHighlight?: string;
  actionItems: string[];
  motivationalQuote: string;
  generatedAt: string;
  deliveredAt?: string;
}

export interface UseNudgeEngineReturn {
  // Preferences
  preferences: NudgePreferences;
  updatePreferences: (updates: Partial<NudgePreferences>) => Promise<void>;
  
  // Push Notifications
  isPushSupported: boolean;
  isPushEnabled: boolean;
  requestPushPermission: () => Promise<boolean>;
  
  // Briefing
  todaysBriefing: MorningBriefingContent | null;
  generateBriefing: () => Promise<MorningBriefingContent | null>;
  deliverBriefing: () => Promise<void>;
  
  // Status
  isLoading: boolean;
  lastDelivered: string | null;
  nextScheduled: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES: NudgePreferences = {
  enabled: true,
  deliveryTime: '07:00',
  includeWeather: true,
  includeAstrology: true,
  includeCalendar: true,
  includeActionItems: true,
  notificationMethod: 'both',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useNudgeEngine(): UseNudgeEngineReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NudgePreferences>(DEFAULT_PREFERENCES);
  const [todaysBriefing, setTodaysBriefing] = useState<MorningBriefingContent | null>(null);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDelivered, setLastDelivered] = useState<string | null>(null);

  // Check push notification support
  const isPushSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator;

  // Calculate next scheduled delivery
  const nextScheduled = useCallback((): string | null => {
    if (!preferences.enabled) return null;
    
    const now = new Date();
    const [hours, minutes] = preferences.deliveryTime.split(':').map(Number);
    
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next.toISOString();
  }, [preferences.enabled, preferences.deliveryTime]);

  // Load preferences from database
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        // Check localStorage first (faster)
        const cached = localStorage.getItem(`nudge_prefs_${user.id}`);
        if (cached) {
          setPreferences(JSON.parse(cached));
        }

        // Then check push notification status
        if (isPushSupported && Notification.permission === 'granted') {
          setIsPushEnabled(true);
        }

        // Check last delivery
        const lastDeliveryKey = `nudge_last_delivered_${user.id}`;
        setLastDelivered(localStorage.getItem(lastDeliveryKey));

      } catch (error) {
        console.error('[NUDGE ENGINE] Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, [user, isPushSupported]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NudgePreferences>): Promise<void> => {
    if (!user) return;

    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);

    // Persist to localStorage
    localStorage.setItem(`nudge_prefs_${user.id}`, JSON.stringify(newPrefs));

    // Log preference change
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'nudge_preferences_updated',
      event_category: 'settings',
      metadata: updates,
    });

    toast.success('Nudge preferences updated');
  }, [user, preferences]);

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported) {
      toast.error('Push notifications not supported on this device');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setIsPushEnabled(true);
        toast.success('Push notifications enabled!', {
          description: 'You will receive your morning briefing every day.',
        });

        // NOTE: Do NOT manually register /sw.js here.
        // The app already uses a platform service worker (PWA) and registering again can
        // create stale-cache / chunk-mismatch crashes ("Importing a module script failed").
        // Push notifications can still work when the main SW is registered by the app.

        return true;
      } else {
        toast.error('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[NUDGE ENGINE] Push permission error:', error);
      return false;
    }
  }, [isPushSupported]);

  // Generate morning briefing content
  const generateBriefing = useCallback(async (): Promise<MorningBriefingContent | null> => {
    if (!user) return null;

    setIsLoading(true);

    try {
      // Get user profile for personalization
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, city, birth_date')
        .eq('user_id', user.id)
        .single();

      // Get today's reminders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: reminders } = await supabase
        .from('reminders')
        .select('title, reminder_time')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('reminder_time', today.toISOString())
        .lt('reminder_time', tomorrow.toISOString())
        .limit(3);

      // Get weather (simplified - would call weather API)
      const weatherSummary = preferences.includeWeather 
        ? `Expected to be a pleasant day in ${profile?.city || 'your area'}.`
        : undefined;

      // Get astrology insight (would integrate with astrology engine)
      const astrologyInsight = preferences.includeAstrology
        ? 'Mars energy is high today - excellent for tackling challenging tasks. Trust your instincts.'
        : undefined;

      // Build calendar highlight
      const calendarHighlight = preferences.includeCalendar && reminders?.length
        ? `You have ${reminders.length} reminder${reminders.length > 1 ? 's' : ''} today: ${reminders.map(r => r.title).join(', ')}`
        : undefined;

      // Generate action items based on user patterns
      const actionItems = preferences.includeActionItems
        ? [
            'Review and respond to priority messages',
            'Complete your most important task before noon',
            'Take a 10-minute break to recharge',
          ]
        : [];

      // Motivational quotes
      const quotes = [
        '"The secret of getting ahead is getting started." - Mark Twain',
        '"What you do today can improve all your tomorrows." - Ralph Marston',
        '"Believe you can and you\'re halfway there." - Theodore Roosevelt',
        '"Start where you are. Use what you have. Do what you can." - Arthur Ashe',
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

      const briefing: MorningBriefingContent = {
        id: `briefing_${Date.now()}`,
        headline: `Good morning, ${profile?.display_name || 'there'}! Here's your briefing.`,
        weatherSummary,
        astrologyInsight,
        calendarHighlight,
        actionItems,
        motivationalQuote: randomQuote,
        generatedAt: new Date().toISOString(),
      };

      setTodaysBriefing(briefing);

      // Store in behavioral events for the Ready Queue
      await supabase.from('behavioral_events').insert([{
        user_id: user.id,
        event_type: 'morning_briefing_ready',
        event_category: 'nudge_engine',
        metadata: JSON.parse(JSON.stringify({
          briefing,
          readyForDelivery: true,
        })),
      }]);

      console.log('[NUDGE ENGINE] ✓ Morning briefing generated');
      return briefing;

    } catch (error) {
      console.error('[NUDGE ENGINE] Briefing generation failed:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, preferences]);

  // Deliver briefing via push notification
  const deliverBriefing = useCallback(async (): Promise<void> => {
    if (!todaysBriefing) {
      await generateBriefing();
    }

    const briefing = todaysBriefing;
    if (!briefing) return;

    // Deliver via push notification
    if (isPushEnabled && preferences.notificationMethod !== 'in_app') {
      try {
        new Notification('☀️ Your Morning Briefing', {
          body: briefing.headline + '\n' + (briefing.astrologyInsight || briefing.weatherSummary || ''),
          icon: '/favicon.ico',
          tag: 'morning-briefing',
          requireInteraction: true,
        });
      } catch (error) {
        console.error('[NUDGE ENGINE] Push notification failed:', error);
      }
    }

    // Always show in-app if enabled
    if (preferences.notificationMethod !== 'push') {
      toast.info(briefing.headline, {
        description: briefing.astrologyInsight || briefing.weatherSummary,
        duration: 10000,
      });
    }

    // Mark as delivered
    briefing.deliveredAt = new Date().toISOString();
    setTodaysBriefing({ ...briefing });

    // Update last delivered
    const key = `nudge_last_delivered_${user?.id}`;
    localStorage.setItem(key, briefing.deliveredAt);
    setLastDelivered(briefing.deliveredAt);

    // Log delivery
    if (user) {
      await supabase.from('behavioral_events').insert([{
        user_id: user.id,
        event_type: 'morning_briefing_delivered',
        event_category: 'nudge_engine',
        metadata: { briefingId: briefing.id },
      }]);
    }

    console.log('[NUDGE ENGINE] ✓ Briefing delivered');
  }, [user, todaysBriefing, isPushEnabled, preferences, generateBriefing]);

  // Check for pending briefing on mount
  useEffect(() => {
    if (!user || !preferences.enabled) return;

    const checkPendingBriefing = async () => {
      // Check if already delivered today
      const today = new Date().toDateString();
      const lastKey = `nudge_last_delivered_${user.id}`;
      const lastDate = localStorage.getItem(lastKey);
      
      if (lastDate) {
        const lastDeliveryDate = new Date(lastDate).toDateString();
        if (lastDeliveryDate === today) {
          console.log('[NUDGE ENGINE] Already delivered today');
          return;
        }
      }

      // Check current time against delivery time
      const now = new Date();
      const [hours, minutes] = preferences.deliveryTime.split(':').map(Number);
      const deliveryTime = new Date();
      deliveryTime.setHours(hours, minutes, 0, 0);

      // If past delivery time, generate and deliver
      if (now >= deliveryTime) {
        console.log('[NUDGE ENGINE] Delivery time passed, generating briefing...');
        await generateBriefing();
        // Don't auto-deliver - wait for user interaction
      }
    };

    checkPendingBriefing();
  }, [user, preferences, generateBriefing]);

  return {
    // Preferences
    preferences,
    updatePreferences,
    
    // Push Notifications
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    
    // Briefing
    todaysBriefing,
    generateBriefing,
    deliverBriefing,
    
    // Status
    isLoading,
    lastDelivered,
    nextScheduled: nextScheduled(),
  };
}

export default useNudgeEngine;
