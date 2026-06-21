import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BADGES } from '@/data/badges';

interface BadgeCollection {
  id: string;
  collection_id: string;
  collection_name: string;
  description: string;
  badge_ids: string[];
  bonus_badge_id: string | null;
  bonus_points: number;
  theme: string;
  icon: string;
}

interface UserCollectionProgress {
  id: string;
  collection_id: string;
  earned_badge_ids: string[];
  is_completed: boolean;
  completed_at: string | null;
  bonus_claimed: boolean;
}

export const useBadgeCollections = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<BadgeCollection[]>([]);
  const [userProgress, setUserProgress] = useState<UserCollectionProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    if (!user) return;

    try {
      // Load all collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('badge_collections')
        .select('*')
        .order('theme');

      if (collectionsError) throw collectionsError;

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_collection_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      setCollections((collectionsData || []).map(c => ({
        ...c,
        badge_ids: c.badge_ids as any as string[]
      })));
      setUserProgress((progressData || []).map(p => ({
        ...p,
        earned_badge_ids: p.earned_badge_ids as any as string[]
      })));
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getCollectionProgress = useCallback((collectionId: string) => {
    return userProgress.find(p => p.collection_id === collectionId);
  }, [userProgress]);

  const getCollectionCompletionPercentage = useCallback(async (collectionId: string) => {
    if (!user) return 0;

    const collection = collections.find(c => c.collection_id === collectionId);
    if (!collection) return 0;

    // Get user's badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user.id);

    const userBadgeIds = new Set(userBadges?.map(b => b.badge_id) || []);
    const requiredBadges = collection.badge_ids;
    const earnedCount = requiredBadges.filter(id => userBadgeIds.has(id)).length;

    return (earnedCount / requiredBadges.length) * 100;
  }, [user, collections]);

  const getCollectionBadgeDetails = useCallback((badgeIds: string[]) => {
    return badgeIds.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  }, []);

  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user, loadCollections]);

  return {
    collections,
    userProgress,
    loading,
    getCollectionProgress,
    getCollectionCompletionPercentage,
    getCollectionBadgeDetails,
    reload: loadCollections,
  };
};
