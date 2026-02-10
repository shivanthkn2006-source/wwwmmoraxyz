import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BADGES } from '@/data/badges';

interface AchievementMilestone {
  id: string;
  user_id: string;
  suggested_badge_id: string;
  reason: string;
  progress_percentage: number;
  priority: number;
  dismissed: boolean;
  created_at: string;
}

export const useAchievementMilestones = () => {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<AchievementMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMilestones = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('achievement_milestones')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMilestones(data || []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateMilestones = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's current badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

      const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || []);

      // Get achievement progress
      const { data: progress } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id);

      // Get feature analytics
      const { data: analytics } = await supabase
        .from('feature_analytics')
        .select('feature_id, feature_name')
        .eq('user_id', user.id);

      const usedFeatures = new Set(analytics?.map(a => a.feature_id) || []);
      const suggestions: any[] = [];

      // Analyze and create suggestions
      BADGES.forEach(badge => {
        if (!earnedBadgeIds.has(badge.id)) {
          let reason = '';
          let progressPercentage = 0;
          let priority = 1;

          // Social badges
          if (badge.category === 'Social' && usedFeatures.has('friends')) {
            reason = 'You\'re actively connecting with friends! Keep growing your network.';
            progressPercentage = Math.min(80, (usedFeatures.size / 15) * 100);
            priority = 3;
          }

          // Voice badges
          if (badge.category === 'Voice' && usedFeatures.has('voice_commands')) {
            reason = 'You\'re using voice commands! Try more advanced features.';
            progressPercentage = 40;
            priority = 2;
          }

          // Content badges
          if (badge.category === 'Content' && usedFeatures.has('posts')) {
            reason = 'You\'re creating content! Keep sharing with your network.';
            progressPercentage = 30;
            priority = 2;
          }

          // Discovery badges
          if (badge.category === 'Discovery') {
            progressPercentage = (usedFeatures.size / 20) * 100;
            reason = `You've discovered ${usedFeatures.size} features. Explore more to earn this badge!`;
            priority = 1;
          }

          if (reason && progressPercentage > 0) {
            suggestions.push({
              user_id: user.id,
              suggested_badge_id: badge.id,
              reason,
              progress_percentage: Math.min(100, progressPercentage),
              priority,
            });
          }
        }
      });

      // Insert top 5 suggestions
      if (suggestions.length > 0) {
        const topSuggestions = suggestions
          .sort((a, b) => b.priority - a.priority || b.progress_percentage - a.progress_percentage)
          .slice(0, 5);

        await supabase
          .from('achievement_milestones')
          .insert(topSuggestions);

        await loadMilestones();
      }
    } catch (error) {
      console.error('Error generating milestones:', error);
    }
  }, [user, loadMilestones]);

  const dismissMilestone = useCallback(async (milestoneId: string) => {
    try {
      await supabase
        .from('achievement_milestones')
        .update({ dismissed: true })
        .eq('id', milestoneId);

      await loadMilestones();
    } catch (error) {
      console.error('Error dismissing milestone:', error);
    }
  }, [loadMilestones]);

  useEffect(() => {
    if (user) {
      loadMilestones();
    }
  }, [user, loadMilestones]);

  return {
    milestones,
    loading,
    generateMilestones,
    dismissMilestone,
    reload: loadMilestones,
  };
};
