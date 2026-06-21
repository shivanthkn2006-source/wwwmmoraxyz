/**
 * useZoeVoice - Phase 2: The "Ears" 
 * 
 * Enhanced voice hook with:
 * - Wake word detection ("Zoe", "System")
 * - Continuous listening with mic button toggle
 * - Sound wave visual feedback state
 * - Proper error handling for browser permissions
 * 
 * This is the single source of truth for Zoe voice interactions.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  initializeZoeVoices, 
  speakAsZoe, 
  stopZoeSpeech, 
  isZoeSpeaking, 
  getZoeSpeechState 
} from '@/utils/zoeVoice';
import {
  requestMicPermission,
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  stopSpeechRecognition,
  getPlatformInfo,
} from '@/utils/micPermissionManager';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ZoeVoiceState {
  isReady: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  finalCommand: string;
  error: string | null;
  wakeWordDetected: boolean;
  audioLevel: number; // 0-1 for sound wave visualization
}

export interface ZoeVoiceOptions {
  wakeWords?: string[];
  autoListen?: boolean;
  silenceTimeoutMs?: number;
  onCommand?: (command: string) => void;
  onWakeWord?: () => void;
  onError?: (error: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_WAKE_WORDS = ['zoe', 'zoey', 'joey', 'hey zoe', 'ok zoe', 'system'];
const DEFAULT_SILENCE_TIMEOUT = 1500;

// ═══════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════

export const useZoeVoice = (options?: ZoeVoiceOptions) => {
  const {
    wakeWords = DEFAULT_WAKE_WORDS,
    autoListen = false,
    silenceTimeoutMs = DEFAULT_SILENCE_TIMEOUT,
    onCommand,
    onWakeWord,
    onError,
  } = options || {};

  const [state, setState] = useState<ZoeVoiceState>({
    isReady: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    finalCommand: '',
    error: null,
    wakeWordDetected: false,
    audioLevel: 0,
  });

  // Refs for non-reactive state
  const mountedRef = useRef(true);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastTranscriptRef = useRef('');
  const isListeningRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZE
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    initializeZoeVoices().then(() => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isReady: true }));
        console.log('[useZoeVoice] Voice system ready');
      }
    });

    // Listen for external speak events
    const handleSpeakStart = () => {
      if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: true }));
    };
    const handleSpeakEnd = () => {
      if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: false }));
    };

    window.addEventListener('zoe-speak', handleSpeakStart as EventListener);
    window.addEventListener('zoe-speak-end', handleSpeakEnd as EventListener);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('zoe-speak', handleSpeakStart as EventListener);
      window.removeEventListener('zoe-speak-end', handleSpeakEnd as EventListener);
      cleanup();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    analyserRef.current = null;
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // AUDIO LEVEL MONITORING (for sound wave visualization)
  // ─────────────────────────────────────────────────────────────────

  const startAudioLevelMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      audioLevelIntervalRef.current = setInterval(() => {
        if (!mountedRef.current || !analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const level = Math.min(average / 128, 1);
        
        setState(prev => ({ ...prev, audioLevel: level }));
      }, 50);

    } catch (err) {
      console.warn('[useZoeVoice] Audio level monitoring failed:', err);
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    analyserRef.current = null;
    setState(prev => ({ ...prev, audioLevel: 0 }));
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // CHECK FOR WAKE WORD
  // ─────────────────────────────────────────────────────────────────

  const checkWakeWord = useCallback((text: string): { hasWakeWord: boolean; command: string } => {
    const lower = text.toLowerCase().trim();
    
    for (const wake of wakeWords) {
      const wakeIndex = lower.indexOf(wake.toLowerCase());
      if (wakeIndex !== -1) {
        // Extract command after wake word
        const afterWake = lower.slice(wakeIndex + wake.length).trim();
        return { hasWakeWord: true, command: afterWake || text };
      }
    }
    
    return { hasWakeWord: false, command: text };
  }, [wakeWords]);

  // ─────────────────────────────────────────────────────────────────
  // START LISTENING
  // ─────────────────────────────────────────────────────────────────

  const startListening = useCallback(async (): Promise<boolean> => {
    if (isListeningRef.current || isZoeSpeaking()) {
      console.log('[useZoeVoice] Already listening or Zoe is speaking');
      return false;
    }

    if (!isSpeechRecognitionSupported()) {
      const error = 'Speech recognition not supported in this browser';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return false;
    }

    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      const error = 'Microphone access denied';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return false;
    }

    // Stop any existing recognition
    cleanup();

    const platform = getPlatformInfo();
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      keepAlive: !platform.isSafari,
    });

    if (!recognition) return false;

    recognition.onstart = () => {
      if (!mountedRef.current) return;
      console.log('[useZoeVoice] Started listening');
      isListeningRef.current = true;
      lastTranscriptRef.current = '';
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: '',
        wakeWordDetected: false,
      }));
      startAudioLevelMonitoring();
    };

    recognition.onresult = (event: any) => {
      if (!mountedRef.current) return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const transcript = (finalTranscript || interimTranscript).trim();
      if (!transcript) return;

      lastTranscriptRef.current = transcript;
      const { hasWakeWord, command } = checkWakeWord(transcript);

      setState(prev => ({
        ...prev,
        transcript,
        wakeWordDetected: hasWakeWord,
      }));

      // If wake word detected, notify
      if (hasWakeWord && !state.wakeWordDetected) {
        onWakeWord?.();
      }

      // Set silence timer to finalize command
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        if (!mountedRef.current || !lastTranscriptRef.current.trim()) return;

        const finalText = lastTranscriptRef.current.trim();
        const { hasWakeWord: wake, command: cmd } = checkWakeWord(finalText);

        // Only process if wake word detected or we're in "always listen" mode
        if (wake || autoListen) {
          setState(prev => ({
            ...prev,
            finalCommand: cmd,
            transcript: '',
            wakeWordDetected: false,
          }));
          onCommand?.(cmd);
        }

        lastTranscriptRef.current = '';
      }, silenceTimeoutMs);
    };

    recognition.onerror = (event: any) => {
      if (['no-speech', 'aborted'].includes(event.error)) return;
      
      console.error('[useZoeVoice] Recognition error:', event.error);
      const error = event.error === 'not-allowed' 
        ? 'Microphone access denied' 
        : `Voice error: ${event.error}`;
      
      setState(prev => ({ ...prev, error }));
      onError?.(error);
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      
      stopAudioLevelMonitoring();
      
      // Auto-restart if still active
      if (isListeningRef.current && !isZoeSpeaking()) {
        setTimeout(() => {
          if (mountedRef.current && isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // Will be restarted by keep-alive logic in micPermissionManager
            }
          }
        }, 100);
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (err) {
      console.error('[useZoeVoice] Start error:', err);
      return false;
    }
  }, [checkWakeWord, cleanup, onCommand, onError, onWakeWord, silenceTimeoutMs, startAudioLevelMonitoring, stopAudioLevelMonitoring, autoListen, state.wakeWordDetected]);

  // ─────────────────────────────────────────────────────────────────
  // STOP LISTENING
  // ─────────────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    console.log('[useZoeVoice] Stopping listening');
    isListeningRef.current = false;
    cleanup();
    stopAudioLevelMonitoring();
    setState(prev => ({
      ...prev,
      isListening: false,
      transcript: '',
      wakeWordDetected: false,
      audioLevel: 0,
    }));
  }, [cleanup, stopAudioLevelMonitoring]);

  // ─────────────────────────────────────────────────────────────────
  // TOGGLE
  // ─────────────────────────────────────────────────────────────────

  const toggleListening = useCallback(async () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      await startListening();
    }
  }, [startListening, stopListening]);

  // ─────────────────────────────────────────────────────────────────
  // SPEAK
  // ─────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string, options?: any): Promise<void> => {
    return new Promise((resolve) => {
      if (!mountedRef.current || !text.trim()) {
        resolve();
        return;
      }

      console.log('[useZoeVoice] Speaking:', text.substring(0, 50));
      setState(prev => ({ ...prev, isSpeaking: true }));

      speakAsZoe(
        text,
        options,
        () => {
          if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: true }));
        },
        () => {
          if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: false }));
          resolve();
        },
        () => {
          console.error('[useZoeVoice] Speak error');
          if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: false }));
          resolve();
        }
      );
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // STOP SPEAKING
  // ─────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    stopZoeSpeech();
    if (mountedRef.current) {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stop,
    getState: getZoeSpeechState,
    isSupported: isSpeechRecognitionSupported(),
  };
};

export default useZoeVoice;
