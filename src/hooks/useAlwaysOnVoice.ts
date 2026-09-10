// ═══════════════════════════════════════════════════════════════════════════════
// ALWAYS-ON VOICE - True hands-free conversation with Zoe
// No mic buttons, no clicks - just speak and Zoe listens/responds naturally
// Like real human conversation - one-to-one, no strings attached
// Uses centralized mic permission manager for reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';

import { askZoe } from '@/services/zoeEngine';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, pauseZoeSpeech, resumeZoeSpeech, initializeZoeVoices, isZoeSpeaking } from '@/utils/zoeVoice';
import { 
  requestMicPermission, 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';
import { zoeDebugLog, zoeDebugSetState } from '@/features/zoe-handsfree/debugBus';
import { resolveVoiceIntent } from '@/features/zoe-handsfree/voiceIntentRouter';
import { recordVoiceTurn } from '@/services/zoeVoiceHistory';

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
}

export const useAlwaysOnVoice = () => {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    error: null,
  });
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(true);
  const processingRef = useRef(false);
  const lastTranscriptRef = useRef('');
  const restartCountRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const processingStartedRef = useRef(0);

  // Initialize voices on mount
  useEffect(() => {
    initializeZoeVoices();
  }, []);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Clear keep-alive interval
  const clearKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Start aggressive keep-alive interval to prevent browser from killing recognition
  const startKeepAlive = useCallback((recognition: any) => {
    clearKeepAlive();
    
    // Aggressive ping every 2 seconds - prevent 5-second timeout
    keepAliveIntervalRef.current = setInterval(() => {
      if (recognition && isEnabledRef.current && !processingRef.current) {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityRef.current;
        
        // If no activity for 4 seconds, force restart
        if (timeSinceActivity > 4000) {
          console.log('[AlwaysOn] Keep-alive: forcing restart after', timeSinceActivity, 'ms');
          try {
            recognition.stop();
            // onend will trigger auto-restart
          } catch (e) {
            // Ignore
          }
        }
        lastActivityRef.current = now;
      }
    }, 2000);
  }, [clearKeepAlive]);

  // Get Zoe's response
  const getZoeResponse = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    // A turn that never finished (network stall, killed speech) used to jam
    // every later question in silence. Anything older than 45s is stale.
    if (processingRef.current) {
      if (Date.now() - processingStartedRef.current < 45000) return;
      console.warn('[AlwaysOn] Clearing a stuck turn and answering the new one');
    }

    processingRef.current = true;
    processingStartedRef.current = Date.now();
    isEnabledRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true, transcript: '' }));
    
    console.log('[AlwaysOn] User said:', userText);
    zoeDebugLog('voice', `recognized: ${userText}`);
    zoeDebugSetState({ hfState: 'processing' });
    window.dispatchEvent(new CustomEvent('zoe-handsfree-transcript', { detail: { text: userText } }));
    
    // Spoken turns land in the same history the orb chat shows.
    await recordVoiceTurn('user', userText, user?.id);

    // Deterministic platform actions ("Zoe, open chat", "Zoe, notifications",
    // "Zoe, send a message to Asha"). Anything else falls through to askZoe so
    // the answer stays natural and live-grounded instead of scripted.
    const intent = resolveVoiceIntent(userText);
    if (intent) {
      if (intent.kind === 'navigate') {
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: intent.path } }));
      } else if (intent.kind === 'notifications') {
        window.dispatchEvent(new CustomEvent('zoe-open-notifications'));
      } else if (intent.kind === 'message') {
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: '/chat' } }));
        window.dispatchEvent(
          new CustomEvent('zoe-compose-message', { detail: { recipient: intent.recipient } }),
        );
      }
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: intent.speak } }));
      await recordVoiceTurn('assistant', intent.speak, user?.id);
      setState((prev) => ({ ...prev, isProcessing: false, isSpeaking: true }));
      await new Promise<void>((resolve) => {
        speakAsZoe(intent.speak, undefined, undefined, () => resolve(), () => resolve());
      });
      setState((prev) => ({ ...prev, isSpeaking: false }));
      processingRef.current = false;
      if (isEnabledRef.current) setTimeout(() => startListening(), 600);
      return;
    }

    try {
      // Get user's local timezone and time
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const localTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });

      const answer = await askZoe({
        text: userText,
        sessionKey: `always-on-${user?.id ?? 'anon'}`,
        userId: user?.id,
        body: { enableASI: true, soulMetrics: { intimacy: 70, selfHarmony: 75, loveEnergy: 70 } },
      });

      const responseText = answer.text || "I'm here.";
      console.log('[AlwaysOn] Zoe says:', responseText);
      zoeDebugLog('voice', `reply: ${responseText.slice(0, 180)}`);
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: responseText } }));
      
      await recordVoiceTurn('assistant', responseText, user?.id);

      // Speak the response with proper state tracking
      setState(prev => ({ ...prev, isSpeaking: true, isProcessing: false }));
      zoeDebugSetState({ hfState: 'speaking' });
      
      await new Promise<void>((resolve) => {
        // Timeout safety - max 60 seconds for speech
        const safetyTimeout = setTimeout(() => {
          console.warn('[AlwaysOn] Speech timeout - forcing completion');
          stopZoeSpeech();
          resolve();
        }, 60000);
        
        speakAsZoe(
          responseText,
          undefined,
          () => setState(prev => ({ ...prev, isSpeaking: true })),
          () => {
            clearTimeout(safetyTimeout);
            setState(prev => ({ ...prev, isSpeaking: false }));
            resolve();
          },
          () => {
            clearTimeout(safetyTimeout);
            setState(prev => ({ ...prev, isSpeaking: false }));
            resolve();
          }
        );
      });

    } catch (err) {
      console.error('[AlwaysOn] Error:', err);
      setState(prev => ({ ...prev, error: 'Connection issue', isSpeaking: false }));
      stopZoeSpeech();
      zoeDebugSetState({ hfState: 'error', lastError: err instanceof Error ? err.message : String(err) });
      // Never leave the user talking to silence — say what went wrong.
      const apology = "I couldn't reach my brain just then. Say that again in a moment.";
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: apology } }));
      await recordVoiceTurn('assistant', apology, user?.id);
      await new Promise<void>((resolve) => {
        speakAsZoe(apology, undefined, undefined, () => resolve(), () => resolve());
      });
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, isProcessing: false, isSpeaking: false }));
      
      // Resume listening after speaking with slight delay
      if (isEnabledRef.current) {
        // Wait a bit longer to ensure TTS is fully stopped
        setTimeout(() => {
          if (isEnabledRef.current && !isZoeSpeaking()) {
            zoeDebugSetState({ hfState: 'listening' });
            startListening();
          }
        }, 800);
      }
    }
  }, [user]);

  // Start listening with auto-restart on browser timeout
  const startListening = useCallback(() => {
    if (!isEnabledRef.current) return;
    if (isZoeSpeaking()) {
      // Zoe is mid-sentence (e.g. the wake greeting). Waiting instead of
      // silently giving up is what makes the follow-up question get heard.
      setTimeout(() => startListening(), 400);
      return;
    }
    
    if (!isSpeechRecognitionSupported()) {
      console.warn('[AlwaysOn] Speech recognition not supported');
      return;
    }

    // Stop existing recognition
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    clearKeepAlive();

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      keepAlive: true
    });
    
    if (!recognition) return;

    recognition.onstart = () => {
      console.log('[AlwaysOn] Listening...');
      lastTranscriptRef.current = '';
      lastActivityRef.current = Date.now();
      restartCountRef.current = 0; // Reset restart count on successful start
      setState(prev => ({ ...prev, isListening: true, error: null }));
      startKeepAlive(recognition);
    };

    recognition.onresult = (event: any) => {
      lastActivityRef.current = Date.now(); // Update activity timestamp
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
      if (transcript) {
        const control = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^(?:zoe\s+)?(?:stop|be quiet|quiet|cancel)$/.test(control)) {
          stopZoeSpeech();
          zoeDebugSetState({ hfState: 'listening' });
          return;
        }
        if (/^(?:zoe\s+)?pause$/.test(control)) {
          pauseZoeSpeech();
          zoeDebugSetState({ hfState: 'paused' });
          return;
        }
        if (/^(?:zoe\s+)?(?:continue|resume)$/.test(control)) {
          resumeZoeSpeech();
          zoeDebugSetState({ hfState: 'speaking' });
          return;
        }
        if (isZoeSpeaking()) stopZoeSpeech();
        lastTranscriptRef.current = transcript;
        setState(prev => ({ ...prev, transcript }));
        
        // Reset silence timer - process after 2s of silence
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current.trim() && isEnabledRef.current) {
            const text = lastTranscriptRef.current.trim();
            try { recognition.stop(); } catch(e) {}
            getZoeResponse(text);
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore common non-critical errors
      if (['no-speech', 'aborted'].includes(event.error)) {
        console.log('[AlwaysOn] Expected event:', event.error);
        return;
      }
      console.error('[AlwaysOn] Error:', event.error);
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      clearKeepAlive();
      
      // Auto-restart if enabled and not processing - IMMEDIATE restart
      if (isEnabledRef.current && !processingRef.current && !isZoeSpeaking()) {
        restartCountRef.current++;
        
        // Reset count every 30 seconds
        const now = Date.now();
        if (now - lastActivityRef.current > 30000) {
          restartCountRef.current = 0;
        }
        
        // Prevent infinite restart loops
        if (restartCountRef.current > 200) {
          console.warn('[AlwaysOn] Too many restarts, pausing for 3 seconds');
          restartCountRef.current = 0;
          setTimeout(() => startListening(), 3000);
          return;
        }
        
        // Very fast restart - 50ms to minimize gap
        const restartDelay = 50;
        console.log(`[AlwaysOn] Auto-restarting in ${restartDelay}ms (restart #${restartCountRef.current})`);
        setTimeout(() => startListening(), restartDelay);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      console.log('[AlwaysOn] Recognition started');
    } catch (err) {
      console.error('[AlwaysOn] Start error:', err);
      // Try again after a brief delay
      setTimeout(() => startListening(), 500);
    }
  }, [clearSilenceTimer, clearKeepAlive, startKeepAlive, getZoeResponse]);

  // Enable always-on voice
  const enable = useCallback(async () => {
    // Pause wake word detection globally while hands-free mode is active
    window.dispatchEvent(new CustomEvent('zoe-handsfree-start'));

    // Request mic permission using centralized manager
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      console.error('[AlwaysOn] Mic permission denied');
      window.dispatchEvent(new CustomEvent('zoe-handsfree-end'));
      return;
    }

    isEnabledRef.current = true;
    console.log('[AlwaysOn] Enabled - now listening');
    startListening();
  }, [startListening]);

  // Disable always-on voice
  const disable = useCallback(() => {
    isEnabledRef.current = false;
    clearSilenceTimer();
    clearKeepAlive();
    restartCountRef.current = 0;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }

    stopZoeSpeech();

    setState({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcript: '',
      error: null,
    });

    // Resume wake word detection
    window.dispatchEvent(new CustomEvent('zoe-handsfree-end'));

    console.log('[AlwaysOn] Disabled');
  }, [clearSilenceTimer, clearKeepAlive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      clearSilenceTimer();
      clearKeepAlive();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [clearSilenceTimer, clearKeepAlive]);

  return {
    ...state,
    isEnabled: isEnabledRef.current,
    enable,
    disable,
    processUtterance: getZoeResponse,
  };
};

export default useAlwaysOnVoice;
