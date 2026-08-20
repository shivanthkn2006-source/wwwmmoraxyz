/**
 * DAILY MOTIVATION CONTENT — deliberately DIFFERENT from the astrology engine.
 *
 * Astrology engine  → transit-driven, sky-flavoured (simple wording).
 * Motivation engine → everyday life-coach language, one concrete action step,
 *                     no astrology jargon at all, warm human tone, art style
 *                     is photographic/lifestyle rather than celestial.
 */
import { sovereignFetch } from './sovereign-ai.ts';

export interface MotivationContent {
  theme: string;
  headline: string;
  body: string;
  actionStep: string;
  quote: string;
  /** Photo scene that visually matches THIS day's words. */
  scene: string;
  source: 'model' | 'fallback';
}

/** Rotating everyday themes — keeps each day genuinely different. */
export const THEMES = [
  'fresh start',
  'small wins',
  'focus and deep work',
  'health and movement',
  'kindness and connection',
  'calm under pressure',
  'money and discipline',
  'learning something new',
  'gratitude',
  'courage to begin',
  'rest and recovery',
  'finishing what you started',
  'confidence',
  'patience',
] as const;

const SCENES: Record<string, string> = {
  'fresh start': 'sunrise over a quiet coastal road, warm morning light, cinematic lifestyle photograph',
  'small wins': 'a tidy wooden desk with a notebook and coffee near a bright window, soft natural light',
  'focus and deep work': 'minimal workspace at golden hour, warm lamp glow, shallow depth of field',
  'health and movement': 'a runner\'s empty park path in early morning mist, fresh green tones',
  'kindness and connection': 'two cups of tea on a table by a window, warm cosy tones, human and gentle',
  'calm under pressure': 'still lake water with soft fog and pale blue light, wide calm composition',
  'money and discipline': 'clean modern city skyline at dawn, orderly geometry, muted warm tones',
  'learning something new': 'open books and warm reading light on a wooden table, inviting and calm',
  'gratitude': 'soft sunlight through leaves onto a wooden floor, warm amber and green',
  'courage to begin': 'a single footpath leading into open mountains at sunrise, hopeful wide shot',
  'rest and recovery': 'a made bed with linen sheets in soft evening light, calm neutral tones',
  'finishing what you started': 'a finished workbench at dusk, tools neatly placed, warm side light',
  'confidence': 'wide open sky above a cliff edge at golden hour, uplifting and spacious',
  'patience': 'slow river flowing through soft green fields, overcast gentle light',
};

export const PALETTES: Array<[string, string, string]> = [
  ['#1d2433', '#3c5a7a', '#e3b778'],
  ['#20301f', '#4a6b47', '#dfe3c1'],
  ['#2b1f2e', '#6b4a63', '#f0c9a8'],
  ['#1a2733', '#37627a', '#cfe6e3'],
];

export function themeFor(dateStr: string, userId: string): string {
  let h = 0;
  const seed = `${dateStr}:${userId}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return THEMES[h % THEMES.length];
}

export function sceneFor(theme: string): string {
  return SCENES[theme] ?? SCENES['fresh start'];
}

export function paletteFor(theme: string): [string, string, string] {
  let h = 0;
  for (let i = 0; i < theme.length; i++) h = (h * 31 + theme.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

/** Evergreen vault, plain everyday English. A blank morning is never shipped. */
const VAULT: Array<Omit<MotivationContent, 'source' | 'theme'>> = [
  {
    headline: 'Start with one small thing',
    body: 'You do not need a perfect day to make progress. Pick the one task you have been avoiding and give it ten honest minutes. Momentum shows up after you begin, not before.',
    actionStep: 'Do the smallest version of your hardest task for 10 minutes.',
    quote: 'Started beats perfect, every single time.',
  },
  {
    headline: 'Protect your first hour',
    body: 'How you spend the first hour usually decides the rest of the day. Keep the phone down a little longer, drink some water, and do one thing for yourself before the world starts asking.',
    actionStep: 'Give yourself 20 screen-free minutes this morning.',
    quote: 'Own the morning and the day follows you.',
  },
  {
    headline: 'Slow down to speed up',
    body: 'Rushing feels productive but usually costs more time later. Take a breath, choose the right next step instead of the fastest one, and let steady beat frantic today.',
    actionStep: 'Before your next task, write down why it matters in one line.',
    quote: 'Calm hands finish faster than shaking ones.',
  },
  {
    headline: 'Move your body a little',
    body: 'Your mood often follows your body. A short walk, a stretch, some fresh air — it costs almost nothing and it changes how the whole day feels.',
    actionStep: 'Take a 15-minute walk without your headphones.',
    quote: 'Motion is the cheapest medicine there is.',
  },
  {
    headline: 'Finish one open loop',
    body: 'Unfinished things quietly drain energy. Pick just one that has been sitting there — a message, a form, a small repair — and close it today. The relief is bigger than the task.',
    actionStep: 'Close one thing that has been pending for over a week.',
    quote: 'Peace is fewer open tabs, in life and in mind.',
  },
  {
    headline: 'Be the reason someone smiles',
    body: 'Reach out to one person today with no agenda. A short message, a thank you, a check-in. Connection is the part of a good day that most people forget to plan.',
    actionStep: 'Send one honest message to someone you value.',
    quote: 'Kindness costs nothing and pays for years.',
  },
];

export function pickMotivationFallback(seed: string, theme: string): MotivationContent {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return { ...VAULT[h % VAULT.length], theme, scene: sceneFor(theme), source: 'fallback' };
}

const BANNED = [
  /\bdeaths?\b/, /\bdying\b/, /\billness(es)?\b/, /\bdiseases?\b/, /\bdiagnos\w*\b/,
  /\bsuicid\w*\b/, /\bbankrupt\w*\b/, /\bdivorces?\b/, /\bfatal\b/, /\bdoomed?\b/,
];

export function motivationUnsafe(text: string): boolean {
  const t = (text || '').toLowerCase();
  return BANNED.some((re) => re.test(t));
}

const SYSTEM = `You write a short daily motivation for an ordinary person opening their phone in the morning.

STYLE RULES (never break):
1. Everyday spoken English. Simple words. A 12-year-old should understand every sentence.
2. NEVER mention astrology, planets, transits, horoscopes, star signs, the universe or destiny. This is pure life motivation.
3. Warm, human, encouraging. Talk to the reader as "you". No corporate buzzwords, no emojis.
4. Never mention illness, death, money loss, legal trouble or relationship breakdown.
5. Give exactly one concrete action the person can do today.
6. Give a matching picture idea: a real-world photo scene that visually echoes today's message (no people's faces, no text in the picture).
7. Return STRICT JSON only with keys: headline (max 6 words), body (40-70 words), actionStep (max 18 words), quote (max 12 words), scene (max 25 words, a photographic scene description with lighting and mood).`;

export async function generateMotivation(args: {
  theme: string;
  weekday: string;
  localDate: string;
  seed: string;
}): Promise<{ content: MotivationContent; error?: string }> {
  const { theme, weekday, localDate, seed } = args;
  try {
    const res = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.85,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Today is ${weekday}, ${localDate}. Theme for today: "${theme}".
Write today's motivation for a normal working person's daily routine. Make it feel different from a generic quote card.`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      return { content: pickMotivationFallback(seed, theme), error: `provider ${res.status}` };
    }
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? '';
    const match = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return { content: pickMotivationFallback(seed, theme), error: 'unparseable output' };

    const p = JSON.parse(match[0]);
    const headline = String(p.headline ?? '').trim();
    const body = String(p.body ?? '').trim();
    const actionStep = String(p.actionStep ?? p.action_step ?? '').trim();
    const quote = String(p.quote ?? '').trim();
    const scene = String(p.scene ?? p.image_prompt ?? '').trim();

    if (!headline || !body) return { content: pickMotivationFallback(seed, theme), error: 'incomplete output' };
    if (motivationUnsafe(`${headline} ${body} ${actionStep} ${quote}`)) {
      return { content: pickMotivationFallback(seed, theme), error: 'guardrail violation' };
    }

    return {
      content: {
        theme,
        headline: headline.slice(0, 90),
        body: body.slice(0, 600),
        actionStep: (actionStep || 'Take one small step toward what matters today.').slice(0, 200),
        quote: (quote || 'Small steps, repeated, change everything.').slice(0, 160),
        // The art is generated from the model's own scene so picture and words
        // always describe the same idea; the theme map is the safety net.
        scene: (scene ? `${scene}, cinematic lifestyle photograph, natural light` : sceneFor(theme)).slice(0, 300),
        source: 'model',
      },
    };
  } catch (e) {
    return { content: pickMotivationFallback(seed, theme), error: String((e as Error)?.message ?? e) };
  }
}
