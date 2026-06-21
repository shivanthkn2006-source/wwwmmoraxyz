// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VOICE INPUT HOOK - Robust Speech-to-Text with Hands-Free Mode
// Features:
// - Reliable voice input that doesn't conflict with wake word detection
// - Hands-free mode with automatic silence detection (5 seconds)
// - Voice commands: "enter", "send", "submit" to process message immediately
// - Centralized mic permission handling via micPermissionManager
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  requestMicPermission, 
  createSpeechRecognition, 
  isSpeechRecognitionSupported,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';

// Voice commands that trigger immediate message submission
const SUBMIT_COMMANDS = ['enter', 'send', 'submit', 'send it', 'enter it', 'submit it', 'go', 'okay send', 'ok send'];

interface VoiceInputOptions {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onSilenceDetected?: () => void;
  onVoiceCommand?: (command: string, messageText: string) => void;
  silenceTimeout?: number;
  handsFreeMode?: boolean;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  silenceCountdown: number | null;
}

export const useZoeVoiceInput = (options: VoiceInputOptions) => {
  const {
    onTranscript,
    onSilenceDetected,
    onVoiceCommand,
    silenceTimeout = 5000,
    handsFreeMode = true,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    error: null,
    silenceCountdown: null,
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const transcriptRef = useRef<string>('');
  const isActiveRef = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef<string>('');

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, silenceCountdown: null }));
  }, []);

  // Reset silence timer when speech is detected
  const resetSilenceTimer = useCallback(() => {
    clearTimers();
    lastSpeechTimeRef.current = Date.now();

    if (handsFreeMode && transcriptRef.current.trim()) {
      // Start countdown display
      let countdown = Math.ceil(silenceTimeout / 1000);
      setState(prev => ({ ...prev, silenceCountdown: countdown }));

      countdownIntervalRef.current = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          setState(prev => ({ ...prev, silenceCountdown: countdown }));
        } else {
          clearTimers();
        }
      }, 1000);

      // Trigger silence callback after timeout
      silenceTimerRef.current = setTimeout(() => {
        clearTimers();
        if (transcriptRef.current.trim() && isActiveRef.current) {
          console.log('[VoiceInput] Silence detected, processing transcript');
          onSilenceDetected?.();
        }
      }, silenceTimeout);
    }
  }, [handsFreeMode, silenceTimeout, onSilenceDetected, clearTimers]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('[VoiceInput] Stopping...');
    clearTimers();
    isActiveRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isListening: false,
      silenceCountdown: null,
    }));

    return transcriptRef.current;
  }, [clearTimers]);

  // Start listening
  const startListening = useCallback(async () => {
    // Already active - stop and restart
    if (isActiveRef.current) {
      console.log('[VoiceInput] Already active, stopping first');
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
      isActiveRef.current = false;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check browser support
    if (!isSpeechRecognitionSupported()) {
      toast.error('Speech recognition not supported in this browser');
      setState(prev => ({ ...prev, error: 'not-supported' }));
      return;
    }

    // Request microphone permission using centralized manager
    console.log('[VoiceInput] Requesting mic permission...');
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      toast.error('Microphone access required. Please allow in browser settings.');
      setState(prev => ({ ...prev, error: 'permission-denied' }));
      return;
    }
    console.log('[VoiceInput] Mic permission granted');

    // Dispatch event to pause wake word detection BEFORE starting our recognition
    console.log('[VoiceInput] Pausing wake word detection');
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));
    
    // Small delay to ensure wake word recognizer has stopped
    await new Promise(resolve => setTimeout(resolve, 150));

    // Create recognition instance using centralized manager
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US'
    });
    
    if (!recognition) {
      toast.error('Could not initialize voice input');
      setState(prev => ({ ...prev, error: 'init-failed' }));
      return;
    }

    recognition.onstart = () => {
      console.log('[VoiceInput] Recognition started successfully');
      isActiveRef.current = true;
      transcriptRef.current = '';
      setState({
        isListening: true,
        transcript: '',
        error: null,
        silenceCountdown: null,
      });

      if (handsFreeMode) {
        toast.success('🎤 Listening... Speak now, I\'ll respond after 5 seconds of silence', { duration: 3000 });
      } else {
        toast.success('🎤 Listening... Tap mic when done', { duration: 3000 });
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      
      if (fullTranscript) {
        // Check for voice commands at the end of the transcript
        const lowerTranscript = fullTranscript.toLowerCase().trim();
        
        // Check if user said a submit command
        for (const cmd of SUBMIT_COMMANDS) {
          if (lowerTranscript.endsWith(cmd)) {
            // Extract the message without the command
            const messageText = fullTranscript.slice(0, -cmd.length).trim();
            
            if (messageText) {
              console.log('[VoiceInput] Submit command detected:', cmd, 'Message:', messageText);
              
              // Stop listening immediately
              try {
                recognition.stop();
              } catch (e) {}
              
              // Clear timers
              clearTimers();
              isActiveRef.current = false;
              
              // Trigger command callback
              if (onVoiceCommand) {
                onVoiceCommand(cmd, messageText);
              } else {
                // Fallback: trigger silence detected with cleaned message
                transcriptRef.current = messageText;
                onSilenceDetected?.();
              }
              
              toast.success(`📨 Sending: "${messageText.slice(0, 30)}${messageText.length > 30 ? '...' : ''}"`, { duration: 2000 });
              return;
            }
          }
        }
        
        // Store the transcript (without submit commands)
        transcriptRef.current = fullTranscript;
        messageBufferRef.current = fullTranscript;
        setState(prev => ({ ...prev, transcript: fullTranscript }));
        onTranscript(fullTranscript, !!finalTranscript);
        
        // Reset silence timer on any speech
        if (handsFreeMode) {
          resetSilenceTimer();
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Handle different error types silently for expected errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // These are expected - no-speech is normal pause, aborted is intentional stop
        return;
      }

      console.error('[VoiceInput] Error:', event.error);

      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow in browser settings.');
        setState(prev => ({ ...prev, error: 'permission-denied' }));
      } else if (event.error === 'network') {
        toast.error('Network error. Please check your connection.');
        setState(prev => ({ ...prev, error: 'network' }));
      } else {
        // Only show toast for unexpected errors
        console.warn('[VoiceInput] Unexpected error:', event.error);
      }
    };

    recognition.onend = () => {
      console.log('[VoiceInput] Recognition ended');
      const wasActive = isActiveRef.current;
      isActiveRef.current = false;
      clearTimers();

      setState(prev => ({
        ...prev,
        isListening: false,
        silenceCountdown: null,
      }));

      // Dispatch event to resume wake word detection
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));

      // If we have a transcript and were actively listening, trigger callback
      if (wasActive && transcriptRef.current.trim()) {
        onSilenceDetected?.();
      }
    };

    try {
      console.log('[VoiceInput] Starting speech recognition...');
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('[VoiceInput] Failed to start:', err);
      // Common error: recognition already started
      if (err.message?.includes('already started')) {
        console.log('[VoiceInput] Already started, treating as success');
        return;
      }
      toast.error('Could not start voice input. Please try again.');
      isActiveRef.current = false;
      setState(prev => ({ ...prev, error: err.message, isListening: false }));
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    }
  }, [handsFreeMode, onTranscript, onSilenceDetected, resetSilenceTimer, clearTimers]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      const transcript = stopListening();
      return transcript;
    } else {
      startListening();
      return '';
    }
  }, [state.isListening, startListening, stopListening]);

  // Get current transcript
  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setState(prev => ({ ...prev, transcript: '' }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [clearTimers]);

  return {
    isListening: state.isListening,
    transcript: state.transcript,
    error: state.error,
    silenceCountdown: state.silenceCountdown,
    startListening,
    stopListening,
    toggleListening,
    getTranscript,
    clearTranscript,
  };
};

export default useZoeVoiceInput;
