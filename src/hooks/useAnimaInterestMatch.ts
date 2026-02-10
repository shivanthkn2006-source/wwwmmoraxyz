// ═══════════════════════════════════════════════════════════════════════════════
// USE ANIMA INTEREST MATCH - Ultra-Fast Interest-Based Soul Matching Hook
// Integrates with Zoe DHF for Real-World Personalized Matching
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  AnimaInterestEngine, 
  type ExtendedSoulVector, 
  type InterestSynergyScore 
} from '@/core/quantum/AnimaInterestEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InterestMatch {
  userId: string;
  displayName: string;
  username: string;
  profilePhotoUrl?: string;
  synergy: InterestSynergyScore;
  isOnline?: boolean;
  lastActive?: Date;
}

export interface UseAnimaInterestMatchReturn {
  myProfile: ExtendedSoulVector | null;
  topInterestMatches: InterestMatch[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshMatches: () => Promise<void>;
  getMatchDetails: (userId: string) => Promise<InterestSynergyScore | null>;
  filterByInterest: (interest: string) => InterestMatch[];
  filterByLocation: (city: string) => InterestMatch[];
  lastUpdated: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Batch fetch optimization
async function batchFetchProfiles(userIds: string[]): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  // Batch in chunks of 50 for optimal performance
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 50) {
    chunks.push(userIds.slice(i, i + 50));
  }
  
  await Promise.all(chunks.map(async (chunk) => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, hobbies, profession, city, status')
      .in('user_id', chunk);
    
    data?.forEach(profile => results.set(profile.user_id, profile));
  }));
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useAnimaInterestMatch = (): UseAnimaInterestMatchReturn => {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<ExtendedSoulVector | null>(null);
  const [topInterestMatches, setTopInterestMatches] = useState<InterestMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Refs for optimization
  const matchCacheRef = useRef<Map<string, InterestSynergyScore>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load current user's profile for matching
   */
  const loadMyProfile = useCallback(async (): Promise<ExtendedSoulVector | null> => {
    if (!user) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, hobbies, profession, field_of_study, city, zoe_discovered_interests')
        .eq('user_id', user.id)
        .single();

      if (!profile) return null;

      // Load Zoe learned patterns
      const { data: behavior } = await supabase
        .from('zoe_user_behavior')
        .select('daily_usage_patterns')
        .eq('user_id', user.id)
        .maybeSingle();

      // Load Soul Codex for deeper patterns
      const { data: codex } = await supabase
        .from('dhf_soul_codex')
        .select('core_values, communication_preference')
        .eq('user_id', user.id)
        .maybeSingle();

      // Safely extract discovered interests
      const discoveredInterests: string[] = Array.isArray(profile.zoe_discovered_interests) 
        ? profile.zoe_discovered_interests as string[]
        : [];

      // Safely extract core values
      const coreValues: string[] = Array.isArray(codex?.core_values) 
        ? codex.core_values as string[]
        : [];

      const extendedVector: ExtendedSoulVector = {
        userId: user.id,
        hobbies: profile.hobbies || [],
        profession: profile.profession,
        fieldOfStudy: profile.field_of_study,
        city: profile.city,
        discoveredInterests,
        zoeLearned: {
          frequentTopics: Object.keys((behavior?.daily_usage_patterns as Record<string, number>) || {}),
          emotionalPatterns: [],
          communicationStyle: (codex?.communication_preference as string) || 'balanced',
          preferredActivities: coreValues
        }
      };

      setMyProfile(extendedVector);
      return extendedVector;
    } catch (err) {
      console.error('[AnimaInterest] Error loading profile:', err);
      setError('Failed to load your profile');
      return null;
    }
  }, [user]);

  /**
   * Refresh matches with optimized batch fetching
   */
  const refreshMatches = useCallback(async (): Promise<void> => {
    if (!user) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsRefreshing(true);
    setError(null);

    try {
      // Ensure we have current profile
      let currentProfile = myProfile;
      if (!currentProfile) {
        currentProfile = await loadMyProfile();
        if (!currentProfile) {
          setError('Please complete your profile to find matches');
          setIsRefreshing(false);
          return;
        }
      }

      // Fetch potential matches with hobbies (exclude current user)
      const { data: potentialMatches } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, profile_photo_url, hobbies, profession, city, status')
        .neq('user_id', user.id)
        .not('hobbies', 'is', null)
        .limit(100);

      if (!potentialMatches || potentialMatches.length === 0) {
        setTopInterestMatches([]);
        setIsRefreshing(false);
        return;
      }

      // Convert to extended vectors
      const candidateVectors: ExtendedSoulVector[] = potentialMatches.map(p => ({
        userId: p.user_id,
        hobbies: p.hobbies || [],
        profession: p.profession,
        city: p.city
      }));

      // Find top matches using optimized engine
      const matches = AnimaInterestEngine.findTopInterestMatches(
        currentProfile,
        candidateVectors,
        20, // Top 20
        30  // Min score 30
      );

      // Build final match list with profile data
      const profileMap = new Map(potentialMatches.map(p => [p.user_id, p]));
      
      const interestMatches: InterestMatch[] = matches.map(m => {
        const profile = profileMap.get(m.userId);
        matchCacheRef.current.set(m.userId, m.synergy);
        
        return {
          userId: m.userId,
          displayName: profile?.display_name || 'Unknown',
          username: profile?.username || '',
          profilePhotoUrl: profile?.profile_photo_url,
          synergy: m.synergy,
          isOnline: profile?.status === 'online'
        };
      });

      setTopInterestMatches(interestMatches);
      setLastUpdated(new Date());

      // Log to Zoe DHF
      window.dispatchEvent(new CustomEvent('zoe-dhf-anima-interest-refresh', {
        detail: {
          userId: user.id,
          matchCount: interestMatches.length,
          topScore: interestMatches[0]?.synergy.overall || 0
        }
      }));

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[AnimaInterest] Error refreshing matches:', err);
        setError('Failed to refresh matches');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user, myProfile, loadMyProfile]);

  /**
   * Get detailed match info for specific user
   */
  const getMatchDetails = useCallback(async (userId: string): Promise<InterestSynergyScore | null> => {
    // Check cache first
    if (matchCacheRef.current.has(userId)) {
      return matchCacheRef.current.get(userId)!;
    }

    if (!myProfile) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, hobbies, profession, city')
        .eq('user_id', userId)
        .single();

      if (!profile) return null;

      const targetVector: ExtendedSoulVector = {
        userId: profile.user_id,
        hobbies: profile.hobbies || [],
        profession: profile.profession,
        city: profile.city
      };

      const synergy = AnimaInterestEngine.analyzeInterestSynergy(myProfile, targetVector);
      matchCacheRef.current.set(userId, synergy);
      
      return synergy;
    } catch (err) {
      console.error('[AnimaInterest] Error getting match details:', err);
      return null;
    }
  }, [myProfile]);

  /**
   * Filter matches by specific interest
   */
  const filterByInterest = useCallback((interest: string): InterestMatch[] => {
    const normalizedInterest = interest.toLowerCase().trim();
    return topInterestMatches.filter(m => 
      m.synergy.sharedInterestsList.some(i => i.toLowerCase().includes(normalizedInterest))
    );
  }, [topInterestMatches]);

  /**
   * Filter matches by location
   */
  const filterByLocation = useCallback((city: string): InterestMatch[] => {
    const normalizedCity = city.toLowerCase().trim();
    return topInterestMatches.filter(m => 
      m.synergy.locationProximity >= 75 // Same city or country
    );
  }, [topInterestMatches]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadMyProfile();
      await refreshMatches();
      setIsLoading(false);
    };
    
    if (user) {
      init();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refreshMatches();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, refreshMatches]);

  return {
    myProfile,
    topInterestMatches,
    isLoading,
    isRefreshing,
    error,
    refreshMatches,
    getMatchDetails,
    filterByInterest,
    filterByLocation,
    lastUpdated
  };
};

export default useAnimaInterestMatch;
