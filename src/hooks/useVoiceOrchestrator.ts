/**
 * VOICE ORCHESTRATOR v4 - Deepgram Aura-2 Primary + Browser Fallback
 * ====================================================================
 * Primary: Deepgram Aura-2 (aura-2-janus-en) - feminine, warm, expressive
 * Fallback: Browser Web Speech API (zero external dependencies)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNativeZoeVoice } from './useNativeZoeVoice';
import { speakWithDeepgram, stopDeepgramSpeech, isDeepgramPlaying } from '@/utils/deepgramTTS';
import { cleanAndSplitForVoice, logRemovedMarkers } from '@/utils/voiceTextCleaner';

export type VoiceProvider = 'deepgram' | 'native';

export const PROVIDER_INFO: Record<VoiceProvider, { 
  name: string; 
  color: 'green' | 'yellow' | 'red';
  description: string;
}> = {
  'deepgram': { 
    name: 'Aura-2 Voice', 
    color: 'green',
    description: 'Premium Deepgram Aura-2 voice active.' 
  },
  'native': { 
    name: 'Browser Voice', 
    color: 'yellow',
    description: 'Browser voice fallback active.' 
  },
};

export interface VoiceConfig {
  provider: VoiceProvider;
  voice: string;
  rate: string;
  pitch: string;
}

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
  speak: (text: string, lang?: string) => Promise<void>;
  speakQueued: (text: string) => Promise<void>;
  stop: () => void;
  setActiveEngine: (provider: VoiceProvider) => void;
  handleVoiceCommand: (transcript: string) => boolean;
  getProviderInfo: () => typeof PROVIDER_INFO;
}

// Cooldown after Deepgram failure (60s)
const DEEPGRAM_COOLDOWN_MS = 60_000;

export const useVoiceOrchestrator = (): VoiceOrchestratorReturn => {
  const [state, setState] = useState<VoiceOrchestratorState>({
    activeEngine: 'deepgram',
    isSpeaking: false,
    isLoading: false,
    lastError: null,
    latencyMs: 0,
    fallbackCount: 0,
    providerStatus: {
      'deepgram': 'unknown',
      'native': 'available',
    },
  });
  
  const nativeVoice = useNativeZoeVoice();
  const nativeVoiceStopRef = useRef(nativeVoice.stop);
  
  // Non-interrupting speech queue
  const speechQueueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  // Deepgram cooldown tracking
  const deepgramFailedAtRef = useRef<number>(0);

  useEffect(() => {
    nativeVoiceStopRef.current = nativeVoice.stop;
  }, [nativeVoice.stop]);
  
  useEffect(() => {
    return () => {
      nativeVoiceStopRef.current();
      stopDeepgramSpeech();
    };
  }, []);

  // Dispatch voice activation event on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zoe-voice-system-activated'));
  }, []);

  const isDeepgramCoolingDown = useCallback((): boolean => {
    if (deepgramFailedAtRef.current === 0) return false;
    return Date.now() - deepgramFailedAtRef.current < DEEPGRAM_COOLDOWN_MS;
  }, []);

  // ─── Deepgram Aura-2 primary engine ───────────────────────────────────
  const speakWithDeepgramEngine = useCallback(async (text: string): Promise<boolean> => {
    if (isDeepgramCoolingDown()) {
      console.log('[VoiceOrchestrator] ⏳ Deepgram cooling down, skipping');
      return false;
    }

    console.log('[VoiceOrchestrator] 🎙️ Using Deepgram Aura-2 (aura-2-janus-en)...');
    const startTime = performance.now();

    try {
      const success = await speakWithDeepgram(
        text,
        () => {
          const latency = Math.round(performance.now() - startTime);
          setState(prev => ({
            ...prev,
            isSpeaking: true,
            isLoading: false,
            activeEngine: 'deepgram',
            latencyMs: latency,
            providerStatus: { ...prev.providerStatus, deepgram: 'available' },
          }));
        },
        () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
        },
        (err) => {
          console.warn('[VoiceOrchestrator] Deepgram playback error:', err?.message);
        }
      );

      if (success) {
        console.log('[VoiceOrchestrator] ✅ Deepgram Aura-2 playing');
        return true;
      }
      
      // Mark Deepgram as failed, start cooldown
      deepgramFailedAtRef.current = Date.now();
      setState(prev => ({
        ...prev,
        providerStatus: { ...prev.providerStatus, deepgram: 'failed' },
      }));
      return false;
    } catch (error) {
      console.error('[VoiceOrchestrator] Deepgram error:', error);
      deepgramFailedAtRef.current = Date.now();
      setState(prev => ({
        ...prev,
        providerStatus: { ...prev.providerStatus, deepgram: 'failed' },
      }));
      return false;
    }
  }, [isDeepgramCoolingDown]);

  // ─── Browser native fallback ──────────────────────────────────────────
  const speakWithNative = useCallback((text: string, lang?: string): boolean => {
    console.log('[VoiceOrchestrator] 📢 Falling back to Browser TTS...', lang ? `(lang: ${lang})` : '');
    
    try {
      nativeVoice.speak(text, {
        pitch: 0.95,
        rate: 0.9,
        volume: 0.85,
        lang,
        onStart: () => {
          setState(prev => ({ 
            ...prev, 
            isSpeaking: true,
            activeEngine: 'native',
            providerStatus: { ...prev.providerStatus, native: 'available' }
          }));
          window.dispatchEvent(new CustomEvent('zoe-speak-start'));
          window.dispatchEvent(new CustomEvent('zoe-speak'));
        },
        onEnd: () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          window.dispatchEvent(new CustomEvent('zoe-speak-end'));
        },
      });
      
      return true;
    } catch (error) {
      console.error('[VoiceOrchestrator] Browser TTS failed:', error);
      setState(prev => ({ 
        ...prev,
        providerStatus: { ...prev.providerStatus, native: 'failed' }
      }));
      return false;
    }
  }, [nativeVoice]);
  
  const stop = useCallback(() => {
    speechQueueRef.current = [];
    stopDeepgramSpeech();
    nativeVoice.stop();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, [nativeVoice]);

  const runSpeak = useCallback(async (text: string, interrupt: boolean, lang?: string): Promise<boolean> => {
    if (!text?.trim()) return false;

    const { chunks, removedMarkers } = cleanAndSplitForVoice(text);
    if (chunks.length === 0) return false;

    logRemovedMarkers(removedMarkers);
    const cleanText = chunks.join(' ');

    setState(prev => ({ ...prev, isLoading: true, lastError: null }));

    if (interrupt) {
      stop();
    }

    // For non-English languages, Deepgram Aura only supports English → go directly to native TTS
    const isNonEnglish = lang && !lang.startsWith('en');
    let success = false;

    if (isNonEnglish) {
      console.log(`[VoiceOrchestrator] 🌐 Non-English language (${lang}), using Browser TTS`);
      success = speakWithNative(cleanText, lang);
    } else {
      // Try Deepgram first, then fall back to native
      success = await speakWithDeepgramEngine(cleanText);
      if (!success) {
        setState(prev => ({ ...prev, fallbackCount: prev.fallbackCount + 1 }));
        success = speakWithNative(cleanText, lang);
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      lastError: success ? null : 'Voice synthesis failed',
    }));

    if (!success) {
      console.error('[VoiceOrchestrator] ❌ All voice engines failed');
    }

    return success;
  }, [speakWithDeepgramEngine, speakWithNative, stop]);

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

  const speak = useCallback(async (text: string, lang?: string): Promise<void> => {
    speechQueueRef.current = [];
    await runSpeak(text, true, lang);
  }, [runSpeak]);

  const speakQueued = useCallback(async (text: string): Promise<void> => {
    if (!text?.trim()) return;
    if (isSpeakingRef.current || isLoadingRef.current || drainingRef.current) {
      speechQueueRef.current.push(text);
      void drainQueue();
      return;
    }
    await runSpeak(text, false);
    void drainQueue();
  }, [drainQueue, runSpeak]);

  useEffect(() => {
    isSpeakingRef.current = state.isSpeaking;
    isLoadingRef.current = state.isLoading;
  }, [state.isSpeaking, state.isLoading]);
  
  const setActiveEngine = useCallback((provider: VoiceProvider) => {
    setState(prev => ({ ...prev, activeEngine: provider }));
    // Reset cooldown if switching to deepgram
    if (provider === 'deepgram') {
      deepgramFailedAtRef.current = 0;
    }
  }, []);
  
  const handleVoiceCommand = useCallback((transcript: string): boolean => {
    const lower = transcript.toLowerCase().trim();
    
    // Switch to premium/deepgram/paid voice
    if (/\b(premium|deepgram|paid|aura)\b/i.test(lower) && /\b(voice|engine|switch)\b/i.test(lower)) {
      setActiveEngine('deepgram');
      deepgramFailedAtRef.current = 0; // Reset cooldown
      return true;
    }
    
    // Switch to free/browser/native voice
    if (/\b(free|browser|native|basic)\b/i.test(lower) && /\b(voice|engine|switch)\b/i.test(lower)) {
      setActiveEngine('native');
      return true;
    }

    // ═══ MALE / FEMALE VOICE SWITCHING via conversation ═══
    // "talk in male voice", "switch to male voice", "can you speak in male voice", "use smith voice"
    const wantsMale = /\b(male|man|boy|smith|masculine|deep)\s*(voice|tone|sound)/i.test(lower)
      || /\b(voice|talk|speak|switch)\b.*\b(male|man|smith|masculine)\b/i.test(lower);
    const wantsFemale = /\b(female|woman|girl|zoe|feminine|soft)\s*(voice|tone|sound)/i.test(lower)
      || /\b(voice|talk|speak|switch)\b.*\b(female|woman|zoe|feminine)\b/i.test(lower);

    if (wantsMale || wantsFemale) {
      const persona = wantsMale ? 'male' : 'female';
      localStorage.setItem('zoe_voice_persona', persona);
      window.dispatchEvent(new CustomEvent('zoe-voice-persona-changed', { detail: { persona } }));
      console.log(`[VoiceOrchestrator] 🔄 Voice persona switched to: ${persona}`);
      // Return false so the message still goes through to AI for a spoken reply confirming the switch
      return false;
    }
    
    return false;
  }, [setActiveEngine]);
  
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
