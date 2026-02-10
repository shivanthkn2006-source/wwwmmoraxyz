// ═══════════════════════════════════════════════════════════════════════════════
// ZOE WALK & TALK HOOK - Energy-Efficient Location-Based Companion
// "True Immortality" - Connects past memories to present location experiences
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';

export type WalkTalkMode = 'discovery' | 'history' | 'monuments' | 'nature' | 'urban' | 'quiet';

interface LocationInsight {
  place_name: string;
  place_type: string;
  historical_context?: string;
  interesting_facts: string[];
  user_memory_connection?: string;
  suggested_narrative: string;
  speak_priority: 'immediate' | 'pause_worthy' | 'background';
}

interface WalkTalkState {
  isActive: boolean;
  isProcessing: boolean;
  currentMode: WalkTalkMode;
  lastInsight: LocationInsight | null;
  lastSpokenTopic: string | null;
  energySaverMode: boolean;
  locationUpdateCount: number;
  speakQueue: string[];
  isSpeaking: boolean;
  error: string | null;
}

interface UseZoeWalkTalkReturn extends WalkTalkState {
  // Core controls
  startWalkTalk: (mode?: WalkTalkMode) => Promise<void>;
  stopWalkTalk: () => void;
  changeMode: (mode: WalkTalkMode) => void;
  
  // Energy controls
  toggleEnergySaver: () => void;
  
  // Manual triggers
  askAboutLocation: (question?: string) => Promise<void>;
  shareCamera: (imageData: string) => Promise<void>;
  
  // Speech controls
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  skipCurrentSpeech: () => void;
}

// Minimum distance (meters) before triggering new insight
const LOCATION_THRESHOLD = 50;
// Time between updates (ms) - longer = less battery
const UPDATE_INTERVAL_NORMAL = 30000; // 30 seconds
const UPDATE_INTERVAL_SAVER = 120000; // 2 minutes

export const useZoeWalkTalk = (): UseZoeWalkTalkReturn => {
  const [state, setState] = useState<WalkTalkState>({
    isActive: false,
    isProcessing: false,
    currentMode: 'discovery',
    lastInsight: null,
    lastSpokenTopic: null,
    energySaverMode: false,
    locationUpdateCount: 0,
    speakQueue: [],
    isSpeaking: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechPausedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Get location insight from backend
  // ═══════════════════════════════════════════════════════════════════════════
  const getLocationInsight = useCallback(async (
    position: GeolocationPosition,
    query?: string,
    imageData?: string
  ) => {
    if (state.isProcessing) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('zoe-walk-talk', {
        body: {
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          mode: state.currentMode,
          user_query: query,
          image_data: imageData,
          battery_saver: state.energySaverMode,
          last_spoken_topic: state.lastSpokenTopic,
        },
      });

      if (error) throw error;

      if (data.success && data.insight) {
        const insight = data.insight as LocationInsight;
        
        setState(prev => ({
          ...prev,
          lastInsight: insight,
          locationUpdateCount: prev.locationUpdateCount + 1,
          isProcessing: false,
        }));

        // Queue speech based on priority
        if (!speechPausedRef.current) {
          if (insight.speak_priority === 'immediate' || query) {
            await speakNarrative(insight.suggested_narrative);
          } else if (insight.speak_priority === 'pause_worthy') {
            // Add to queue for natural pauses
            setState(prev => ({
              ...prev,
              speakQueue: [...prev.speakQueue, insight.suggested_narrative],
            }));
          }
        }

        setState(prev => ({
          ...prev,
          lastSpokenTopic: insight.place_name,
        }));
      }
    } catch (error) {
      console.error('[WalkTalk] Error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Lost connection to Zoe\'s awareness...',
      }));
    }
  }, [state.currentMode, state.energySaverMode, state.lastSpokenTopic, state.isProcessing]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEECH: Energy-efficient TTS
  // ═══════════════════════════════════════════════════════════════════════════
  const speakNarrative = useCallback(async (text: string) => {
    if (speechPausedRef.current) {
      setState(prev => ({
        ...prev,
        speakQueue: [...prev.speakQueue, text],
      }));
      return;
    }

    // Check if already speaking via state getter to avoid stale closure
    setState(prev => {
      if (prev.isSpeaking) {
        return { ...prev, speakQueue: [...prev.speakQueue, text] };
      }
      return { ...prev, isSpeaking: true };
    });

    try {
      await new Promise<void>((resolve) => {
        speakAsZoe(text, undefined, undefined, () => resolve());
      });
    } catch (error) {
      console.error('[WalkTalk] Speech error:', error);
    } finally {
      setState(prev => {
        // Process queue after speech ends
        if (prev.speakQueue.length > 0) {
          const [next, ...rest] = prev.speakQueue;
          // Schedule next speech asynchronously
          setTimeout(() => speakNarrative(next), 100);
          return { ...prev, isSpeaking: false, speakQueue: rest };
        }
        return { ...prev, isSpeaking: false };
      });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION: Handle position updates with threshold
  // ═══════════════════════════════════════════════════════════════════════════
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;

    // Check if we've moved enough to warrant a new insight
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        latitude,
        longitude
      );

      if (distance < LOCATION_THRESHOLD) {
        return; // Haven't moved enough
      }
    }

    lastPositionRef.current = { lat: latitude, lng: longitude };
    getLocationInsight(position);
  }, [getLocationInsight]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS: Start/Stop Walk & Talk
  // ═══════════════════════════════════════════════════════════════════════════
  const startWalkTalk = useCallback(async (mode: WalkTalkMode = 'discovery') => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isActive: true,
      currentMode: mode,
      error: null,
    }));

    try {
      // Initial position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: !state.energySaverMode,
          timeout: 10000,
          maximumAge: state.energySaverMode ? 60000 : 5000,
        });
      });

      lastPositionRef.current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Initial insight
      await getLocationInsight(position);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (error) => {
          console.error('[WalkTalk] GPS error:', error);
          setState(prev => ({ ...prev, error: 'GPS signal lost...' }));
        },
        {
          enableHighAccuracy: !state.energySaverMode,
          timeout: 15000,
          maximumAge: state.energySaverMode ? 60000 : 10000,
        }
      );

      // Periodic updates (for when user is stationary but still wants insights)
      const interval = state.energySaverMode ? UPDATE_INTERVAL_SAVER : UPDATE_INTERVAL_NORMAL;
      updateIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(handlePositionUpdate);
      }, interval);

      // Welcome message
      await speakAsZoe(
        mode === 'quiet' 
          ? 'I\'m here with you.' 
          : `Walk & Talk mode activated. I'll share ${mode === 'history' ? 'historical stories' : mode === 'nature' ? 'nature insights' : 'interesting discoveries'} as we go.`
      );

    } catch (error) {
      console.error('[WalkTalk] Start error:', error);
      setState(prev => ({
        ...prev,
        isActive: false,
        error: 'Could not access your location',
      }));
    }
  }, [state.energySaverMode, getLocationInsight, handlePositionUpdate]);

  const stopWalkTalk = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      isProcessing: false,
      speakQueue: [],
    }));

    speakAsZoe('Walk & Talk paused. I\'ll be here when you want to continue.');
  }, []);

  const changeMode = useCallback((mode: WalkTalkMode) => {
    setState(prev => ({ ...prev, currentMode: mode }));
    
    if (state.isActive && lastPositionRef.current) {
      // Get fresh insight in new mode
      navigator.geolocation.getCurrentPosition((position) => {
        getLocationInsight(position);
      });
    }
  }, [state.isActive, getLocationInsight]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  const toggleEnergySaver = useCallback(() => {
    setState(prev => ({
      ...prev,
      energySaverMode: !prev.energySaverMode,
    }));

    // Restart with new settings if active
    if (state.isActive) {
      stopWalkTalk();
      setTimeout(() => startWalkTalk(state.currentMode), 500);
    }
  }, [state.isActive, state.currentMode, startWalkTalk, stopWalkTalk]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════
  const askAboutLocation = useCallback(async (question?: string) => {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    await getLocationInsight(position, question || 'What can you tell me about this place?');
  }, [getLocationInsight]);

  const shareCamera = useCallback(async (imageData: string) => {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    await getLocationInsight(position, 'What am I looking at?', imageData);
  }, [getLocationInsight]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEECH CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  const pauseSpeech = useCallback(() => {
    speechPausedRef.current = true;
    window.speechSynthesis?.pause();
  }, []);

  const resumeSpeech = useCallback(() => {
    speechPausedRef.current = false;
    window.speechSynthesis?.resume();
    
    // Process queued items using setState to get fresh state
    setState(prev => {
      if (prev.speakQueue.length > 0) {
        const [next, ...rest] = prev.speakQueue;
        setTimeout(() => speakNarrative(next), 100);
        return { ...prev, speakQueue: rest };
      }
      return prev;
    });
  }, [speakNarrative]);

  const skipCurrentSpeech = useCallback(() => {
    stopZoeSpeech();
    
    // Process next in queue using setState to get fresh state
    setState(prev => {
      if (prev.speakQueue.length > 0) {
        const [next, ...rest] = prev.speakQueue;
        setTimeout(() => speakNarrative(next), 100);
        return { ...prev, isSpeaking: false, speakQueue: rest };
      }
      return { ...prev, isSpeaking: false };
    });
  }, [speakNarrative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startWalkTalk,
    stopWalkTalk,
    changeMode,
    toggleEnergySaver,
    askAboutLocation,
    shareCamera,
    pauseSpeech,
    resumeSpeech,
    skipCurrentSpeech,
  };
};

// Haversine formula for distance calculation (meters)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
