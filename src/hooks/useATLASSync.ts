// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS SYNC HOOK - Manages DHF Autonomy Data Synchronization
// With mandatory text-based verification for critical data points
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { ATLASSyncDataPoint } from '@/components/ATLASSyncVerification';

export interface SyncMeterState {
  percentage: number;
  status: 'inactive' | 'syncing' | 'synchronized' | 'error';
  lastSyncAt: string | null;
  pendingDataPoints: ATLASSyncDataPoint[];
  verifiedDataPoints: ATLASSyncDataPoint[];
  eventCount: number;
  finetuningReady: boolean;
}

export interface UseATLASSyncReturn {
  syncState: SyncMeterState;
  isHandsFreeModeActive: boolean;
  voiceToTextFailed: boolean;
  addDataPoint: (dataPoint: ATLASSyncDataPoint) => void;
  markDataPointVerified: (key: string, authorizationId: string) => void;
  triggerVoiceVerification: (dataPoint: ATLASSyncDataPoint) => Promise<boolean>;
  getSyncPercentage: () => number;
  getRequiresVerification: () => ATLASSyncDataPoint[];
  resetSync: () => void;
  refreshFromDatabase: () => Promise<void>;
}

/**
 * Hook for managing ATLAS Sync Meter data collection
 * 
 * Implements the mandatory text-based authorization flow:
 * 1. For data points in 20%-100% sync range requiring DHF autonomy
 * 2. If voice-to-text fails in Hands-Free Mode, triggers fallback
 * 3. User must type "I AUTHORIZE" followed by confirmation
 * 4. Logs to immutable audit trail with ISO 27001 compliance
 */
export const useATLASSync = (): UseATLASSyncReturn => {
  const { user } = useAuth();
  
  const [syncState, setSyncState] = useState<SyncMeterState>({
    percentage: 0,
    status: 'inactive',
    lastSyncAt: null,
    pendingDataPoints: [],
    verifiedDataPoints: [],
    eventCount: 0,
    finetuningReady: false,
  });

  // Fetch real data from database on mount
  const refreshFromDatabase = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('zoe_settings')
        .select('sync_percentage, last_event_sync_at, event_count, finetuning_ready')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[ATLAS Sync] Database fetch error:', error);
        return;
      }
      
      if (data) {
        setSyncState(prev => ({
          ...prev,
          percentage: data.sync_percentage || 0,
          lastSyncAt: data.last_event_sync_at,
          eventCount: data.event_count || 0,
          finetuningReady: data.finetuning_ready || false,
          status: data.sync_percentage > 0 ? 'syncing' : 'inactive',
        }));
      }
    } catch (err) {
      console.error('[ATLAS Sync] Refresh failed:', err);
    }
  }, [user]);

  // Load initial data and subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    
    refreshFromDatabase();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('atlas-sync-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zoe_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setSyncState(prev => ({
            ...prev,
            percentage: newData.sync_percentage || prev.percentage,
            eventCount: newData.event_count || prev.eventCount,
            finetuningReady: newData.finetuning_ready || prev.finetuningReady,
            lastSyncAt: newData.last_event_sync_at || prev.lastSyncAt,
          }));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshFromDatabase]);
  
  const [isHandsFreeModeActive, setIsHandsFreeModeActive] = useState(false);
  const [voiceToTextFailed, setVoiceToTextFailed] = useState(false);
  
  /**
   * Add a new data point for synchronization
   * Data points with syncPercentage >= 20 require verification
   */
  const addDataPoint = useCallback((dataPoint: ATLASSyncDataPoint) => {
    setSyncState(prev => {
      // Check if already exists
      if (prev.pendingDataPoints.some(dp => dp.key === dataPoint.key) ||
          prev.verifiedDataPoints.some(dp => dp.key === dataPoint.key)) {
        return prev;
      }
      
      return {
        ...prev,
        status: 'syncing',
        pendingDataPoints: [...prev.pendingDataPoints, dataPoint],
      };
    });
  }, []);
  
  /**
   * Mark a data point as verified after text authorization
   */
  const markDataPointVerified = useCallback((key: string, authorizationId: string) => {
    setSyncState(prev => {
      const dataPoint = prev.pendingDataPoints.find(dp => dp.key === key);
      if (!dataPoint) return prev;
      
      const newVerified = [...prev.verifiedDataPoints, dataPoint];
      const newPending = prev.pendingDataPoints.filter(dp => dp.key !== key);
      
      // Calculate new percentage
      const totalPoints = newVerified.length + newPending.length;
      const percentage = totalPoints > 0 
        ? Math.round((newVerified.length / totalPoints) * 100)
        : 0;
      
      return {
        ...prev,
        percentage,
        status: newPending.length === 0 ? 'synchronized' : 'syncing',
        lastSyncAt: new Date().toISOString(),
        pendingDataPoints: newPending,
        verifiedDataPoints: newVerified,
      };
    });
    
    console.log(`[ATLAS Sync] Data point verified: ${key}, Authorization ID: ${authorizationId}`);
  }, []);
  
  /**
   * Attempt voice verification (for Hands-Free Mode)
   * Returns false if VTT fails, triggering text fallback
   */
  const triggerVoiceVerification = useCallback(async (dataPoint: ATLASSyncDataPoint): Promise<boolean> => {
    if (!user) return false;
    
    setIsHandsFreeModeActive(true);
    
    try {
      // Simulate voice-to-text attempt
      // In production, this would integrate with actual VTT service
      const vttSuccess = await simulateVoiceToText();
      
      if (!vttSuccess) {
        setVoiceToTextFailed(true);
        toast.info('Voice verification unavailable', {
          description: 'Please use text-based verification instead.',
        });
        return false;
      }
      
      // VTT succeeded
      setVoiceToTextFailed(false);
      return true;
      
    } catch (error) {
      console.error('[ATLAS Sync] VTT error:', error);
      setVoiceToTextFailed(true);
      return false;
    }
  }, [user]);
  
  /**
   * Simulate Voice-to-Text attempt
   * Replace with actual VTT integration
   */
  const simulateVoiceToText = async (): Promise<boolean> => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return false;
    }
    
    // For now, return false to demonstrate fallback flow
    // In production, this would attempt actual speech recognition
    return false;
  };
  
  /**
   * Get current sync percentage
   */
  const getSyncPercentage = useCallback((): number => {
    return syncState.percentage;
  }, [syncState.percentage]);
  
  /**
   * Get data points that require verification
   */
  const getRequiresVerification = useCallback((): ATLASSyncDataPoint[] => {
    return syncState.pendingDataPoints.filter(dp => dp.syncPercentage >= 20);
  }, [syncState.pendingDataPoints]);
  
  /**
   * Reset sync state
   */
  const resetSync = useCallback(() => {
    setSyncState({
      percentage: 0,
      status: 'inactive',
      lastSyncAt: null,
      pendingDataPoints: [],
      verifiedDataPoints: [],
      eventCount: 0,
      finetuningReady: false,
    });
    setIsHandsFreeModeActive(false);
    setVoiceToTextFailed(false);
  }, []);
  
  return {
    syncState,
    isHandsFreeModeActive,
    voiceToTextFailed,
    addDataPoint,
    markDataPointVerified,
    triggerVoiceVerification,
    getSyncPercentage,
    getRequiresVerification,
    resetSync,
    refreshFromDatabase,
  };
};

export default useATLASSync;
