/**
 * SELFIE CITY VOICE LAYER - Phase 1-3 Complete
 * 
 * This hook creates a "Voice Layer" that bridges:
 * 1. Web Speech API (input: user speaks)
 * 2. Zoe AI (processing: intent extraction via Gemini)
 * 3. Three.js Canvas (action: camera/filter control)
 * 4. TTS Response (output: Zoe speaks back conversationally)
 * 
 * Architecture:
 * User Voice -> Speech Recognition -> Zoe AI -> Intent -> Action -> Zoe TTS Response
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  requestMicPermission, 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition,
  getPlatformInfo
} from '@/utils/micPermissionManager';
import { speakAs, stopSpeaking, initializeAssistantVoices, isAssistantSpeaking } from '@/utils/assistantVoice';
import { smartFlyTo, KNOWN_LOCATIONS } from '@/services/globeNavigationService';
import { generateZoeResponse, type ResponseContext } from '@/utils/zoeResponseGenerator';

// ════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ════════════════════════════════════════════════════════════════

export interface VoiceLayerState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  lastIntent: ParsedIntent | null;
  error: string | null;
}

export interface ParsedIntent {
  type: 'navigation' | 'filter' | 'action' | 'search' | 'camera' | 'help' | 'unknown';
  action: string;
  payload: Record<string, any>;
  confidence: number;
  rawTranscript: string;
  zoeResponse: string;
}

export interface GlobeCameraAction {
  type: 'fly_to' | 'zoom_in' | 'zoom_out' | 'rotate' | 'reset';
  coordinates?: { lat: number; lng: number };
  locationName?: string;
  zoomLevel?: number;
  duration?: number;
}

export interface VoiceLayerCallbacks {
  onIntentParsed?: (intent: ParsedIntent) => void;
  onCameraAction?: (action: GlobeCameraAction) => void;
  onFilterChange?: (filter: string) => void;
  onSearchQuery?: (query: string) => void;
  onError?: (error: string) => void;
}

// ════════════════════════════════════════════════════════════════
// WAKE WORDS & LOCAL INTENT PATTERNS
// ════════════════════════════════════════════════════════════════

const WAKE_WORDS = ['zoe', 'zoey', 'so we', 'so he', 'joey', 'hey zoe', 'ok zoe'];

// Fast local patterns for common commands (skip AI for these)
const LOCAL_INTENT_PATTERNS: Array<{
  patterns: RegExp[];
  intentType: ParsedIntent['type'];
  action: string;
  extractPayload?: (match: RegExpMatchArray, input: string) => Record<string, any>;
  defaultResponse: string;
}> = [
  // Navigation - Fly To
  {
    patterns: [
      /(?:fly|go|take me|navigate|head)\s+(?:to|towards?)\s+(.+)/i,
      /show\s+(?:me\s+)?(.+)\s+on\s+(?:the\s+)?(?:globe|map)/i,
    ],
    intentType: 'navigation',
    action: 'fly_to',
    extractPayload: (match, input) => {
      const locationMatch = input.match(/(?:fly|go|take me|navigate|head|show)\s+(?:to|towards?|me)?\s*(.+?)(\s+on|\s*$)/i);
      return { location: locationMatch?.[1]?.trim().replace(/^the\s+/i, '') || match[1]?.trim() };
    },
    defaultResponse: 'Flying there now!',
  },
  // Camera Controls
  {
    patterns: [/zoom\s*in/i, /get\s+closer/i, /magnify/i],
    intentType: 'camera',
    action: 'zoom_in',
    defaultResponse: 'Zooming in.',
  },
  {
    patterns: [/zoom\s*out/i, /pull\s+back/i, /wider\s+view/i],
    intentType: 'camera',
    action: 'zoom_out',
    defaultResponse: 'Zooming out.',
  },
  {
    patterns: [/reset\s+(?:the\s+)?view/i, /default\s+view/i, /center/i],
    intentType: 'camera',
    action: 'reset_view',
    defaultResponse: 'Resetting view.',
  },
  {
    patterns: [/rotate\s+(?:the\s+)?globe/i, /spin/i],
    intentType: 'camera',
    action: 'rotate',
    defaultResponse: 'Rotating the globe.',
  },
  // Filters
  {
    patterns: [/show\s+(?:my\s+)?friends/i, /friends\s+(?:only|filter)/i],
    intentType: 'filter',
    action: 'filter_friends',
    defaultResponse: 'Showing your friends.',
  },
  {
    patterns: [/show\s+(?:the\s+)?deals/i, /sales/i, /discounts/i],
    intentType: 'filter',
    action: 'filter_sales',
    defaultResponse: 'Showing deals and sales.',
  },
  {
    patterns: [/show\s+products/i, /products?\s+(?:only|filter)/i],
    intentType: 'filter',
    action: 'filter_products',
    defaultResponse: 'Showing products.',
  },
  {
    patterns: [/show\s+premium/i, /premium\s+only/i, /vip/i, /exclusive/i],
    intentType: 'filter',
    action: 'filter_premium',
    defaultResponse: 'Showing premium content.',
  },
  {
    patterns: [/clear\s+(?:all\s+)?filters/i, /reset\s+filters/i, /show\s+(?:me\s+)?all/i],
    intentType: 'filter',
    action: 'clear_filters',
    defaultResponse: 'Clearing filters.',
  },
  // Actions
  {
    patterns: [/open\s+(?:the\s+)?camera/i, /take\s+(?:a\s+)?(?:selfie|photo|picture)/i, /capture/i],
    intentType: 'action',
    action: 'open_camera',
    defaultResponse: 'Opening camera. Strike a pose!',
  },
  {
    patterns: [/close\s+(?:the\s+)?camera/i, /cancel\s+camera/i],
    intentType: 'action',
    action: 'close_camera',
    defaultResponse: 'Closing camera.',
  },
  {
    patterns: [/start\s+tracking/i, /track\s+(?:my\s+)?route/i, /follow\s+me/i],
    intentType: 'action',
    action: 'start_tracking',
    defaultResponse: 'Starting route tracking.',
  },
  {
    patterns: [/stop\s+tracking/i, /end\s+tracking/i],
    intentType: 'action',
    action: 'stop_tracking',
    defaultResponse: 'Stopping route tracking.',
  },
  {
    patterns: [/go\s+(?:back\s+)?home/i, /exit\s+(?:selfie\s+)?city/i, /leave/i],
    intentType: 'action',
    action: 'go_home',
    defaultResponse: 'Taking you home.',
  },
  // Weather queries
  {
    patterns: [
      /where\s+(?:is\s+it\s+)?rain(?:ing)?/i,
      /show\s+(?:me\s+)?(?:the\s+)?rain/i,
      /precipitation/i,
      /what's?\s+the\s+weather/i,
    ],
    intentType: 'navigation',
    action: 'check_weather',
    extractPayload: () => ({ weatherType: 'rain' }),
    defaultResponse: 'Scanning for precipitation patterns. Visualizing rain now.',
  },
  // Brand filter (e.g., "Show me everyone wearing Adidas")
  {
    patterns: [
      /show\s+(?:me\s+)?(?:everyone|people|users?)\s+(?:wearing|with)\s+(.+)/i,
      /(?:filter|find)\s+(?:by\s+)?brand\s+(.+)/i,
      /who\s+(?:is\s+)?wearing\s+(.+)/i,
    ],
    intentType: 'filter',
    action: 'filter_brand',
    extractPayload: (match, input) => {
      const brandMatch = input.match(/(?:wearing|with|brand)\s+(.+?)(?:\s*$|\s+on)/i);
      return { brand: brandMatch?.[1]?.trim() || match[1]?.trim() };
    },
    defaultResponse: 'Filtering by brand...',
  },
  // Search
  {
    patterns: [
      /(?:search|find|look)\s+(?:for\s+)?(.+)/i,
      /where\s+(?:is|are|can\s+I\s+find)\s+(.+)/i,
    ],
    intentType: 'search',
    action: 'search_query',
    extractPayload: (match, input) => {
      const queryMatch = input.match(/(?:search|find|look|where)\s+(?:for\s+|is\s+|are\s+|can\s+I\s+find\s+)?(.+)/i);
      return { query: queryMatch?.[1]?.trim() };
    },
    defaultResponse: 'Searching...',
  },
  // Help
  {
    patterns: [/help/i, /what\s+can\s+(?:you|I)\s+(?:do|say)/i, /commands?/i],
    intentType: 'help',
    action: 'help',
    defaultResponse: 'I can help you navigate! Try: "Fly to Paris", "Show deals", "Open camera", or "Find Nike".',
  },
];

// ════════════════════════════════════════════════════════════════
// MAIN HOOK
// ════════════════════════════════════════════════════════════════

export const useSelfieCityVoiceLayer = (callbacks?: VoiceLayerCallbacks) => {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceLayerState>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    lastIntent: null,
    error: null,
  });

  // Refs for stateful values that shouldn't trigger re-renders
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const processingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef('');
  const restartCountRef = useRef(0);

  // Initialize Zoe voices
  useEffect(() => {
    initializeAssistantVoices();
  }, []);

  // ────────────────────────────────────────────────────────────────
  // INTENT PARSING - Local first, then AI fallback
  // ────────────────────────────────────────────────────────────────

  const parseIntentLocally = useCallback((transcript: string): ParsedIntent | null => {
    const cleanInput = transcript.toLowerCase().trim();
    
    // Remove wake word prefix if present
    let input = cleanInput;
    for (const wake of WAKE_WORDS) {
      if (cleanInput.startsWith(wake)) {
        input = cleanInput.slice(wake.length).trim();
        break;
      }
    }

    // Match against local patterns
    for (const pattern of LOCAL_INTENT_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = input.match(regex);
        if (match) {
          const payload = pattern.extractPayload?.(match, input) || {};
          
          // Map internal intent type to VoiceIntent for response generator
          const intentMap: Record<string, string> = {
            'fly_to': 'FLY_TO',
            'zoom_in': 'ZOOM_IN',
            'zoom_out': 'ZOOM_OUT',
            'reset_view': 'RESET_VIEW',
            'rotate': 'ROTATE',
            'filter_friends': 'SHOW_FRIENDS',
            'filter_sales': 'SHOW_DEALS',
            'filter_products': 'SHOW_PRODUCTS',
            'filter_premium': 'SHOW_PREMIUM',
            'filter_brand': 'FILTER_BRAND',
            'clear_filters': 'CLEAR_FILTERS',
            'open_camera': 'OPEN_CAMERA',
            'close_camera': 'CLOSE_CAMERA',
            'start_tracking': 'START_TRACKING',
            'stop_tracking': 'STOP_TRACKING',
            'go_home': 'GO_HOME',
            'search_query': 'SEARCH',
            'check_weather': 'CHECK_WEATHER',
            'help': 'HELP',
          };
          
          // Generate conversational response using the new generator
          const voiceIntent = intentMap[pattern.action] || 'UNKNOWN';
          const conversationalResponse = generateZoeResponse(
            voiceIntent as any,
            { location: payload.location, query: payload.query, username: payload.username }
          );
          
          return {
            type: pattern.intentType,
            action: pattern.action,
            payload,
            confidence: 0.9,
            rawTranscript: transcript,
            zoeResponse: conversationalResponse,
          };
        }
      }
    }

    return null; // No local match
  }, []);

  const parseIntentWithAI = useCallback(async (transcript: string): Promise<ParsedIntent> => {
    // Call Zoe AI for complex intent parsing
    try {
      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: transcript,
          userId: user?.id,
          context: {
            platform: 'selfie_city',
            capabilities: ['navigation', 'filter', 'search', 'camera'],
          },
          options: {
            forceThinkingLevel: 'low', // Fast response for voice
            extractIntent: true,
          }
        }
      });

      if (error) throw error;

      // Parse Zoe's response for intent
      const intent: ParsedIntent = {
        type: data?.intent?.type || 'unknown',
        action: data?.intent?.action || 'general_query',
        payload: data?.intent?.payload || {},
        confidence: data?.intent?.confidence || 0.5,
        rawTranscript: transcript,
        zoeResponse: data?.message || "I'm not sure what you mean. Try saying 'Help' for options.",
      };

      return intent;

    } catch (err) {
      console.error('[VoiceLayer] AI intent parsing failed:', err);
      return {
        type: 'unknown',
        action: 'error',
        payload: {},
        confidence: 0,
        rawTranscript: transcript,
        zoeResponse: "I had trouble understanding that. Please try again.",
      };
    }
  }, [user?.id]);

  // ────────────────────────────────────────────────────────────────
  // EXECUTE INTENT - Dispatch actions to globe/page
  // ────────────────────────────────────────────────────────────────

  const executeIntent = useCallback(async (intent: ParsedIntent) => {
    console.log('[VoiceLayer] Executing intent:', intent);

    // Call the appropriate callback
    callbacks?.onIntentParsed?.(intent);

    switch (intent.type) {
      case 'navigation':
        if (intent.action === 'fly_to' && intent.payload.location) {
          const location = intent.payload.location as string;
          
          // Try smart fly-to (checks known locations first, then geocodes)
          const result = await smartFlyTo(location);
          
          if (result.success && result.location) {
            callbacks?.onCameraAction?.({
              type: 'fly_to',
              coordinates: { lat: result.location.lat, lng: result.location.lng },
              locationName: result.location.displayName,
              duration: 2000,
            });
          } else {
            // Update response if location not found
            intent.zoeResponse = `I couldn't find "${location}". Try a major city name.`;
          }
        }
        break;

      case 'camera':
        const cameraAction: GlobeCameraAction = { type: intent.action as any };
        if (intent.action === 'zoom_in') cameraAction.zoomLevel = -0.5;
        if (intent.action === 'zoom_out') cameraAction.zoomLevel = 0.5;
        
        // Dispatch camera control event
        window.dispatchEvent(new CustomEvent('selfie-city-camera-control', {
          detail: cameraAction
        }));
        callbacks?.onCameraAction?.(cameraAction);
        break;

      case 'filter':
        const filter = intent.action.replace('filter_', '');
        callbacks?.onFilterChange?.(filter);
        
        // Dispatch filter event
        window.dispatchEvent(new CustomEvent('selfie-city-voice-action', {
          detail: {
            action: intent.action,
            payload: intent.payload,
            response: intent.zoeResponse,
            confidence: intent.confidence,
          }
        }));
        break;

      case 'action':
      case 'search':
      case 'help':
        // Dispatch as voice action for SelfieCityPage to handle
        window.dispatchEvent(new CustomEvent('selfie-city-voice-action', {
          detail: {
            action: intent.action,
            payload: intent.payload,
            response: intent.zoeResponse,
            confidence: intent.confidence,
          }
        }));
        
        if (intent.type === 'search') {
          callbacks?.onSearchQuery?.(intent.payload.query);
        }
        break;
    }

    // Update state with last intent
    setState(prev => ({ ...prev, lastIntent: intent }));

    // Log to behavioral events (fire and forget)
    if (user?.id) {
      (async () => {
        try {
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'voice_layer_intent',
            event_category: 'ar_commerce',
            context_snippet: intent.rawTranscript.slice(0, 100),
            metadata: {
              intentType: intent.type,
              action: intent.action,
              confidence: intent.confidence,
              platform: 'selfie_city_voice_layer',
            },
            dhf_logged: true,
          });
        } catch (err) {
          console.error('[VoiceLayer] Log error:', err);
        }
      })();
    }

  }, [callbacks, user?.id]);

  // ────────────────────────────────────────────────────────────────
  // PROCESS VOICE INPUT
  // ────────────────────────────────────────────────────────────────

  const processVoiceInput = useCallback(async (transcript: string) => {
    if (!transcript.trim() || processingRef.current) return;

    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true }));

    console.log('[VoiceLayer] Processing:', transcript);

    try {
      // Step 1: Try local pattern matching first (fast)
      let intent = parseIntentLocally(transcript);

      // Step 2: Fall back to AI if no local match
      if (!intent) {
        intent = await parseIntentWithAI(transcript);
      }

      // Step 3: Execute the intent
      await executeIntent(intent);

      // Step 4: Speak Zoe's response
      setState(prev => ({ ...prev, isSpeaking: true }));
      
      await new Promise<void>((resolve) => {
        speakAs(
          intent.zoeResponse,
          'Zoe',
          () => setState(prev => ({ ...prev, isSpeaking: true })),
          () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            resolve();
          },
          () => resolve()
        );
      });

    } catch (err) {
      console.error('[VoiceLayer] Processing error:', err);
      callbacks?.onError?.(err instanceof Error ? err.message : 'Voice processing failed');
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, isProcessing: false, transcript: '' }));

      // Resume listening if still active
      if (isActiveRef.current) {
        setTimeout(() => startListening(), 300);
      }
    }
  }, [parseIntentLocally, parseIntentWithAI, executeIntent, callbacks]);

  // ────────────────────────────────────────────────────────────────
  // SPEECH RECOGNITION
  // ────────────────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isActiveRef.current || processingRef.current || isAssistantSpeaking()) return;

    if (!isSpeechRecognitionSupported()) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    // Stop existing recognition
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;

    const platform = getPlatformInfo();
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      keepAlive: !platform.isSafari, // Safari handles this differently
    });

    if (!recognition) return;

    recognition.onstart = () => {
      console.log('[VoiceLayer] Listening started');
      lastTranscriptRef.current = '';
      restartCountRef.current = 0;
      setState(prev => ({ ...prev, isListening: true, error: null }));

      // Keep-alive for browsers that timeout
      keepAliveRef.current = setInterval(() => {
        if (isActiveRef.current && !processingRef.current) {
          // Touch recognition to prevent timeout
        }
      }, 3000);
    };

    recognition.onresult = (event: any) => {
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

        // Process after 1.5s of silence
        clearTimers();
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current.trim() && isActiveRef.current) {
            const text = lastTranscriptRef.current.trim();
            try { recognition.stop(); } catch(e) {}
            processVoiceInput(text);
          }
        }, 1500);
      }
    };

    recognition.onerror = (event: any) => {
      if (['no-speech', 'aborted'].includes(event.error)) return;
      console.error('[VoiceLayer] Recognition error:', event.error);
      setState(prev => ({ ...prev, error: event.error }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      clearTimers();

      // Auto-restart if active and not processing
      if (isActiveRef.current && !processingRef.current && !isAssistantSpeaking()) {
        restartCountRef.current++;
        if (restartCountRef.current > 100) {
          console.warn('[VoiceLayer] Too many restarts, pausing');
          restartCountRef.current = 0;
          setTimeout(() => startListening(), 2000);
          return;
        }
        setTimeout(() => startListening(), 100);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('[VoiceLayer] Start error:', err);
      setTimeout(() => startListening(), 500);
    }
  }, [clearTimers, processVoiceInput]);

  // ────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────

  const activate = useCallback(async () => {
    console.log('[VoiceLayer] Activating...');

    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      setState(prev => ({ ...prev, error: 'Microphone access denied' }));
      callbacks?.onError?.('Microphone access denied');
      return false;
    }

    isActiveRef.current = true;
    setState(prev => ({ ...prev, isActive: true, error: null }));

    // Notify other systems
    window.dispatchEvent(new CustomEvent('selfie-city-voice-layer-active', { detail: { active: true } }));

    startListening();
    return true;
  }, [callbacks, startListening]);

  const deactivate = useCallback(() => {
    console.log('[VoiceLayer] Deactivating...');

    isActiveRef.current = false;
    clearTimers();
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    stopSpeaking();

    setState({
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcript: '',
      lastIntent: null,
      error: null,
    });

    window.dispatchEvent(new CustomEvent('selfie-city-voice-layer-active', { detail: { active: false } }));
  }, [clearTimers]);

  const toggle = useCallback(async () => {
    if (isActiveRef.current) {
      deactivate();
    } else {
      await activate();
    }
  }, [activate, deactivate]);

  // Manually trigger a command (for testing or programmatic use)
  const sendCommand = useCallback((command: string) => {
    processVoiceInput(command);
  }, [processVoiceInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      clearTimers();
      stopSpeechRecognition(recognitionRef.current);
    };
  }, [clearTimers]);

  return {
    // State
    ...state,

    // Actions
    activate,
    deactivate,
    toggle,
    sendCommand,

    // Helpers
    isSupported: isSpeechRecognitionSupported(),
    knownLocations: Object.keys(KNOWN_LOCATIONS),
  };
};

export default useSelfieCityVoiceLayer;
