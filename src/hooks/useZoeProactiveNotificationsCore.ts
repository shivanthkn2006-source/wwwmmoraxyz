import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ProactiveInsight {
  type: 'achievement' | 'reminder' | 'social' | 'wellness' | 'opportunity';
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export const useZoeProactiveNotificationsCore = () => {
  const { user } = useAuth();
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [pendingInsights, setPendingInsights] = useState<ProactiveInsight[]>([]);

  const analyzeAndSuggest = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[ZoeProactiveNotifications] Running analysis...');
      
      const insights: ProactiveInsight[] = [];
      
      // Check for unread notifications
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (unreadCount && unreadCount > 5) {
        insights.push({
          type: 'social',
          message: `You have ${unreadCount} unread notifications. Would you like me to summarize them?`,
          actionUrl: '/notifications',
          priority: 'medium',
        });
      }

      // Check for upcoming reminders
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: upcomingReminders } = await supabase
        .from('reminders')
        .select('title, reminder_time')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('reminder_time', now.toISOString())
        .lte('reminder_time', tomorrow.toISOString())
        .limit(3);
      
      if (upcomingReminders && upcomingReminders.length > 0) {
        insights.push({
          type: 'reminder',
          message: `You have ${upcomingReminders.length} reminder${upcomingReminders.length > 1 ? 's' : ''} coming up: ${upcomingReminders.map(r => r.title).join(', ')}`,
          priority: 'high',
        });
      }

      // Check for friends online
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => 
          f.user1_id === user.id ? f.user2_id : f.user1_id
        );
        
        const { count: onlineCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('user_id', friendIds)
          .eq('status', 'online');
        
        if (onlineCount && onlineCount > 0) {
          insights.push({
            type: 'social',
            message: `${onlineCount} of your friends are online right now.`,
            actionUrl: '/huddle',
            priority: 'low',
          });
        }
      }

      // Check for achievement progress
      const { data: progress } = await supabase
        .from('achievement_progress')
        .select('current_progress, target_progress')
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false })
        .limit(1);
      
      if (progress && progress.length > 0) {
        const pct = (progress[0].current_progress || 0) / progress[0].target_progress * 100;
        if (pct >= 80 && pct < 100) {
          insights.push({
            type: 'achievement',
            message: `You're ${Math.round(pct)}% towards your next achievement! Keep going!`,
            priority: 'medium',
          });
        }
      }

      setPendingInsights(insights);
      setLastAnalysis(new Date());
      
      // Show high priority insights as toasts
      insights
        .filter(i => i.priority === 'high')
        .forEach(insight => {
          toast.info(insight.message, {
            duration: 8000,
          });
        });

      console.log(`[ZoeProactiveNotifications] Analysis complete. Found ${insights.length} insights.`);
      return insights;
    } catch (error) {
      console.error('Error in proactive notifications:', error);
      return [];
    }
  }, [user]);

  // Run analysis periodically (every 30 minutes)
  useEffect(() => {
    if (!user) return;

    // Initial analysis after 5 seconds
    const initialTimeout = setTimeout(() => {
      analyzeAndSuggest();
    }, 5000);

    // Periodic analysis every 30 minutes
    const interval = setInterval(() => {
      analyzeAndSuggest();
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, analyzeAndSuggest]);

  return { 
    analyzeAndSuggest, 
    pendingInsights, 
    lastAnalysis,
    clearInsights: () => setPendingInsights([]),
  };
};