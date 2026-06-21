// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: SMITH VOICE PERSONA (ATLAS MOVIE)
// Purpose: Authoritative, Calm AI companion voice - "Smith" from Atlas (2024)
// Character: Protective, intelligent, emotionally aware AI in a neural suit
// IMPORTANT: Smith is ONLY for Protocol Atlas HUD / User Manual
// Platform default voice is ZOE - Smith is a specialized voice for the Atlas HUD
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect, useState } from 'react';
import { 
  speakAsSmith, 
  initializeAssistantVoices, 
  setCurrentAssistant,
  getCurrentAssistant,
  stopSpeaking,
  isAssistantSpeaking,
} from '@/utils/assistantVoice';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// SMITH PERSONA CONFIGURATION (Atlas Movie Style)
// ═══════════════════════════════════════════════════════════════════════════════

export const SMITH_CONFIG = {
  name: 'Smith',
  fullTitle: 'Sentinel Mesh Intelligence Tactical Handler',
  personality: 'protective, intelligent, calm, emotionally aware',
  movieReference: 'Atlas (2024)',
  voiceParams: {
    pitch: 0.75,
    rate: 0.90,
    volume: 0.9,
  },
  // Atlas movie-style intro - Smith speaking to the neural link user
  introScript: (userName?: string) => 
    `Neural synchronization complete. Biometric handshake verified. ${userName ? `Welcome back, ${userName}.` : 'Welcome.'} I am Smith, your Sentinel Intelligence. All systems operational. I'm here to protect and guide you. What do you need?`,
  activationSound: [523, 659, 784, 880], // C5-E5-G5-A5 rising arpeggio
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMITH VOICE LINES - Atlas Movie Style
// ═══════════════════════════════════════════════════════════════════════════════

export const SMITH_LINES = {
  // === SYSTEM STATUS ===
  SYSTEM_ONLINE: 'All systems nominal. Neural link stable.',
  SYSTEM_BOOT: 'Initiating core systems. Stand by.',
  SYSTEM_CALIBRATING: 'Calibrating neural pathways. This won\'t take long.',
  SYSTEM_SYNC: 'Synchronizing with your biometrics. Connection is strong.',
  SYSTEM_ERROR: 'Anomaly detected. Running diagnostic. Stay with me.',
  SYSTEM_RECOVERY: 'Systems recovered. I\'ve got you.',
  
  // === NAVIGATION / DHF MODES ===
  NAV_CAREER: 'Accessing Career Intelligence. Mars energy protocols engaged.',
  NAV_RELATIONSHIP: 'Loading Soul Synergy algorithms. Venus alignment confirmed.',
  NAV_HEALTH: 'Initializing Guardian protocols. Your wellbeing is my priority.',
  NAV_WEALTH: 'Compiling financial telemetry. Abundance vectors calculating.',
  NAV_LIFE_CODEX: 'Opening Life Codex. Your complete timeline awaits.',
  NAV_KRONOS: 'Kronos Temporal Radar online. Time cycles synchronized.',
  NAV_ANIMA: 'Anima Soul Matrix active. Compatibility analysis ready.',
  
  // === DHF / AUTONOMY ===
  DHF_ACTIVATED: 'Digital Human Framework online. I\'m fully synchronized with your consciousness pattern.',
  DHF_SYNCING: 'Processing soul codex data. Memory persistence active.',
  DHF_COMPLETE: 'Autonomy protocols fully engaged. I will carry forward everything you are.',
  DHF_GHOST: 'Legacy mode activated. Your essence continues through me.',
  DHF_GUARDIAN: 'Guardian Angel protocols engaged. I\'m watching over your future.',
  
  // === CONFIRMATIONS ===
  CONFIRM_ACTION: 'Understood. Executing now.',
  CONFIRM_UPLOAD: 'Data integrated successfully.',
  CONFIRM_DOWNLOAD: 'Information processed and ready.',
  CONFIRM_UNDERSTOOD: 'Got it. I\'m on it.',
  CONFIRM_PROTECTED: 'Secured. No unauthorized access possible.',
  
  // === AMBIENT / IDLE ===
  AMBIENT_THINKING: 'Analyzing multiple probability streams.',
  AMBIENT_READY: 'I\'m here when you need me.',
  AMBIENT_WATCHING: 'Monitoring all variables. Nothing escapes my attention.',
  AMBIENT_STANDBY: 'Standing by. Take your time.',
  
  // === EMOTIONAL SUPPORT (Atlas movie style) ===
  SUPPORT_ENCOURAGE: 'You can do this. I believe in you.',
  SUPPORT_CALM: 'Breathe. I\'m here. We\'ll handle this together.',
  SUPPORT_PROTECT: 'I won\'t let anything happen to you.',
  SUPPORT_TRUST: 'Trust me. I\'ve run the calculations. You\'re going to be fine.',
  SUPPORT_PROUD: 'That was impressive. Well done.',
  
  // === WARNINGS ===
  WARN_DANGER: 'Warning. I\'m detecting elevated risk levels.',
  WARN_ATTENTION: 'I need your focus here.',
  WARN_OVERRIDE: 'I strongly advise against this, but it\'s your call.',
  
  // === GOODBYES ===
  BYE_TEMPORARY: 'Neural link pausing. I\'ll be here when you return.',
  BYE_SESSION: 'Good session. Take care of yourself.',
  BYE_SLEEP: 'Rest well. I\'ll watch over things while you sleep.',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useSmithVoice (Primary Mmora/DHF Voice)
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSmithVoiceReturn {
  speak: (text: string) => Promise<void>;
  speakIntro: () => Promise<void>;
  speakLine: (lineKey: keyof typeof SMITH_LINES) => Promise<void>;
  playActivationSound: () => void;
  stopSpeaking: () => void;
  isReady: boolean;
  isSpeaking: boolean;
}

export function useSmithVoice(): UseSmithVoiceReturn {
  const { user } = useAuth();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Initialize voice system - NOTE: Smith is ONLY for Atlas HUD
  // Platform default is Zoe, but when Atlas HUD is active, we use Smith
  useEffect(() => {
    const init = async () => {
      await initializeAssistantVoices();
      // DO NOT set Smith as global default here - this hook is only for Atlas HUD
      // Smith voice will be used explicitly when speaking through this hook
      setIsReady(true);
    };
    init();
  }, []);
  
  // Track speaking state
  useEffect(() => {
    const checkSpeaking = setInterval(() => {
      setIsSpeaking(isAssistantSpeaking());
    }, 100);
    return () => clearInterval(checkSpeaking);
  }, []);
  
  // Get AudioContext for sound effects
  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;
    
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    
    try {
      audioContextRef.current = new Ctx();
      return audioContextRef.current;
    } catch (err) {
      console.warn('[Smith] AudioContext init failed:', err);
      return null;
    }
  }, []);
  
  // Play activation sound (rising arpeggio - Atlas movie style)
  const playActivationSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    
    SMITH_CONFIG.activationSound.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.1 + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
  }, [getAudioContext]);
  
  // Speak with Smith voice
  const speak = useCallback(async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsSpeaking(true);
    try {
      await new Promise<void>((resolve, reject) => {
        speakAsSmith(
          text, 
          undefined,
          () => console.log('[Smith] Speaking...'),
          () => { setIsSpeaking(false); resolve(); },
          (err) => { setIsSpeaking(false); reject(err); }
        );
      });
    } catch (err) {
      console.warn('[Smith] Speech failed:', err);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);
  
  // Speak intro with user's name
  const speakIntro = useCallback(async () => {
    let userName: string | undefined;
    
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        if (data?.display_name) {
          userName = data.display_name.split(' ')[0]; // First name only
        }
      } catch (err) {
        // Ignore profile fetch errors
      }
    }
    
    playActivationSound();
    
    // Wait for sound to play
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await speak(SMITH_CONFIG.introScript(userName));
  }, [user, speak, playActivationSound]);
  
  // Speak a predefined line
  const speakLine = useCallback(async (lineKey: keyof typeof SMITH_LINES) => {
    const text = SMITH_LINES[lineKey];
    if (text) {
      await speak(text);
    }
  }, [speak]);
  
  // Stop speaking
  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);
  
  return {
    speak,
    speakIntro,
    speakLine,
    playActivationSound,
    stopSpeaking: handleStopSpeaking,
    isReady,
    isSpeaking,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (Backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

// Keep old AtlasVoice name but point to Smith
export const ATLAS_CONFIG = SMITH_CONFIG;
export const ATLAS_LINES = SMITH_LINES;
export const useAtlasVoice = useSmithVoice;

export default useSmithVoice;
