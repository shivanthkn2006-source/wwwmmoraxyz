/**
 * USE AUTO-PROFILER HOOK
 * React hook for passive user profiling via conversation
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  autoProfile, 
  ExtractedEntity, 
  ProfileUpdate,
  AutoProfilerResult 
} from '@/components/zoe-infinity/AutoProfiler';

export interface UseAutoProfilerReturn {
  /**
   * Profile a message and optionally sync with backend
   */
  profileMessage: (message: string, syncToBackend?: boolean) => Promise<{
    entities: ExtractedEntity[];
    acknowledgment?: string;
    synced: boolean;
  }>;
  
  /**
   * Get quick local extraction without backend call
   */
  quickProfile: (message: string) => AutoProfilerResult;
  
  /**
   * Check if a message contains significant profile data
   */
  hasSignificantData: (message: string) => boolean;
}

export function useAutoProfiler(): UseAutoProfilerReturn {
  const { user } = useAuth();
  const lastProfileTime = useRef<number>(0);
  const minProfileInterval = 2000; // Don't profile more than once every 2 seconds

  const quickProfile = useCallback((message: string): AutoProfilerResult => {
    return autoProfile(message);
  }, []);

  const hasSignificantData = useCallback((message: string): boolean => {
    const result = autoProfile(message);
    return result.entities.length > 0 && result.entities.some(e => e.confidence > 0.7);
  }, []);

  const profileMessage = useCallback(async (
    message: string, 
    syncToBackend: boolean = true
  ): Promise<{
    entities: ExtractedEntity[];
    acknowledgment?: string;
    synced: boolean;
  }> => {
    // Quick local extraction first
    const localResult = autoProfile(message);
    
    // If no entities or user not logged in, return local result
    if (localResult.entities.length === 0 || !user?.id) {
      return {
        entities: localResult.entities,
        acknowledgment: localResult.acknowledgmentSuggestion,
        synced: false
      };
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastProfileTime.current < minProfileInterval) {
      return {
        entities: localResult.entities,
        acknowledgment: localResult.acknowledgmentSuggestion,
        synced: false
      };
    }
    lastProfileTime.current = now;

    // If sync requested, call backend for deeper analysis
    if (syncToBackend) {
      try {
        const { data, error } = await supabase.functions.invoke('zoe-silent-scribe', {
          body: {
            message,
            userId: user.id,
            localEntities: localResult.entities
          }
        });

        if (error) {
          console.error('[AutoProfiler] Backend sync error:', error);
          return {
            entities: localResult.entities,
            acknowledgment: localResult.acknowledgmentSuggestion,
            synced: false
          };
        }

        return {
          entities: data.entities || localResult.entities,
          acknowledgment: data.acknowledgment || localResult.acknowledgmentSuggestion,
          synced: data.updated || false
        };
      } catch (err) {
        console.error('[AutoProfiler] Sync failed:', err);
        return {
          entities: localResult.entities,
          acknowledgment: localResult.acknowledgmentSuggestion,
          synced: false
        };
      }
    }

    return {
      entities: localResult.entities,
      acknowledgment: localResult.acknowledgmentSuggestion,
      synced: false
    };
  }, [user?.id]);

  return {
    profileMessage,
    quickProfile,
    hasSignificantData
  };
}

export default useAutoProfiler;
