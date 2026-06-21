import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChallengeSeason {
  id: string;
  season_name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  season_type: string;
  theme: string;
  bonus_multiplier: number;
  created_at: string;
}

interface SeasonalChallenge {
  id: string;
  season_id: string;
  challenge_id: string;
  is_exclusive: boolean;
}

export const useChallengeSeasons = () => {
  const [activeSeasons, setActiveSeasons] = useState<ChallengeSeason[]>([]);
  const [seasonalChallenges, setSeasonalChallenges] = useState<SeasonalChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSeasons = useCallback(async () => {
    try {
      // Load active seasons
      const { data: seasons, error: seasonsError } = await supabase
        .from('challenge_seasons')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: false });

      if (seasonsError) throw seasonsError;

      // Load seasonal challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('seasonal_challenges')
        .select('*');

      if (challengesError) throw challengesError;

      setActiveSeasons(seasons || []);
      setSeasonalChallenges(challenges || []);
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSeasonProgress = useCallback((seasonId: string) => {
    const now = new Date();
    const season = activeSeasons.find(s => s.id === seasonId);
    if (!season) return 0;

    const start = new Date(season.start_date).getTime();
    const end = new Date(season.end_date).getTime();
    const current = now.getTime();

    if (current < start) return 0;
    if (current > end) return 100;

    return ((current - start) / (end - start)) * 100;
  }, [activeSeasons]);

  const getSeasonChallenges = useCallback((seasonId: string) => {
    return seasonalChallenges.filter(sc => sc.season_id === seasonId);
  }, [seasonalChallenges]);

  const isSeasonActive = useCallback((seasonId: string) => {
    const season = activeSeasons.find(s => s.id === seasonId);
    if (!season) return false;

    const now = new Date();
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);

    return now >= start && now <= end && season.is_active;
  }, [activeSeasons]);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  return {
    activeSeasons,
    seasonalChallenges,
    loading,
    getSeasonProgress,
    getSeasonChallenges,
    isSeasonActive,
    reload: loadSeasons,
  };
};
