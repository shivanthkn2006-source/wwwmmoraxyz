// ═══════════════════════════════════════════════════════════════════════════════
// MINIMUM VIABLE DATA (MVD) SCORING ENGINE
// The Velvet Rope Protocol: Gates advanced features behind profile completion
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface MVDScore {
  // Core metrics
  totalScore: number;           // 0-100
  isBasicComplete: boolean;     // Threshold: 50%
  isAdvancedReady: boolean;     // Threshold: 77%
  isDHFReady: boolean;          // Threshold: 95%
  
  // Breakdown by category
  categories: {
    identity: { score: number; missing: string[] };
    personality: { score: number; missing: string[] };
    astrology: { score: number; missing: string[] };
    social: { score: number; missing: string[] };
  };
  
  // Quick access
  missingFields: string[];
  nextSteps: string[];
  
  // Gating flags
  canAccessLifeCodex: boolean;
  canAccessDHF: boolean;
  canAccessAdvancedFeatures: boolean;
}

// Field weights for scoring
const FIELD_WEIGHTS = {
  // Identity (30 points max)
  display_name: 10,
  username: 10,
  profile_photo_url: 10,
  
  // Personality (25 points max)
  bio: 8,
  profession: 7,
  hobbies: 5,
  gender: 5,
  
  // Astrology (25 points max)
  birth_date: 10,
  birth_time: 8,
  birth_place: 7,
  
  // Social (20 points max)
  city: 7,
  field_of_study: 7,
  organization: 6,
};

const FIELD_LABELS: Record<string, string> = {
  display_name: 'Display Name',
  username: 'Username',
  profile_photo_url: 'Profile Photo',
  bio: 'Bio',
  profession: 'Profession',
  hobbies: 'Hobbies',
  gender: 'Gender',
  birth_date: 'Birth Date',
  birth_time: 'Birth Time',
  birth_place: 'Birth Place',
  city: 'City',
  field_of_study: 'Field of Study',
  organization: 'Organization',
};

export const useMinimumViableData = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err) {
        console.error('[MVD] Profile load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Calculate MVD score
  const mvdScore = useMemo((): MVDScore => {
    if (!profile) {
      return {
        totalScore: 0,
        isBasicComplete: false,
        isAdvancedReady: false,
        isDHFReady: false,
        categories: {
          identity: { score: 0, missing: ['Display Name', 'Username', 'Profile Photo'] },
          personality: { score: 0, missing: ['Bio', 'Profession', 'Hobbies', 'Gender'] },
          astrology: { score: 0, missing: ['Birth Date', 'Birth Time', 'Birth Place'] },
          social: { score: 0, missing: ['City', 'Field of Study', 'Organization'] },
        },
        missingFields: Object.values(FIELD_LABELS),
        nextSteps: ['Complete your basic profile to unlock advanced features'],
        canAccessLifeCodex: false,
        canAccessDHF: false,
        canAccessAdvancedFeatures: false,
      };
    }

    let totalScore = 0;
    const missingFields: string[] = [];
    const categories = {
      identity: { score: 0, missing: [] as string[] },
      personality: { score: 0, missing: [] as string[] },
      astrology: { score: 0, missing: [] as string[] },
      social: { score: 0, missing: [] as string[] },
    };

    // Check each field
    Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
      const value = profile[field];
      const hasValue = value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);

      if (hasValue) {
        totalScore += weight;
        
        // Add to category scores
        if (['display_name', 'username', 'profile_photo_url'].includes(field)) {
          categories.identity.score += weight;
        } else if (['bio', 'profession', 'hobbies', 'gender'].includes(field)) {
          categories.personality.score += weight;
        } else if (['birth_date', 'birth_time', 'birth_place'].includes(field)) {
          categories.astrology.score += weight;
        } else {
          categories.social.score += weight;
        }
      } else {
        missingFields.push(FIELD_LABELS[field] || field);
        
        // Add to category missing
        if (['display_name', 'username', 'profile_photo_url'].includes(field)) {
          categories.identity.missing.push(FIELD_LABELS[field]);
        } else if (['bio', 'profession', 'hobbies', 'gender'].includes(field)) {
          categories.personality.missing.push(FIELD_LABELS[field]);
        } else if (['birth_date', 'birth_time', 'birth_place'].includes(field)) {
          categories.astrology.missing.push(FIELD_LABELS[field]);
        } else {
          categories.social.missing.push(FIELD_LABELS[field]);
        }
      }
    });

    // Normalize to 100
    const normalizedScore = totalScore; // Already out of 100

    // Calculate thresholds - VELVET ROPE PROTOCOL
    // Basic: 50% - Unlocks basic features & Planetary Intent selector
    // Advanced: 77% - Unlocks Life Codex access
    // DHF: 95% - Unlocks Digital Human Fingerprint core
    const isBasicComplete = normalizedScore >= 50;
    const isAdvancedReady = normalizedScore >= 77;
    const isDHFReady = normalizedScore >= 95;

    // Generate next steps
    const nextSteps: string[] = [];
    if (categories.identity.score < 30) {
      nextSteps.push('Complete your identity section (name, username, photo)');
    }
    if (categories.personality.score < 15 && isBasicComplete) {
      nextSteps.push('Add personality details to unlock better AI matching');
    }
    if (categories.astrology.score < 15 && isAdvancedReady) {
      nextSteps.push('Add birth details to unlock Kronos timeline features');
    }

    return {
      totalScore: normalizedScore,
      isBasicComplete,
      isAdvancedReady,
      isDHFReady,
      categories,
      missingFields,
      nextSteps,
      canAccessLifeCodex: isAdvancedReady,
      canAccessDHF: isDHFReady,
      canAccessAdvancedFeatures: isBasicComplete,
    };
  }, [profile]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setProfile(data);
    } catch (err) {
      console.error('[MVD] Refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    profile,
    mvdScore,
    loading,
    error,
    refreshProfile,
  };
};

export default useMinimumViableData;
