/**
 * Zoe search companion — the conversational layer that sits on top of the
 * home search bar.
 *
 * Everything in this module is PURE and SYNCHRONOUS on purpose: the line Zoe
 * shows (and optionally speaks) while the user is still typing must never wait
 * on a network round trip, an edge function or a model. Retrieval stays exactly
 * where it was; this only decides *what Zoe says* and *where she should look*.
 */

/** Where Zoe should look for an answer. */
export type SearchScope = 'mmora' | 'web' | 'both';

/** Coarse topic buckets, derived locally from the raw query. */
export type SearchTopic =
  | 'greeting'
  | 'people'
  | 'media'
  | 'shopping'
  | 'food'
  | 'news'
  | 'weather'
  | 'howto'
  | 'platform'
  | 'general';

export interface CompanionTurn {
  topic: SearchTopic;
  /** Scope Zoe would pick if the user never answers. */
  suggestedScope: SearchScope;
  /** True when Zoe already knows the preference and just proceeds. */
  auto: boolean;
  /** The sentence rendered in the panel. */
  text: string;
  /** Shorter phrasing used for speech (no punctuation noise). */
  speech: string;
  /** Scope chips to offer; empty when Zoe is proceeding on her own. */
  options: SearchScope[];
}

export const SCOPE_LABEL: Record<SearchScope, string> = {
  mmora: 'Inside M’Mora',
  web: 'The web',
  both: 'Both',
};

const RULES: { topic: SearchTopic; scope: SearchScope; test: RegExp }[] = [
  { topic: 'greeting', scope: 'mmora', test: /^(hi|hey|hello|yo|hola|namaste|good\s?(morning|evening|afternoon|night)|zoe)\b/i },
  { topic: 'weather', scope: 'web', test: /\b(weather|forecast|temperature|rain|humidity|monsoon|snow)\b/i },
  { topic: 'news', scope: 'web', test: /\b(news|headline|breaking|today'?s|latest|update[sd]?|election|market)\b/i },
  { topic: 'shopping', scope: 'web', test: /\b(buy|price|cheap|deal|discount|phone|iphone|laptop|shoes|watch|order|shop|amazon|best\s+\w+\s+under)\b/i },
  { topic: 'food', scope: 'both', test: /\b(food|recipe|restaurant|cafe|eat|dinner|lunch|breakfast|biryani|pizza|coffee|menu)\b/i },
  { topic: 'people', scope: 'mmora', test: /(^@)|\b(profile|member|friend|creator|user|who\s+is)\b/i },
  { topic: 'media', scope: 'both', test: /\b(loop|reel|short|video|photo|image|post|clip|story)\b/i },
  { topic: 'platform', scope: 'mmora', test: /\b(setting|settings|dhf|vault|growth|notification|admin|orb|mmora|m'?mora)\b/i },
  { topic: 'howto', scope: 'web', test: /\b(how|why|what|when|where|explain|meaning|define|tutorial)\b/i },
];

/** Locally classify a query into a topic + the scope Zoe would default to. */
export function classifyQuery(raw: string): { topic: SearchTopic; scope: SearchScope } {
  const query = (raw || '').trim();
  if (!query) return { topic: 'general', scope: 'mmora' };
  for (const rule of RULES) {
    if (rule.test.test(query)) return { topic: rule.topic, scope: rule.scope };
  }
  return { topic: 'general', scope: 'both' };
}

const ASK: Record<SearchTopic, (q: string) => string> = {
  greeting: () => 'Hey — I’m right here. Tell me what to look for and I’ll search M’Mora or the whole web for you.',
  people: (q) => `Looking for someone called “${q}”? I can check M’Mora members, or widen it to the web.`,
  media: (q) => `Want me to pull “${q}” from M’Mora loops and posts, or find it out on the web too?`,
  shopping: (q) => `“${q}” sounds like shopping. Shall I price it across the web, or keep it inside M’Mora?`,
  food: (q) => `Hungry for “${q}”? I can check what M’Mora people posted, or search the web for places and recipes.`,
  news: (q) => `I can bring live coverage on “${q}” from the web, or stay inside M’Mora. Which one?`,
  weather: () => 'I can fetch live weather for your location from the web — want me to?',
  howto: (q) => `I can answer “${q}” from the open web, or from what M’Mora already knows. Your call.`,
  platform: (q) => `“${q}” looks like something inside M’Mora. Want me to search the platform, or the web as well?`,
  general: (q) => `Want me to search “${q}” inside M’Mora, out on the web, or both?`,
};

const AUTO: Record<SearchScope, (q: string, topic: SearchTopic) => string> = {
  mmora: (q) => `Searching M’Mora for “${q}” — the way you like it.`,
  web: (q) => `Searching the web for “${q}” — one moment.`,
  both: (q) => `Checking M’Mora and the web for “${q}”.`,
};

function toSpeech(text: string): string {
  return text.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Build the turn Zoe shows next to the search bar.
 *
 * @param query        raw text currently in the search bar
 * @param remembered   scope the user previously chose for this topic, if any
 */
export function buildCompanionTurn(query: string, remembered?: SearchScope | null): CompanionTurn | null {
  const term = (query || '').trim();
  if (term.length < 2) return null;

  const { topic, scope } = classifyQuery(term);

  if (remembered) {
    const text = AUTO[remembered](term, topic);
    return { topic, suggestedScope: remembered, auto: true, text, speech: toSpeech(text), options: [] };
  }

  const text = ASK[topic](term);
  const options: SearchScope[] = topic === 'weather' ? ['web', 'mmora'] : ['mmora', 'web', 'both'];
  return { topic, suggestedScope: scope, auto: false, text, speech: toSpeech(text), options };
}

/** Whether external (web) retrieval should run for the active scope. */
export function scopeAllowsWeb(scope: SearchScope | null): boolean {
  return scope !== 'mmora';
}

/** Whether platform retrieval should run for the active scope. */
export function scopeAllowsPlatform(scope: SearchScope | null): boolean {
  return scope !== 'web';
}
