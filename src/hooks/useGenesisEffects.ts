// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GENESIS - Unified Effects Controller
// Part 7: The Launch (Final Polish)
// Combines Haptic + Sound for coordinated feedback
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';
import { useHapticFeedback } from './useHapticFeedback';
import { useSoundDesign } from './useSoundDesign';

interface GenesisEffectsOptions {
  hapticsEnabled?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
}

/**
 * Genesis Effects Hook
 * Unified controller for all sensory feedback
 * Coordinates haptics + sounds for immersive UX
 */
export function useGenesisEffects(options: GenesisEffectsOptions = {}) {
  const { 
    hapticsEnabled = true, 
    soundEnabled = true,
    soundVolume = 0.25,
  } = options;

  const haptics = useHapticFeedback({ enabled: hapticsEnabled });
  const sounds = useSoundDesign({ enabled: soundEnabled, volume: soundVolume });
  
  // Store references to avoid stale closures
  const hapticsRef = useRef(haptics);
  const soundsRef = useRef(sounds);
  
  // Update refs when haptics/sounds change
  hapticsRef.current = haptics;
  soundsRef.current = sounds;
  
  // Typing effect controller
  const typingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE TYPING EFFECT
  // Simulates Zoe "typing" with haptics and soft sounds
  // ═══════════════════════════════════════════════════════════════════════════
  const startZoeTyping = useCallback(() => {
    if (isTypingRef.current) return;
    isTypingRef.current = true;

    // Random interval between 50-150ms for organic feel
    const tick = () => {
      if (!isTypingRef.current) return;
      
      hapticsRef.current.zoeTyping();
      soundsRef.current.playZoeTyping();
      
      const nextDelay = 50 + Math.random() * 100;
      typingIntervalRef.current = setTimeout(tick, nextDelay);
    };

    tick();
  }, []);

  const stopZoeTyping = useCallback(() => {
    isTypingRef.current = false;
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COORDINATED EFFECTS (use refs to avoid stale closures)
  // ═══════════════════════════════════════════════════════════════════════════
  const onMessageSent = useCallback(() => {
    hapticsRef.current.tap();
    soundsRef.current.playMessageOut();
  }, []);

  const onMessageReceived = useCallback(() => {
    hapticsRef.current.zoeResponse();
    soundsRef.current.playMessageIn();
  }, []);

  const onSystemAlert = useCallback(() => {
    hapticsRef.current.notification();
    soundsRef.current.playChirp();
  }, []);

  const onSuccess = useCallback(() => {
    hapticsRef.current.success();
    soundsRef.current.playSuccess();
  }, []);

  const onError = useCallback(() => {
    hapticsRef.current.error();
    soundsRef.current.playError();
  }, []);

  const onUnlock = useCallback(() => {
    hapticsRef.current.zoeSingularity();
    soundsRef.current.playUnlock();
  }, []);

  const onSingularityAwaken = useCallback(() => {
    hapticsRef.current.zoeSingularity();
    soundsRef.current.playSingularity();
  }, []);

  const onVoiceActivated = useCallback(() => {
    hapticsRef.current.notification();
    soundsRef.current.playChirpHigh();
  }, []);

  const onPhantomModeToggle = useCallback((enabled: boolean) => {
    hapticsRef.current.impact(enabled ? 'light' : 'medium');
    soundsRef.current.playChirpLow();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  const initEffects = useCallback(() => {
    soundsRef.current.initAudio();
  }, []);

  return {
    // Core
    haptics,
    sounds,
    initEffects,
    
    // Zoe typing simulation
    startZoeTyping,
    stopZoeTyping,
    
    // Coordinated effects
    onMessageSent,
    onMessageReceived,
    onSystemAlert,
    onSuccess,
    onError,
    onUnlock,
    onSingularityAwaken,
    onVoiceActivated,
    onPhantomModeToggle,
  };
}
