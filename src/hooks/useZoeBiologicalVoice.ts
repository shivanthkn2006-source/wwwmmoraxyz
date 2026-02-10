/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * useZoeBiologicalVoice - React Hook for Zero-Cost Voice
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Provides a React-friendly interface to the Biological Voice engine.
 * Uses browser-native Web Speech APIs - NO API KEYS REQUIRED.
 * 
 * Features:
 * - TTS (Text-to-Speech) via SpeechSynthesis API
 * - STT (Speech-to-Text) via SpeechRecognition API
 * - DHF integration for intelligent responses
 * - Conversation history management
 * - State management with React hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  zoeBiologicalVoice, 
  BiologicalVoiceState, 
  VoiceConversationContext 
} from '@/core/zoe/ZoeBiologicalVoice';
import { OrchestratorResponse } from '@/core/zoe/ZoeDHFOrchestrator';
import { useAuth } from '@/lib/auth';

export interface UseZoeBiologicalVoiceReturn {
  // State
  state: BiologicalVoiceState;
  isReady: boolean;
  
  // TTS Controls
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  
  // STT Controls
  startListening: () => void;
  stopListening: () => void;
  
  // Full Conversation
  startConversation: () => Promise<OrchestratorResponse | null>;
  
  // History
  conversationHistory: Array<{ role: 'user' | 'zoe'; content: string }>;
  clearHistory: () => void;
  
  // Context
  setContext: (context: Partial<VoiceConversationContext>) => void;
}

export const useZoeBiologicalVoice = (): UseZoeBiologicalVoiceReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<BiologicalVoiceState>({
    isListening: false,
    isSpeaking: false,
    isPaused: false,
    voiceName: null,
    isInitialized: false,
    lastTranscript: null,
    lastResponse: null,
    errorState: null,
  });
  
  const [isReady, setIsReady] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'zoe'; content: string }>
  >([]);
  
  const transcriptCallbackRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const success = await zoeBiologicalVoice.initialize();
      setIsReady(success);
      
      if (user?.id) {
        zoeBiologicalVoice.setContext({ userId: user.id });
      }
      
      updateState();
    };
    
    init();
    
    // Listen for voice events
    const handleSpeakStart = () => updateState();
    const handleSpeakEnd = () => updateState();
    
    window.addEventListener('zoe-biological-voice-start', handleSpeakStart);
    window.addEventListener('zoe-biological-voice-end', handleSpeakEnd);
    
    return () => {
      window.removeEventListener('zoe-biological-voice-start', handleSpeakStart);
      window.removeEventListener('zoe-biological-voice-end', handleSpeakEnd);
    };
  }, [user?.id]);

  const updateState = useCallback(() => {
    setState(zoeBiologicalVoice.getState());
    setConversationHistory(zoeBiologicalVoice.getConversationHistory());
  }, []);

  // TTS Controls
  const speak = useCallback((text: string, onEnd?: () => void) => {
    zoeBiologicalVoice.speak(
      text,
      () => updateState(),
      () => {
        updateState();
        onEnd?.();
      },
      () => updateState()
    );
  }, [updateState]);

  const stop = useCallback(() => {
    zoeBiologicalVoice.stop();
    updateState();
  }, [updateState]);

  const pause = useCallback(() => {
    zoeBiologicalVoice.pause();
    updateState();
  }, [updateState]);

  const resume = useCallback(() => {
    zoeBiologicalVoice.resume();
    updateState();
  }, [updateState]);

  // STT Controls
  const startListening = useCallback(() => {
    zoeBiologicalVoice.startListening(
      (transcript, isFinal) => {
        setState(prev => ({ ...prev, lastTranscript: transcript }));
        transcriptCallbackRef.current?.(transcript, isFinal);
      },
      (error) => {
        setState(prev => ({ ...prev, errorState: error }));
      }
    );
    updateState();
  }, [updateState]);

  const stopListening = useCallback(() => {
    zoeBiologicalVoice.stopListening();
    updateState();
  }, [updateState]);

  // Full Conversation
  const startConversation = useCallback(async (): Promise<OrchestratorResponse | null> => {
    return new Promise((resolve) => {
      zoeBiologicalVoice.converse(
        () => updateState(),
        (transcript) => setState(prev => ({ ...prev, lastTranscript: transcript })),
        (response) => {
          updateState();
          resolve(response);
        },
        () => updateState(),
        () => updateState()
      );
    });
  }, [updateState]);

  // History Management
  const clearHistory = useCallback(() => {
    zoeBiologicalVoice.clearHistory();
    setConversationHistory([]);
  }, []);

  // Context Management
  const setContext = useCallback((context: Partial<VoiceConversationContext>) => {
    zoeBiologicalVoice.setContext(context);
  }, []);

  return {
    state,
    isReady,
    speak,
    stop,
    pause,
    resume,
    startListening,
    stopListening,
    startConversation,
    conversationHistory,
    clearHistory,
    setContext,
  };
};

export default useZoeBiologicalVoice;
