import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition,
  checkMicPermission,
  claimSpeechRecognition,
  releaseSpeechRecognition,
  getActiveSpeechRecognitionOwner,
} from '@/utils/micPermissionManager';
import { zoeDebugSetState, zoeDebugSpeechError, zoeDebugSpeechStart, zoeDebugSpeechStop } from '@/features/zoe-handsfree/debugBus';

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
  const enabledRef = useRef(enabled);
  const lastBlockedReasonRef = useRef<string | null>(null);
  
  // Store callbacks in refs to avoid re-running effects
  const wakeWordsRef = useRef(wakeWords);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const onErrorRef = useRef(onError);
  
  // Update refs when props change (no effect re-run)
  useEffect(() => {
    wakeWordsRef.current = wakeWords;
    onWakeWordDetectedRef.current = onWakeWordDetected;
    onErrorRef.current = onError;
    enabledRef.current = enabled;
  });

  const startWakeWordDetection = useCallback(async () => {
    // Guard: prevent multiple starts
    if (hasStartedRef.current || recognitionRef.current) {
      console.log('[WakeWord] Already running, skipping start');
      return;
    }
    
    if (!isSpeechRecognitionSupported()) {
      zoeDebugSetState({ hfState: 'error', lastError: 'SpeechRecognition unsupported' });
      onErrorRef.current?.('Speech recognition is not supported in this browser');
      return;
    }

    const activeOwner = getActiveSpeechRecognitionOwner();
    if (activeOwner && activeOwner !== 'wake-word') {
      zoeDebugSpeechStop('wake-word', `blocked by active owner: ${activeOwner}`);
      setIsListening(false);
      isListeningRef.current = false;
      hasStartedRef.current = false;
      return;
    }

    const permissionState = await checkMicPermission();
    if (permissionState !== 'granted') {
      const reason = permissionState === 'denied'
        ? 'microphone permission denied — enable mic access, then tap the mic once'
        : 'microphone permission needed — tap the mic once to enable wake words';
      if (lastBlockedReasonRef.current !== reason) {
        onErrorRef.current?.(reason);
        lastBlockedReasonRef.current = reason;
      }
      zoeDebugSetState({ hfState: 'error', micPermission: permissionState, lastStopReason: reason });
      setIsListening(false);
      isListeningRef.current = false;
      hasStartedRef.current = false;
      return;
    }

    lastBlockedReasonRef.current = null;

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
          zoeDebugSetState({ hfState: 'wake-detected' });
          zoeDebugSpeechStop('wake-word', `wake phrase detected: ${wakeWord}`);
          isListeningRef.current = false;
          hasStartedRef.current = false;
          setIsListening(false);
          recognitionRef.current = null;
          stopSpeechRecognition(recognition);
          onWakeWordDetectedRef.current({ wakeWord, transcript });
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') {
        zoeDebugSpeechError('wake-word', 'aborted', 'handoff or explicit stop');
        setIsListening(false);
        isListeningRef.current = false;
        hasStartedRef.current = false;
        recognitionRef.current = null;
        releaseSpeechRecognition('wake-word', recognition);
        return;
      }
      if (event.error === 'no-speech') {
        zoeDebugSpeechError('wake-word', 'no-speech', 'silent wake segment ended');
        return;
      }
      console.error('[WakeWord] Error:', event.error);
      zoeDebugSpeechError('wake-word', String(event.error || 'unknown'), 'wake-word recognizer error');
      onErrorRef.current?.(String(event.error || 'unknown'));
      setIsListening(false);
      isListeningRef.current = false;
      hasStartedRef.current = false;
      recognitionRef.current = null;
      releaseSpeechRecognition('wake-word', recognition);
    };

    recognition.onend = () => {
      // Mark as stopped - micPermissionManager handles keepAlive restarts
      hasStartedRef.current = false;
      recognitionRef.current = null;
      zoeDebugSpeechStop('wake-word', enabledRef.current ? 'native onend · waiting for next wake segment' : 'native onend · disabled');
      releaseSpeechRecognition('wake-word', recognition);
      if (!isListeningRef.current) {
        setIsListening(false);
      }
    };

    try {
      claimSpeechRecognition('wake-word', recognition);
      zoeDebugSetState({ hfState: 'awaiting-wake', micPermission: 'granted' });
      zoeDebugSpeechStart('wake-word', 'wake-word detection requested');
      recognition.start();
      recognitionRef.current = recognition;
      hasStartedRef.current = true;
      setIsListening(true);
      isListeningRef.current = true;
      console.log('[WakeWord] Detection started');
    } catch (e) {
      console.error('[WakeWord] Failed to start:', e);
      zoeDebugSpeechError('wake-word', e instanceof Error ? e.message : 'Failed to start wake word detection', 'recognition.start threw');
      onErrorRef.current?.(e instanceof Error ? e.message : 'Failed to start wake word detection');
      hasStartedRef.current = false;
      recognitionRef.current = null;
      releaseSpeechRecognition('wake-word', recognition);
    }
  }, []); // No dependencies - uses refs

  const stopWakeWordDetection = useCallback(() => {
    if (!recognitionRef.current) return; // Skip if nothing to stop
    
    isListeningRef.current = false;
    hasStartedRef.current = false;
    setIsListening(false);
    zoeDebugSpeechStop('wake-word', 'stopWakeWordDetection called');
    stopSpeechRecognition(recognitionRef.current);
    releaseSpeechRecognition('wake-word', recognitionRef.current);
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

  useEffect(() => {
    const handlePermissionChanged = (event: Event) => {
      const state = (event as CustomEvent<{ state?: string }>).detail?.state;
      if (state === 'granted' && enabledRef.current) {
        startWakeWordDetection();
      }
    };

    window.addEventListener('zoe-mic-permission-changed', handlePermissionChanged);
    return () => window.removeEventListener('zoe-mic-permission-changed', handlePermissionChanged);
  }, [startWakeWordDetection]);

  return {
    isListening,
    startWakeWordDetection,
    stopWakeWordDetection,
  };
};