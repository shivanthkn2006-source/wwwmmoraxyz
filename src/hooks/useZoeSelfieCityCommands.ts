/**
 * ZOE SELFIE CITY VOICE COMMANDS
 * 
 * Comprehensive voice command integration for Selfie City.
 * Registers 40+ voice commands for hands-free AR commerce navigation.
 * All commands dispatch events that SelfieCityPage consumes.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Command action types
export type SelfieCityAction = 
  | 'open_camera'
  | 'close_camera'
  | 'take_selfie'
  | 'post_selfie'
  | 'fly_to_location'
  | 'search_query'
  | 'filter_friends'
  | 'filter_sales'
  | 'filter_products'
  | 'filter_premium'
  | 'filter_brand'
  | 'clear_filters'
  | 'show_filters'
  | 'hide_filters'
  | 'show_notifications'
  | 'hide_notifications'
  | 'start_tracking'
  | 'stop_tracking'
  | 'zoom_in'
  | 'zoom_out'
  | 'rotate_globe'
  | 'reset_view'
  | 'show_deals'
  | 'show_brands'
  | 'find_nearby'
  | 'show_friends'
  | 'open_pin'
  | 'close_pin'
  | 'like_post'
  | 'share_post'
  | 'comment_post'
  | 'enable_vip'
  | 'show_trending'
  | 'check_weather'
  | 'go_home'
  | 'help';

export interface VoiceCommandResult {
  action: SelfieCityAction;
  payload?: Record<string, any>;
  response: string;
  confidence: number;
}

// Voice command patterns with regex and associated actions
const SELFIE_CITY_COMMAND_PATTERNS: Array<{
  patterns: RegExp[];
  action: SelfieCityAction;
  extractPayload?: (match: RegExpMatchArray, input: string) => Record<string, any>;
  response: string;
}> = [
  // Camera Commands
  {
    patterns: [
      /open camera/i,
      /take (a )?selfie/i,
      /start camera/i,
      /capture (my )?look/i,
      /post (my )?look/i,
      /show camera/i,
    ],
    action: 'open_camera',
    response: 'Opening camera. Strike your best pose!',
  },
  {
    patterns: [/close camera/i, /cancel camera/i, /exit camera/i],
    action: 'close_camera',
    response: 'Closing camera.',
  },
  {
    patterns: [/post (this )?selfie/i, /upload (this )?selfie/i, /share (this )?selfie/i],
    action: 'post_selfie',
    response: 'Posting your selfie to the globe!',
  },

  // Navigation & Globe Commands
  {
    patterns: [
      /fly to (.+)/i,
      /go to (.+)/i,
      /take me to (.+)/i,
      /show me (.+) on (the )?globe/i,
      /navigate to (.+)/i,
      /find (.+) on (the )?map/i,
    ],
    action: 'fly_to_location',
    extractPayload: (match, input) => {
      // Extract location from the match
      const locationMatch = input.match(/(?:fly to|go to|take me to|show me|navigate to|find)\s+(.+?)(?:\s+on|\s*$)/i);
      return { location: locationMatch?.[1]?.trim() || match[1]?.trim() };
    },
    response: 'Flying to your destination...',
  },
  {
    patterns: [/zoom in/i, /closer/i, /magnify/i],
    action: 'zoom_in',
    response: 'Zooming in.',
  },
  {
    patterns: [/zoom out/i, /farther/i, /pull back/i],
    action: 'zoom_out',
    response: 'Zooming out.',
  },
  {
    patterns: [/rotate (the )?globe/i, /spin (the )?globe/i, /turn (the )?globe/i],
    action: 'rotate_globe',
    response: 'Rotating the globe.',
  },
  {
    patterns: [/reset view/i, /default view/i, /home view/i, /center globe/i],
    action: 'reset_view',
    response: 'Resetting to default view.',
  },

  // Search Commands
  {
    patterns: [
      /search for (.+)/i,
      /find (.+)/i,
      /look for (.+)/i,
      /where (is|are|can I find) (.+)/i,
      /show me (.+)/i,
    ],
    action: 'search_query',
    extractPayload: (match, input) => {
      const queryMatch = input.match(/(?:search for|find|look for|show me)\s+(.+)/i) ||
        input.match(/where (?:is|are|can I find)\s+(.+)/i);
      return { query: queryMatch?.[1]?.trim() };
    },
    response: 'Searching...',
  },

  // Filter Commands
  {
    patterns: [/show friends/i, /filter friends/i, /friends only/i, /my friends/i],
    action: 'filter_friends',
    response: 'Showing friends.',
  },
  {
    patterns: [/show sales/i, /filter sales/i, /show deals/i, /deals only/i],
    action: 'filter_sales',
    response: 'Showing sales and deals.',
  },
  {
    patterns: [/show products/i, /filter products/i, /products only/i],
    action: 'filter_products',
    response: 'Showing products.',
  },
  {
    patterns: [/show premium/i, /filter premium/i, /premium only/i, /vip (mode|only)/i, /exclusive/i],
    action: 'filter_premium',
    response: 'Showing premium content.',
  },
  {
    patterns: [/clear filters/i, /reset filters/i, /show all/i, /remove filters/i],
    action: 'clear_filters',
    response: 'Clearing all filters.',
  },
  {
    patterns: [/open filters/i, /show filter panel/i, /filter options/i],
    action: 'show_filters',
    response: 'Opening filter panel.',
  },
  {
    patterns: [/close filters/i, /hide filter panel/i],
    action: 'hide_filters',
    response: 'Closing filter panel.',
  },

  // Notification Commands
  {
    patterns: [/show notifications/i, /open alerts/i, /my alerts/i, /show alerts/i],
    action: 'show_notifications',
    response: 'Opening notifications.',
  },
  {
    patterns: [/close notifications/i, /hide alerts/i, /dismiss alerts/i],
    action: 'hide_notifications',
    response: 'Closing notifications.',
  },

  // Tracking Commands
  {
    patterns: [/start tracking/i, /track my route/i, /enable tracking/i, /follow me/i],
    action: 'start_tracking',
    response: 'Starting route tracking.',
  },
  {
    patterns: [/stop tracking/i, /end tracking/i, /disable tracking/i],
    action: 'stop_tracking',
    response: 'Stopping route tracking.',
  },

  // Discovery Commands
  {
    patterns: [/nearby deals/i, /deals near me/i, /what('s| is) nearby/i],
    action: 'find_nearby',
    response: 'Finding deals near you.',
  },
  {
    patterns: [/trending/i, /what('s| is) hot/i, /popular/i],
    action: 'show_trending',
    response: 'Showing trending content.',
  },
  {
    patterns: [/show brands/i, /brand list/i, /all brands/i],
    action: 'show_brands',
    response: 'Showing all brands.',
  },

  // Pin Interaction Commands
  {
    patterns: [/like (this|the) (post|selfie)/i, /heart (this|it)/i],
    action: 'like_post',
    response: 'Liked!',
  },
  {
    patterns: [/share (this|the) (post|selfie)/i],
    action: 'share_post',
    response: 'Opening share options.',
  },
  {
    patterns: [/comment on (this|the) (post|selfie)/i, /add comment/i],
    action: 'comment_post',
    response: 'Opening comments.',
  },
  {
    patterns: [/close (this|the) (post|pin|card)/i, /dismiss/i],
    action: 'close_pin',
    response: 'Closing.',
  },

  // Navigation Commands
  {
    patterns: [/go home/i, /back to home/i, /exit selfie city/i],
    action: 'go_home',
    response: 'Going back home.',
  },

  // Help Commands
  {
    patterns: [/help/i, /what can (you|I) (do|say)/i, /commands/i],
    action: 'help',
    response: 'I can help you navigate Selfie City! Try saying: "Fly to Mumbai", "Show premium deals", "Open camera", or "Find Nike stores".',
  },
];

export const useZoeSelfieCityCommands = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [commandHistory, setCommandHistory] = useState<VoiceCommandResult[]>([]);

  // Process a voice command
  const processCommand = useCallback(async (transcript: string): Promise<VoiceCommandResult | null> => {
    if (!transcript || transcript.trim().length === 0) return null;

    setIsProcessing(true);
    const cleanInput = transcript.trim().toLowerCase();

    try {
      // Find matching command pattern
      for (const cmdDef of SELFIE_CITY_COMMAND_PATTERNS) {
        for (const pattern of cmdDef.patterns) {
          const match = cleanInput.match(pattern);
          if (match) {
            const payload = cmdDef.extractPayload?.(match, cleanInput) || {};
            
            const result: VoiceCommandResult = {
              action: cmdDef.action,
              payload,
              response: cmdDef.response,
              confidence: 0.9,
            };

            // Dispatch event for SelfieCityPage to consume
            window.dispatchEvent(new CustomEvent('selfie-city-voice-action', {
              detail: result
            }));

            // Log to DHF behavioral events (fire and forget)
            if (user?.id) {
              (async () => {
                try {
                  await supabase.from('behavioral_events').insert({
                    user_id: user.id,
                    event_type: 'selfie_city_voice_command',
                    event_category: 'ar_commerce',
                    context_snippet: transcript.slice(0, 100),
                    metadata: {
                      action: result.action,
                      payload: result.payload,
                      confidence: result.confidence,
                    },
                    dhf_logged: true,
                  });
                } catch (err) {
                  console.error('[DHF Log Error]', err);
                }
              })();
            }

            setLastCommand(result);
            setCommandHistory(prev => [...prev.slice(-19), result]);
            setIsProcessing(false);

            return result;
          }
        }
      }

      // No match found - check if it's a search intent
      const fallbackResult: VoiceCommandResult = {
        action: 'search_query',
        payload: { query: cleanInput },
        response: `Searching for "${cleanInput}"...`,
        confidence: 0.6,
      };

      window.dispatchEvent(new CustomEvent('selfie-city-voice-action', {
        detail: fallbackResult
      }));

      setLastCommand(fallbackResult);
      setIsProcessing(false);
      return fallbackResult;

    } catch (error) {
      console.error('[useZoeSelfieCityCommands] Error processing command:', error);
      setIsProcessing(false);
      return null;
    }
  }, [user?.id]);

  // Listen for voice commands from other systems (e.g., ZoeCoreUnifiedProvider)
  useEffect(() => {
    const handleExternalCommand = (e: CustomEvent<{ command?: string; transcript?: string }>) => {
      const cmd = String(e.detail?.command ?? e.detail?.transcript ?? '').toLowerCase();
      if (!cmd) return;
      
      // Only process if it's a Selfie City related command
      if (
        cmd.includes('selfie') ||
        cmd.includes('globe') ||
        cmd.includes('fly to') ||
        cmd.includes('camera') ||
        cmd.includes('deal') ||
        cmd.includes('brand') ||
        cmd.includes('filter') ||
        cmd.includes('premium') ||
        cmd.includes('track')
      ) {
        processCommand(e.detail.command);
      }
    };

    window.addEventListener('zoe-voice-command', handleExternalCommand as EventListener);
    return () => window.removeEventListener('zoe-voice-command', handleExternalCommand as EventListener);
  }, [processCommand]);

  // Get available commands for help display
  const getAvailableCommands = useCallback((): string[] => {
    return [
      'Open camera / Take a selfie',
      'Fly to [location]',
      'Search for [product/brand]',
      'Show friends / sales / premium',
      'Clear filters',
      'Show notifications',
      'Start/Stop tracking',
      'Zoom in/out',
      'Reset view',
      'Like/Share/Comment on post',
      'What\'s nearby?',
      'Show trending',
      'Help',
    ];
  }, []);

  return {
    isProcessing,
    lastCommand,
    commandHistory,
    processCommand,
    getAvailableCommands,
  };
};
