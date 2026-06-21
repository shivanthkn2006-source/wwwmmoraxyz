import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  profile_photo_url: string | null;
  total_points: number;
  badge_count: number;
  features_discovered: number;
  current_tier: string | null;
  completed_achievements: number;
  challenge_points: number;
}

export const useLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Use secure function to fetch leaderboard (automatically refreshes materialized view)
      const { data, error } = await supabase
        .rpc('get_leaderboard', { limit_count: 100 });

      if (error) throw error;

      setLeaderboard(data || []);

      // Find user's rank
      const userIndex = data?.findIndex(entry => entry.user_id === user.id);
      if (userIndex !== undefined && userIndex !== -1) {
        setUserRank(userIndex + 1);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopByBadges = () => {
    return [...leaderboard].sort((a, b) => (b.badge_count || 0) - (a.badge_count || 0));
  };

  const getTopByFeatures = () => {
    return [...leaderboard].sort((a, b) => (b.features_discovered || 0) - (a.features_discovered || 0));
  };

  return {
    leaderboard,
    userRank,
    loading,
    getTopByBadges,
    getTopByFeatures,
    reload: loadLeaderboard,
  };
};
