import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BADGES, ACHIEVEMENTS, Badge, Achievement } from '@/data/badges';
import { useToast } from '@/hooks/use-toast';

export const useGamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserBadges = useCallback(async () => {
    if (!user) return;

    try {
      const { data: badges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      setUserBadges(badges || []);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  }, [user]);

  const loadAchievementProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data: progress } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id);

      setAchievementProgress(progress || []);
    } catch (error) {
      console.error('Error loading achievement progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const trackProgress = useCallback(async (achievementId: string, increment: number = 1) => {
    if (!user) return;

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    try {
      // Get current progress
      const { data: existing } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)
        .single();

      const newProgress = (existing?.current_progress || 0) + increment;

      if (existing) {
        // Update existing
        await supabase
          .from('achievement_progress')
          .update({
            current_progress: newProgress,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new
        await supabase
          .from('achievement_progress')
          .insert({
            user_id: user.id,
            achievement_id: achievementId,
            current_progress: newProgress,
            target_progress: achievement.target
          });
      }

      // Check if achievement is completed
      if (newProgress >= achievement.target) {
        await awardBadge(achievement.badge_id, achievement.feature_category);
      }

      await loadAchievementProgress();
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }, [user, loadAchievementProgress]);

  const awardBadge = useCallback(async (badgeId: string, category?: string) => {
    if (!user) return;

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return;

    try {
      // Check if user already has this badge
      const { data: existing } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('badge_id', badgeId)
        .single();

      if (existing) return; // Already has badge

      // Award badge
      await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          badge_name: badge.name,
          badge_description: badge.description,
          badge_icon: badge.icon,
          feature_category: category
        });

      // Show toast notification
      toast({
        title: `🎉 New Badge Earned!`,
        description: `${badge.icon} ${badge.name}: ${badge.description}`,
        duration: 5000,
      });

      await loadUserBadges();
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }, [user, loadUserBadges, toast]);

  const getProgressPercentage = (achievementId: string): number => {
    const progress = achievementProgress.find(p => p.achievement_id === achievementId);
    if (!progress) return 0;
    return Math.min(100, (progress.current_progress / progress.target_progress) * 100);
  };

  const hasBadge = (badgeId: string): boolean => {
    return userBadges.some(b => b.badge_id === badgeId);
  };

  useEffect(() => {
    if (user) {
      loadUserBadges();
      loadAchievementProgress();
    }
  }, [user, loadUserBadges, loadAchievementProgress]);

  return {
    userBadges,
    achievementProgress,
    loading,
    trackProgress,
    awardBadge,
    getProgressPercentage,
    hasBadge,
    reload: () => {
      loadUserBadges();
      loadAchievementProgress();
    }
  };
};
