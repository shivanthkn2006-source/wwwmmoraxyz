/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VAD GATED VOICE - Voice Activity Detection Integration Hook
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Monitors microphone locally (FREE via Web Audio API).
 * Gates audio: only passes through when speech is detected.
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
  isActive: boolean;
  isGateOpen: boolean;
  isSpeechDetected: boolean;
  speechProbability: number;
  audioLevel: number;
  start: () => Promise<boolean>;
  stop: () => void;
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

  const callbacksRef = useRef<VADCallbacks>({});
  
  useEffect(() => {
    callbacksRef.current = {
      onSpeechStart: () => { setState(vadRef.current.getState()); onSpeechStart?.(); },
      onSpeechEnd: () => { setState(vadRef.current.getState()); onSpeechEnd?.(); },
      onGateOpen: () => {
        setState(vadRef.current.getState());
        onGateOpen?.();
        console.log('[VADGatedVoice] 🔓 GATE OPEN - Speech detected');
      },
      onGateClose: () => {
        setState(vadRef.current.getState());
        onGateClose?.();
        console.log('[VADGatedVoice] 🔒 GATE CLOSED - Silence detected');
      },
      onAudioLevel: (level) => { setState(prev => ({ ...prev, audioLevel: level })); onAudioLevel?.(level); },
    };
  }, [onSpeechStart, onSpeechEnd, onGateOpen, onGateClose, onAudioLevel]);

  const start = useCallback(async (): Promise<boolean> => {
    if (isActive) return true;
    const success = await vadRef.current.start(callbacksRef.current);
    setIsActive(success);
    if (success) console.log('[VADGatedVoice] 🛡️ Cost Firewall ACTIVE');
    return success;
  }, [isActive]);

  const stop = useCallback(() => {
    vadRef.current.stop();
    setIsActive(false);
    setState({ isSpeechDetected: false, speechProbability: 0, audioLevel: 0, gateOpen: false, lastSpeechTimestamp: 0 });
  }, []);

  useEffect(() => {
    if (autoStart) start();
  }, [autoStart, start]);

  const guardedCall = useCallback(<T,>(callback: () => T, fallback: T): T => {
    return vadRef.current.isGateOpen() ? callback() : fallback;
  }, []);

  const guardedCallAsync = useCallback(async <T,>(callback: () => Promise<T>, fallback: T): Promise<T> => {
    return vadRef.current.isGateOpen() ? callback() : fallback;
  }, []);

  return {
    isActive,
    isGateOpen: state.gateOpen,
    isSpeechDetected: state.isSpeechDetected,
    speechProbability: state.speechProbability,
    audioLevel: state.audioLevel,
    start,
    stop,
    guardedCall,
    guardedCallAsync,
  };
}

export default useVADGatedVoice;
