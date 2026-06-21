/**
 * GlobalMediaContext - "ONE EAR" PROTOCOL
 * 
 * PHASE 1 of Grand Unification Protocol:
 * - Single global media permission request on first app load
 * - Stores MediaStream in context for all consumers
 * - Eliminates "permission fatigue" across pages
 * - Initializes Atlas/Smith Voice Listener globally
 * 
 * The Gatekeeper: Request ONCE, distribute everywhere
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect, 
  useRef,
  ReactNode 
} from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MediaPermissions {
  audio: 'granted' | 'denied' | 'prompt' | 'unavailable';
  video: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

export interface GlobalMediaState {
  isInitialized: boolean;
  permissions: MediaPermissions;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  audioContext: AudioContext | null;
  isVoiceListenerActive: boolean;
  error: string | null;
}

export interface GlobalMediaContextType extends GlobalMediaState {
  // Actions
  requestAllPermissions: () => Promise<boolean>;
  requestAudioPermission: () => Promise<MediaStream | null>;
  requestVideoPermission: () => Promise<MediaStream | null>;
  getAudioStream: () => MediaStream | null;
  getVideoStream: () => MediaStream | null;
  getOrCreateVideoStream: () => Promise<MediaStream | null>;
  releaseVideoStream: () => void;
  releaseAllStreams: () => void;
  resumeAudioContext: () => Promise<boolean>;
  startGlobalVoiceListener: () => void;
  stopGlobalVoiceListener: () => void;
}

const defaultState: GlobalMediaState = {
  isInitialized: false,
  permissions: {
    audio: 'prompt',
    video: 'prompt',
  },
  audioStream: null,
  videoStream: null,
  audioContext: null,
  isVoiceListenerActive: false,
  error: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const GlobalMediaContext = createContext<GlobalMediaContextType | undefined>(undefined);

// Session storage key for permission status
const PERMISSION_CACHE_KEY = 'mmora-global-media-permissions';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export const GlobalMediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GlobalMediaState>(() => {
    // Try to restore cached permission status
    try {
      const cached = sessionStorage.getItem(PERMISSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...defaultState,
          permissions: parsed.permissions || defaultState.permissions,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultState;
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceListenerRef = useRef<any>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  const checkPermissionStatus = useCallback(async (): Promise<MediaPermissions> => {
    const permissions: MediaPermissions = {
      audio: 'unavailable',
      video: 'unavailable',
    };

    try {
      if ('permissions' in navigator) {
        try {
          const micResult = await navigator.permissions.query({ 
            name: 'microphone' as PermissionName 
          });
          permissions.audio = micResult.state as 'granted' | 'denied' | 'prompt';
        } catch {
          permissions.audio = 'prompt';
        }

        try {
          const camResult = await navigator.permissions.query({ 
            name: 'camera' as PermissionName 
          });
          permissions.video = camResult.state as 'granted' | 'denied' | 'prompt';
        } catch {
          permissions.video = 'prompt';
        }
      }
    } catch {
      // Permissions API not supported
    }

    return permissions;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO CONTEXT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const resumeAudioContext = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('[GlobalMedia] AudioContext resumed');
      }

      setState(prev => ({ ...prev, audioContext: audioContextRef.current }));
      return audioContextRef.current.state === 'running';
    } catch (err) {
      console.warn('[GlobalMedia] AudioContext resume failed:', err);
      return false;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const requestAudioPermission = useCallback(async (): Promise<MediaStream | null> => {
    // If already have stream, return it
    if (state.audioStream && state.audioStream.active) {
      return state.audioStream;
    }

    try {
      console.log('[GlobalMedia] Requesting audio permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      setState(prev => ({
        ...prev,
        audioStream: stream,
        permissions: { ...prev.permissions, audio: 'granted' },
        error: null,
      }));

      // Cache permission status
      try {
        const cached = { permissions: { ...state.permissions, audio: 'granted' } };
        sessionStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(cached));
      } catch { /* ignore */ }

      console.log('[GlobalMedia] Audio permission granted');
      return stream;
    } catch (err: any) {
      console.error('[GlobalMedia] Audio permission denied:', err?.name);
      
      const newPermState: 'denied' | 'prompt' = 
        err?.name === 'NotAllowedError' ? 'denied' : 'prompt';
      
      setState(prev => ({
        ...prev,
        permissions: { ...prev.permissions, audio: newPermState },
        error: err?.message || 'Audio permission denied',
      }));
      
      return null;
    }
  }, [state.audioStream, state.permissions]);

  const requestVideoPermission = useCallback(async (): Promise<MediaStream | null> => {
    // If already have active stream, return it
    if (state.videoStream && state.videoStream.active) {
      return state.videoStream;
    }

    try {
      console.log('[GlobalMedia] Requesting video permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      setState(prev => ({
        ...prev,
        videoStream: stream,
        permissions: { ...prev.permissions, video: 'granted' },
        error: null,
      }));

      // Cache permission status
      try {
        const cached = { permissions: { ...state.permissions, video: 'granted' } };
        sessionStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(cached));
      } catch { /* ignore */ }

      console.log('[GlobalMedia] Video permission granted');
      return stream;
    } catch (err: any) {
      console.error('[GlobalMedia] Video permission denied:', err?.name);
      
      const newPermState: 'denied' | 'prompt' = 
        err?.name === 'NotAllowedError' ? 'denied' : 'prompt';
      
      setState(prev => ({
        ...prev,
        permissions: { ...prev.permissions, video: newPermState },
        error: err?.message || 'Video permission denied',
      }));
      
      return null;
    }
  }, [state.videoStream, state.permissions]);

  // THE GATEKEEPER - Request all permissions ONCE
  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    console.log('[GlobalMedia] THE GATEKEEPER: Requesting all permissions...');
    
    // Resume AudioContext first (requires user gesture)
    await resumeAudioContext();
    
    // Request audio (primary for voice)
    const audioStream = await requestAudioPermission();
    
    // Request video (for camera features)
    const videoStream = await requestVideoPermission();
    
    const success = !!audioStream || !!videoStream;
    
    if (success) {
      setState(prev => ({ ...prev, isInitialized: true }));
      
      // Dispatch global event for other systems
      window.dispatchEvent(new CustomEvent('global-media-initialized', {
        detail: {
          audio: !!audioStream,
          video: !!videoStream,
        },
      }));
      
      console.log('[GlobalMedia] All permissions acquired. Audio:', !!audioStream, 'Video:', !!videoStream);
    }
    
    return success;
  }, [resumeAudioContext, requestAudioPermission, requestVideoPermission]);

  // Get existing stream (no prompt)
  const getAudioStream = useCallback((): MediaStream | null => {
    return state.audioStream?.active ? state.audioStream : null;
  }, [state.audioStream]);

  const getVideoStream = useCallback((): MediaStream | null => {
    return state.videoStream?.active ? state.videoStream : null;
  }, [state.videoStream]);

  // Get or create video stream (may prompt if not already granted)
  const getOrCreateVideoStream = useCallback(async (): Promise<MediaStream | null> => {
    if (state.videoStream?.active) {
      return state.videoStream;
    }
    return requestVideoPermission();
  }, [state.videoStream, requestVideoPermission]);

  // Release video stream (for when camera is no longer needed)
  const releaseVideoStream = useCallback(() => {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, videoStream: null }));
      console.log('[GlobalMedia] Video stream released');
    }
  }, [state.videoStream]);

  // Release all streams
  const releaseAllStreams = useCallback(() => {
    if (state.audioStream) {
      state.audioStream.getTracks().forEach(track => track.stop());
    }
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(track => track.stop());
    }
    setState(prev => ({
      ...prev,
      audioStream: null,
      videoStream: null,
    }));
    console.log('[GlobalMedia] All streams released');
  }, [state.audioStream, state.videoStream]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL VOICE LISTENER (Atlas/Smith)
  // ═══════════════════════════════════════════════════════════════════════════

  const startGlobalVoiceListener = useCallback(() => {
    if (state.isVoiceListenerActive) return;
    if (!state.audioStream?.active && state.permissions.audio !== 'granted') {
      console.log('[GlobalMedia] Cannot start voice listener - no audio permission');
      return;
    }

    console.log('[GlobalMedia] Starting global voice listener (Atlas/Smith)');
    setState(prev => ({ ...prev, isVoiceListenerActive: true }));
    
    // Dispatch event for voice system to pick up
    window.dispatchEvent(new CustomEvent('global-voice-listener-start'));
  }, [state.isVoiceListenerActive, state.audioStream, state.permissions.audio]);

  const stopGlobalVoiceListener = useCallback(() => {
    if (!state.isVoiceListenerActive) return;
    
    console.log('[GlobalMedia] Stopping global voice listener');
    setState(prev => ({ ...prev, isVoiceListenerActive: false }));
    
    window.dispatchEvent(new CustomEvent('global-voice-listener-stop'));
  }, [state.isVoiceListenerActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Check initial permission status on mount - ONCE ONLY
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple initializations (caused infinite loop before)
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    const init = async () => {
      const permissions = await checkPermissionStatus();
      setState(prev => ({ ...prev, permissions }));
      
      // If already granted, silently re-acquire streams
      if (permissions.audio === 'granted') {
        console.log('[GlobalMedia] Audio already granted, re-acquiring silently');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000,
            },
          });
          
          setState(prev => ({
            ...prev,
            audioStream: stream,
            permissions: { ...prev.permissions, audio: 'granted' },
          }));
          
          console.log('[GlobalMedia] Audio stream re-acquired');
          window.dispatchEvent(new CustomEvent('zoe-voice-system-activated'));
        } catch (err) {
          console.warn('[GlobalMedia] Failed to re-acquire audio stream:', err);
        }
      }
    };

    init();
  }, []); // Empty deps - run ONCE on mount only

  // Listen for voice activation events to start global listener
  useEffect(() => {
    const handleVoiceActivated = () => {
      if (state.permissions.audio === 'granted') {
        startGlobalVoiceListener();
      }
    };

    window.addEventListener('zoe-voice-system-activated', handleVoiceActivated);
    window.addEventListener('global-media-initialized', handleVoiceActivated);
    
    return () => {
      window.removeEventListener('zoe-voice-system-activated', handleVoiceActivated);
      window.removeEventListener('global-media-initialized', handleVoiceActivated);
    };
  }, [state.permissions.audio, startGlobalVoiceListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseAllStreams();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [releaseAllStreams]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const contextValue: GlobalMediaContextType = {
    ...state,
    requestAllPermissions,
    requestAudioPermission,
    requestVideoPermission,
    getAudioStream,
    getVideoStream,
    getOrCreateVideoStream,
    releaseVideoStream,
    releaseAllStreams,
    resumeAudioContext,
    startGlobalVoiceListener,
    stopGlobalVoiceListener,
  };

  return (
    <GlobalMediaContext.Provider value={contextValue}>
      {children}
    </GlobalMediaContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useGlobalMedia = (): GlobalMediaContextType => {
  const context = useContext(GlobalMediaContext);
  if (!context) {
    throw new Error('useGlobalMedia must be used within a GlobalMediaProvider');
  }
  return context;
};

// Optional safe hook that doesn't throw
export const useGlobalMediaSafe = (): GlobalMediaContextType | null => {
  return useContext(GlobalMediaContext) || null;
};

export default GlobalMediaProvider;
