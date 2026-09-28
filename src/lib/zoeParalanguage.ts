/**
 * Zoe paralanguage + per-member voice traits + frequent-answer memory.
 *
 * - detectUserCues: finds "hmm", laughter, fillers and backchannels in what the
 *   member said (typed or spoken transcript).
 * - recordVoiceTraits: counts those cues and topic usage in the member's DHF
 *   (zoe_voice_traits) so future replies adapt to their style.
 * - PARALANGUAGE_INSTRUCTION + applyParalanguage: Zoe may open a reply with ONE
 *   human sound tag; it is turned into natural text ("Oh, ...") so the chat
 *   bubble and the Deepgram voice say the same thing through the one voice queue.
 * - Frequent answers: repeat, non-time-sensitive questions are answered from
 *   the member's saved copy instead of spending AI tokens.
 */
import { supabase } from '@/integrations/supabase/client';

export type UserCue = 'hmm' | 'laugh' | 'filler' | 'backchannel';

const CUE_PATTERNS: Record<UserCue, RegExp> = {
  hmm: /\b(h+m+m*|hm+|mm+h?m*)\b/i,
  laugh: /\b(ha(ha)+h?|he(he)+|hi(hi)+|lol+|lmao|rofl|haa+)\b|😂|🤣|\[laugh(ter|s|ing)?\]|\(laugh(ter|s|ing)?\)/i,
  filler: /\b(u+m+|u+h+|e+r+m*|a+h+)\b/i,
  backchannel: /^\s*(mhm+|uh[- ]?huh|yeah|yep|okay|ok|right)\s*[.!?]*\s*$/i,
};

export function detectUserCues(text: string): UserCue[] {
  const t = text || '';
  return (Object.keys(CUE_PATTERNS) as UserCue[]).filter((k) => CUE_PATTERNS[k].test(t));
}

const TOPIC_PATTERNS: Record<string, RegExp> = {
  weather: /\b(weather|rain|umbrella|temperature|forecast)\b/i,
  astrology: /\b(horoscope|astrology|planet|zodiac|chart|tomorrow|next (month|year))\b/i,
  love: /\b(love|relationship|partner|dating|marriage)\b/i,
  career: /\b(career|job|work|boss|business|money)\b/i,
  health: /\b(health|sleep|tired|pain|eyes|headache|diet)\b/i,
  jokes: /\b(joke|funny|laugh|lol)\b/i,
  news: /\b(news|latest|score|match)\b/i,
  music: /\b(music|song|play)\b/i,
};

export function detectTopics(text: string): string[] {
  return Object.keys(TOPIC_PATTERNS).filter((k) => TOPIC_PATTERNS[k].test(text));
}

type Traits = { cues: Record<string, number>; topics: Record<string, number> };
let traitsCache: { uid: string; traits: Traits } | null = null;

async function currentUid(userId?: string): Promise<string | null> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export async function loadVoiceTraits(userId?: string): Promise<Traits | null> {
  const uid = await currentUid(userId);
  if (!uid) return null;
  if (traitsCache?.uid === uid) return traitsCache.traits;
  const { data } = await supabase.from('zoe_voice_traits' as any).select('cues,topics').eq('user_id', uid).maybeSingle();
  const traits: Traits = { cues: ((data as any)?.cues ?? {}), topics: ((data as any)?.topics ?? {}) };
  traitsCache = { uid, traits };
  return traits;
}

export async function recordVoiceTraits(text: string, userId?: string): Promise<void> {
  const cues = detectUserCues(text);
  const topics = detectTopics(text);
  if (!cues.length && !topics.length) return;
  const uid = await currentUid(userId);
  if (!uid) return;
  const traits = (await loadVoiceTraits(uid)) ?? { cues: {}, topics: {} };
  cues.forEach((c) => { traits.cues[c] = (traits.cues[c] ?? 0) + 1; });
  topics.forEach((t) => { traits.topics[t] = (traits.topics[t] ?? 0) + 1; });
  traitsCache = { uid, traits };
  await supabase.from('zoe_voice_traits' as any).upsert(
    { user_id: uid, cues: traits.cues, topics: traits.topics, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

/** One short system line describing this member's style (empty if nothing learned). */
export function describeTraits(traits: Traits | null, currentCues: UserCue[]): string {
  const parts: string[] = [];
  if (currentCues.includes('laugh')) parts.push('The member is laughing right now — match the light mood (a warm "Haha" or "Aha" is fine).');
  if (currentCues.includes('hmm')) parts.push('The member said "hmm" — they are thinking or unsure; gently help them decide or ask what is on their mind.');
  if (currentCues.includes('backchannel')) parts.push('The member only acknowledged ("mhm/yeah/ok") — continue briefly, do not restart the topic.');
  if (traits) {
    const c = traits.cues;
    if ((c.laugh ?? 0) >= 3) parts.push('This member laughs often and enjoys playful replies.');
    if ((c.hmm ?? 0) >= 3) parts.push('This member often says "hmm" while thinking — give them space and clear options.');
    const top = Object.entries(traits.topics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    if (top.length) parts.push(`Topics this member uses most: ${top.join(', ')}.`);
  }
  return parts.join(' ');
}

export const PARALANGUAGE_INSTRUCTION = `Human sounds: when it genuinely fits, you may start your reply with exactly ONE tag, then your answer:
[BACKCHANNEL: Mhm|Mm|Yeah] when the member paused mid-thought; [HESITATION: Um|Hmm|Ah] before a complex answer; [REACTION: Oh|Ooh|Wow|Aha|Haha] for surprise, realisation or laughter; [PHYSICAL: Oof|Ugh|Phew] for empathy with distress or relief.
Never chain two tags. Vary the sound from your previous turn. For plain factual replies, use no tag.`;

const TAG_RE = /^\s*\[(BACKCHANNEL|HESITATION|REACTION|PHYSICAL)\s*:\s*([A-Za-z]+)\s*\]\s*/i;
const ANY_TAG_RE = /\[(BACKCHANNEL|HESITATION|REACTION|PHYSICAL)\s*:\s*[^\]]*\]\s*/gi;
let lastSound = '';

/** Turns the leading tag into a natural spoken opener and removes any stray tags. */
export function applyParalanguage(reply: string): string {
  if (!reply) return reply;
  const m = reply.match(TAG_RE);
  let rest = reply.replace(TAG_RE, '').replace(ANY_TAG_RE, '').trim();
  if (!m) return rest;
  const sound = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  if (sound.toLowerCase() === lastSound) return rest; // no repeating the same sound twice in a row
  lastSound = sound.toLowerCase();
  const joiner = /^(Hmm|Um|Ah|Mm)$/.test(sound) ? '... ' : ', ';
  if (rest) rest = rest.charAt(0).toUpperCase() + rest.slice(1);
  return rest ? `${sound}${joiner}${rest}` : `${sound}.`;
}

// ─── Frequent answers (token saver) ────────────────────────────────────────
const TIME_SENSITIVE = /\b(today|tonight|now|tomorrow|yesterday|latest|news|current|weather|rain|umbrella|score|price|time|date|this (week|month|year)|next|last|recent|doing|wear|see|camera|notification|message|remind|open|play|call)\b/i;

export function questionKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\b(please|zoe|hey|hi|can you|could you|tell me|the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isCacheable(text: string): boolean {
  const k = questionKey(text);
  return k.length >= 8 && k.split(' ').length >= 3 && !TIME_SENSITIVE.test(text) && detectUserCues(text).length === 0;
}

/** Returns a saved answer when this member has asked the same question before. */
export async function frequentAnswer(text: string, userId?: string): Promise<string | null> {
  if (!isCacheable(text)) return null;
  const uid = await currentUid(userId);
  if (!uid) return null;
  const key = questionKey(text);
  const { data } = await supabase.from('zoe_frequent_answers' as any)
    .select('id,answer,hits,last_used_at').eq('user_id', uid).eq('question_key', key).maybeSingle();
  const row = data as any;
  if (!row) return null;
  // Saved answers stay fresh for 30 days, then Zoe asks her brain again.
  if (Date.now() - new Date(row.last_used_at).getTime() > 30 * 86400_000) return null;
  void supabase.from('zoe_frequent_answers' as any).update({ hits: (row.hits ?? 1) + 1, last_used_at: new Date().toISOString() }).eq('id', row.id);
  return row.answer as string;
}

export async function saveFrequentAnswer(text: string, answer: string, userId?: string): Promise<void> {
  if (!isCacheable(text) || !answer || answer.length > 1500) return;
  const uid = await currentUid(userId);
  if (!uid) return;
  await supabase.from('zoe_frequent_answers' as any).upsert(
    { user_id: uid, question_key: questionKey(text), question: text.slice(0, 500), answer, last_used_at: new Date().toISOString() },
    { onConflict: 'user_id,question_key' },
  );
}
