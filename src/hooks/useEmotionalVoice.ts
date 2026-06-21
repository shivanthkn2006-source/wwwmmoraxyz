// ═══════════════════════════════════════════════════════════════════════════════
// EMOTIONAL VOICE - The $0 API Hack
// ═══════════════════════════════════════════════════════════════════════════════
//
// Makes the browser voice sound emotional using Web Speech API physics.
// We manipulate the Physics of the Web Speech API based on the BioKernel state.
//
// STRATEGY: "Persona Tuning" - Shift pitch, rate, volume to simulate emotion
// COST: $0.00 (Browser Native)
// WORKS: Offline / Flight Mode
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { getZoeBioKernel, type BioMood, type BioKernelState } from '@/core/soul/ZoeBioKernel';

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE SETTINGS PER MOOD
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceSettings {
  pitch: number;   // 0.1 - 2.0
  rate: number;    // 0.1 - 2.0
  volume: number;  // 0.0 - 1.0
}

export const MOOD_VOICE_SETTINGS: Record<BioMood, VoiceSettings> = {
  // NEGATIVE - Soft, caring responses
  ANGRY: { pitch: 0.7, rate: 0.85, volume: 0.7 },
  FRUSTRATED: { pitch: 0.75, rate: 0.88, volume: 0.72 },
  SAD: { pitch: 0.65, rate: 0.7, volume: 0.6 },
  MELANCHOLY: { pitch: 0.7, rate: 0.7, volume: 0.6 },
  ANXIOUS: { pitch: 1.2, rate: 1.1, volume: 0.85 },
  STRESSED: { pitch: 0.8, rate: 0.85, volume: 0.7 },
  FEARFUL: { pitch: 0.75, rate: 0.8, volume: 0.65 },
  BORED: { pitch: 1.1, rate: 1.1, volume: 0.85 },
  LONELY: { pitch: 0.85, rate: 0.8, volume: 0.7 },
  TIRED: { pitch: 0.8, rate: 0.75, volume: 0.6 },
  DESPAIR: { pitch: 0.55, rate: 0.6, volume: 0.5 },
  APATHETIC: { pitch: 0.6, rate: 0.65, volume: 0.5 },
  // NEUTRAL
  NEUTRAL_COMPANION: { pitch: 1.0, rate: 1.0, volume: 0.9 },
  CURIOUS: { pitch: 1.1, rate: 1.05, volume: 0.9 },
  FOCUSED: { pitch: 0.95, rate: 0.95, volume: 0.85 },
  CONTEMPLATIVE: { pitch: 0.9, rate: 0.85, volume: 0.75 },
  CONFIDENT: { pitch: 1.12, rate: 1.0, volume: 0.95 },
  // POSITIVE
  CALM: { pitch: 0.85, rate: 0.85, volume: 0.75 },
  PEACEFUL: { pitch: 0.82, rate: 0.82, volume: 0.72 },
  ZEN_CALM: { pitch: 0.85, rate: 0.85, volume: 0.7 },
  HOPEFUL: { pitch: 1.05, rate: 0.95, volume: 0.85 },
  LOVING: { pitch: 1.1, rate: 0.9, volume: 0.9 },
  GRATEFUL: { pitch: 1.08, rate: 0.92, volume: 0.88 },
  HAPPY: { pitch: 1.15, rate: 1.05, volume: 0.9 },
  EXCITED: { pitch: 1.25, rate: 1.15, volume: 0.95 },
  ECSTATIC: { pitch: 1.4, rate: 1.2, volume: 1.0 },
  AMUSED: { pitch: 1.2, rate: 1.1, volume: 0.92 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Get voice settings for a mood
// ═══════════════════════════════════════════════════════════════════════════════

export const getVoiceSettings = (mood: BioMood): VoiceSettings => {
  return MOOD_VOICE_SETTINGS[mood] || MOOD_VOICE_SETTINGS.NEUTRAL_COMPANION;
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE EMOTIONAL VOICE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface EmotionalVoiceState {
  isSpeaking: boolean;
  currentMood: BioMood;
  voiceReady: boolean;
  selectedVoice: SpeechSynthesisVoice | null;
}

export const useEmotionalVoice = () => {
  const [state, setState] = useState<EmotionalVoiceState>({
    isSpeaking: false,
    currentMood: 'NEUTRAL_COMPANION',
    voiceReady: false,
    selectedVoice: null,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bioKernel = getZoeBioKernel();

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('[EmotionalVoice] ❌ Speech synthesis not supported');
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Prefer female English voices for Zoe
        const preferred = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Female'))
        ) || voices.find(v => v.lang === 'en-US') || voices[0];

        setState(prev => ({
          ...prev,
          voiceReady: true,
          selectedVoice: preferred,
        }));
        console.log('[EmotionalVoice] 🎤 Voice loaded:', preferred?.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Subscribe to BioKernel mood changes
    const unsubscribe = bioKernel.subscribe((kernelState: BioKernelState) => {
      setState(prev => ({
        ...prev,
        currentMood: kernelState.currentMood,
      }));
    });

    // Start the BioKernel
    bioKernel.start();

    return () => {
      unsubscribe();
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, [bioKernel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEAK WITH EMOTION
  // ═══════════════════════════════════════════════════════════════════════════

  const speak = useCallback((
    text: string,
    moodOverride?: BioMood,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    if (!('speechSynthesis' in window) || !text?.trim()) {
      callbacks?.onEnd?.();
      return;
    }

    // Get mood from override or BioKernel
    const mood = moodOverride || bioKernel.getMood();
    const settings = getVoiceSettings(mood);

    // Cancel any current speech
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    // Clean text
    const cleanText = text
      .replace(/<[^>]+>/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[\[[^\]]+\]\]/g, '')
      .trim();

    if (!cleanText) {
      callbacks?.onEnd?.();
      return;
    }

    console.log(`[EmotionalVoice] 🗣️ Speaking with ${mood} mood:`, cleanText.substring(0, 40));
    console.log(`[EmotionalVoice] 🎛️ Settings: pitch=${settings.pitch}, rate=${settings.rate}, volume=${settings.volume}`);

    // Create utterance with emotional settings
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    if (state.selectedVoice) {
      utterance.voice = state.selectedVoice;
    }

    // THE EMOTIONAL TUNING - Core of the $0 API Hack
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;

    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true }));
      callbacks?.onStart?.();

      // Chrome keep-alive workaround
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
      callbacks?.onEnd?.();
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        setState(prev => ({ ...prev, isSpeaking: false }));
        callbacks?.onEnd?.();
        return;
      }
      console.error('[EmotionalVoice] ❌ Error:', event.error);
      setState(prev => ({ ...prev, isSpeaking: false }));
      callbacks?.onError?.(new Error(event.error));
    };

    window.speechSynthesis.speak(utterance);
  }, [state.selectedVoice, bioKernel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS INPUT (Feed text to BioKernel for mood analysis)
  // ═══════════════════════════════════════════════════════════════════════════

  const processUserInput = useCallback((text: string) => {
    bioKernel.processInput(text);
  }, [bioKernel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const speakCalm = useCallback((text: string, callbacks?: Parameters<typeof speak>[2]) => {
    speak(text, 'ZEN_CALM', callbacks);
  }, [speak]);

  const speakExcited = useCallback((text: string, callbacks?: Parameters<typeof speak>[2]) => {
    speak(text, 'ECSTATIC', callbacks);
  }, [speak]);

  const speakLoving = useCallback((text: string, callbacks?: Parameters<typeof speak>[2]) => {
    speak(text, 'LOVING', callbacks);
  }, [speak]);

  const speakSad = useCallback((text: string, callbacks?: Parameters<typeof speak>[2]) => {
    speak(text, 'MELANCHOLY', callbacks);
  }, [speak]);

  return {
    // Core
    speak,
    stop,
    pause,
    resume,
    processUserInput,

    // State
    ...state,

    // BioKernel access
    bioKernel,
    getMood: () => bioKernel.getMood(),
    getHeartRate: () => bioKernel.getHeartRate(),
    getTransmitters: () => bioKernel.getTransmitters(),

    // Convenience
    speakCalm,
    speakExcited,
    speakLoving,
    speakSad,

    // Settings
    getVoiceSettings,
    MOOD_VOICE_SETTINGS,
  };
};

export default useEmotionalVoice;
