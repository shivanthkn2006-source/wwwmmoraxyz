/**
 * useNativeZoeVoice - Protocol Native Tongue
 * ===========================================
 * Zero-cost browser-native voice synthesis for Zoe
 * 
 * Uses Web Speech API (SpeechSynthesis) - completely FREE
 * No API calls, works offline, instant response
 * 
 * Priority voice selection:
 * 1. Samantha (Mac/iOS - High Quality)
 * 2. Google US English (Android/Chrome)
 * 3. Any Female English voice
 * 4. Default en-US fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cleanAndSplitForVoice, PACING_DELAY_MS, logRemovedMarkers } from '@/utils/voiceTextCleaner';

// Voice preference priority for "Zoe" persona (female)
const VOICE_PRIORITIES_FEMALE = [
  'Samantha',           // Mac/iOS - Premium quality
  'Google US English',  // Android/Chrome
  'Microsoft Zira',     // Windows
  'Karen',              // macOS
  'Moira',              // macOS
  'Fiona',              // macOS
  'Victoria',           // macOS
  'Female',             // Generic female
];

// Voice preference priority for "Smith" persona (male)
const VOICE_PRIORITIES_MALE = [
  'Daniel',             // Mac/iOS - Premium male
  'Alex',               // macOS
  'Google UK English Male', // Chrome
  'Microsoft David',    // Windows
  'Fred',               // macOS
  'Thomas',             // macOS
  'Male',               // Generic male
];

export interface NativeZoeVoiceState {
  isSpeaking: boolean;
  isPaused: boolean;
  voiceName: string | null;
  isReady: boolean;
}

export interface NativeZoeVoiceOptions {
  pitch?: number;     // 0-2, default 1.0
  rate?: number;      // 0.1-10, default 1.05
  volume?: number;    // 0-1, default 1.0
  lang?: string;      // BCP-47 language code for multilingual TTS (e.g. 'hi-IN', 'fr-FR')
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useNativeZoeVoice = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [state, setState] = useState<NativeZoeVoiceState>({
    isSpeaking: false,
    isPaused: false,
    voiceName: null,
    isReady: false,
  });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<Array<{ text: string; options?: NativeZoeVoiceOptions }>>([]);
  const isProcessingRef = useRef(false);
  
  // Find the best voice based on current persona
  const findBestVoice = useCallback((voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voices.length) return null;
    
    // Check stored voice persona preference
    let isMalePersona = false;
    try { isMalePersona = localStorage.getItem('zoe_voice_persona') === 'male'; } catch {}
    
    const priorities = isMalePersona ? VOICE_PRIORITIES_MALE : VOICE_PRIORITIES_FEMALE;
    
    // Priority 1: Named premium voices
    for (const preferredName of priorities) {
      const match = voices.find(v => 
        v.name.toLowerCase().includes(preferredName.toLowerCase()) &&
        v.lang.startsWith('en')
      );
      if (match) return match;
    }
    
    // Priority 2: Gender-matched English voice
    const genderKeyword = isMalePersona ? 'male' : 'female';
    const genderMatch = voices.find(v => 
      v.lang.startsWith('en') && 
      v.name.toLowerCase().includes(genderKeyword)
    );
    if (genderMatch) return genderMatch;
    
    // Priority 3: en-US default
    const englishUS = voices.find(v => v.lang === 'en-US');
    if (englishUS) return englishUS;
    
    // Priority 4: Any English voice
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;
    
    // Fallback: First available
    return voices[0];
  }, []);
  
  // Load voices on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('[NativeZoeVoice] SpeechSynthesis not supported');
      return;
    }
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const bestVoice = findBestVoice(voices);
        if (bestVoice) {
          setVoice(bestVoice);
          setState(prev => ({
            ...prev,
            voiceName: bestVoice.name,
            isReady: true,
          }));
          console.log('[NativeZoeVoice] Voice selected:', bestVoice.name);
        }
      }
    };
    
    // Chrome loads voices asynchronously
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Chrome bug workaround: keep synthesis alive
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    
    return () => {
      clearInterval(keepAlive);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [findBestVoice]);
  
  // Process next item in queue
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const { text, options } = queueRef.current.shift()!;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    // If a specific language is requested, find a voice for that language
    if (options?.lang) {
      const voices = window.speechSynthesis.getVoices();
      const langVoice = voices.find(v => v.lang.startsWith(options.lang!.split('-')[0]));
      if (langVoice) {
        utterance.voice = langVoice;
        utterance.lang = options.lang;
      } else if (voice) {
        utterance.voice = voice;
      }
    } else if (voice) {
      utterance.voice = voice;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SAMANTHA "HER" TUNING - Native Browser Voice
    // ═══════════════════════════════════════════════════════════════════════════
    utterance.pitch = options?.pitch ?? 0.92;
    utterance.rate = options?.rate ?? 0.85;
    utterance.volume = options?.volume ?? 0.9;
    
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
      options?.onStart?.();
      window.dispatchEvent(new CustomEvent('zoe-speak-start'));
    };
    
    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
      utteranceRef.current = null;
      isProcessingRef.current = false;
      options?.onEnd?.();
      window.dispatchEvent(new CustomEvent('zoe-speak-end'));
      
      // Process next in queue
      processQueue();
    };
    
    utterance.onerror = (event) => {
      console.error('[NativeZoeVoice] Speech error:', event.error);
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
      utteranceRef.current = null;
      isProcessingRef.current = false;
      options?.onError?.(event.error);
      
      // Continue queue even on error
      processQueue();
    };
    
    window.speechSynthesis.speak(utterance);
  }, [voice]);
  
  // Speak text with SAMANTHA PACING - chunks with delays
  const speak = useCallback((text: string, options?: NativeZoeVoiceOptions) => {
    if (!text?.trim()) return;
    
    // FIX 1 + FIX 3: AUDIOBOOK KILLER + SAMANTHA PACING
    const { chunks, hasMultipleChunks, removedMarkers } = cleanAndSplitForVoice(text);
    
    if (chunks.length === 0) return;
    
    // Log what was removed (debug)
    logRemovedMarkers(removedMarkers);
    
    console.log('[NativeZoeVoice] 🎼 Samantha Pacing:', hasMultipleChunks ? `${chunks.length} chunks` : 'single');
    
    // Cancel current speech and clear queue for new immediate speech
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isProcessingRef.current = false;
    
    // BUG FIX: Store original onEnd to call at the very end
    const originalOnEnd = options?.onEnd;
    let finalOnEndCalled = false;
    
    // Queue all chunks - the queue processor handles sequential playback
    chunks.forEach((chunk, index) => {
      const isLastChunk = index === chunks.length - 1;
      
      queueRef.current.push({ 
        text: chunk, 
        options: {
          ...options,
          // BUG FIX: Only call original onEnd for the last chunk
          onEnd: isLastChunk
            ? () => {
                if (!finalOnEndCalled) {
                  finalOnEndCalled = true;
                  originalOnEnd?.();
                }
              }
            : () => {
                // Pause between chunks for intimate rhythm
                setTimeout(() => processQueue(), PACING_DELAY_MS);
              },
        }
      });
    });
    
    processQueue();
  }, [processQueue]);
  
  // Queue text with SAMANTHA PACING (doesn't interrupt current speech)
  const queue = useCallback((text: string, options?: NativeZoeVoiceOptions) => {
    if (!text?.trim()) return;
    
    // FIX 1 + FIX 3: AUDIOBOOK KILLER + SAMANTHA PACING
    const { chunks, removedMarkers } = cleanAndSplitForVoice(text);
    
    if (chunks.length === 0) return;
    
    logRemovedMarkers(removedMarkers);
    
    // BUG FIX: Store original onEnd to call at the very end
    const originalOnEnd = options?.onEnd;
    let finalOnEndCalled = false;
    
    // Queue all chunks with pacing delays
    chunks.forEach((chunk, index) => {
      const isLastChunk = index === chunks.length - 1;
      
      queueRef.current.push({ 
        text: chunk, 
        options: {
          ...options,
          // BUG FIX: Only call original onEnd for the last chunk
          onEnd: isLastChunk
            ? () => {
                if (!finalOnEndCalled) {
                  finalOnEndCalled = true;
                  originalOnEnd?.();
                }
              }
            : () => setTimeout(() => processQueue(), PACING_DELAY_MS),
        }
      });
    });
    
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [processQueue]);
  
  // Stop all speech
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    utteranceRef.current = null;
    isProcessingRef.current = false;
    setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    window.dispatchEvent(new CustomEvent('zoe-speak-end'));
  }, []);
  
  // Pause current speech
  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);
  
  // Resume paused speech
  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);
  
  return {
    speak,
    queue,
    stop,
    pause,
    resume,
    ...state,
  };
};

// Global singleton for imperative usage
let globalInstance: { speak: (text: string) => void; stop: () => void } | null = null;
let globalVoice: SpeechSynthesisVoice | null = null;
let globalVoiceInitialized = false;

// BUG FIX: Properly cache and initialize the global voice instance
const initializeGlobalVoice = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;
  
  let isMalePersona = false;
  try { isMalePersona = localStorage.getItem('zoe_voice_persona') === 'male'; } catch {}
  const priorities = isMalePersona ? VOICE_PRIORITIES_MALE : VOICE_PRIORITIES_FEMALE;
  for (const name of priorities) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(name.toLowerCase()) && v.lang.startsWith('en')
    );
    if (match) {
      globalVoice = match;
      console.log('[NativeZoeVoice] Global voice set:', match.name);
      break;
    }
  }
  
  if (!globalVoice) {
    globalVoice = voices.find(v => v.lang === 'en-US') || voices[0] || null;
  }
  
  globalVoiceInitialized = true;
};

export const getNativeZoeVoice = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  
  // BUG FIX: Create singleton ONCE and cache it
  if (!globalInstance) {
    // Initialize voice if not done
    if (!globalVoiceInitialized) {
      initializeGlobalVoice();
      // Also listen for voiceschanged to reinitialize
      window.speechSynthesis.addEventListener('voiceschanged', initializeGlobalVoice);
    }
    
    globalInstance = {
      speak: (text: string) => {
        if (!text?.trim()) return;
        window.speechSynthesis.cancel();
        
        // Re-check voice on each speak (in case voices changed)
        if (!globalVoice && window.speechSynthesis.getVoices().length > 0) {
          initializeGlobalVoice();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        if (globalVoice) utterance.voice = globalVoice;
        // SAMANTHA "HER" settings - Global singleton
        utterance.pitch = 0.92;   // Warm, intimate (not robotic)
        utterance.rate = 0.85;    // Slow, contemplative
        utterance.volume = 0.9;   // Soft presence
        
        window.speechSynthesis.speak(utterance);
      },
      stop: () => window.speechSynthesis.cancel(),
    };
  }
  
  return globalInstance;
};

export default useNativeZoeVoice;
