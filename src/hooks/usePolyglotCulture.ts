// ═══════════════════════════════════════════════════════════════════════════════
// POLYGLOT CULTURE HOOK - React integration for cultural adaptation
// Provides the "5 Billion Users" cultural awareness for Zoe
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPolyglotEngine,
  type CulturalProfile,
  type CulturalAdaptation,
} from '@/core/culture/PolyglotEmotionEngine';

export interface UsePolyglotCultureReturn {
  // Current Profile
  profile: CulturalProfile;
  isHighContext: boolean;
  isLowContext: boolean;
  directnessLevel: number;
  formalityLevel: number;
  
  // Adaptation Functions
  adaptResponse: (
    response: string,
    context: {
      userEmotion: string;
      zoeEmotion: string;
      conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    }
  ) => string;
  
  getAdaptation: (context: {
    userEmotion: string;
    zoeEmotion: string;
    conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    messageLength: 'short' | 'medium' | 'long';
  }) => CulturalAdaptation;
  
  // UX Recommendations
  uxRecommendations: {
    preferVoice: boolean;
    preferText: boolean;
    idealResponseLength: 'brief' | 'moderate' | 'detailed';
    animationIntensity: 'subtle' | 'moderate' | 'expressive';
    colorWarmth: 'cool' | 'neutral' | 'warm';
    interactionPace: 'fast' | 'moderate' | 'contemplative';
  };
  
  // Settings
  setCulturalRegion: (region: string) => void;
  setExplicitPreferences: (prefs: Partial<CulturalProfile>) => void;
}

export function usePolyglotCulture(): UsePolyglotCultureReturn {
  const [profile, setProfile] = useState<CulturalProfile>(getPolyglotEngine().getProfile());
  
  // Sync profile on mount
  useEffect(() => {
    // Small delay to allow culture detection to complete
    const timeout = setTimeout(() => {
      setProfile(getPolyglotEngine().getProfile());
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Derived states
  const isHighContext = profile.context === 'high';
  const isLowContext = profile.context === 'low';
  
  // Adapt response with cultural awareness
  const adaptResponse = useCallback((
    response: string,
    context: {
      userEmotion: string;
      zoeEmotion: string;
      conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    }
  ): string => {
    return getPolyglotEngine().adaptResponse(response, context);
  }, []);
  
  // Get adaptation settings
  const getAdaptation = useCallback((context: {
    userEmotion: string;
    zoeEmotion: string;
    conversationTone: 'serious' | 'casual' | 'intimate' | 'professional';
    messageLength: 'short' | 'medium' | 'long';
  }): CulturalAdaptation => {
    return getPolyglotEngine().getAdaptation(context);
  }, []);
  
  // UX recommendations
  const uxRecommendations = useMemo(() => {
    return getPolyglotEngine().getUXRecommendations();
  }, [profile]);
  
  // Set cultural region
  const setCulturalRegion = useCallback((region: string) => {
    getPolyglotEngine().setCulturalRegion(region);
    setProfile(getPolyglotEngine().getProfile());
  }, []);
  
  // Set explicit preferences
  const setExplicitPreferences = useCallback((prefs: Partial<CulturalProfile>) => {
    getPolyglotEngine().setExplicitPreferences(prefs);
    setProfile(getPolyglotEngine().getProfile());
  }, []);
  
  return {
    profile,
    isHighContext,
    isLowContext,
    directnessLevel: profile.directness,
    formalityLevel: profile.formalityLevel,
    adaptResponse,
    getAdaptation,
    uxRecommendations,
    setCulturalRegion,
    setExplicitPreferences,
  };
}

export default usePolyglotCulture;
