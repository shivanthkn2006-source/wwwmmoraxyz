import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';

interface WakeWordOptions {
  wakeWords: string[];
  onWakeWordDetected: () => void;
  enabled: boolean;
}

export const useWakeWord = ({ wakeWords, onWakeWordDetected, enabled }: WakeWordOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const hasStartedRef = useRef(false); // Prevent double-start
  
  // Store callbacks in refs to avoid re-running effects
  const wakeWordsRef = useRef(wakeWords);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  
  // Update refs when props change (no effect re-run)
  useEffect(() => {
    wakeWordsRef.current = wakeWords;
    onWakeWordDetectedRef.current = onWakeWordDetected;
  });

  const startWakeWordDetection = useCallback(() => {
    // Guard: prevent multiple starts
    if (hasStartedRef.current || recognitionRef.current) {
      console.log('[WakeWord] Already running, skipping start');
      return;
    }
    
    if (!isSpeechRecognitionSupported()) return;

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: false,
      lang: 'en-US'
    });
    
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('[WakeWord] Heard:', transcript);
      
      for (const wakeWord of wakeWordsRef.current) {
        if (transcript.includes(wakeWord.toLowerCase())) {
          console.log('[WakeWord] Detected:', wakeWord);
          onWakeWordDetectedRef.current();
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.error('[WakeWord] Error:', event.error);
      setIsListening(false);
      isListeningRef.current = false;
      hasStartedRef.current = false;
    };

    recognition.onend = () => {
      // Mark as stopped - micPermissionManager handles keepAlive restarts
      hasStartedRef.current = false;
      if (!isListeningRef.current) {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      hasStartedRef.current = true;
      setIsListening(true);
      isListeningRef.current = true;
      console.log('[WakeWord] Detection started');
    } catch (e) {
      console.error('[WakeWord] Failed to start:', e);
      hasStartedRef.current = false;
    }
  }, []); // No dependencies - uses refs

  const stopWakeWordDetection = useCallback(() => {
    if (!recognitionRef.current) return; // Skip if nothing to stop
    
    isListeningRef.current = false;
    hasStartedRef.current = false;
    setIsListening(false);
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    console.log('[WakeWord] Detection stopped');
  }, []); // No dependencies

  // CRITICAL: Only run when `enabled` changes, NOT when callbacks change
  // BUG FIX: Added stable callbacks to dependencies to satisfy ESLint exhaustive-deps
  useEffect(() => {
    if (enabled) {
      startWakeWordDetection();
    } else {
      stopWakeWordDetection();
    }

    return () => {
      stopWakeWordDetection();
    };
  }, [enabled, startWakeWordDetection, stopWakeWordDetection]); // Callbacks are stable via useCallback with no deps

  return {
    isListening,
    startWakeWordDetection,
    stopWakeWordDetection,
  };
};