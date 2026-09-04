/**
 * UNIFIED INTENT TAXONOMY
 *
 * One vocabulary shared by every Zoe surface (chat, orb, voice, agent) so the
 * lineage ledger and the audit dashboards can answer "what did the user ask for
 * and did we handle it?". Anything that does not match a known intent is
 * recorded as `unknown` and flagged as an unhandled intent in the audit.
 */
export const ZOE_INTENTS = [
  'navigate',
  'search',
  'create_content',
  'media_generate',
  'dhf_write',
  'dhf_query',
  'memory_recall',
  'astrology',
  'growth_coaching',
  'social_action',
  'settings',
  'diagnostics',
  'smalltalk',
  'unknown',
] as const;

export type ZoeIntent = (typeof ZOE_INTENTS)[number];

const PATTERNS: Array<[ZoeIntent, RegExp]> = [
  ['navigate', /\b(open|go to|take me to|show me the|navigate)\b.*\b(page|dashboard|feed|menu|settings|profile|home)\b|\bopen\s+\/[a-z-]+/i],
  ['search', /\b(search|find|look up|lookup|who is|what is|where is)\b/i],
  ['media_generate', /\b(generate|create|make|draw)\b.*\b(image|picture|video|photo|art|avatar)\b/i],
  ['create_content', /\b(post|write|draft|compose|caption)\b/i],
  ['dhf_write', /\b(remember this|save this|log this|record this|add to my dhf|store this)\b/i],
  ['dhf_query', /\b(my dhf|digital fingerprint|my vectors|my profile data|my timeline)\b/i],
  ['memory_recall', /\b(do you remember|what did i (say|tell you)|recall|last time)\b/i],
  ['astrology', /\b(horoscope|astrology|birth chart|nakshatra|dasha|transit|zodiac|rashi)\b/i],
  ['growth_coaching', /\b(goal|habit|motivat|improve|discipline|routine|focus area)\b/i],
  ['social_action', /\b(like|comment|follow|share|message|dm|friend request)\b/i],
  ['settings', /\b(setting|preference|turn (on|off)|enable|disable|volume|theme|notification)\b/i],
  ['diagnostics', /\b(error|bug|not working|broken|status|health|diagnos|why did .* fail)\b/i],
  ['smalltalk', /\b(hi|hello|hey|how are you|good (morning|evening|night)|thanks|thank you)\b/i],
];

export interface IntentResult {
  intent: ZoeIntent;
  unhandled: boolean;
}

export function classifyZoeIntent(text: string): IntentResult {
  const clean = (text ?? '').trim();
  if (!clean) return { intent: 'unknown', unhandled: true };
  for (const [intent, pattern] of PATTERNS) {
    if (pattern.test(clean)) return { intent, unhandled: false };
  }
  return { intent: 'unknown', unhandled: true };
}
