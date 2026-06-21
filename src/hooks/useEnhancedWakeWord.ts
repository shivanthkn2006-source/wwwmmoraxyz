// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED WAKE WORD SYSTEM - FULLY AUTOMATED CONTINUOUS DETECTION
// Part of 360-Degree Conversational Foundation
// NOW: Detects "Zoe <command>" in a single phrase - NO BUTTON CLICKS
// Uses centralized speech recognition manager for cross-browser stability
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createSpeechRecognition,
  stopSpeechRecognition,
  isSpeechRecognitionSupported,
  requestMicPermission,
} from '@/utils/micPermissionManager';

// Default wake words (2-4 syllables as recommended)
const DEFAULT_WAKE_WORDS = [
  'hey zoe',
  'ok zoe',
  'okay zoe',
  'hi zoe',
  'hello zoe',
  'zoe talk',  // Opens Zoe orb chat panel for typing
  'zoe chat',  // Alternative for opening chat panel
  'zoe close', // Closes/minimizes the Zoe orb chat panel
  'close zoe', // Alternative for closing chat panel
  'zoe',
  'hey zo',
];

// Configuration for wake word detection
interface WakeWordConfig {
  wakeWords?: string[];
  sensitivity?: number; // 0-1, higher = more sensitive
  timeout?: number; // ms before resetting
  continuous?: boolean;
  onDeviceOnly?: boolean; // Prefer on-device processing
  enableVoiceFingerprinting?: boolean;
}

interface VoiceMetrics {
  pitch: 'low' | 'medium' | 'high';
  pace: 'slow' | 'normal' | 'fast';
  volume: number;
  confidence: number;
}

interface WakeWordResult {
  detected: boolean;
  wakeWord: string;
  confidence: number;
  timestamp: number;
  voiceMetrics?: VoiceMetrics;
  // NEW: Include the command spoken after the wake word
  command?: string;
  fullTranscript?: string;
}

export const useEnhancedWakeWord = ({
  wakeWords = DEFAULT_WAKE_WORDS,
  sensitivity = 0.7,
  timeout = 5000,
  continuous = true,
  onDeviceOnly = true,
  onWakeWordDetected,
  onVoiceMetrics,
  enabled = true,
}: WakeWordConfig & {
  onWakeWordDetected: (result: WakeWordResult) => void;
  onVoiceMetrics?: (metrics: VoiceMetrics) => void;
  enabled?: boolean;
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastDetection, setLastDetection] = useState<WakeWordResult | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);

  // Prevent permission/activation spam loops
  const awaitingUserActivationRef = useRef(false);
  const lastActivationRequestAtRef = useRef(0);

  const requestVoiceActivationUI = useCallback(() => {
    const now = Date.now();
    // Avoid firing this event repeatedly (can cause UI spam / repeated prompts)
    if (now - lastActivationRequestAtRef.current < 5000) return;
    lastActivationRequestAtRef.current = now;
    window.dispatchEvent(new CustomEvent('zoe-request-voice-activation'));
  }, []);

  // Check for browser support using centralized manager
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setIsSupported(false);
      console.warn('[WakeWord] Speech Recognition not supported');
    }
  }, []);

  // Analyze voice characteristics
  const analyzeVoiceMetrics = useCallback((): VoiceMetrics | undefined => {
    if (!analyserRef.current) return undefined;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const volume = Math.min(1, average / 128);

    // Estimate pitch from frequency distribution
    let lowFreq = 0, midFreq = 0, highFreq = 0;
    const third = Math.floor(bufferLength / 3);
    for (let i = 0; i < bufferLength; i++) {
      if (i < third) lowFreq += dataArray[i];
      else if (i < third * 2) midFreq += dataArray[i];
      else highFreq += dataArray[i];
    }

    let pitch: 'low' | 'medium' | 'high' = 'medium';
    if (lowFreq > midFreq && lowFreq > highFreq) pitch = 'low';
    else if (highFreq > lowFreq && highFreq > midFreq) pitch = 'high';

    return {
      pitch,
      pace: 'normal',
      volume,
      confidence: Math.min(1, volume * 1.5),
    };
  }, []);

  // Setup audio analysis
  const setupAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      return true;
    } catch (error: any) {
      console.error('[WakeWord] Audio setup error:', error);
      // If blocked, prompt the VoiceSystemActivator UI
      if (error?.name === 'NotAllowedError') {
        awaitingUserActivationRef.current = true;
        requestVoiceActivationUI();
      }
      return false;
    }
  }, [requestVoiceActivationUI]);

  // Extract wake word and command from transcript
  const extractWakeWordAndCommand = useCallback((transcript: string): {
    matched: boolean;
    word: string;
    command: string;
    confidence: number;
  } => {
    const normalizedTranscript = transcript.toLowerCase().trim();

    // Sort wake words by length (longest first) to match "hey zoe" before "zoe"
    const sortedWakeWords = [...wakeWords].sort((a, b) => b.length - a.length);

    for (const wakeWord of sortedWakeWords) {
      const normalizedWakeWord = wakeWord.toLowerCase().trim();

      // Check if transcript starts with wake word
      if (normalizedTranscript.startsWith(normalizedWakeWord)) {
        const command = normalizedTranscript.slice(normalizedWakeWord.length).trim();
        return { matched: true, word: wakeWord, command, confidence: 1.0 };
      }

      // Check for wake word anywhere in beginning of transcript
      const patterns = [
        new RegExp(`^${normalizedWakeWord}\\s+(.*)`, 'i'),
        new RegExp(`^${normalizedWakeWord}[,.]?\\s*(.*)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = normalizedTranscript.match(pattern);
        if (match) {
          return { matched: true, word: wakeWord, command: match[1] || '', confidence: 0.95 };
        }
      }
    }

    return { matched: false, word: '', command: '', confidence: 0 };
  }, [wakeWords]);

  // Track initialization to avoid spam logging
  const hasLoggedStartRef = useRef(false);

  // Start wake word detection - FULLY AUTOMATED using centralized manager
  const startListening = useCallback(async () => {
    if (!enabled || !isSupported || isActiveRef.current) return;

    // If the browser blocked mic access, don't hammer requests; wait for user activation.
    if (awaitingUserActivationRef.current) return;

    if (!isSpeechRecognitionSupported()) return;

    // Ensure real mic permission exists (do NOT assume)
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      awaitingUserActivationRef.current = true;
      setPermissionGranted(false);
      setIsListening(false);
      isActiveRef.current = false;
      requestVoiceActivationUI();
      return;
    }

    setPermissionGranted(true);

    // Setup audio analysis for voice metrics (non-blocking for wake word)
    if (!audioContextRef.current) {
      setupAudioAnalysis().catch(() => {});
    }

    // Use centralized manager with keep-alive for continuous detection
    // NOTE: Safari often fails to emit reliable interim results; for wake words we prefer final-only.
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: false,
      keepAlive: true, // Enable auto-restart to prevent 5-second timeout
      lang: 'en-US',
    });

    if (!recognition) return;

    const originalOnStart = recognition.onstart;
    recognition.onstart = (event: any) => {
      isActiveRef.current = true;
      setIsListening(true);
      // Only log once to avoid spam
      if (!hasLoggedStartRef.current) {
        console.log('[Zoe] Fully automated voice ready - say "Zoe" followed by your command');
        hasLoggedStartRef.current = true;
      }
      if (originalOnStart) originalOnStart.call(recognition, event);
    };

    const originalOnResult = recognition.onresult;
    recognition.onresult = (event: any) => {
      // Keep centralized manager activity tracking (prevents watchdog restarts)
      try {
        if (originalOnResult) originalOnResult.call(recognition, event);
      } catch {
        // Ignore wrapper errors
      }

      // Process results as they arrive.
      // For interim results, only trigger if a command is already present (reduces false triggers).
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const isFinal = !!event.results[i].isFinal;

        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript;
          const speechConfidence = event.results[i][j].confidence || 0.8;

          const match = extractWakeWordAndCommand(transcript);

          // If it's not final yet, only trigger when the user already spoke a command.
          if (!isFinal && !match.command) continue;

          if (match.matched && match.confidence >= sensitivity) {
            // Debounce: prevent duplicate detections within 3 seconds
            const now = Date.now();
            if (now - lastDetectionTimeRef.current < 3000) {
              continue;
            }
            lastDetectionTimeRef.current = now;

            console.log('[WakeWord] Detected:', match.word, '| Command:', match.command || '(none)');

            const voiceMetrics = analyzeVoiceMetrics();

            const result: WakeWordResult = {
              detected: true,
              wakeWord: match.word,
              confidence: match.confidence * speechConfidence,
              timestamp: now,
              voiceMetrics,
              command: match.command,
              fullTranscript: transcript,
            };

            setLastDetection(result);
            onWakeWordDetected(result);

            if (voiceMetrics && onVoiceMetrics) {
              onVoiceMetrics(voiceMetrics);
            }

            return;
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;

      if (event.error === 'not-allowed') {
        console.warn('[WakeWord] Microphone not allowed - requesting voice activation');
        awaitingUserActivationRef.current = true;
        setPermissionGranted(false);
        setIsListening(false);
        isActiveRef.current = false;

        // Stop to prevent auto-restart loops
        stopSpeechRecognition(recognition);
        recognitionRef.current = null;

        // Prompt the user to enable the voice system (user gesture required)
        requestVoiceActivationUI();
        return;
      }

      if (event.error === 'network') {
        console.warn('[WakeWord] Network error, will retry');
      } else {
        console.error('[WakeWord] Error:', event.error);
        setIsListening(false);
      }
    };

    // Keep-alive manager handles auto-restart, just update state on end
    const originalOnEnd = recognition.onend;
    recognition.onend = (event: any) => {
      if (!continuous || !enabled) {
        isActiveRef.current = false;
        setIsListening(false);
      }
      // originalOnEnd handles auto-restart via centralized manager
      if (originalOnEnd) originalOnEnd.call(recognition, event);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error: any) {
      console.error('[WakeWord] Start failed:', error);
      setIsListening(false);
      isActiveRef.current = false;

      if (error?.name === 'NotAllowedError') {
        awaitingUserActivationRef.current = true;
        setPermissionGranted(false);
        requestVoiceActivationUI();
      }
    }
  }, [
    enabled,
    isSupported,
    continuous,
    sensitivity,
    extractWakeWordAndCommand,
    analyzeVoiceMetrics,
    setupAudioAnalysis,
    onWakeWordDetected,
    onVoiceMetrics,
  ]);

  // If the user activates voice, try starting again.
  useEffect(() => {
    const handleActivated = () => {
      awaitingUserActivationRef.current = false;
      if (enabled && !isActiveRef.current) {
        startListening();
      }
    };

    window.addEventListener('zoe-voice-system-activated', handleActivated);
    return () => window.removeEventListener('zoe-voice-system-activated', handleActivated);
  }, [enabled, startListening]);


  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
    }
    
    isActiveRef.current = false;
    setIsListening(false);
    console.log('[WakeWord] Detection stopped');
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      return true;
    } catch (error) {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // Effect to manage lifecycle - STABLE version without callback dependencies
  // Uses refs to avoid infinite loops from callback changes
  const enabledRef = useRef(enabled);
  const isSupportedRef = useRef(isSupported);
  
  // Keep refs in sync
  useEffect(() => {
    enabledRef.current = enabled;
    isSupportedRef.current = isSupported;
  }, [enabled, isSupported]);
  
  // Primary lifecycle effect - runs only on mount/unmount
  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout | null = null;
    
    const initializeListening = async () => {
      if (!mounted) return;
      
      // Check current values from refs
      if (enabledRef.current && isSupportedRef.current) {
        // Delay to ensure browser audio context is ready
        await new Promise(resolve => setTimeout(resolve, 200));
        if (mounted && enabledRef.current) {
          try {
            await startListening();
          } catch (err) {
            console.warn('[WakeWord] Init failed, will retry:', err);
            // Retry once after delay
            initTimeout = setTimeout(() => {
              if (mounted && enabledRef.current) {
                startListening().catch(() => {});
              }
            }, 1000);
          }
        }
      }
    };
    
    initializeListening();

    return () => {
      mounted = false;
      if (initTimeout) clearTimeout(initTimeout);
      stopListening();
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - runs only on mount/unmount
  
  // Separate effect to handle enabled changes after mount
  useEffect(() => {
    if (!isSupported) return;
    
    if (enabled && !isActiveRef.current) {
      startListening();
    } else if (!enabled && isActiveRef.current) {
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSupported]);

  return {
    isListening,
    isSupported,
    permissionGranted,
    lastDetection,
    startListening,
    stopListening,
    requestPermission,
    wakeWords,
  };
};

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default useEnhancedWakeWord;
