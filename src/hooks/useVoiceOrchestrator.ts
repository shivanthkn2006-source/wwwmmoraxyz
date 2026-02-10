/**
 * VOICE ORCHESTRATOR v2 - Triple Threat Voice System
 * ===================================================
 * Manages the "Triple Threat" voice hierarchy for Samantha-like quality:
 * 
 * 1. PRIMARY: Edge TTS (Jenny Neural -5Hz) - FREE Azure Neural via proxy
 * 2. FALLBACK: Deepgram Aura-2 (zoe-voice function) - Premium neural
 * 3. EMERGENCY: Native Browser TTS (Samantha) - Zero-cost offline
 * 
 * FEATURES:
 * - Voice command switching ("Switch to cloud voice", "Go offline", "Emergency mode")
 * - Cross-device compatibility (iPhone XR → iPhone 15 Pro Max)
 * - Mobile audio gesture handling (iOS/Android)
 * - Real-time status indicator support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNativeZoeVoice } from './useNativeZoeVoice';
import { cleanAndSplitForVoice, logRemovedMarkers } from '@/utils/voiceTextCleaner';
import { getEffectiveVoiceExperience } from '@/utils/voiceExperienceLock';
import { applyVoiceSettingsToAudio, getZoeInfinityVoiceSettings } from '@/stores/zoeInfinityVoiceSettings';

// Voice provider types (matches PROMPT 2 naming)
export type VoiceProvider = 'edge-cloud' | 'deepgram' | 'native';

// Provider display info for UI
export const PROVIDER_INFO: Record<VoiceProvider, { 
  name: string; 
  color: 'green' | 'yellow' | 'red';
  description: string;
}> = {
  'edge-cloud': { 
    name: 'Azure Neural', 
    color: 'green',
    description: 'Connected to Azure Neural.' 
  },
  'deepgram': { 
    name: 'Deepgram Aura', 
    color: 'yellow',
    description: 'Running on Deepgram Aura.' 
  },
  'native': { 
    name: 'System Backup', 
    color: 'red',
    description: 'System backup active.' 
  },
};

export interface VoiceConfig {
  provider: VoiceProvider;
  voice: string;
  rate: string;
  pitch: string;
}

// Default configs for each provider - tuned for "Samantha" warmth
const VOICE_CONFIGS: Record<VoiceProvider, VoiceConfig> = {
  'edge-cloud': {
    provider: 'edge-cloud',
    voice: 'en-US-JennyNeural',
    rate: '-10%',
    pitch: '-5Hz',  // Warm, intimate pitch (Samantha-like)
  },
  'deepgram': {
    provider: 'deepgram',
    voice: 'aura-2-thalia-en',  // Zoe's Deepgram voice
    rate: '1.0',
    pitch: '1.0',
  },
  'native': {
    provider: 'native',
    voice: 'Samantha',  // macOS/iOS Samantha voice
    rate: '0.9',
    pitch: '0.95',
  },
};

// Voice command patterns for switching engines
const VOICE_SWITCH_PATTERNS: Array<{ pattern: RegExp; provider: VoiceProvider }> = [
  { pattern: /switch\s*to\s*cloud\s*voice/i, provider: 'edge-cloud' },
  { pattern: /use\s*azure/i, provider: 'edge-cloud' },
  { pattern: /cloud\s*mode/i, provider: 'edge-cloud' },
  { pattern: /go\s*offline/i, provider: 'native' },
  { pattern: /offline\s*mode/i, provider: 'native' },
  { pattern: /local\s*voice/i, provider: 'native' },
  { pattern: /emergency\s*mode/i, provider: 'native' },
  { pattern: /backup\s*mode/i, provider: 'native' },
  { pattern: /use\s*deepgram/i, provider: 'deepgram' },
  { pattern: /premium\s*voice/i, provider: 'deepgram' },
];

export interface VoiceOrchestratorState {
  activeEngine: VoiceProvider;
  isSpeaking: boolean;
  isLoading: boolean;
  lastError: string | null;
  latencyMs: number;
  fallbackCount: number;
  providerStatus: Record<VoiceProvider, 'available' | 'failed' | 'unknown'>;
}

export interface VoiceOrchestratorReturn extends VoiceOrchestratorState {
  speak: (text: string) => Promise<void>;
  /** Queue speech without interrupting current playback (prevents mid-sentence cutoffs). */
  speakQueued: (text: string) => Promise<void>;
  stop: () => void;
  setActiveEngine: (provider: VoiceProvider) => void;
  handleVoiceCommand: (transcript: string) => boolean;
  getProviderInfo: () => typeof PROVIDER_INFO;
}

// Detect mobile device for audio handling
const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Detect PWA mode
const isPWAMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// iOS audio unlock - required for autoplay
let audioUnlocked = false;
const unlockAudio = (): void => {
  if (audioUnlocked || typeof window === 'undefined') return;
  
  const silentAudio = new Audio();
  silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////AAAAAABMF6dQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAAAE/wAAABBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQwAAAAAANIAAAAAAAAAA0gAAAAAATAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBBwEHAQcBB//+5DAAAAAAADSA=';
  
  const playPromise = silentAudio.play();
  if (playPromise) {
    playPromise.then(() => {
      audioUnlocked = true;
      console.log('[VoiceOrchestrator] 🔓 iOS Audio unlocked');
      
      // In PWA mode, trigger voice activation prompt after successful audio unlock
      if (isPWAMode()) {
        window.dispatchEvent(new CustomEvent('zoe-request-voice-activation'));
      }
    }).catch(() => {
      // Silent fail - will try again on user gesture
    });
  }
};

const VOICE_PREF_KEY = 'zoe_voice_preferred_engine_v1';
const EDGE_FAILED_KEY = 'zoe_edge_tts_failed_v1';
const EDGE_FAILED_EXPIRY_MS = 5 * 60 * 1000; // BUG FIX: 5 minute expiry for edge failure

const safeGetPreferredEngine = (): VoiceProvider | null => {
  try {
    const raw = localStorage.getItem(VOICE_PREF_KEY);
    if (raw === 'edge-cloud' || raw === 'deepgram' || raw === 'native') return raw;
    return null;
  } catch {
    return null;
  }
};

const safeSetPreferredEngine = (provider: VoiceProvider): void => {
  try {
    localStorage.setItem(VOICE_PREF_KEY, provider);
    
    // MIGRATION FIX: Sync voice preference to profiles.zoe_infinity_voice_preference
    // Use async IIFE to not block the main function
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ zoe_infinity_voice_preference: provider } as any)
            .eq('user_id', user.id);
          console.log('[VoiceOrchestrator] ✓ Synced voice preference to DB:', provider);
        }
      } catch (e) {
        console.warn('[VoiceOrchestrator] DB sync failed:', e);
      }
    })();
  } catch {
    // ignore
  }
};

// BUG FIX: Edge failure now has expiry to allow retry after 5 minutes
const safeSetEdgeFailed = (failed: boolean): void => {
  try {
    if (failed) {
      localStorage.setItem(EDGE_FAILED_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(EDGE_FAILED_KEY);
    }
  } catch {
    // ignore
  }
};

const safeGetEdgeFailed = (): boolean => {
  try {
    const raw = localStorage.getItem(EDGE_FAILED_KEY);
    if (!raw) return false;
    const failedAt = parseInt(raw, 10);
    if (isNaN(failedAt)) return false;
    // BUG FIX: Check if failure has expired
    if (Date.now() - failedAt > EDGE_FAILED_EXPIRY_MS) {
      localStorage.removeItem(EDGE_FAILED_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const useVoiceOrchestrator = (): VoiceOrchestratorReturn => {
  const [state, setState] = useState<VoiceOrchestratorState>({
    // Zoe Infinity requirement: Deepgram Aura is the default.
    activeEngine: (() => {
      const pref = safeGetPreferredEngine();
      // Infinity must never persist/restore native as preferred.
      if (getEffectiveVoiceExperience() === 'zoe-infinity' && pref === 'native') return 'deepgram';
      return pref ?? 'deepgram';
    })(),
    isSpeaking: false,
    isLoading: false,
    lastError: null,
    latencyMs: 0,
    fallbackCount: 0,
    providerStatus: {
      'edge-cloud': 'unknown',
      'deepgram': 'unknown',
      'native': 'available',  // Always available
    },
  });
  
  const nativeVoice = useNativeZoeVoice();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBlockedRef = useRef(false);
  const hasProbedProvidersRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const speakRef = useRef<((text: string) => Promise<void>) | null>(null);

  // Non-interrupting speech queue (needed because Infinity emits multiple assistant lines rapidly)
  const speechQueueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);
  
  // BUG FIX: Use refs to track speaking/loading for speakQueued to avoid stale closures
  const isSpeakingRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  // Unlock audio on first user interaction (iOS requirement)
  useEffect(() => {
    if (isMobile()) {
      const handleInteraction = () => {
        unlockAudio();
        // Create AudioContext on user gesture for iOS
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      };
      
      window.addEventListener('touchstart', handleInteraction, { once: true });
      window.addEventListener('click', handleInteraction, { once: true });
      
      return () => {
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('click', handleInteraction);
      };
    }
  }, []);
  
  // BUG FIX: Store stable reference to nativeVoice.stop to use in cleanup
  const nativeVoiceStopRef = useRef(nativeVoice.stop);
  useEffect(() => {
    nativeVoiceStopRef.current = nativeVoice.stop;
  }, [nativeVoice.stop]);
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      nativeVoiceStopRef.current();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Probe providers - deferred until after voice activation to avoid PWA autoplay issues
  const probeProviders = useCallback(async () => {
    if (hasProbedProvidersRef.current) return;
    hasProbedProvidersRef.current = true;

    try {
      // Probe Deepgram (Infinity default). Avoid probing Edge-TTS since it is returning fallback.
      const res = await supabase.functions.invoke(
        'zoe-voice',
        {
          body: {
            text: 'hi',
            voice: 'zoe',
            encoding: 'mp3',
          },
          responseType: 'arraybuffer',
        } as any
      );

      if (res.error) throw res.error;

      const data = res.data;
      const isFallback =
        isJsonFallbackPayload(data) ||
        (data instanceof ArrayBuffer && (() => {
          const maybeJson = tryDecodeArrayBufferAsJson(data);
          return !!(maybeJson && isJsonFallbackPayload(maybeJson));
        })());

      setState((prev) => ({
        ...prev,
        providerStatus: { ...prev.providerStatus, deepgram: isFallback ? 'failed' : 'available' },
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        providerStatus: { ...prev.providerStatus, deepgram: 'failed' },
      }));
    }
  }, []);

  // Listen for voice activation and retry pending speech + probe providers
  useEffect(() => {
    const handleVoiceActivated = () => {
      console.log('[VoiceOrchestrator] 🎤 Voice system activated, probing providers...');
      audioBlockedRef.current = false;
      
      // Probe providers now that audio is unlocked
      probeProviders();
      
      // Retry pending speech if any
      if (pendingTextRef.current && speakRef.current) {
        const text = pendingTextRef.current;
        pendingTextRef.current = null;
        console.log('[VoiceOrchestrator] 🔄 Retrying pending speech after activation');
        // Small delay to ensure audio context is ready
        setTimeout(() => {
          speakRef.current?.(text);
        }, 100);
      }
    };

    window.addEventListener('zoe-voice-system-activated', handleVoiceActivated);
    
    // Check if already activated from previous session (for PWA persistence)
    const storage = isPWAMode() ? localStorage : sessionStorage;
    if (storage.getItem('zoe-voice-system-activated')) {
      probeProviders();
    }

    return () => {
      window.removeEventListener('zoe-voice-system-activated', handleVoiceActivated);
    };
  }, [probeProviders]);
  
  /**
   * Play audio blob with cross-device compatibility
   * @param originalText - The original text being spoken, used for retry after audio unlock
   */
  const playAudioBlob = useCallback(async (blob: Blob, startTime: number, provider: VoiceProvider, originalText?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio();
        audioRef.current = audio;
        
        // Apply Zoe Infinity voice settings (playbackRate, volume, pitch preservation)
        // This creates the "soothing cinematic feel" with playbackRate=0.9 default
        applyVoiceSettingsToAudio(audio);

        let didAttemptPlay = false;
        const attemptPlay = () => {
          if (didAttemptPlay) return;
          didAttemptPlay = true;

          audio.play().then(() => {
            const latency = Date.now() - startTime;
            setState(prev => ({
              ...prev,
              isSpeaking: true,
              latencyMs: latency,
              activeEngine: provider,
              providerStatus: { ...prev.providerStatus, [provider]: 'available' }
            }));
            console.log(`[VoiceOrchestrator] ✅ ${provider} playing (${latency}ms latency)`);
          }).catch((err) => {
            console.error('[VoiceOrchestrator] Play failed:', err);
            // Mobile Safari/iOS often throws NotAllowedError until a user gesture unlocks audio.
            // Trigger the existing VoiceSystemActivator flow.
            const name = (err as any)?.name;
            if (name === 'NotAllowedError') {
              // IMPORTANT: Do NOT auto-fallback to native here.
              // If we fall back, it looks like premium voice "doesn't work" while it's actually autoplay-blocked.
              audioBlockedRef.current = true;
              // Store text for retry after user grants audio permission
              if (originalText) {
                pendingTextRef.current = originalText;
              }
              window.dispatchEvent(new CustomEvent('zoe-request-voice-activation'));
            }
            setState(prev => ({
              ...prev,
              providerStatus: { ...prev.providerStatus, [provider]: 'failed' }
            }));
            resolve(false);
          });
        };
        
        // iOS-specific attributes
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setState(prev => ({ 
            ...prev, 
            isSpeaking: false,
            providerStatus: { ...prev.providerStatus, [provider]: 'available' }
          }));
          resolve(true);
        };
        
        audio.onerror = (e) => {
          // Extract actual MediaError code for better debugging
          const mediaError = audio.error;
          const errorCode = mediaError?.code;
          const errorMessage = mediaError?.message || 'Unknown audio error';
          
          // MediaError codes:
          // 1 = MEDIA_ERR_ABORTED - user aborted
          // 2 = MEDIA_ERR_NETWORK - network error
          // 3 = MEDIA_ERR_DECODE - decoding failed (corrupted audio)
          // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - format not supported
          
          // Only log as error for actual playback failures, not user aborts
          if (errorCode === 1) {
            console.log('[VoiceOrchestrator] Audio aborted by user/system');
          } else {
            console.error(`[VoiceOrchestrator] Audio error (code ${errorCode}): ${errorMessage}`);
          }
          
          URL.revokeObjectURL(audioUrl);
          // BUG FIX: Always reset isSpeaking state on error, not just provider status
          setState(prev => ({ 
            ...prev,
            isSpeaking: false,
            providerStatus: { ...prev.providerStatus, [provider]: errorCode === 1 ? 'available' : 'failed' }
          }));
          resolve(false);
        };
        
        // Different browsers fire different readiness events for short mp3 blobs.
        audio.oncanplay = attemptPlay;
        audio.oncanplaythrough = attemptPlay;
        
        audio.src = audioUrl;
        audio.load(); // Required for iOS
        
      } catch (err) {
        console.error('[VoiceOrchestrator] Audio setup error:', err);
        resolve(false);
      }
    });
  }, []);

  // Some backend voice endpoints return { fallback: true, ... } while others return
  // { useBrowserFallback: true, ... }. Treat both as a "no-audio" signal.
  const isJsonFallbackPayload = (data: unknown): data is { fallback?: true; useBrowserFallback?: true } => {
    if (!data || typeof data !== 'object') return false;
    return (
      // edge-tts
      'fallback' in data ||
      // zoe-voice
      'useBrowserFallback' in data
    );
  };

  const tryDecodeArrayBufferAsJson = (data: ArrayBuffer): any | null => {
    try {
      const text = new TextDecoder().decode(new Uint8Array(data));
      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };
  
  /**
   * Speak using Edge TTS (PRIMARY - Jenny Neural / Azure)
   */
  const speakWithEdgeCloud = useCallback(async (text: string): Promise<boolean> => {
    const startTime = Date.now();
    const config = VOICE_CONFIGS['edge-cloud'];
    
    try {
      console.log('[VoiceOrchestrator] 🎤 Trying Edge Cloud (Jenny Neural)...');
      
      // IMPORTANT: Request binary data. Without responseType, the client may try JSON parsing
      // and we end up with "no audio" even when the function returns audio/mpeg.
      const response = await supabase.functions.invoke(
        'edge-tts',
        {
          body: {
            text,
            voice: config.voice,
            rate: config.rate,
            pitch: config.pitch,
          },
          responseType: 'arraybuffer',
        } as any
      );
      
      // Check if we got audio data or a fallback signal
      if (response.error) {
        throw response.error;
      }
      
      const data = response.data;
      
      // If we got a JSON fallback payload, skip to next provider.
      if (isJsonFallbackPayload(data)) {
        console.log('[VoiceOrchestrator] Edge TTS returned fallback signal');
        setState(prev => ({
          ...prev,
          providerStatus: { ...prev.providerStatus, 'edge-cloud': 'failed' },
          activeEngine: prev.activeEngine === 'edge-cloud' ? 'deepgram' : prev.activeEngine,
        }));
        return false;
      }
      
      // Handle audio blob/arraybuffer
      if (data instanceof Blob) {
        return await playAudioBlob(data, startTime, 'edge-cloud', text);
      }
      
      if (data instanceof ArrayBuffer) {
        // Edge function might return JSON with Content-Type application/json.
        // When responseType is arraybuffer, that JSON comes through as bytes.
        const maybeJson = tryDecodeArrayBufferAsJson(data);
        if (maybeJson && isJsonFallbackPayload(maybeJson)) {
          console.log('[VoiceOrchestrator] Edge TTS returned fallback signal (decoded)');
          setState(prev => ({
            ...prev,
            providerStatus: { ...prev.providerStatus, 'edge-cloud': 'failed' },
            activeEngine: prev.activeEngine === 'edge-cloud' ? 'deepgram' : prev.activeEngine,
          }));
          return false;
        }
        const blob = new Blob([data], { type: 'audio/mpeg' });
        return await playAudioBlob(blob, startTime, 'edge-cloud', text);
      }
      
      // Unexpected response format
      console.warn('[VoiceOrchestrator] Edge TTS returned unexpected format');
      return false;
      
    } catch (error) {
      console.error('[VoiceOrchestrator] Edge Cloud failed:', error);
      setState(prev => ({ 
        ...prev,
        providerStatus: { ...prev.providerStatus, 'edge-cloud': 'failed' }
      }));
      return false;
    }
  }, [playAudioBlob]);
  
  /**
   * Speak using Deepgram (FALLBACK - Aura-2)
   */
  const speakWithDeepgram = useCallback(async (text: string): Promise<boolean> => {
    const startTime = Date.now();
    
    try {
      console.log('[VoiceOrchestrator] 🎙️ Trying Deepgram (Aura-2)...');
      
      // Use native fetch for more reliable binary handling
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoe-voice`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voice: 'zoe', encoding: 'mp3' }),
      });
      
      if (!response.ok) {
        console.error('[VoiceOrchestrator] Deepgram HTTP error:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      console.log('[VoiceOrchestrator] Deepgram response content-type:', contentType);
      
      // Check if JSON fallback
      if (contentType.includes('application/json')) {
        const json = await response.json();
        console.log('[VoiceOrchestrator] Deepgram returned JSON:', json);
        if (json?.useBrowserFallback || json?.fallback) {
          console.log('[VoiceOrchestrator] Deepgram signaled fallback');
          return false;
        }
        return false; // JSON but not fallback signal - still not audio
      }
      
      // Get audio blob directly
      const blob = await response.blob();
      console.log('[VoiceOrchestrator] Deepgram audio blob:', blob.size, 'bytes, type:', blob.type);
      
      if (blob.size < 100) {
        console.warn('[VoiceOrchestrator] Deepgram blob too small, likely error');
        return false;
      }
      
      return await playAudioBlob(blob, startTime, 'deepgram', text);
      
    } catch (error) {
      console.error('[VoiceOrchestrator] Deepgram failed:', error);
      setState(prev => ({ 
        ...prev,
        providerStatus: { ...prev.providerStatus, 'deepgram': 'failed' }
      }));
      return false;
    }
  }, [playAudioBlob]);
  
  /**
   * Speak using Native Browser TTS (EMERGENCY - Samantha)
   */
  const speakWithNative = useCallback((text: string): boolean => {
    console.log('[VoiceOrchestrator] 📢 Using Native TTS (Samantha fallback)...');
    
    try {
      nativeVoice.speak(text, {
        pitch: 0.95,  // Slightly warmer
        rate: 0.9,    // Relaxed pace (Samantha-like)
        volume: 0.85, // Intimate volume
        onStart: () => {
          setState(prev => ({ 
            ...prev, 
            isSpeaking: true,
            activeEngine: 'native',
            providerStatus: { ...prev.providerStatus, 'native': 'available' }
          }));
        },
        onEnd: () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
        },
      });
      
      return true;
    } catch (error) {
      console.error('[VoiceOrchestrator] Native TTS failed:', error);
      setState(prev => ({ 
        ...prev,
        providerStatus: { ...prev.providerStatus, 'native': 'failed' }
      }));
      return false;
    }
  }, [nativeVoice]);
  
  /**
   * Stop all speech
   */
  const stop = useCallback(() => {
    speechQueueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      // Ensure any awaiting play promise resolves (prevents queue from hanging)
      try {
        audioRef.current.dispatchEvent(new Event('ended'));
      } catch {
        // ignore
      }
      audioRef.current.src = '';
      audioRef.current = null;
    }
    nativeVoice.stop();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, [nativeVoice]);

  /**
   * Internal speak runner.
   * - interrupt=true: stops current playback first (user/explicit).
   * - interrupt=false: does not stop current playback (queue mode).
   */
  const runSpeak = useCallback(async (text: string, interrupt: boolean): Promise<boolean> => {
    if (!text?.trim()) return false;

    const exp = getEffectiveVoiceExperience();

    const { chunks, removedMarkers } = cleanAndSplitForVoice(text);
    if (chunks.length === 0) return false;

    logRemovedMarkers(removedMarkers);
    const cleanText = chunks.join(' ');

    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    audioBlockedRef.current = false;

    if (interrupt) {
      stop();
    }

    let success = false;
    let fallbackCount = 0;
    const preferredEngine = state.activeEngine;
    const edgeFailed = safeGetEdgeFailed();

    const engineOrder: VoiceProvider[] =
      exp === 'zoe-infinity'
        ? (preferredEngine === 'edge-cloud'
            ? (edgeFailed ? ['deepgram'] : ['edge-cloud', 'deepgram'])
            : ['deepgram'])
        : (
            preferredEngine === 'deepgram'
              ? ['deepgram', 'native']
              : preferredEngine === 'edge-cloud'
                ? (edgeFailed ? ['deepgram', 'native'] : ['edge-cloud', 'deepgram', 'native'])
                : ['native', 'deepgram']
          );

    for (const engine of engineOrder) {
      if (success) break;

      if (engine === 'edge-cloud') {
        success = await speakWithEdgeCloud(cleanText);
      } else if (engine === 'deepgram') {
        success = await speakWithDeepgram(cleanText);
      } else {
        success = exp === 'zoe-infinity' ? false : speakWithNative(cleanText);
      }

      if (!success && audioBlockedRef.current) break;

      if (!success && engine !== preferredEngine) {
        fallbackCount++;
        console.log(`[VoiceOrchestrator] ⚠️ Falling back from ${engine}...`);
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      fallbackCount,
      lastError: success
        ? null
        : (audioBlockedRef.current
            ? 'Voice is blocked by the browser. Tap “Enable Voice” to allow audio playback.'
            : (exp === 'zoe-infinity'
                ? 'Deepgram voice is unavailable right now (no browser fallback in Infinity).'
                : 'All voice providers failed')),
    }));

    if (!success) {
      console.error('[VoiceOrchestrator] ❌ All voice providers failed!');
    }

    return success;
  }, [state.activeEngine, speakWithEdgeCloud, speakWithDeepgram, speakWithNative, stop]);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      while (speechQueueRef.current.length > 0) {
        const next = speechQueueRef.current.shift();
        if (!next) continue;
        await runSpeak(next, false);
      }
    } finally {
      drainingRef.current = false;
    }
  }, [runSpeak]);

  /** Main speak (interrupts current speech) */
  const speak = useCallback(async (text: string): Promise<void> => {
    speechQueueRef.current = [];
    await runSpeak(text, true);
  }, [runSpeak]);

  /** Queue speech (never interrupts current playback) */
  const speakQueued = useCallback(async (text: string): Promise<void> => {
    if (!text?.trim()) return;
    // BUG FIX: Use refs instead of stale state closures
    if (isSpeakingRef.current || isLoadingRef.current || drainingRef.current) {
      speechQueueRef.current.push(text);
      void drainQueue();
      return;
    }
    await runSpeak(text, false);
    void drainQueue();
  }, [drainQueue, runSpeak]);

  // BUG FIX: Keep refs in sync with state for speakQueued closure
  useEffect(() => {
    isSpeakingRef.current = state.isSpeaking;
    isLoadingRef.current = state.isLoading;
  }, [state.isSpeaking, state.isLoading]);

  // Keep speakRef current for the voice activation retry logic
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);
  
  /**
   * Manually set preferred engine
   */
  const setActiveEngine = useCallback((provider: VoiceProvider) => {
    // Infinity must never switch to native.
    if (getEffectiveVoiceExperience() === 'zoe-infinity' && provider === 'native') return;
    setState(prev => ({ ...prev, activeEngine: provider }));
    console.log(`[VoiceOrchestrator] 🔄 Engine set to: ${provider}`);
    safeSetPreferredEngine(provider);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('zoe-voice-engine-changed', {
      detail: { provider, info: PROVIDER_INFO[provider] }
    }));
  }, []);
  
  /**
   * Handle voice commands for switching engines
   * Returns true if a voice switch command was detected
   */
  const handleVoiceCommand = useCallback((transcript: string): boolean => {
    if (!transcript?.trim()) return false;

    const exp = getEffectiveVoiceExperience();
    
    for (const { pattern, provider } of VOICE_SWITCH_PATTERNS) {
      if (pattern.test(transcript)) {
        if (exp === 'zoe-infinity' && provider === 'native') {
          // User requested: no browser voice in Infinity.
          return true;
        }
        console.log(`[VoiceOrchestrator] 🎤 Voice command detected: switching to ${provider}`);
        setActiveEngine(provider);
        
        // Speak confirmation only if native is allowed.
        if (exp !== 'zoe-infinity') {
          const info = PROVIDER_INFO[provider];
          setTimeout(() => {
            speakWithNative(info.description);
          }, 100);
        }
        
        return true;
      }
    }
    
    return false;
  }, [setActiveEngine, speakWithNative]);
  
  /**
   * Get provider info for UI
   */
  const getProviderInfo = useCallback(() => PROVIDER_INFO, []);
  
  return {
    ...state,
    speak,
    speakQueued,
    stop,
    setActiveEngine,
    handleVoiceCommand,
    getProviderInfo,
  };
};

export default useVoiceOrchestrator;
