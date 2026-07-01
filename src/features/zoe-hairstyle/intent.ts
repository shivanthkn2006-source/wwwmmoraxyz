// Zoe Hairstyle intent detection — self-contained
export type Gender = 'men' | 'women' | 'any';

export interface HairstyleIntent {
  matched: boolean;
  gender?: Gender;
  raw: string;
}

const TRIGGER = /\b(hair\s*style|hairstyle|haircut|new\s+hair|try\s+.*hair|change\s+.*hair|barber|salon|hair\s+color|dye\s+.*hair)\b/i;

export function detectHairstyleIntent(text: string): HairstyleIntent {
  if (!text || typeof text !== 'string') return { matched: false, raw: text };
  if (!TRIGGER.test(text)) return { matched: false, raw: text };
  let gender: Gender = 'any';
  if (/\b(men|man|male|guy|boy)\b/i.test(text)) gender = 'men';
  else if (/\b(women|woman|female|girl|lady)\b/i.test(text)) gender = 'women';
  return { matched: true, gender, raw: text };
}

export const ZOE_HAIRSTYLE_OPEN_EVENT = 'zoe-hairstyle:open';

export function emitOpenHairstyle(detail: { gender?: Gender; prompt?: string } = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZOE_HAIRSTYLE_OPEN_EVENT, { detail }));
}
