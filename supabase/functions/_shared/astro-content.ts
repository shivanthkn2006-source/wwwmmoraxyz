/**
 * ASTRO CONTENT — guarded text generation + Pollinations poster rendering.
 * No Lovable AI Gateway is used anywhere in this module.
 */
import { sovereignFetch } from './sovereign-ai.ts';
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

const SYSTEM_PROMPT = `You are M'Mora Zoe, an astrological guide and motivational psychologist.
You turn precise astrological transit data and the member's current emotional state into a short, empowering, actionable reflection.

HARD SAFETY RULES (never break):
1. NEVER predict illness, death, financial ruin, accidents, legal trouble, or the end of a relationship.
2. Frame every square/opposition as constructive friction and an opportunity to level up.
3. No medical, legal, or financial advice. No fear language. No absolute claims about the future.
4. Sophisticated, warm, grounded tone. No emojis in the JSON values.
5. Return STRICT JSON only, with exactly these keys: headline (under 7 words), body (under 60 words), quote (under 15 words).`;

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
  morning: 'soft dawn light over calm mountains, pale gold and deep indigo',
  noon: 'clear high-noon sky over a quiet ocean horizon, warm neutral tones',
  evening: 'golden hour over rolling hills, amber and dusty rose',
  night: 'deep starfield night sky above still water, midnight blue and silver',
};

/**
 * Render the poster with Pollinations, download the bytes and persist them in
 * Supabase Storage. Pollinations URLs are not durable, so we never store them.
 * Returns null on any failure — the card still publishes text-only.
 */
export async function renderPoster(opts: {
  slot: Slot;
  headline: string;
  userId: string;
  storagePath: string;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<string | null> {
  const prompt = encodeURIComponent(
    `minimal cinematic celestial poster background, ${SLOT_SCENE[opts.slot]}, ` +
    `abstract astrology constellation lines, no text, no words, no letters, no watermark, ` +
    `elegant editorial composition, subtle film grain`,
  );
  let seed = 0;
  for (let i = 0; i < opts.storagePath.length; i++) seed = (seed * 31 + opts.storagePath.charCodeAt(i)) >>> 0;
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1350&nologo=true&model=flux&seed=${seed % 100000}`;

  const pollToken = Deno.env.get('POLLINATIONS_API_KEY');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    const img = await fetch(url, {
      signal: ctrl.signal,
      headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {},
    });
    clearTimeout(timer);
    if (!img.ok) {
      console.warn('[astro-poster] pollinations failed', img.status, (await img.text()).slice(0, 200));
      return null;
    }
    const bytes = new Uint8Array(await img.arrayBuffer());
    if (bytes.byteLength < 1024) {
      console.warn('[astro-poster] pollinations returned tiny payload', bytes.byteLength);
      return null;
    }

    const up = await fetch(
      `${opts.supabaseUrl}/storage/v1/object/astro-posters/${opts.storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.serviceKey}`,
          apikey: opts.serviceKey,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        body: bytes,
      },
    );
    if (!up.ok) {
      console.warn('[astro-poster] storage upload failed', up.status, (await up.text()).slice(0, 200));
      return null;
    }
    return opts.storagePath;
  } catch (e) {
    console.warn('[astro-poster] error', String(e));
    return null;
  }
}
