// ═══════════════════════════════════════════════════════════════════════════════
// VELVET ROPE CONTEXT
// Strategic gating layer for DHF "Life Codex" Integration
// Progressive disclosure & memory optimization for low-end devices
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useMinimumViableData, type MVDScore } from '@/hooks/useMinimumViableData';

export type PlanetaryIntent = 
  | 'mars'      // Career & Skills
  | 'venus'     // Love & Relationships  
  | 'mercury'   // Education & Learning
  | 'jupiter'   // Life Goals & Purpose
  | 'moon'      // Stress & Recovery
  | null;

export interface VelvetRopeState {
  // Intent selection
  selectedIntent: PlanetaryIntent;
  hasSelectedIntent: boolean;
  
  // MVD gating
  mvdScore: MVDScore;
  isProfileComplete: boolean;
  
  // Module loading flags
  loadedModules: Set<string>;
  
  // UI flags
  showIntentSelector: boolean;
  showProfileGate: boolean;
}

interface VelvetRopeContextValue extends VelvetRopeState {
  // Actions
  setIntent: (intent: PlanetaryIntent) => void;
  clearIntent: () => void;
  shouldLoadModule: (moduleId: string) => boolean;
  dismissIntentSelector: () => void;
  refreshMVD: () => Promise<void>;
}

const VelvetRopeContext = createContext<VelvetRopeContextValue | null>(null);

// Module mapping by planetary intent
const INTENT_MODULES: Record<Exclude<PlanetaryIntent, null>, string[]> = {
  mars: ['career', 'skills', 'agasthya-career', 'resume'],
  venus: ['huddle', 'anima', 'relationships', 'family'],
  mercury: ['education', 'skills-learning', 'knowledge'],
  jupiter: ['kronos', 'dhf', 'life-goals', 'soul-codex'],
  moon: ['health', 'wellness', 'stress', 'meditation'],
};

// Storage key for persistence
const INTENT_STORAGE_KEY = 'mmora_planetary_intent';
const INTENT_DISMISSED_KEY = 'mmora_intent_dismissed_today';

export const VelvetRopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { mvdScore, loading: mvdLoading, refreshProfile } = useMinimumViableData();
  
  const [selectedIntent, setSelectedIntent] = useState<PlanetaryIntent>(null);
  const [loadedModules] = useState<Set<string>>(new Set());
  const [showIntentSelector, setShowIntentSelector] = useState(false);
  
  // Check if intent selector should show
  useEffect(() => {
    if (!user || mvdLoading) return;
    
    // Check if already dismissed today
    const dismissedKey = `${INTENT_DISMISSED_KEY}_${user.id}`;
    const dismissedToday = localStorage.getItem(dismissedKey);
    const today = new Date().toDateString();
    
    if (dismissedToday === today) {
      setShowIntentSelector(false);
      return;
    }
    
    // Check for saved intent
    const savedIntent = localStorage.getItem(`${INTENT_STORAGE_KEY}_${user.id}`);
    if (savedIntent) {
      setSelectedIntent(savedIntent as PlanetaryIntent);
      setShowIntentSelector(false);
    } else if (mvdScore.isBasicComplete) {
      // Only show intent selector if basic profile is complete
      setShowIntentSelector(true);
    }
  }, [user, mvdLoading, mvdScore.isBasicComplete]);
  
  // Set planetary intent
  const setIntent = useCallback((intent: PlanetaryIntent) => {
    if (!user) return;
    
    setSelectedIntent(intent);
    setShowIntentSelector(false);
    
    // Persist selection
    if (intent) {
      localStorage.setItem(`${INTENT_STORAGE_KEY}_${user.id}`, intent);
      localStorage.setItem(`${INTENT_DISMISSED_KEY}_${user.id}`, new Date().toDateString());
      
      // Log intent selection
      console.log(`[VelvetRope] Planetary intent set: ${intent.toUpperCase()}`);
      console.log(`[VelvetRope] Modules to load:`, INTENT_MODULES[intent]);
    }
  }, [user]);
  
  // Clear intent
  const clearIntent = useCallback(() => {
    if (!user) return;
    
    setSelectedIntent(null);
    localStorage.removeItem(`${INTENT_STORAGE_KEY}_${user.id}`);
  }, [user]);
  
  // Check if a module should be loaded based on intent
  const shouldLoadModule = useCallback((moduleId: string): boolean => {
    // If no intent selected, load all modules (legacy behavior)
    if (!selectedIntent) return true;
    
    // Check if module is in the selected intent's list
    const intentModules = INTENT_MODULES[selectedIntent];
    return intentModules.some(m => moduleId.toLowerCase().includes(m.toLowerCase()));
  }, [selectedIntent]);
  
  // Dismiss intent selector for today
  const dismissIntentSelector = useCallback(() => {
    if (!user) return;
    
    setShowIntentSelector(false);
    localStorage.setItem(`${INTENT_DISMISSED_KEY}_${user.id}`, new Date().toDateString());
  }, [user]);
  
  // Refresh MVD score
  const refreshMVD = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);
  
  const value: VelvetRopeContextValue = {
    selectedIntent,
    hasSelectedIntent: selectedIntent !== null,
    mvdScore,
    isProfileComplete: mvdScore.isBasicComplete,
    loadedModules,
    showIntentSelector,
    showProfileGate: !mvdScore.isBasicComplete,
    setIntent,
    clearIntent,
    shouldLoadModule,
    dismissIntentSelector,
    refreshMVD,
  };
  
  return (
    <VelvetRopeContext.Provider value={value}>
      {children}
    </VelvetRopeContext.Provider>
  );
};

export const useVelvetRope = (): VelvetRopeContextValue => {
  const context = useContext(VelvetRopeContext);
  if (!context) {
    throw new Error('useVelvetRope must be used within VelvetRopeProvider');
  }
  return context;
};

// Optional hook for components that might be outside the provider
export const useVelvetRopeOptional = (): VelvetRopeContextValue | null => {
  return useContext(VelvetRopeContext);
};

export default VelvetRopeContext;
