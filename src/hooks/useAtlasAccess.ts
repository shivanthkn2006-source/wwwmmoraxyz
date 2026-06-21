// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GLASS VAULT: ATLAS GATEKEEPER
// Purpose: Calculate access to 5 Core Pillars for Smith AI HUD
// Security: Progressive disclosure - users must "earn" access to advanced features
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR UNLOCK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PillarStatus {
  isUnlocked: boolean;
  completionPercent: number;
  missingFields: string[];
  requiredThreshold: number;
}

export interface AtlasAccessState {
  // The 5 Core Pillars
  career: PillarStatus;
  relationships: PillarStatus;
  health: PillarStatus;
  wealth: PillarStatus;
  dhf: PillarStatus;
  
  // Master Key - All 5 unlocked
  canAccessSmithAI: boolean;
  
  // Overall progress
  overallProgress: number;
  unlockedPillars: number;
  totalPillars: number;
  
  // Shadow ban detection (competitor protection)
  isShadowMode: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Redirect path for unlocking
  getUnlockPath: (pillarId: string) => string;
}

// Field mappings for each pillar
const PILLAR_FIELDS = {
  career: {
    threshold: 80, // Must be 80% filled
    fields: ['profession', 'organization', 'field_of_study'],
    weights: { profession: 40, organization: 30, field_of_study: 30 },
    unlockPath: '/kronos',
    friendlyName: 'Career & Skills',
  },
  relationships: {
    threshold: 60, // Must be 60% filled
    fields: ['relationship_status', 'city', 'bio'],
    weights: { relationship_status: 40, city: 30, bio: 30 },
    unlockPath: '/anima',
    friendlyName: 'Relationships',
  },
  health: {
    threshold: 50, // Must be 50% filled
    fields: ['birth_date', 'gender'],
    weights: { birth_date: 60, gender: 40 },
    unlockPath: '/vitruvian',
    friendlyName: 'Health & Wellness',
  },
  wealth: {
    threshold: 50, // Must be 50% filled
    fields: ['profession', 'organization'],
    weights: { profession: 50, organization: 50 },
    unlockPath: '/career-divinity',
    friendlyName: 'Wealth & Finance',
  },
  dhf: {
    threshold: 70, // Must be 70% filled
    fields: ['birth_date', 'birth_time', 'birth_place', 'bio'],
    weights: { birth_date: 30, birth_time: 25, birth_place: 25, bio: 20 },
    unlockPath: '/dhf-dashboard',
    friendlyName: 'DHF Core',
  },
};

// Voice lines for locked pillars (Smith persona)
export const PILLAR_LOCK_VOICE = {
  career: 'Insufficient data. Access to Career Protocols requires professional calibration.',
  relationships: 'Soul Synergy module locked. Relationship data required for activation.',
  health: 'Guardian protocols offline. Biometric calibration incomplete.',
  wealth: 'Financial telemetry unavailable. Asset mapping required.',
  dhf: 'Digital Human Framework restricted. Soul Codex data incomplete.',
  zoe: 'Full Smith AI access requires completion of all five core pillars.',
  smithAI: 'Full Smith AI access requires completion of all five pillars.',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GATEKEEPER HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAtlasAccess(): AtlasAccessState {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShadowMode, setIsShadowMode] = useState(false);
  
  // Load profile and check shadow ban status
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const loadProfile = async () => {
      try {
        // Load profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Check shadow ban status (competitor protection)
        // Shadow mode: Account < 24 hours old AND has low activity
        if (profileData) {
          const createdAt = new Date(profileData.created_at || Date.now());
          const accountAge = Date.now() - createdAt.getTime();
          const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours
          
          if (isNewAccount) {
            // Check behavioral event count (activity indicator)
            const { count } = await supabase
              .from('behavioral_events')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            const hasActivity = (count || 0) > 5;
            setIsShadowMode(isNewAccount && !hasActivity);
          }
        }
      } catch (err) {
        console.error('[AtlasGatekeeper] Profile load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);
  
  // Calculate pillar status
  const calculatePillarStatus = useCallback((pillarId: keyof typeof PILLAR_FIELDS): PillarStatus => {
    const config = PILLAR_FIELDS[pillarId];
    
    if (!profile) {
      return {
        isUnlocked: false,
        completionPercent: 0,
        missingFields: config.fields.map(f => f.replace(/_/g, ' ')),
        requiredThreshold: config.threshold,
      };
    }
    
    let totalWeight = 0;
    let earnedWeight = 0;
    const missingFields: string[] = [];
    
    config.fields.forEach(field => {
      const weight = config.weights[field as keyof typeof config.weights] || 0;
      totalWeight += weight;
      
      const value = profile[field];
      const hasValue = value !== null && value !== undefined && value !== '' &&
        (Array.isArray(value) ? value.length > 0 : true);
      
      if (hasValue) {
        earnedWeight += weight;
      } else {
        missingFields.push(field.replace(/_/g, ' '));
      }
    });
    
    const completionPercent = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    
    return {
      isUnlocked: completionPercent >= config.threshold,
      completionPercent,
      missingFields,
      requiredThreshold: config.threshold,
    };
  }, [profile]);
  
  // Calculate all pillars
  const accessState = useMemo((): AtlasAccessState => {
    const career = calculatePillarStatus('career');
    const relationships = calculatePillarStatus('relationships');
    const health = calculatePillarStatus('health');
    const wealth = calculatePillarStatus('wealth');
    const dhf = calculatePillarStatus('dhf');
    
    const pillars = [career, relationships, health, wealth, dhf];
    const unlockedPillars = pillars.filter(p => p.isUnlocked).length;
    const overallProgress = Math.round(
      pillars.reduce((sum, p) => sum + p.completionPercent, 0) / pillars.length
    );
    
    // Master key: All 5 pillars must be unlocked
    const canAccessSmithAI = unlockedPillars === 5;
    
    // Get unlock path for a pillar
    const getUnlockPath = (pillarId: string): string => {
      const config = PILLAR_FIELDS[pillarId as keyof typeof PILLAR_FIELDS];
      return config?.unlockPath || '/profile';
    };
    
    return {
      career,
      relationships,
      health,
      wealth,
      dhf,
      canAccessSmithAI,
      overallProgress,
      unlockedPillars,
      totalPillars: 5,
      isShadowMode,
      isLoading,
      getUnlockPath,
    };
  }, [calculatePillarStatus, isShadowMode, isLoading]);
  
  return accessState;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Get pillar config
// ═══════════════════════════════════════════════════════════════════════════════

export const getPillarConfig = (pillarId: string) => {
  return PILLAR_FIELDS[pillarId as keyof typeof PILLAR_FIELDS] || null;
};

export const getPillarVoiceLine = (pillarId: string): string => {
  return PILLAR_LOCK_VOICE[pillarId as keyof typeof PILLAR_LOCK_VOICE] || 
    'Module locked. Additional data required for activation.';
};

export default useAtlasAccess;
