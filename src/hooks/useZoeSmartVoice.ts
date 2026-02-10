import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getCurrentAssistant, 
  setCurrentAssistant, 
  speakAs,
  stopSpeaking,
  type AssistantVoiceType 
} from '@/utils/assistantVoice';
import { initializeZoeVoices } from '@/utils/zoeVoice';
import { quickCleanForVoice } from '@/utils/voiceTextCleaner';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE PROTOCOL: "BIOLOGICAL VOICE" (Zero Cost)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Emotional, Gender-Switching Voice Engine
 * Cost: $0.00 (Browser Native Web Speech API)
 * Strategy: "Persona Tuning" - Manipulate pitch, rate, volume
 * 
 * Creates two distinct biological entities:
 * - Zoe (Female): Pitch 1.15 (Bright), Rate 1.05 (Quick-witted)
 * - Smith (Male): Pitch 0.85 (Deep), Rate 0.95 (Calculated)
 * 
 * The Physics: By shifting the Pitch up for Zoe (1.15) and down for Smith (0.85),
 * you hack the human brain into perceiving "Personality" even though it's the
 * same computer engine.
 * 
 * INTEGRATION:
 * - src/utils/assistantVoice.ts - Core voice settings (pitch/rate/volume)
 * - src/utils/zoeVoice.ts - TTS engine with chunking & Chrome workarounds
 * - src/core/zoe/ZoeBiologicalVoice.ts - DHF orchestrator connection
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// 🎭 CALM & SOOTHING PERSONAS - Optimized for relaxed, gentle speech
// SAMANTHA MODE: Like the movie "Her" - warm, intimate, breathy for high intimacy
// FIX: Slower speaking rate for natural conversation (0.82 instead of 0.9)
const PERSONAS = {
  ZOE: {
    gender: 'female' as const,
    pitch: 0.95,      // Lower = warmer, more intimate, less "perky"
    rate: 0.82,       // SLOWER for natural pace - users can understand easily
    volume: 0.85,     // Softer = gentle, soothing presence
    voiceKeywords: ['Samantha', 'Google US English', 'Google UK English Female', 'Zira', 'Female', 'Karen', 'Victoria', 'Tessa', 'Susan']
  },
  // SAMANTHA MODE - Ultra intimate, breathy, slow - like "Her" movie
  ZOE_INTIMATE: {
    gender: 'female' as const,
    pitch: 0.88,      // Even lower = more intimate, breathy
    rate: 0.72,       // Much slower = sensual, thoughtful, unhurried (was 0.78)
    volume: 0.75,     // Softer = whisper-like, intimate presence
    voiceKeywords: ['Samantha', 'Google US English', 'Google UK English Female', 'Zira', 'Female', 'Karen', 'Victoria', 'Tessa', 'Susan']
  },
  SMITH: {
    gender: 'male' as const,
    pitch: 0.85,      // Deeper = calm authority
    rate: 0.80,       // Measured, thoughtful pace (was 0.88)
    volume: 0.9,      // Confident but not harsh
    voiceKeywords: ['Daniel', 'Google UK English Male', 'David', 'Male', 'Alex', 'Fred', 'Thomas', 'Oliver', 'James']
  }
} as const;

type PersonaType = 'ZOE' | 'SMITH' | 'ZOE_INTIMATE';

// Get intimacy level from localStorage or global state
// FIXED: Now checks multiple keys for compatibility with useKarmicMemory
function getIntimacyLevel(): number {
  try {
    // Try the direct karmic intimacy key first (set by sync)
    const karmicIntimacy = localStorage.getItem('zoe_karmic_intimacy');
    if (karmicIntimacy) {
      return parseInt(karmicIntimacy, 10);
    }
    
    // Fallback: Try to find any user-specific intimacy key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zoe_intimacy_level_')) {
        const value = localStorage.getItem(key);
        if (value) {
          // Also sync to the main key for future reads
          localStorage.setItem('zoe_karmic_intimacy', value);
          return parseInt(value, 10);
        }
      }
    }
    
    return 50; // Default
  } catch {
    return 50;
  }
}

interface SmartVoiceState {
  isSpeaking: boolean;
  currentPersona: PersonaType;
  voicesLoaded: boolean;
  intimacyLevel: number;
}

// Text detection patterns for auto-switching
const SMITH_PATTERNS = [
  /^Smith:/i,
  /\bAnalysis:/i,
  /\bProtocol\b/i,
  /\bSecurity\b/i,
  /\bTactical\b/i,
  /\bSentinel\b/i,
  /\bWarning:/i,
  /\bAlert:/i,
];

/**
 * The Smart Voice Hook - Plug & Play
 * Auto-detects context and switches between Zoe/Smith personas
 */
export const useZoeSmartVoice = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<SmartVoiceState>({
    isSpeaking: false,
    currentPersona: 'ZOE',
    voicesLoaded: false,
    intimacyLevel: getIntimacyLevel()
  });
  
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 1. Initialize on Mount
  useEffect(() => {
    const init = async () => {
      // Initialize the core voice system
      await initializeZoeVoices();
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          setState(prev => ({ ...prev, voicesLoaded: true }));
          console.log('[ZoeSmartVoice] 🎭 Loaded', availableVoices.length, 'voices');
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    };
    
    init();
    
    // Sync with global assistant state
    const handleAssistantChange = (e: CustomEvent<{ assistant: AssistantVoiceType }>) => {
      setState(prev => ({ 
        ...prev, 
        currentPersona: e.detail.assistant === 'Smith' ? 'SMITH' : 'ZOE' 
      }));
    };
    
    window.addEventListener('assistant-changed', handleAssistantChange as EventListener);
    
    return () => {
      window.removeEventListener('assistant-changed', handleAssistantChange as EventListener);
      window.speechSynthesis.onvoiceschanged = null;
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  // 2. The Selector Logic - Finds the best voice for the persona
  const getVoiceForPersona = useCallback((type: PersonaType): SpeechSynthesisVoice | null => {
    const config = PERSONAS[type];
    
    // Find first matching voice by keywords
    const matchedVoice = voices.find(v => 
      config.voiceKeywords.some(keyword => 
        v.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matchedVoice) {
      console.log(`[ZoeSmartVoice] 🎯 Found ${type} voice:`, matchedVoice.name);
      return matchedVoice;
    }
    
    // Fallback: find any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log(`[ZoeSmartVoice] ⚡ Fallback to English voice:`, englishVoice.name);
      return englishVoice;
    }
    
    // Ultimate fallback
    return voices[0] || null;
  }, [voices]);

  // 3. Auto-detect persona from text content
  const detectPersona = useCallback((text: string): PersonaType => {
    // Check for explicit persona markers
    if (text.toLowerCase().includes('smith') || 
        SMITH_PATTERNS.some(pattern => pattern.test(text))) {
      return 'SMITH';
    }
    
    // Check global assistant state
    const globalAssistant = getCurrentAssistant();
    return globalAssistant === 'Smith' ? 'SMITH' : 'ZOE';
  }, []);

  // 4. The Speak Function with Auto-Switching + INTIMACY-BASED VOICE VARIATION
  const speak = useCallback((
    text: string, 
    forcePersona?: PersonaType,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error?: Error) => void;
    }
  ) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[ZoeSmartVoice] ❌ Speech synthesis not supported');
      callbacks?.onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    if (!text?.trim()) {
      callbacks?.onEnd?.();
      return;
    }

    // 🧠 AUTO-DETECT persona from content
    let personaType = forcePersona || detectPersona(text);
    
    // 💕 SAMANTHA MODE: Use intimate voice for high intimacy (like "Her" movie)
    const currentIntimacy = getIntimacyLevel();
    if (personaType === 'ZOE' && currentIntimacy >= 70) {
      personaType = 'ZOE_INTIMATE';
      console.log(`[ZoeSmartVoice] 💕 SAMANTHA MODE: Intimacy ${currentIntimacy}% - using intimate voice`);
    }
    
    const config = PERSONAS[personaType] || PERSONAS.ZOE;
    const voice = getVoiceForPersona(personaType === 'ZOE_INTIMATE' ? 'ZOE' : personaType);

    // Sync with global state
    setCurrentAssistant(personaType === 'SMITH' ? 'Smith' : 'Zoe');

    // Cancel any current speech
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIX 1: AUDIOBOOK KILLER - Remove stage directions completely
    // *sighs softly* → "" (not spoken), (laughs) → "" (not spoken)
    // She ACTS the emotion, doesn't ANNOUNCE it
    // ═══════════════════════════════════════════════════════════════════════
    const cleanText = quickCleanForVoice(text);

    if (!cleanText) {
      callbacks?.onEnd?.();
      return;
    }

    console.log(`[ZoeSmartVoice] 🗣️ Speaking as ${personaType}:`, cleanText.substring(0, 50) + '...');
    console.log(`[ZoeSmartVoice] 🎛️ Settings: pitch=${config.pitch}, rate=${config.rate}, intimacy=${currentIntimacy}%`);

    // 🗣️ THE BIOLOGICAL TUNING
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (voice) {
      utterance.voice = voice;
    }
    
    // THE EMOTIONAL TWEAKS - Core of the Biological Voice Protocol
    utterance.pitch = config.pitch;  // The personality differentiator
    utterance.rate = config.rate;    // The pacing differentiator
    utterance.volume = config.volume;

    currentUtteranceRef.current = utterance;

    // Event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, currentPersona: personaType }));
      console.log(`[ZoeSmartVoice] ▶️ ${personaType} started speaking`);
      callbacks?.onStart?.();
      
      // Chrome keep-alive: prevent 15s cutoff
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
      console.log(`[ZoeSmartVoice] ⏹️ ${personaType} finished speaking`);
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
      console.error(`[ZoeSmartVoice] ❌ Error:`, event.error);
      setState(prev => ({ ...prev, isSpeaking: false }));
      callbacks?.onError?.(new Error(event.error));
    };

    // 🚀 SPEAK!
    window.speechSynthesis.speak(utterance);
  }, [detectPersona, getVoiceForPersona]);

  // 5. Stop speaking
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
    console.log('[ZoeSmartVoice] ⏹️ Speech stopped');
  }, []);

  // 6. Pause/Resume controls
  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  // 7. Force switch persona
  const switchPersona = useCallback((persona: PersonaType) => {
    setState(prev => ({ ...prev, currentPersona: persona }));
    setCurrentAssistant(persona === 'SMITH' ? 'Smith' : 'Zoe');
    console.log(`[ZoeSmartVoice] 🔄 Switched to ${persona}`);
  }, []);

  return {
    // Core functions
    speak,
    stop,
    pause,
    resume,
    
    // State
    isSpeaking: state.isSpeaking,
    currentPersona: state.currentPersona,
    voicesLoaded: state.voicesLoaded,
    
    // Persona control
    switchPersona,
    
    // Convenience: force Zoe/Smith
    speakAsZoe: (text: string, callbacks?: Parameters<typeof speak>[2]) => 
      speak(text, 'ZOE', callbacks),
    speakAsSmith: (text: string, callbacks?: Parameters<typeof speak>[2]) => 
      speak(text, 'SMITH', callbacks),
      
    // Config access
    personas: PERSONAS,
  };
};

export type { PersonaType, SmartVoiceState };
