import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';

interface WakeWordOptions {
  wakeWords: string[];
  onWakeWordDetected: (match: { wakeWord: string; transcript: string }) => void;
  onError?: (error: string) => void;
  enabled: boolean;
}

const normalizeWakeTranscript = (value: string) => value
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const transcriptIncludesWakePhrase = (transcript: string, phrase: string) => {
  const normalizedTranscript = normalizeWakeTranscript(transcript);
  const normalizedPhrase = normalizeWakeTranscript(phrase);
  if (!normalizedTranscript || !normalizedPhrase) return false;
  return new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?:\\s|$)`).test(normalizedTranscript);
};

export const useWakeWord = ({ wakeWords, onWakeWordDetected, onError, enabled }: WakeWordOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const hasStartedRef = useRef(false); // Prevent double-start
  
  // Store callbacks in refs to avoid re-running effects
  const wakeWordsRef = useRef(wakeWords);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const onErrorRef = useRef(onError);
  
  // Update refs when props change (no effect re-run)
  useEffect(() => {
    wakeWordsRef.current = wakeWords;
    onWakeWordDetectedRef.current = onWakeWordDetected;
    onErrorRef.current = onError;
  });

  const startWakeWordDetection = useCallback(() => {
    // Guard: prevent multiple starts
    if (hasStartedRef.current || recognitionRef.current) {
      console.log('[WakeWord] Already running, skipping start');
      return;
    }
    
    if (!isSpeechRecognitionSupported()) {
      onErrorRef.current?.('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: false,
      lang: 'en-US'
    });
    
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('[WakeWord] Heard:', transcript);

      const sortedWakeWords = wakeWordsRef.current
        .slice()
        .sort((a, b) => normalizeWakeTranscript(b).length - normalizeWakeTranscript(a).length);

      for (const wakeWord of sortedWakeWords) {
        if (transcriptIncludesWakePhrase(transcript, wakeWord)) {
          console.log('[WakeWord] Detected:', wakeWord);
          onWakeWordDetectedRef.current({ wakeWord, transcript });
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.error('[WakeWord] Error:', event.error);
      onErrorRef.current?.(String(event.error || 'unknown'));
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
      onErrorRef.current?.(e instanceof Error ? e.message : 'Failed to start wake word detection');
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