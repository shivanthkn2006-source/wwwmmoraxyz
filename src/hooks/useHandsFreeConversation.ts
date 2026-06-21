// ═══════════════════════════════════════════════════════════════════════════════
// HANDS-FREE CONVERSATION - Natural voice dialogue with Zoe
// No mic buttons, no clicks - just speak naturally and Zoe responds
// Uses centralized mic permission manager for reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, isZoeSpeaking, initializeZoeVoices, getZoeSpeechState } from '@/utils/zoeVoice';
import { 
  requestMicPermission, 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';
import { toast } from 'sonner';

interface ConversationMessage {
  role: 'user' | 'zoe';
  content: string;
  timestamp: Date;
}

interface HandsFreeState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  lastUserMessage: string;
}

export const useHandsFreeConversation = () => {
  const { user } = useAuth();
  const [state, setState] = useState<HandsFreeState>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentTranscript: '',
    lastUserMessage: '',
  });
  
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const transcriptRef = useRef('');
  const processingRef = useRef(false);
  const restartCountRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  // Initialize voices
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

  // Start keep-alive to prevent browser timeout
  const startKeepAlive = useCallback(() => {
    clearKeepAlive();
    keepAliveIntervalRef.current = setInterval(() => {
      lastActivityRef.current = Date.now();
    }, 3000);
  }, [clearKeepAlive]);

  // Process user speech and get Zoe's response
  const processUserSpeech = useCallback(async (userText: string) => {
    if (!userText.trim() || processingRef.current) return;
    
    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true, isListening: false }));
    
    console.log('[HandsFree] Processing:', userText);
    
    // Add user message
    const userMsg: ConversationMessage = { role: 'user', content: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    
    // Save to DB (SEPARATION PROTOCOL: tag as zoe_classic)
    if (user) {
      supabase.from('ai_companion_messages').insert({
        user_id: user.id,
        role: 'user',
        variant: 'zoe_classic',
        content: userText
      } as any).then(() => console.log('[HandsFree] Saved user message'));
    }

    try {
      // Get conversation context
      const recentMessages = messages.slice(-5).map(m => ({
        role: m.role === 'zoe' ? 'assistant' : 'user',
        content: m.content
      }));

      // Get user's local timezone and time
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const localTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [...recentMessages, { role: 'user', content: userText }],
          timezone: userTimezone,
          localTime: localTime,
          enableASI: true,
          soulMetrics: { intimacy: 70, selfHarmony: 75, loveEnergy: 70 }
        }
      });

      if (error) throw error;

      const responseText = data?.message || data?.response || "I'm here with you.";
      console.log('[HandsFree] Zoe response:', responseText);
      
      // Add Zoe's message
      const zoeMsg: ConversationMessage = { role: 'zoe', content: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, zoeMsg]);
      
      // Save to DB (SEPARATION PROTOCOL: tag as zoe_classic)
      if (user) {
        supabase.from('ai_companion_messages').insert({
          user_id: user.id,
          role: 'assistant',
          variant: 'zoe_classic',
          content: responseText
        } as any).then(() => console.log('[HandsFree] Saved Zoe message'));
      }

      // Speak response with safety timeout
      setState(prev => ({ ...prev, isSpeaking: true }));
      
      await new Promise<void>((resolve) => {
        // Safety timeout - max 60 seconds
        const safetyTimeout = setTimeout(() => {
          console.warn('[HandsFree] Speech timeout - forcing completion');
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
      console.error('[HandsFree] Error:', err);
      toast.error('Connection issue. Resuming...');
      stopZoeSpeech();
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, isProcessing: false, isSpeaking: false }));
      
      // Resume listening if still active - wait for TTS to fully stop
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isZoeSpeaking()) {
            startListeningInternal();
          }
        }, 800);
      }
    }
  }, [user, messages]);

  // Internal start listening (after Zoe speaks) - with auto-restart on browser timeout
  const startListeningInternal = useCallback(() => {
    if (!isActiveRef.current) return;
    
    if (!isSpeechRecognitionSupported()) {
      console.error('[HandsFree] Speech recognition not supported');
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    // Stop any existing recognition cleanly
    if (recognitionRef.current) {
      try {
        stopSpeechRecognition(recognitionRef.current);
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null;
    }
    clearKeepAlive();

    // Create recognition with aggressive keep-alive settings
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      keepAlive: true,
      onAutoRestart: () => {
        console.log('[HandsFree] Auto-restart triggered by keep-alive');
      }
    });
    
    if (!recognition) {
      console.error('[HandsFree] Failed to create speech recognition');
      return;
    }

    // Override the recognition's native onstart
    const originalOnStart = recognition.onstart;
    recognition.onstart = (event: any) => {
      console.log('[HandsFree] ✓ Listening active');
      transcriptRef.current = '';
      lastActivityRef.current = Date.now();
      restartCountRef.current = 0;
      setState(prev => ({ ...prev, isListening: true, currentTranscript: '' }));
      startKeepAlive();
      if (originalOnStart) originalOnStart.call(recognition, event);
    };

    // Handle results - accumulate final transcripts
    const originalOnResult = recognition.onresult;
    recognition.onresult = (event: any) => {
      lastActivityRef.current = Date.now();
      let finalTranscript = '';
      let interimTranscript = '';

      // Process all results from the beginning
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Use final transcript if available, otherwise interim
      const transcript = (finalTranscript.trim() || interimTranscript).trim();
      
      if (transcript) {
        transcriptRef.current = transcript;
        setState(prev => ({ ...prev, currentTranscript: transcript }));
        
        // Reset silence timer - process after 1.5 seconds of silence for faster response
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptRef.current.trim() && isActiveRef.current && !processingRef.current) {
            const text = transcriptRef.current.trim();
            console.log('[HandsFree] Processing after silence:', text);
            
            // Disable keep-alive temporarily to prevent restart during processing
            (recognition as any).__keepAlive = false;
            try { recognition.stop(); } catch(e) {}
            
            processUserSpeech(text);
          }
        }, 1500); // 1.5 seconds for faster response
      }
      
      if (originalOnResult) originalOnResult.call(recognition, event);
    };

    // Handle errors gracefully
    const originalOnError = recognition.onerror;
    recognition.onerror = (event: any) => {
      const error = event.error;
      
      // These are expected and non-fatal
      if (error === 'no-speech' || error === 'aborted') {
        console.log('[HandsFree] Expected event:', error);
        return;
      }
      
      // Handle network errors
      if (error === 'network') {
        console.warn('[HandsFree] Network error - will retry');
        return;
      }
      
      console.error('[HandsFree] Recognition error:', error);
      
      if (originalOnError) originalOnError.call(recognition, event);
    };

    // Override onend for reliable restart
    const originalOnEnd = recognition.onend;
    recognition.onend = (event: any) => {
      console.log('[HandsFree] Recognition ended');
      setState(prev => ({ ...prev, isListening: false }));
      clearKeepAlive();
      
      // Let the createSpeechRecognition's built-in auto-restart handle it
      // unless we're processing
      if (!isActiveRef.current || processingRef.current) {
        // Don't restart - either inactive or processing
        (recognition as any).__keepAlive = false;
      }
      
      if (originalOnEnd) originalOnEnd.call(recognition, event);
    };

    // Start recognition
    try {
      recognition.start();
      recognitionRef.current = recognition;
      console.log('[HandsFree] Recognition initialized');
    } catch (err: any) {
      if (err?.message?.includes('already started')) {
        console.log('[HandsFree] Already started');
        recognitionRef.current = recognition;
      } else {
        console.error('[HandsFree] Start error:', err);
        // Retry after short delay
        setTimeout(() => {
          if (isActiveRef.current) startListeningInternal();
        }, 500);
      }
    }
  }, [clearSilenceTimer, clearKeepAlive, startKeepAlive, processUserSpeech]);

  // Start hands-free mode
  const startConversation = useCallback(async () => {
    // Request mic permission using centralized manager
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      toast.error('Microphone access required for hands-free mode');
      return;
    }

    isActiveRef.current = true;
    setState(prev => ({ ...prev, isActive: true }));
    
    // Pause wake word detection
    window.dispatchEvent(new CustomEvent('zoe-handsfree-start'));
    
    toast.success('🎙️ Hands-free mode active. Just speak naturally!', { duration: 3000 });
    
    // Start listening
    startListeningInternal();
  }, [startListeningInternal]);

  // Stop hands-free mode
  const stopConversation = useCallback(() => {
    isActiveRef.current = false;
    clearSilenceTimer();
    clearKeepAlive();
    restartCountRef.current = 0;
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    
    stopZoeSpeech();
    
    setState({
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentTranscript: '',
      lastUserMessage: '',
    });
    
    // Resume wake word detection
    window.dispatchEvent(new CustomEvent('zoe-handsfree-end'));
    
    toast.info('Hands-free mode ended');
  }, [clearSilenceTimer, clearKeepAlive]);

  // Toggle hands-free mode
  const toggleConversation = useCallback(() => {
    if (state.isActive) {
      stopConversation();
    } else {
      startConversation();
    }
  }, [state.isActive, startConversation, stopConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      clearSilenceTimer();
      clearKeepAlive();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [clearSilenceTimer, clearKeepAlive]);

  return {
    ...state,
    messages,
    startConversation,
    stopConversation,
    toggleConversation,
  };
};

export default useHandsFreeConversation;
