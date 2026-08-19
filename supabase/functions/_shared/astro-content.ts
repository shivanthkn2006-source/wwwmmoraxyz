/**
 * ASTRO CONTENT — guarded text generation + Pollinations poster rendering.
 * No Lovable AI Gateway is used anywhere in this module.
 */
import { sovereignFetch } from './sovereign-ai.ts';
import { renderImage } from './image-engine.ts';
import type { Transit } from './astro-engine.ts';

export type Slot = 'morning' | 'noon' | 'evening' | 'night';

export const SLOT_LOCAL_TIME: Record<Slot, { hour: number; minute: number; label: string }> = {
  morning: { hour: 0, minute: 2, label: 'Early Morning Alignment' },
  noon: { hour: 12, minute: 2, label: 'Midday Recalibration' },
  evening: { hour: 17, minute: 0, label: 'Evening Reflection' },
  night: { hour: 21, minute: 30, label: 'Goodnight Motivation' },
};

export interface PredictionContent {
  headline: string;
  body: string;
  quote: string;
  source: 'model' | 'fallback';
}

/** Evergreen vault — a blank feed is never acceptable. */
const FALLBACK_VAULT: Record<Slot, Array<Omit<PredictionContent, 'source'>>> = {
  morning: [
    { headline: 'Inner Grounding & Centered Focus', body: 'Today opens quietly. Ground your first hour, choose one thing that matters, and let momentum build without forcing the outcome.', quote: 'Still water reflects the sky most clearly.' },
    { headline: 'A Clean Start Line', body: 'Nothing from yesterday has to be carried forward. Begin from where you actually stand and take the smallest honest step.', quote: 'Every morning is an unwritten page.' },
  ],
  noon: [
    { headline: 'Midday Recalibration', body: 'Check the direction, not just the speed. A small correction now saves the whole afternoon.', quote: 'Adjust the sail, not the wind.' },
    { headline: 'Steady Through The Middle', body: 'The middle of the day is where discipline quietly wins. Finish the thing you already started.', quote: 'Consistency outlives intensity.' },
  ],
  evening: [
    { headline: 'Evening Reflection', body: 'Look back without judgement. Name one thing that worked and one thing you would do differently — that is the whole lesson.', quote: 'Reflection turns experience into wisdom.' },
    { headline: 'Close The Loops', body: 'Give the unfinished thoughts a place to rest so the evening belongs to you.', quote: 'Peace begins where the mental noise ends.' },
  ],
  night: [
    { headline: 'Goodnight — You Did Enough', body: 'Rest is not a reward for finishing; it is part of the work. Let the day settle and trust tomorrow to carry the rest.', quote: 'Sleep is where tomorrow is built.' },
    { headline: 'Soft Landing', body: 'Set the day down gently. Whatever remains will still be there, and you will meet it stronger.', quote: 'Even the sky rests before it shines.' },
  ],
};

export function pickFallback(slot: Slot, seed: string): PredictionContent {
  const vault = FALLBACK_VAULT[slot] ?? FALLBACK_VAULT.morning;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return { ...vault[h % vault.length], source: 'fallback' };
}

/**
 * Word-boundary patterns only. Substring matching used to misfire on ordinary
 * words and on the zodiac sign "Cancer", which sent valid output to fallback.
 * Medical fear language is still caught via illness/disease/diagnosis terms.
 */
const BANNED_PATTERNS: RegExp[] = [
  /\bdeaths?\b/, /\bdying\b/, /\bdies\b/, /\bdied\b/,
  /\billness(es)?\b/, /\bdiseases?\b/, /\bdiagnos\w*\b/, /\bterminally ill\b/,
  /\bdivorces?\b/, /\bbreak-?ups?\b/, /\bbankrupt\w*\b/, /\bfinancial ruin\b/,
  /\blawsuits?\b/, /\baccidents?\b/, /\bcursed?\b/, /\bdoomed?\b/,
  /\btragedy\b/, /\btragic\b/, /\bfatal\b/, /\bsuicid\w*\b/,
];

/** Terminal safety net: reject any output that violates the guardrails. */
export function violatesGuardrails(text: string): boolean {
  const t = (text || '').toLowerCase();
  return BANNED_PATTERNS.some((re) => re.test(t));
}

const SYSTEM_PROMPT = `You are M'Mora Zoe. You read the sky for people who know nothing about astrology.

HOW YOU WRITE (never break):
1. Plain, everyday English. Simple short sentences. A 12-year-old must understand every word.
2. NEVER use technical astrology words: no "transit", "natal", "square", "trine", "sextile", "conjunction", "retrograde", "house", "aspect", "degrees", "ephemeris". Translate the sky into ordinary feelings, e.g. "today the mood favours patience over speed".
3. NEVER predict illness, death, money loss, accidents, legal trouble or the end of a relationship.
4. Turn any tense energy into a friendly heads-up and something useful the person can do.
5. Warm, calm, encouraging. Talk to the reader as "you". No emojis, no buzzwords, no absolute promises.
6. Return STRICT JSON only, with exactly these keys: headline (under 7 words), body (under 60 words), quote (under 15 words).`;


interface GenerateArgs {
  slot: Slot;
  transits: Transit[];
  mood: string;
  intensity: number;
  localDate: string;
  seed: string;
}

export interface GenerateResult {
  content: PredictionContent;
  /** Set when a terminal provider condition should pause the whole job. */
  circuitBreak?: { status: number; message: string };
  rateLimited?: boolean;
  error?: string;
}

/** Generate the guarded prediction text. Never throws. */
export async function generatePrediction(args: GenerateArgs): Promise<GenerateResult> {
  const { slot, transits, mood, intensity, localDate, seed } = args;
  const userPrompt = `Dispatch slot: ${slot} (${SLOT_LOCAL_TIME[slot].label})
Local date: ${localDate}
Member mood mode: ${mood} (intensity ${intensity}/5)
Strongest active transits: ${JSON.stringify(transits.slice(0, 4))}

Write the ${slot} reflection.`;

  try {
    const res = await sovereignFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (res.status === 402 || res.status === 403) {
      const msg = await res.text();
      return { content: pickFallback(slot, seed), circuitBreak: { status: res.status, message: msg.slice(0, 300) } };
    }
    if (res.status === 429) {
      return { content: pickFallback(slot, seed), rateLimited: true };
    }
    if (!res.ok) {
      return { content: pickFallback(slot, seed), error: `provider ${res.status}` };
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? '';
    const match = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return { content: pickFallback(slot, seed), error: 'unparseable model output' };

    const parsed = JSON.parse(match[0]);
    const headline = String(parsed.headline ?? '').trim();
    const body = String(parsed.body ?? '').trim();
    const quote = String(parsed.quote ?? '').trim();

    if (!headline || !body || !quote) {
      return { content: pickFallback(slot, seed), error: 'incomplete model output' };
    }
    if (violatesGuardrails(`${headline} ${body} ${quote}`)) {
      return { content: pickFallback(slot, seed), error: 'guardrail violation — fallback used' };
    }

    return {
      content: {
        headline: headline.slice(0, 90),
        body: body.slice(0, 600),
        quote: quote.slice(0, 160),
        source: 'model',
      },
    };
  } catch (e) {
    return { content: pickFallback(slot, seed), error: String((e as Error)?.message ?? e) };
  }
}

const SLOT_SCENE: Record<Slot, string> = {
  morning: 'soft dawn light over calm mountains, pale gold and deep indigo, drifting mist',
  noon: 'clear high-noon sky over a quiet ocean horizon, warm neutral tones, glittering water',
  evening: 'golden hour over rolling hills, amber and dusty rose, long soft shadows',
  night: 'deep starfield night sky above still water, midnight blue and silver, glowing milky way',
};

const SLOT_PALETTE: Record<Slot, [string, string, string]> = {
  morning: ['#1b2340', '#3d5a8a', '#f0c98a'],
  noon: ['#123246', '#2f7ba0', '#eae2c8'],
  evening: ['#3a1f2b', '#8a4a52', '#f2c19a'],
  night: ['#0b1024', '#1e2a55', '#c9d6ff'],
};

/**
 * Celestial poster for the astrology card. Uses the sovereign image engine, so
 * an image ALWAYS exists (Pollinations ladder → guaranteed local SVG poster).
 * Art direction is deliberately celestial/abstract — the daily-motivation
 * feature renders photographic lifestyle scenes instead, so the two features
 * never look alike.
 */
export async function renderPoster(opts: {
  slot: Slot;
  headline: string;
  userId: string;
  storagePath: string;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<string | null> {
  const res = await renderImage({
    prompt:
      `minimal cinematic celestial poster background, ${SLOT_SCENE[opts.slot]}, ` +
      `abstract constellation lines, elegant editorial composition, subtle film grain`,
    storagePath: opts.storagePath,
    bucket: 'astro-posters',
    supabaseUrl: opts.supabaseUrl,
    serviceKey: opts.serviceKey,
    palette: SLOT_PALETTE[opts.slot],
  });
  if (!res.path) console.warn('[astro-poster] all providers failed', JSON.stringify(res.attempts));
  return res.path;
}

