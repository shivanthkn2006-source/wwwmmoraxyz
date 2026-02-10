/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VAD GATED VOICE - The Cost Firewall Integration Hook
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROMPT 1 IMPLEMENTATION: "The Cost Firewall (VAD)"
 * 
 * LOGIC:
 * - Listen: Monitor microphone locally (FREE via Web Audio API)
 * - Filter: If speech_probability < 0.9, BLOCK data from reaching Deepgram
 * - Pass: Only send audio frames when user is definitely speaking
 * - Goal: Reduce Deepgram costs by 95%
 * 
 * This hook wraps the VADCostFirewall and provides React-friendly state
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getVADFirewall, type VADState, type VADCallbacks } from '@/core/audio/VADCostFirewall';

interface UseVADGatedVoiceOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onGateOpen?: () => void;
  onGateClose?: () => void;
  onAudioLevel?: (level: number) => void;
  autoStart?: boolean;
}

interface UseVADGatedVoiceReturn {
  // State
  isActive: boolean;
  isGateOpen: boolean;
  isSpeechDetected: boolean;
  speechProbability: number;
  audioLevel: number;
  
  // Controls
  start: () => Promise<boolean>;
  stop: () => void;
  
  // Guard functions for protecting paid API calls
  guardedCall: <T>(callback: () => T, fallback: T) => T;
  guardedCallAsync: <T>(callback: () => Promise<T>, fallback: T) => Promise<T>;
}

export function useVADGatedVoice(options: UseVADGatedVoiceOptions = {}): UseVADGatedVoiceReturn {
  const {
    onSpeechStart,
    onSpeechEnd,
    onGateOpen,
    onGateClose,
    onAudioLevel,
    autoStart = false,
  } = options;

  const [state, setState] = useState<VADState>({
    isSpeechDetected: false,
    speechProbability: 0,
    audioLevel: 0,
    gateOpen: false,
    lastSpeechTimestamp: 0,
  });
  const [isActive, setIsActive] = useState(false);
  const vadRef = useRef(getVADFirewall());

  // Set up callbacks
  const callbacksRef = useRef<VADCallbacks>({});
  
  useEffect(() => {
    callbacksRef.current = {
      onSpeechStart: () => {
        setState(vadRef.current.getState());
        onSpeechStart?.();
      },
      onSpeechEnd: () => {
        setState(vadRef.current.getState());
        onSpeechEnd?.();
      },
      onGateOpen: () => {
        setState(vadRef.current.getState());
        onGateOpen?.();
        console.log('[VADGatedVoice] 🔓 GATE OPEN - Deepgram can receive audio');
      },
      onGateClose: () => {
        setState(vadRef.current.getState());
        onGateClose?.();
        console.log('[VADGatedVoice] 🔒 GATE CLOSED - Blocking Deepgram');
      },
      onAudioLevel: (level) => {
        setState(prev => ({ ...prev, audioLevel: level }));
        onAudioLevel?.(level);
      },
    };
  }, [onSpeechStart, onSpeechEnd, onGateOpen, onGateClose, onAudioLevel]);

  // Start VAD
  const start = useCallback(async (): Promise<boolean> => {
    if (isActive) return true;
    
    const success = await vadRef.current.start(callbacksRef.current);
    setIsActive(success);
    
    if (success) {
      console.log('[VADGatedVoice] 🛡️ Cost Firewall ACTIVE');
    }
    
    return success;
  }, [isActive]);

  // Stop VAD
  const stop = useCallback(() => {
    vadRef.current.stop();
    setIsActive(false);
    setState({
      isSpeechDetected: false,
      speechProbability: 0,
      audioLevel: 0,
      gateOpen: false,
      lastSpeechTimestamp: 0,
    });
    console.log('[VADGatedVoice] 🛑 Cost Firewall stopped');
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      start();
    }
    
    return () => {
      // Don't stop on unmount if auto-started - let it run globally
    };
  }, [autoStart, start]);

  // Guard function - Only execute if gate is open (speech detected)
  const guardedCall = useCallback(<T,>(callback: () => T, fallback: T): T => {
    if (vadRef.current.isGateOpen()) {
      return callback();
    }
    return fallback;
  }, []);

  // Async guard function
  const guardedCallAsync = useCallback(async <T,>(
    callback: () => Promise<T>, 
    fallback: T
  ): Promise<T> => {
    if (vadRef.current.isGateOpen()) {
      return callback();
    }
    return fallback;
  }, []);

  return {
    // State
    isActive,
    isGateOpen: state.gateOpen,
    isSpeechDetected: state.isSpeechDetected,
    speechProbability: state.speechProbability,
    audioLevel: state.audioLevel,
    
    // Controls
    start,
    stop,
    
    // Guard functions
    guardedCall,
    guardedCallAsync,
  };
}

export default useVADGatedVoice;
