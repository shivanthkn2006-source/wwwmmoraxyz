/**
 * processVoiceCommand - Phase 2 & 3: The "Brain" + Conversational Voice
 * 
 * Takes raw voice transcript and converts it to structured JSON action
 * using Zoe AI (zoe-core-executor), with rich conversational responses.
 * 
 * JSON Schema returned:
 * {
 *   "intent": "FLY_TO" | "FILTER_BY" | "SHOW_USER" | "CHECK_WEATHER" | "OPEN_CAMERA" | etc,
 *   "parameters": { ... },
 *   "response": "Zoe's spoken response (conversational, <5 seconds)",
 *   "confidence": 0-1
 * }
 */

import { supabase } from '@/integrations/supabase/client';
import { generateZoeResponse } from './zoeResponseGenerator';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type VoiceIntent = 
  | 'FLY_TO'
  | 'FILTER_BY'
  | 'FILTER_BRAND'
  | 'SHOW_USER'
  | 'CHECK_WEATHER'
  | 'OPEN_CAMERA'
  | 'CLOSE_CAMERA'
  | 'TAKE_SELFIE'
  | 'SEARCH'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_VIEW'
  | 'ROTATE'
  | 'SHOW_DEALS'
  | 'SHOW_FRIENDS'
  | 'SHOW_PRODUCTS'
  | 'SHOW_PREMIUM'
  | 'CLEAR_FILTERS'
  | 'START_TRACKING'
  | 'STOP_TRACKING'
  | 'GO_HOME'
  | 'HELP'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  intent: VoiceIntent;
  parameters: {
    location?: string;
    product?: string;
    username?: string;
    query?: string;
    filter?: string;
    [key: string]: any;
  };
  response: string;
  confidence: number;
  rawTranscript: string;
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL PATTERN MATCHING (Fast path - no AI needed)
// ═══════════════════════════════════════════════════════════════════

const LOCAL_PATTERNS: Array<{
  patterns: RegExp[];
  intent: VoiceIntent;
  extractParams?: (match: RegExpMatchArray, input: string) => Record<string, any>;
  response: string;
}> = [
  // Navigation
  {
    patterns: [
      /(?:fly|go|take me|navigate|head)\s+(?:to|towards?)\s+(.+)/i,
      /show\s+(?:me\s+)?(.+)\s+on\s+(?:the\s+)?(?:globe|map)/i,
    ],
    intent: 'FLY_TO',
    extractParams: (_, input) => {
      const m = input.match(/(?:fly|go|take me|navigate|show)\s+(?:to|towards?|me)?\s*(.+?)(?:\s+on|\s*$)/i);
      return { location: m?.[1]?.trim().replace(/^the\s+/i, '') };
    },
    response: 'Flying there now!',
  },
  // Camera
  { patterns: [/zoom\s*in/i, /get\s+closer/i], intent: 'ZOOM_IN', response: 'Zooming in.' },
  { patterns: [/zoom\s*out/i, /pull\s+back/i], intent: 'ZOOM_OUT', response: 'Zooming out.' },
  { patterns: [/reset\s+(?:the\s+)?view/i, /center/i], intent: 'RESET_VIEW', response: 'Resetting view.' },
  { patterns: [/rotate\s+(?:the\s+)?globe/i, /spin/i], intent: 'ROTATE', response: 'Rotating the globe.' },
  // Camera/Selfie
  {
    patterns: [/open\s+(?:the\s+)?camera/i, /take\s+(?:a\s+)?(?:selfie|photo|picture)/i],
    intent: 'OPEN_CAMERA',
    response: 'Opening camera. Strike a pose!',
  },
  { patterns: [/close\s+(?:the\s+)?camera/i], intent: 'CLOSE_CAMERA', response: 'Closing camera.' },
  // Filters
  { patterns: [/show\s+(?:my\s+)?friends/i], intent: 'SHOW_FRIENDS', response: 'Showing your friends.' },
  { patterns: [/show\s+(?:the\s+)?deals/i, /sales/i, /discounts/i], intent: 'SHOW_DEALS', response: 'Showing deals.' },
  { patterns: [/show\s+products/i], intent: 'SHOW_PRODUCTS', response: 'Showing products.' },
  { patterns: [/show\s+premium/i, /vip/i, /exclusive/i], intent: 'SHOW_PREMIUM', response: 'Showing premium content.' },
  { patterns: [/clear\s+(?:all\s+)?filters/i, /show\s+all/i], intent: 'CLEAR_FILTERS', response: 'Clearing filters.' },
  // Actions
  { patterns: [/start\s+tracking/i], intent: 'START_TRACKING', response: 'Starting route tracking.' },
  { patterns: [/stop\s+tracking/i], intent: 'STOP_TRACKING', response: 'Stopping route tracking.' },
  { patterns: [/go\s+(?:back\s+)?home/i, /exit/i], intent: 'GO_HOME', response: 'Taking you home.' },
  // Search
  {
    patterns: [/(?:search|find|look)\s+(?:for\s+)?(.+)/i, /where\s+(?:is|are)\s+(.+)/i],
    intent: 'SEARCH',
    extractParams: (_, input) => {
      const m = input.match(/(?:search|find|look|where)\s+(?:for\s+|is\s+|are\s+)?(.+)/i);
      return { query: m?.[1]?.trim() };
    },
    response: 'Searching...',
  },
  // User
  {
    patterns: [/show\s+(?:me\s+)?@?(\w+)/i, /find\s+user\s+@?(\w+)/i],
    intent: 'SHOW_USER',
    extractParams: (match) => ({ username: match[1] }),
    response: 'Looking for that user...',
  },
  // Weather
  {
    patterns: [/(?:what's|what is)\s+the\s+weather/i, /weather\s+in\s+(.+)/i],
    intent: 'CHECK_WEATHER',
    extractParams: (_, input) => {
      const m = input.match(/weather\s+in\s+(.+)/i);
      return { location: m?.[1]?.trim() };
    },
    response: 'Checking weather...',
  },
  // Help
  { patterns: [/help/i, /what\s+can\s+(?:you|I)\s+do/i], intent: 'HELP', response: 'I can help you navigate! Try: "Fly to Paris", "Show deals", "Open camera", or "Find Nike".' },
];

// ═══════════════════════════════════════════════════════════════════
// LOCAL PATTERN MATCHING
// ═══════════════════════════════════════════════════════════════════

const matchLocalPattern = (transcript: string): VoiceCommandResult | null => {
  const input = transcript.toLowerCase().trim();
  
  // Remove wake words
  const wakeWords = ['zoe', 'zoey', 'hey zoe', 'ok zoe', 'system'];
  let cleanInput = input;
  for (const wake of wakeWords) {
    if (cleanInput.startsWith(wake)) {
      cleanInput = cleanInput.slice(wake.length).trim();
      break;
    }
  }

  for (const pattern of LOCAL_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = cleanInput.match(regex);
      if (match) {
        const params = pattern.extractParams?.(match, cleanInput) || {};
        // Use the new conversational response generator
        const conversationalResponse = generateZoeResponse(pattern.intent, params);
        return {
          intent: pattern.intent,
          parameters: params,
          response: conversationalResponse,
          confidence: 0.9,
          rawTranscript: transcript,
        };
      }
    }
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════
// AI INTENT PARSING
// ═══════════════════════════════════════════════════════════════════

const NAVIGATOR_SYSTEM_PROMPT = `You are the Navigator of Selfie City, a voice-controlled 3D globe interface.
Convert user speech into a JSON Action.

Return ONLY valid JSON in this exact schema:
{
  "intent": "FLY_TO" | "FILTER_BY" | "SHOW_USER" | "CHECK_WEATHER" | "OPEN_CAMERA" | "SEARCH" | "ZOOM_IN" | "ZOOM_OUT" | "RESET_VIEW" | "HELP" | "UNKNOWN",
  "parameters": {
    "location": "city name" (if intent is FLY_TO),
    "product": "product/brand name" (if intent is FILTER_BY),
    "username": "@username" (if intent is SHOW_USER),
    "query": "search term" (if intent is SEARCH)
  },
  "response": "Short spoken response to user (10 words max)",
  "confidence": 0.0-1.0
}

Examples:
User: "Take me to Tokyo"
{"intent":"FLY_TO","parameters":{"location":"Tokyo"},"response":"Flying to Tokyo!","confidence":0.95}

User: "Show me red dresses"
{"intent":"FILTER_BY","parameters":{"product":"red dresses"},"response":"Showing red dresses.","confidence":0.9}

User: "Where is @saraswathi"
{"intent":"SHOW_USER","parameters":{"username":"saraswathi"},"response":"Looking for saraswathi...","confidence":0.85}`;

const parseWithAI = async (transcript: string, userId?: string): Promise<VoiceCommandResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
      body: {
        command: transcript,
        userId,
        context: {
          platform: 'selfie_city_navigator',
          systemPrompt: NAVIGATOR_SYSTEM_PROMPT,
        },
        options: {
          forceThinkingLevel: 'low',
          extractIntent: true,
          responseFormat: 'json',
        },
      },
    });

    if (error) throw error;

    // Try to parse JSON from response
    let parsed: any;
    const message = data?.message || data?.response || '';
    
    try {
      // Find JSON in response
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else if (data?.intent) {
        parsed = data.intent;
      }
    } catch {
      // Fall back to structured response
      parsed = {
        intent: data?.intent?.type?.toUpperCase() || 'UNKNOWN',
        parameters: data?.intent?.payload || {},
        response: message.slice(0, 100),
        confidence: data?.intent?.confidence || 0.5,
      };
    }

    // Generate conversational response using the generator
    const conversationalResponse = generateZoeResponse(
      (parsed?.intent as VoiceIntent) || 'UNKNOWN',
      parsed?.parameters || {}
    );

    return {
      intent: (parsed?.intent as VoiceIntent) || 'UNKNOWN',
      parameters: parsed?.parameters || {},
      response: conversationalResponse,
      confidence: parsed?.confidence || 0.5,
      rawTranscript: transcript,
    };

  } catch (err) {
    console.error('[processVoiceCommand] AI parsing failed:', err);
    return {
      intent: 'UNKNOWN',
      parameters: {},
      response: "I had trouble understanding. Please try again.",
      confidence: 0,
      rawTranscript: transcript,
    };
  }
};

// ═══════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════

export const processVoiceCommand = async (
  transcript: string,
  userId?: string
): Promise<VoiceCommandResult> => {
  console.log('[processVoiceCommand] Processing:', transcript);

  // Step 1: Try fast local matching
  const localMatch = matchLocalPattern(transcript);
  if (localMatch) {
    console.log('[processVoiceCommand] Local match:', localMatch.intent);
    return localMatch;
  }

  // Step 2: Fall back to AI
  console.log('[processVoiceCommand] Using AI for complex intent');
  return await parseWithAI(transcript, userId);
};

// ═══════════════════════════════════════════════════════════════════
// INTENT ACTION EXECUTOR
// ═══════════════════════════════════════════════════════════════════

export const executeVoiceIntent = (
  result: VoiceCommandResult,
  handlers: {
    onFlyTo?: (location: string) => void;
    onZoom?: (direction: 'in' | 'out') => void;
    onReset?: () => void;
    onRotate?: () => void;
    onFilter?: (filter: string) => void;
    onSearch?: (query: string) => void;
    onCamera?: (action: 'open' | 'close') => void;
    onTracking?: (action: 'start' | 'stop') => void;
    onUser?: (username: string) => void;
    onHome?: () => void;
    onHelp?: () => void;
    onUnknown?: (transcript: string) => void;
  }
): void => {
  const { intent, parameters } = result;

  switch (intent) {
    case 'FLY_TO':
      if (parameters.location) handlers.onFlyTo?.(parameters.location);
      break;
    case 'ZOOM_IN':
      handlers.onZoom?.('in');
      break;
    case 'ZOOM_OUT':
      handlers.onZoom?.('out');
      break;
    case 'RESET_VIEW':
      handlers.onReset?.();
      break;
    case 'ROTATE':
      handlers.onRotate?.();
      break;
    case 'SHOW_FRIENDS':
      handlers.onFilter?.('friends');
      break;
    case 'SHOW_DEALS':
      handlers.onFilter?.('sales');
      break;
    case 'SHOW_PRODUCTS':
      handlers.onFilter?.('products');
      break;
    case 'SHOW_PREMIUM':
      handlers.onFilter?.('premium');
      break;
    case 'CLEAR_FILTERS':
      handlers.onFilter?.('clear');
      break;
    case 'FILTER_BY':
      if (parameters.product) handlers.onSearch?.(parameters.product);
      break;
    case 'SEARCH':
      if (parameters.query) handlers.onSearch?.(parameters.query);
      break;
    case 'OPEN_CAMERA':
    case 'TAKE_SELFIE':
      handlers.onCamera?.('open');
      break;
    case 'CLOSE_CAMERA':
      handlers.onCamera?.('close');
      break;
    case 'START_TRACKING':
      handlers.onTracking?.('start');
      break;
    case 'STOP_TRACKING':
      handlers.onTracking?.('stop');
      break;
    case 'SHOW_USER':
      if (parameters.username) handlers.onUser?.(parameters.username);
      break;
    case 'GO_HOME':
      handlers.onHome?.();
      break;
    case 'HELP':
      handlers.onHelp?.();
      break;
    default:
      handlers.onUnknown?.(result.rawTranscript);
  }
};

export default processVoiceCommand;
