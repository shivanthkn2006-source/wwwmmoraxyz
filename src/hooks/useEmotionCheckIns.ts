import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { differenceInHours, format } from 'date-fns';

interface CheckInTrigger {
  type: 'time' | 'inactivity' | 'pattern';
  message: string;
}

export const useEmotionCheckIns = (zoeEnabled: boolean) => {
  const { user } = useAuth();
  const lastCheckInRef = useRef<Date | null>(null);
  const hasCheckedTodayRef = useRef(false);

  const triggerCheckIn = useCallback((trigger: CheckInTrigger) => {
    // Dispatch event for Zoe to listen to
    window.dispatchEvent(new CustomEvent('zoe-emotion-checkin', {
      detail: { message: trigger.message, type: trigger.type }
    }));
    lastCheckInRef.current = new Date();
  }, []);

  const checkTimeBasedTriggers = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();

    // Morning check-in (8-10 AM)
    if (hour >= 8 && hour < 10 && !hasCheckedTodayRef.current) {
      triggerCheckIn({
        type: 'time',
        message: "Good morning! How are you feeling today? I'd love to check in with you."
      });
      hasCheckedTodayRef.current = true;
      return true;
    }

    // Afternoon check-in (2-4 PM)
    if (hour >= 14 && hour < 16) {
      if (!lastCheckInRef.current || differenceInHours(now, lastCheckInRef.current) >= 4) {
        triggerCheckIn({
          type: 'time',
          message: "It's mid-afternoon. How are you holding up? I'm here if you want to share how you're feeling."
        });
        return true;
      }
    }

    // Evening check-in (7-9 PM)
    if (hour >= 19 && hour < 21) {
      if (!lastCheckInRef.current || differenceInHours(now, lastCheckInRef.current) >= 4) {
        triggerCheckIn({
          type: 'time',
          message: "Hope your day went well! How are you feeling this evening?"
        });
        return true;
      }
    }

    return false;
  }, [triggerCheckIn]);

  const checkInactivityTrigger = useCallback(async () => {
    if (!user) return false;

    const { data: recentLogs } = await supabase
      .from('emotion_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!recentLogs || recentLogs.length === 0) {
      // No logs ever - don't be too pushy on first use
      return false;
    }

    const lastLog = new Date(recentLogs[0].created_at);
    const hoursSinceLastLog = differenceInHours(new Date(), lastLog);

    // If no emotion logged in 8+ hours, check in
    if (hoursSinceLastLog >= 8) {
      if (!lastCheckInRef.current || differenceInHours(new Date(), lastCheckInRef.current) >= 6) {
        triggerCheckIn({
          type: 'inactivity',
          message: "I haven't heard from you in a while. How are you feeling? I'm here to listen."
        });
        return true;
      }
    }

    return false;
  }, [user, triggerCheckIn]);

  const checkPatternTrigger = useCallback(async () => {
    if (!user) return false;

    const { data: recentLogs } = await supabase
      .from('emotion_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentLogs || recentLogs.length < 3) return false;

    // Check for negative emotion patterns
    const negativeEmotions = ['sad', 'anxious', 'angry', 'tired'];
    const recentNegative = recentLogs.filter(log => 
      negativeEmotions.includes(log.emotion) && log.intensity >= 3
    );

    // If 3+ negative emotions in recent logs, check in
    if (recentNegative.length >= 3) {
      if (!lastCheckInRef.current || differenceInHours(new Date(), lastCheckInRef.current) >= 12) {
        triggerCheckIn({
          type: 'pattern',
          message: "I've noticed you've been going through some tough emotions lately. Would you like to talk about how you're feeling?"
        });
        return true;
      }
    }

    return false;
  }, [user, triggerCheckIn]);

  const runCheckInLogic = useCallback(async () => {
    if (!zoeEnabled || !user) return;

    // Don't check in if we just did recently (less than 2 hours ago)
    if (lastCheckInRef.current && differenceInHours(new Date(), lastCheckInRef.current) < 2) {
      return;
    }

    // Try different triggers in order of priority
    const timeTriggered = checkTimeBasedTriggers();
    if (timeTriggered) return;

    await checkPatternTrigger();
    await checkInactivityTrigger();
  }, [zoeEnabled, user, checkTimeBasedTriggers, checkPatternTrigger, checkInactivityTrigger]);

  useEffect(() => {
    if (!zoeEnabled || !user) return;

    // Reset daily check flag at midnight
    const resetDailyCheck = () => {
      hasCheckedTodayRef.current = false;
    };

    // Calculate time until midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      resetDailyCheck();
      // Set up daily reset
      setInterval(resetDailyCheck, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Run check-in logic every 30 minutes
    runCheckInLogic(); // Run once on mount
    const interval = setInterval(runCheckInLogic, 30 * 60 * 1000);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(interval);
    };
  }, [zoeEnabled, user, runCheckInLogic]);

  return { triggerCheckIn };
};
