/**
 * useUniversalCalculator Hook - Phase 4 Integration
 * React hook for accessing the Universal Calculator (Time & Space)
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  universalCalculator,
  SpaceTimeCoordinates,
  OpportunityVector,
  OptimalActivity,
} from '@/core/zoe';

interface CalculatorState {
  isCalculating: boolean;
  lastCalculation: OpportunityVector | null;
  currentCoordinates: SpaceTimeCoordinates | null;
  error: string | null;
}

interface UseUniversalCalculatorReturn {
  // State
  isCalculating: boolean;
  currentVector: OpportunityVector | null;
  coordinates: SpaceTimeCoordinates | null;
  error: string | null;
  
  // Actions
  calculateNow: (coordinates?: Partial<SpaceTimeCoordinates>) => Promise<OpportunityVector | null>;
  calculateForLocation: (lat: number, lng: number) => Promise<OpportunityVector | null>;
  refreshCalculation: () => Promise<void>;
  
  // Utilities
  getCurrentActivity: () => OptimalActivity | null;
  getCosmicMessage: () => string;
  getActionRecommendation: () => string;
  clearCache: () => void;
}

export function useUniversalCalculator(): UseUniversalCalculatorReturn {
  const { user } = useAuth();
  
  const [state, setState] = useState<CalculatorState>({
    isCalculating: false,
    lastCalculation: null,
    currentCoordinates: null,
    error: null,
  });

  /**
   * Get user's current location
   */
  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  }, []);

  /**
   * Build space-time coordinates
   */
  const buildCoordinates = useCallback((
    overrides?: Partial<SpaceTimeCoordinates>
  ): SpaceTimeCoordinates => {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      latitude: 0,
      longitude: 0,
      timestamp: now,
      timezone,
      ...overrides,
    };
  }, []);

  /**
   * Calculate opportunity vector for current location
   */
  const calculateNow = useCallback(async (
    overrides?: Partial<SpaceTimeCoordinates>
  ): Promise<OpportunityVector | null> => {
    setState(prev => ({ ...prev, isCalculating: true, error: null }));
    
    try {
      let coords: SpaceTimeCoordinates;
      
      if (overrides?.latitude !== undefined && overrides?.longitude !== undefined) {
        coords = buildCoordinates(overrides);
      } else {
        // Try to get current location
        try {
          const position = await getCurrentLocation();
          coords = buildCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            ...overrides,
          });
        } catch {
          // Fall back to default coordinates (London)
          coords = buildCoordinates({
            latitude: 51.5074,
            longitude: -0.1278,
            ...overrides,
          });
        }
      }
      
      const vector = await universalCalculator.calculate(coords);
      
      setState({
        isCalculating: false,
        lastCalculation: vector,
        currentCoordinates: coords,
        error: null,
      });
      
      console.log('[useUniversalCalculator] Calculation complete:', {
        alignment: vector.overallAlignment,
        primaryActivity: vector.optimalActivities[0]?.activity,
      });
      
      return vector;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({
        ...prev,
        isCalculating: false,
        error: errorMessage,
      }));
      console.error('[useUniversalCalculator] Error:', error);
      return null;
    }
  }, [buildCoordinates, getCurrentLocation]);

  /**
   * Calculate for specific location
   */
  const calculateForLocation = useCallback(async (
    lat: number,
    lng: number
  ): Promise<OpportunityVector | null> => {
    return calculateNow({ latitude: lat, longitude: lng });
  }, [calculateNow]);

  /**
   * Refresh current calculation
   */
  const refreshCalculation = useCallback(async () => {
    if (state.currentCoordinates) {
      await calculateNow({
        latitude: state.currentCoordinates.latitude,
        longitude: state.currentCoordinates.longitude,
      });
    } else {
      await calculateNow();
    }
  }, [state.currentCoordinates, calculateNow]);

  /**
   * Get current primary activity
   */
  const getCurrentActivity = useCallback((): OptimalActivity | null => {
    return state.lastCalculation?.optimalActivities[0] ?? null;
  }, [state.lastCalculation]);

  /**
   * Get cosmic message
   */
  const getCosmicMessage = useCallback((): string => {
    return state.lastCalculation?.cosmicMessage ?? 
      'Await cosmic alignment calculation...';
  }, [state.lastCalculation]);

  /**
   * Get action recommendation
   */
  const getActionRecommendation = useCallback((): string => {
    return state.lastCalculation?.actionRecommendation.cosmicAdvice ?? 
      'Calculating optimal path...';
  }, [state.lastCalculation]);

  /**
   * Clear the cache
   */
  const clearCache = useCallback(() => {
    universalCalculator.clearCache();
    setState(prev => ({
      ...prev,
      lastCalculation: null,
      currentCoordinates: null,
    }));
  }, []);

  // Auto-calculate on mount if user is authenticated
  useEffect(() => {
    if (user && !state.lastCalculation && !state.isCalculating) {
      calculateNow();
    }
  }, [user, state.lastCalculation, state.isCalculating, calculateNow]);

  return {
    // State
    isCalculating: state.isCalculating,
    currentVector: state.lastCalculation,
    coordinates: state.currentCoordinates,
    error: state.error,
    
    // Actions
    calculateNow,
    calculateForLocation,
    refreshCalculation,
    
    // Utilities
    getCurrentActivity,
    getCosmicMessage,
    getActionRecommendation,
    clearCache,
  };
}

export default useUniversalCalculator;
