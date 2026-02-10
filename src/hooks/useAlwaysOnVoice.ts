// ═══════════════════════════════════════════════════════════════════════════════
// ALWAYS-ON VOICE - True hands-free conversation with Zoe
// No mic buttons, no clicks - just speak and Zoe listens/responds naturally
// Like real human conversation - one-to-one, no strings attached
// Uses centralized mic permission manager for reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, initializeZoeVoices, isZoeSpeaking, getZoeSpeechState } from '@/utils/zoeVoice';
import { 
  requestMicPermission, 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';

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
    if (!userText.trim() || processingRef.current) return;
    
    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true, transcript: '' }));
    
    console.log('[AlwaysOn] User said:', userText);
    
    // Save user message to DB (SEPARATION PROTOCOL: tag as zoe_classic)
    if (user) {
      await supabase.from('ai_companion_messages').insert({
        user_id: user.id,
        role: 'user',
        variant: 'zoe_classic',
        content: userText
      } as any);
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

      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [{ role: 'user', content: userText }],
          timezone: userTimezone,
          localTime: localTime,
          enableASI: true,
          soulMetrics: { intimacy: 70, selfHarmony: 75, loveEnergy: 70 }
        }
      });

      if (error) throw error;

      const responseText = data?.message || data?.response || "I'm here.";
      console.log('[AlwaysOn] Zoe says:', responseText);
      
      // Save Zoe's message to DB (SEPARATION PROTOCOL: tag as zoe_classic)
      if (user) {
        await supabase.from('ai_companion_messages').insert({
          user_id: user.id,
          role: 'assistant',
          variant: 'zoe_classic',
          content: responseText
        } as any);
      }

      // Speak the response with proper state tracking
      setState(prev => ({ ...prev, isSpeaking: true, isProcessing: false }));
      
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
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, isProcessing: false, isSpeaking: false }));
      
      // Resume listening after speaking with slight delay
      if (isEnabledRef.current) {
        // Wait a bit longer to ensure TTS is fully stopped
        setTimeout(() => {
          if (isEnabledRef.current && !isZoeSpeaking()) {
            startListening();
          }
        }, 800);
      }
    }
  }, [user]);

  // Start listening with auto-restart on browser timeout
  const startListening = useCallback(() => {
    if (!isEnabledRef.current) return;
    if (isZoeSpeaking()) return; // Don't listen while Zoe is speaking
    
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
  };
};

export default useAlwaysOnVoice;
