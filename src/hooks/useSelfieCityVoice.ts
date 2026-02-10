import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { speakAs, stopSpeaking } from '@/utils/assistantVoice';
import { useSelfieCitySearch } from './useSelfieCitySearch';

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

// Voice commands for Selfie City
const SELFIE_CITY_COMMANDS = [
  { pattern: /search(?: for)?(.+)/i, action: 'search', extract: 1 },
  { pattern: /find(.+)/i, action: 'search', extract: 1 },
  { pattern: /show(?:me)?(.+)(?:near(?:by)?|around)/i, action: 'search_nearby', extract: 1 },
  { pattern: /(?:what|where)(?:'s|is)(.+)(?:sale|offer|deal)/i, action: 'find_deals', extract: 1 },
  { pattern: /navigate to(.+)/i, action: 'navigate', extract: 1 },
  { pattern: /(?:take|post)(?:a)?selfie/i, action: 'selfie' },
  { pattern: /scan(?:this)?(?:product|item|outfit)/i, action: 'scan' },
  { pattern: /(?:show|open)(?:my)?deals/i, action: 'show_deals' },
  { pattern: /(?:show|open)(?:my)?friends/i, action: 'show_friends' },
  { pattern: /(?:track|start)(?:my)?route/i, action: 'start_tracking' },
  { pattern: /stop(?:route)?tracking/i, action: 'stop_tracking' },
  { pattern: /(?:what|show)(?:'s)?trending/i, action: 'trending' },
  { pattern: /(?:filter|show)(.+)(?:only|category)/i, action: 'filter', extract: 1 },
  { pattern: /clear(?:all)?(?:filters)?/i, action: 'clear_filters' },
  { pattern: /zoom(?:in|out)/i, action: 'zoom' },
  { pattern: /(?:tell|show)(?:me)?about(.+)/i, action: 'info', extract: 1 },
];

export const useSelfieCityVoice = () => {
  const { user } = useAuth();
  const { search, processVoiceSearch, getTrendingSearches } = useSelfieCitySearch();
  
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    error: null,
  });
  
  const recognitionRef = useRef<any>(null);
  const callbacksRef = useRef<{
    onSearch?: (query: string, results: any[]) => void;
    onAction?: (action: string, data?: any) => void;
  }>({});

  // Process voice command
  const processCommand = useCallback(async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    console.log('[SelfieCityVoice] Processing:', lowerTranscript);

    // Check for specific commands
    for (const cmd of SELFIE_CITY_COMMANDS) {
      const match = lowerTranscript.match(cmd.pattern);
      if (match) {
        const extractedData = cmd.extract ? match[cmd.extract]?.trim() : undefined;
        
        switch (cmd.action) {
          case 'search':
          case 'search_nearby':
          case 'find_deals': {
            if (extractedData) {
              const results = await processVoiceSearch(extractedData);
              if (results?.results?.length) {
                const topResult = results.results[0];
                speakAs(`I found ${results.results.length} results. The top match is ${topResult.name} in ${topResult.category}.`);
                callbacksRef.current.onSearch?.(extractedData, results.results);
              } else {
                speakAs(`I couldn't find anything for ${extractedData}. Try a different search.`);
              }
            }
            break;
          }
          
          case 'selfie':
            speakAs('Opening camera for your selfie. Strike a pose!');
            callbacksRef.current.onAction?.('open_camera');
            break;
            
          case 'scan':
            speakAs('Scanning mode activated. Point at any product.');
            callbacksRef.current.onAction?.('start_scan');
            break;
            
          case 'show_deals':
            speakAs('Showing all deals near you.');
            callbacksRef.current.onAction?.('filter_deals');
            break;
            
          case 'show_friends':
            speakAs('Showing your friends on the map.');
            callbacksRef.current.onAction?.('filter_friends');
            break;
            
          case 'start_tracking':
            speakAs('Starting route tracking. I\'ll notify you about deals on your path.');
            callbacksRef.current.onAction?.('start_tracking');
            break;
            
          case 'stop_tracking':
            speakAs('Route tracking stopped.');
            callbacksRef.current.onAction?.('stop_tracking');
            break;
            
          case 'trending': {
            const trending = getTrendingSearches();
            speakAs(`Trending now: ${trending.slice(0, 3).join(', ')}`);
            callbacksRef.current.onAction?.('show_trending', trending);
            break;
          }
          
          case 'filter':
            if (extractedData) {
              speakAs(`Filtering by ${extractedData}`);
              callbacksRef.current.onAction?.('apply_filter', extractedData);
            }
            break;
            
          case 'clear_filters':
            speakAs('Filters cleared.');
            callbacksRef.current.onAction?.('clear_filters');
            break;
            
          case 'zoom':
            callbacksRef.current.onAction?.(lowerTranscript.includes('in') ? 'zoom_in' : 'zoom_out');
            break;
            
          case 'navigate':
            if (extractedData) {
              speakAs(`Opening navigation to ${extractedData}`);
              callbacksRef.current.onAction?.('navigate', extractedData);
            }
            break;
            
          case 'info':
            if (extractedData) {
              const results = await processVoiceSearch(extractedData);
              if (results?.zoe_insight) {
                speakAs(results.zoe_insight);
              } else {
                speakAs(`Let me search for information about ${extractedData}`);
                callbacksRef.current.onSearch?.(extractedData, results?.results || []);
              }
            }
            break;
        }
        
        // Log voice command to DHF
        if (user?.id) {
          supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'selfie_city_voice_command',
            event_category: 'voice_interaction',
            context_snippet: lowerTranscript.slice(0, 100),
            metadata: { action: cmd.action, data: extractedData },
            dhf_logged: true,
          });
        }
        
        return true;
      }
    }

    // Fallback to general search
    if (lowerTranscript.length > 2) {
      const results = await processVoiceSearch(lowerTranscript);
      if (results?.results?.length) {
        speakAs(`Searching for ${lowerTranscript}. Found ${results.results.length} results.`);
        callbacksRef.current.onSearch?.(lowerTranscript, results.results);
      }
      return true;
    }

    return false;
  }, [user?.id, processVoiceSearch, getTrendingSearches]);

  // Start listening
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN';

    recognitionRef.current.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({ ...prev, transcript: finalTranscript || interimTranscript }));

      if (finalTranscript) {
        processCommand(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('[SelfieCityVoice] Error:', event.error);
      setState(prev => ({ ...prev, error: event.error, isListening: false }));
    };

    recognitionRef.current.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };

    recognitionRef.current.start();
  }, [processCommand]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopSpeaking();
    setState(prev => ({ ...prev, isListening: false, isSpeaking: false }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Register callbacks
  const registerCallbacks = useCallback((callbacks: {
    onSearch?: (query: string, results: any[]) => void;
    onAction?: (action: string, data?: any) => void;
  }) => {
    callbacksRef.current = callbacks;
  }, []);

  // Speak response
  const speak = useCallback((text: string) => {
    setState(prev => ({ ...prev, isSpeaking: true }));
    speakAs(text, undefined, undefined, () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    });
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    registerCallbacks,
    speak,
  };
};
