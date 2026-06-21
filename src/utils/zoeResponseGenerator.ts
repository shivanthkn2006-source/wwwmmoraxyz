/**
 * Zoe Response Generator - Phase 3: The Voice
 * 
 * Generates conversational, context-aware responses for Zoe.
 * All responses designed to be under 5 seconds when spoken.
 * 
 * Response Style Examples:
 * - "Fly to New York" → "Routing to New York. I see 4 active users and a sale at Fifth Avenue."
 * - "Where is @saraswathi?" → "She is currently in Trivandrum. Locking on to her signal."
 */

import { VoiceIntent } from './processVoiceCommand';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ResponseContext {
  location?: string;
  username?: string;
  query?: string;
  product?: string;
  userCount?: number;
  dealCount?: number;
  friendCount?: number;
  weather?: string;
  temperature?: number;
  nearbyDeals?: string[];
  userLocation?: string;
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE TEMPLATES
// ═══════════════════════════════════════════════════════════════════

const FLY_TO_RESPONSES = [
  (ctx: ResponseContext) => `Routing to ${ctx.location}. ${ctx.userCount ? `I see ${ctx.userCount} active users` : 'Setting coordinates'}${ctx.dealCount ? ` and ${ctx.dealCount} deals nearby` : ''}.`,
  (ctx: ResponseContext) => `Flying to ${ctx.location}. ${ctx.nearbyDeals?.length ? `There's a sale at ${ctx.nearbyDeals[0]}` : 'Hang tight'}.`,
  (ctx: ResponseContext) => `Setting course for ${ctx.location}. ${ctx.weather ? `Weather looks ${ctx.weather}` : 'Initiating flight'}.`,
  (ctx: ResponseContext) => `Locking onto ${ctx.location}. ${ctx.friendCount ? `${ctx.friendCount} friends are nearby` : 'You will be there shortly'}.`,
];

const SHOW_USER_RESPONSES = [
  (ctx: ResponseContext) => `${ctx.username} is currently in ${ctx.userLocation || 'the grid'}. Locking on to their signal.`,
  (ctx: ResponseContext) => `Found ${ctx.username}. ${ctx.userLocation ? `They're in ${ctx.userLocation}` : 'Highlighting their position now'}.`,
  (ctx: ResponseContext) => `Tracking ${ctx.username}. ${ctx.userLocation ? `Signal coming from ${ctx.userLocation}` : 'Stand by'}.`,
];

const FILTER_RESPONSES: Record<string, (ctx: ResponseContext) => string> = {
  friends: (ctx) => `Showing ${ctx.friendCount || 'your'} friends on the globe. ${ctx.friendCount && ctx.friendCount > 5 ? 'Quite the social circle!' : 'Your people, front and center.'}`,
  sales: (ctx) => `Highlighting ${ctx.dealCount || 'active'} deals. ${ctx.nearbyDeals?.length ? `Don't miss ${ctx.nearbyDeals[0]}` : 'Bargains are glowing green'}.`,
  products: (ctx) => `Filtering to products. ${ctx.dealCount ? `${ctx.dealCount} items visible` : 'Showing all available items'}.`,
  premium: (ctx) => `VIP content unlocked. Exclusive deals are now visible.`,
  clear: (ctx) => `Filters cleared. The full globe is yours to explore.`,
};

const SEARCH_RESPONSES = [
  (ctx: ResponseContext) => `Searching for ${ctx.query}. ${ctx.userCount ? `Found ${ctx.userCount} results` : 'Scanning the network'}.`,
  (ctx: ResponseContext) => `Looking for ${ctx.query}. Give me a moment to scan the grid.`,
  (ctx: ResponseContext) => `Hunting down ${ctx.query}. I'll highlight any matches.`,
];

const CAMERA_RESPONSES = {
  open: [
    `Camera ready. Strike a pose!`,
    `Opening camera. Let's capture this moment.`,
    `Camera active. Show me your best angle.`,
  ],
  close: [
    `Camera closed.`,
    `Putting the camera away.`,
  ],
};

const ACTION_RESPONSES: Record<string, string[]> = {
  start_tracking: [
    `Route tracking activated. I'm logging your journey.`,
    `Tracking started. Your path is being recorded.`,
  ],
  stop_tracking: [
    `Tracking stopped. Your route has been saved.`,
    `Route tracking ended. Nice journey!`,
  ],
  go_home: [
    `Taking you home. See you next time!`,
    `Heading back. The globe will be here when you return.`,
  ],
};

const WEATHER_RESPONSES = [
  (ctx: ResponseContext) => `Weather in ${ctx.location || 'this region'}: ${ctx.weather || 'clear skies'}. ${ctx.temperature ? `It's ${ctx.temperature} degrees` : 'Perfect for exploring'}.`,
  (ctx: ResponseContext) => `${ctx.location || 'The region'} is ${ctx.weather || 'looking good'}. ${ctx.temperature ? `Temperature is ${ctx.temperature}` : ''}.`,
  (ctx: ResponseContext) => `Precipitation detected in the Amazon Basin. Visualizing rain patterns now.`,
  (ctx: ResponseContext) => `Scanning for rain. I'm highlighting active precipitation zones on the globe.`,
];

const HELP_RESPONSE = `I can help you navigate Selfie City! Try saying: Fly to Tokyo, Show my friends, Open camera, or Find Nike. What would you like to do?`;

const ZOOM_RESPONSES = {
  in: [`Zooming in.`, `Getting closer.`, `Magnifying.`],
  out: [`Zooming out.`, `Pulling back.`, `Widening the view.`],
};

const ROTATE_RESPONSES = [
  `Spinning the globe.`,
  `Rotating view.`,
];

const RESET_RESPONSES = [
  `Resetting to default view.`,
  `Back to center.`,
];

const UNKNOWN_RESPONSES = [
  `I didn't quite catch that. Try saying "Help" for options.`,
  `Not sure what you mean. Say "Help" to see what I can do.`,
  `Hmm, that's a new one. What would you like me to do?`,
];

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateMockContext = (params: Record<string, any>): ResponseContext => {
  // In a real implementation, this would fetch actual data
  return {
    location: params.location,
    username: params.username?.replace('@', ''),
    query: params.query || params.product,
    product: params.product,
    userCount: Math.floor(Math.random() * 10) + 1,
    dealCount: Math.floor(Math.random() * 8) + 1,
    friendCount: Math.floor(Math.random() * 12) + 1,
    weather: pickRandom(['sunny', 'cloudy', 'clear', 'pleasant']),
    temperature: Math.floor(Math.random() * 30) + 15,
    nearbyDeals: ['Fifth Avenue', 'Oxford Street', 'Shibuya Crossing', 'Rodeo Drive'],
    userLocation: pickRandom(['New York', 'London', 'Tokyo', 'Mumbai', 'Paris', 'Sydney']),
  };
};

// ═══════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════

export const generateZoeResponse = (
  intent: VoiceIntent,
  params: Record<string, any>,
  realContext?: Partial<ResponseContext>
): string => {
  // Merge mock context with any real data provided
  const context: ResponseContext = {
    ...generateMockContext(params),
    ...realContext,
    location: params.location || realContext?.location,
    username: params.username || realContext?.username,
    query: params.query || realContext?.query,
    product: params.product || realContext?.product,
  };

  switch (intent) {
    case 'FLY_TO':
      if (!context.location) return `Where would you like to fly?`;
      return pickRandom(FLY_TO_RESPONSES)(context);

    case 'SHOW_USER':
      if (!context.username) return `Who are you looking for?`;
      return pickRandom(SHOW_USER_RESPONSES)(context);

    case 'SHOW_FRIENDS':
      return FILTER_RESPONSES.friends(context);

    case 'SHOW_DEALS':
      return FILTER_RESPONSES.sales(context);

    case 'SHOW_PRODUCTS':
      return FILTER_RESPONSES.products(context);

    case 'SHOW_PREMIUM':
      return FILTER_RESPONSES.premium(context);

    case 'CLEAR_FILTERS':
      return FILTER_RESPONSES.clear(context);

    case 'FILTER_BY':
      return pickRandom(SEARCH_RESPONSES)(context);

    case 'FILTER_BRAND':
      const brand = params.brand || 'the brand';
      return `Filtering for ${brand}. The globe is dimming and matching clusters are lighting up in neon blue.`;

    case 'SEARCH':
      return pickRandom(SEARCH_RESPONSES)(context);

    case 'OPEN_CAMERA':
    case 'TAKE_SELFIE':
      return pickRandom(CAMERA_RESPONSES.open);

    case 'CLOSE_CAMERA':
      return pickRandom(CAMERA_RESPONSES.close);

    case 'START_TRACKING':
      return pickRandom(ACTION_RESPONSES.start_tracking);

    case 'STOP_TRACKING':
      return pickRandom(ACTION_RESPONSES.stop_tracking);

    case 'GO_HOME':
      return pickRandom(ACTION_RESPONSES.go_home);

    case 'CHECK_WEATHER':
      return pickRandom(WEATHER_RESPONSES)(context);

    case 'ZOOM_IN':
      return pickRandom(ZOOM_RESPONSES.in);

    case 'ZOOM_OUT':
      return pickRandom(ZOOM_RESPONSES.out);

    case 'ROTATE':
      return pickRandom(ROTATE_RESPONSES);

    case 'RESET_VIEW':
      return pickRandom(RESET_RESPONSES);

    case 'HELP':
      return HELP_RESPONSE;

    case 'UNKNOWN':
    default:
      return pickRandom(UNKNOWN_RESPONSES);
  }
};

// ═══════════════════════════════════════════════════════════════════
// RESPONSE WITH REAL DATA
// ═══════════════════════════════════════════════════════════════════

export const generateContextualResponse = async (
  intent: VoiceIntent,
  params: Record<string, any>,
  fetchContext?: () => Promise<Partial<ResponseContext>>
): Promise<string> => {
  try {
    const realContext = fetchContext ? await fetchContext() : undefined;
    return generateZoeResponse(intent, params, realContext);
  } catch {
    return generateZoeResponse(intent, params);
  }
};

export default generateZoeResponse;
