export type ZoeMood = 'neutral' | 'cyan' | 'gold';
export type WalkTalkMode = 'discovery' | 'history' | 'monuments' | 'nature' | 'urban' | 'quiet';

export const zoeUiTimeFormatter = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
});

export const MAX_PERSISTED_MESSAGES = 95;

export const ZOE_IDLE_ALERTS = [
  'Hey… are you okay? I’m here if you need me.',
  'You went quiet for a bit — is anything bothering you?',
  'Just checking in… do you need help with something?',
  'Did you forget something, or want me to help you get somewhere?',
  'I noticed the silence. Want to talk, or want a hand with anything?',
];

const UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

export const isUuidValue = (value: string): boolean => UUID_LIKE_REGEX.test(value);

export const WALK_TALK_START_PATTERNS = [
  /\bstart\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bturn\s+on\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bwalk\s+with\s+me\b/i,
  /\bguide\s+me\s+while\s+i\s+walk\b/i,
  /\bnarrate\s+my\s+walk\b/i,
];

export const WALK_TALK_STOP_PATTERNS = [
  /\bstop\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bturn\s+off\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bpause\s+(walk\s*&?\s*talk|walktalk)\b/i,
];

export const LOCATION_INSIGHT_PATTERNS = [
  /\bwhere\s+am\s+i\b/i,
  /\bwhat\s+place\s+is\s+this\b/i,
  /\btell\s+me\s+about\s+(this\s+place|where\s+i\s+am|my\s+location)\b/i,
  /\bwhat('?s|\s+is)\s+around\s+me\b/i,
  /\bnearby\s+(places|landmarks|spots|things)\b/i,
  /\bwhat\s+can\s+you\s+tell\s+me\s+about\s+this\s+place\b/i,
  /\bwhat\s+do\s+you\s+know\s+about\s+this\s+area\b/i,
];

export const WALK_TALK_MODE_PATTERNS: Array<{ mode: WalkTalkMode; pattern: RegExp }> = [
  { mode: 'history', pattern: /\b(history|historical|past|old\s+city|heritage)\b/i },
  { mode: 'monuments', pattern: /\b(monument|landmark|temple|museum|statue|architecture)\b/i },
  { mode: 'nature', pattern: /\b(nature|park|trees|forest|lake|river|garden|beach)\b/i },
  { mode: 'urban', pattern: /\b(urban|city|street|downtown|market|neighborhood)\b/i },
  { mode: 'quiet', pattern: /\b(quiet|silent|soft|minimal)\b/i },
];

export const resolveWalkTalkMode = (input: string): WalkTalkMode => {
  const match = WALK_TALK_MODE_PATTERNS.find(({ pattern }) => pattern.test(input));
  return match?.mode || 'discovery';
};

export const getWalkTalkModeLabel = (mode: WalkTalkMode): string => {
  switch (mode) {
    case 'history':
      return 'history';
    case 'monuments':
      return 'monuments';
    case 'nature':
      return 'nature';
    case 'urban':
      return 'urban';
    case 'quiet':
      return 'quiet';
    default:
      return 'discovery';
  }
};

export const getWalkTalkErrorMessage = (error: unknown): string => {
  if (typeof GeolocationPositionError !== 'undefined' && error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) return 'I need location access before I can guide you through the place around you.';
    if (error.code === error.POSITION_UNAVAILABLE) return 'I cannot lock onto your location right now. Try again in a moment.';
    if (error.code === error.TIMEOUT) return 'Your location request timed out. Try again when the signal is steadier.';
  }

  return 'I could not tune into your location right now. Try again in a moment.';
};
