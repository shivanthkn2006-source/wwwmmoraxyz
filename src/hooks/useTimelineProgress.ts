import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  DeltaSyncVault, 
  deltaSyncSingle, 
  STALE_TIMES, 
  STORES 
} from '@/utils/deltaSyncVault';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

interface TimelineProgress {
  tutorialCompleted: boolean;
  thresholdsExplored: number[];
  expertisePreference: ExpertiseLevel;
  firstVisit: string;
  lastVisit: string;
}

/**
 * Hook to track user progress and preferences in the timeline
 * NOW WITH DELTA SYNC: Only fetches data changed since last sync (1-hour stale time)
 */
export const useTimelineProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<TimelineProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const fetchProgress = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    try {
      // DELTA SYNC: Timeline progress (1-hour stale time)
      const result = await deltaSyncSingle(
        user.id,
        'timeline_user_progress',
        STORES.TIMELINE,
        STALE_TIMES.TIMELINE,
        async () => {
          const { data, error } = await supabase
            .from('timeline_user_progress')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          if (data) {
            return {
              tutorialCompleted: data.tutorial_completed,
              thresholdsExplored: (data.thresholds_explored as number[]) || [],
              expertisePreference: data.expertise_preference as ExpertiseLevel,
              firstVisit: data.first_visit_at,
              lastVisit: data.last_visit_at,
            };
          }
          
          // Create initial progress record if none exists
          const { data: newData, error: insertError } = await supabase
            .from('timeline_user_progress')
            .insert({
              user_id: user.id,
              tutorial_completed: false,
              thresholds_explored: [],
              expertise_preference: 'intermediate',
            })
            .select()
            .single();

          if (insertError) throw insertError;

          return {
            tutorialCompleted: false,
            thresholdsExplored: [],
            expertisePreference: 'intermediate' as ExpertiseLevel,
            firstVisit: newData.first_visit_at,
            lastVisit: newData.last_visit_at,
          };
        },
        forceRefresh
      );

      if (result.data) {
        setProgress(result.data);
        setFromCache(result.fromCache);
        
        if (result.fromCache) {
          console.log('[Timeline] Delta Sync: Using cached data (saved ~5KB)');
        }
      }
    } catch (error) {
      console.error('Failed to fetch timeline progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const markThresholdExplored = useCallback(async (thresholdId: number) => {
    if (!user?.id || !progress) return;

    if (progress.thresholdsExplored.includes(thresholdId)) return;

    const updatedThresholds = [...progress.thresholdsExplored, thresholdId];

    try {
      await supabase
        .from('timeline_user_progress')
        .update({
          thresholds_explored: updatedThresholds,
          last_visit_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setProgress(prev => prev ? {
        ...prev,
        thresholdsExplored: updatedThresholds,
        lastVisit: new Date().toISOString(),
      } : null);
    } catch (error) {
      console.error('Failed to mark threshold explored:', error);
    }
  }, [user?.id, progress]);

  const updateExpertiseLevel = useCallback(async (level: ExpertiseLevel) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('timeline_user_progress')
        .update({ expertise_preference: level })
        .eq('user_id', user.id);

      setProgress(prev => prev ? { ...prev, expertisePreference: level } : null);
    } catch (error) {
      console.error('Failed to update expertise level:', error);
    }
  }, [user?.id]);

  return {
    progress,
    isLoading,
    fromCache, // Delta Sync indicator
    markThresholdExplored,
    updateExpertiseLevel,
    refreshProgress: fetchProgress,
  };
};
