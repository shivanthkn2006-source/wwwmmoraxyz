/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DHF DAILY COMPASS — content synthesis for the 10 scheduled daily slots.
 *
 * Design contract (mirrors the proven growth-content module):
 *   • pure, dependency-light and never throws — every failure path falls back
 *     to the evergreen vault so a slot is NEVER empty;
 *   • every dynamic value is clamped before it reaches a model or an image URL;
 *   • generation is called ONCE per (user, date, slot); the caller enforces
 *     idempotency through the UNIQUE(user_id, post_date, slot_time) constraint.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { sovereignFetch } from './sovereign-ai.ts';
import { julianDay, getPositions, calculateTransits, SIGNS, PLANETS } from './astro-engine.ts';

export interface CompassSlot {
  /** 24h HH:MM:SS — matches dhf_daily_posts.slot_time. */
  time: string;
  label: string;
  category: string;
  theme: string;
}

/** The 10 fixed daily delivery slots. Order is chronological and stable. */
export const COMPASS_SLOTS: CompassSlot[] = [
  { time: '05:00:00', label: '5:00 AM', category: 'Morning Ignition', theme: 'Core spirit, waking intention and the first hour of the day.' },
  { time: '06:30:00', label: '6:30 AM', category: 'Energy & Habits', theme: 'Health, vitality, movement and the habit loop that carries the day.' },
  { time: '08:00:00', label: '8:00 AM', category: 'Daily Focus', theme: 'Focus, strategy and choosing the one thing that matters today.' },
  { time: '09:30:00', label: 'Career Prediction', theme: 'Career trajectory, visibility and the opportunity in motion today.', category_placeholder: '' } as unknown as CompassSlot,
  { time: '11:00:00', label: '11:00 AM', category: 'Wealth & Decisions', theme: 'Money, risk posture and decision-making quality.' },
  { time: '12:30:00', label: '12:30 PM', category: 'Philosophy', theme: 'Midday reflection, meaning and long-arc perspective.' },
  { time: '14:00:00', label: '2:00 PM', category: 'Social Dynamics', theme: 'Relationships, communication and how others receive you today.' },
  { time: '15:30:00', label: 'Genius Potential', theme: 'Creativity, original thought and affinity with animals and nature.', category_placeholder: '' } as unknown as CompassSlot,
  { time: '17:00:00', label: '5:00 PM', category: 'Lifestyle & Travel', theme: 'Evening decompression, movement, travel and lifestyle design.' },
  { time: '18:30:00', label: '6:30 PM', category: 'Night Story', theme: 'A closing story and the forward DHF projection for the life phase.' },
];

// Repair the two entries written with a placeholder above so the module stays
// declarative while keeping label/category explicit and typed.
COMPASS_SLOTS[3] = { time: '09:30:00', label: '9:30 AM', category: 'Career Prediction', theme: COMPASS_SLOTS[3].theme };
COMPASS_SLOTS[7] = { time: '15:30:00', label: '3:30 PM', category: 'Genius Potential', theme: COMPASS_SLOTS[7].theme };

export const SLOT_TIMES = COMPASS_SLOTS.map((s) => s.time);

export function slotByTime(time: string): CompassSlot | null {
  return COMPASS_SLOTS.find((s) => s.time === time) ?? null;
}

/** 1..5 — ten-year life segments capped at the top band. */
export function lifePhaseFor(dob: string | null | undefined): number {
  if (!dob) return 1;
  const born = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return 1;
  const years = (Date.now() - born.getTime()) / (365.2425 * 86_400_000);
  if (years <= 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil(years / 10) > 5 ? 5 : Math.ceil(years / 10)));
}

/** Deterministic, collision-resistant referral code. */
export function referralCodeFor(userId: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  let out = '';
  let n = hash;
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + 7 * (i + 1);
  }
  return `ZOE${out}`;
}

export interface AstroContext {
  summary: string;
  transits: string[];
}

/**
 * Deterministic ephemeris context for one calendar day.
 * Falls back to a neutral, still-usable summary when birth data is missing.
 */
export function astroContextFor(
  dob: string | null | undefined,
  birthTime: string | null | undefined,
  target: Date,
): AstroContext {
  try {
    const targetJd = julianDay(target);
    const positions = getPositions(targetJd);
    const sun = positions.Sun;
    const moon = positions.Moon;
    const skyline = `Sun in ${SIGNS[sun.sign] ?? 'transit'}, Moon in ${SIGNS[moon.sign] ?? 'transit'}`;

    if (!dob) return { summary: `${skyline} (natal chart not provided)`, transits: [] };

    const time = /^\d{2}:\d{2}/.test(birthTime ?? '') ? (birthTime as string).slice(0, 5) : '12:00';
    const natal = new Date(`${dob}T${time}:00Z`);
    if (Number.isNaN(natal.getTime())) return { summary: skyline, transits: [] };

    const transits = calculateTransits(julianDay(natal), targetJd)
      .slice(0, 5)
      .map((t) => `${t.transiting} ${t.aspect} natal ${t.natal}`);

    return { summary: transits.length ? `${skyline}; ${transits.join(', ')}` : skyline, transits };
  } catch {
    return { summary: 'Steady planetary baseline', transits: [] };
  }
}

/** Stable 32-bit seed from any string — used for vault picks and image seeds. */
export function seedFrom(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  return hash >>> 0;
}

export interface CompassContent {
  headline: string;
  shortSummary: string;
  fullStory: string;
  category: string;
  source: 'llm' | 'vault';
}

/** Evergreen vault — one guaranteed body per slot index. Never empty. */
const VAULT: Array<{ headline: string; summary: string; story: string }> = COMPASS_SLOTS.map((slot) => ({
  headline: `${slot.category}: hold the line today`,
  summary: `${slot.theme} Today the sky asks for steadiness rather than speed — one deliberate move beats five reactive ones.`,
  story:
    `${slot.theme}\n\n` +
    'Every life phase repeats a lesson until it is answered rather than avoided. In this window, the practical work is small: ' +
    'name the single outcome you want from the next ninety minutes, remove one source of friction, and begin before you feel ready.\n\n' +
    'Planetary weather does not decide your day; it describes the terrain. Terrain rewards preparation. Treat this window as a ' +
    'checkpoint on the longer arc of your Digital Human Fingerprint — the compounding record of what you actually did, not what you intended.\n\n' +
    'Close the window by writing one sentence about what changed. That sentence is the data your future forecast is built from.',
}));

export function vaultContent(slotIndex: number): CompassContent {
  const idx = ((slotIndex % VAULT.length) + VAULT.length) % VAULT.length;
  const v = VAULT[idx];
  return {
    headline: v.headline,
    shortSummary: v.summary,
    fullStory: v.story,
    category: COMPASS_SLOTS[idx].category,
    source: 'vault',
  };
}

const SYSTEM_PROMPT = `You are Zoe, the astrological intelligence of the mmora platform.
You write one scheduled daily card for a member, grounded in the supplied ephemeris context.

Rules:
1. Return STRICT JSON only: {"headline": string, "short_summary": string, "full_story_content": string}.
2. headline: max 80 characters, concrete, no emoji, no astrology jargon dump.
3. short_summary: 1-2 sentences, max 220 characters — the feed preview.
4. full_story_content: 3-5 paragraphs (600-1100 characters total is too short; aim 1200-2200), a readable essay/story
   that connects the planetary context to practical action in this delivery window.
5. Never invent personal facts about the member beyond the supplied data.
6. Never mention model names, providers or that you are an AI.
7. No markdown headings, no bullet lists — plain paragraphs separated by blank lines.`;

export interface GenerateArgs {
  slotIndex: number;
  postDate: string;
  astro: AstroContext;
  lifePhase: number;
  birthPlace?: string | null;
  seed: number;
}

export interface GenerateResult {
  content: CompassContent;
  circuitBreak?: { status: number; message: string };
  rateLimited?: boolean;
  error?: string;
}

/** Generate one card. Never throws; always returns usable content. */
export async function generateCompassPost(args: GenerateArgs): Promise<GenerateResult> {
  const idx = Math.min(Math.max(args.slotIndex, 0), COMPASS_SLOTS.length - 1);
  const slot = COMPASS_SLOTS[idx];
  const payload = {
    delivery_window: slot.label,
    category: slot.category,
    theme: slot.theme,
    post_date: /^\d{4}-\d{2}-\d{2}$/.test(args.postDate) ? args.postDate : '',
    astrological_context: args.astro.summary.slice(0, 400),
    life_phase: `phase ${args.lifePhase} of 5 (ten-year segments)`,
    birth_place: (args.birthPlace ?? '').slice(0, 80),
  };

  try {
    const res = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `DATA:\n${JSON.stringify(payload)}\n\nWrite this member's card for the delivery window.` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (res.status === 402 || res.status === 403) {
      const msg = await res.text();
      return { content: vaultContent(idx), circuitBreak: { status: res.status, message: msg.slice(0, 300) } };
    }
    if (res.status === 429) return { content: vaultContent(idx), rateLimited: true };
    if (!res.ok) return { content: vaultContent(idx), error: `provider ${res.status}` };

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? '';
    const match = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return { content: vaultContent(idx), error: 'unparseable model output' };

    const parsed = JSON.parse(match[0]);
    const headline = String(parsed.headline ?? '').trim();
    const summary = String(parsed.short_summary ?? '').trim();
    const story = String(parsed.full_story_content ?? '').trim();
    if (!headline || !summary || !story) return { content: vaultContent(idx), error: 'incomplete model output' };

    return {
      content: {
        headline: headline.slice(0, 120),
        shortSummary: summary.slice(0, 300),
        fullStory: story.slice(0, 6000),
        category: slot.category,
        source: 'llm',
      },
    };
  } catch (e) {
    return { content: vaultContent(idx), error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}

/**
 * Stable image URL for a card. The URL is persisted once with the row, so a
 * feed reload never re-requests generation (zero token bleed by construction).
 */
export function compassImageUrl(headline: string, slotIndex: number, seed: number): string {
  const slot = COMPASS_SLOTS[Math.min(Math.max(slotIndex, 0), COMPASS_SLOTS.length - 1)];
  const prompt = [
    'cinematic minimalist editorial illustration,',
    `${slot.category} theme,`,
    headline.replace(/[^a-zA-Z0-9 ,.'-]/g, ' ').slice(0, 140) + ',',
    'monochrome black and white with a single subtle accent light,',
    'no text, no letters, no watermark, no logo',
  ].join(' ');
  const params = new URLSearchParams({
    width: '1024',
    height: '576',
    nologo: 'true',
    seed: String(seed % 1_000_000),
    model: 'flux',
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function referralCta(code: string): string {
  return `Share your Zoe forecast with code ${code} — every friend who joins unlocks deeper timeline forecasts for both of you.`;
}

/** Slot times already elapsed for a given local wall clock (HH:MM). */
export function elapsedSlotTimes(hour: number, minute: number): string[] {
  const nowMin = hour * 60 + minute;
  return SLOT_TIMES.filter((t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m <= nowMin;
  });
}

export { PLANETS };
