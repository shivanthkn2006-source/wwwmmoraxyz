/**
 * LIFE FORECAST — focus parsing, safety framing and a zero-token reading.
 *
 * - parseForecastFocus: life area(s) + exact time window (year/month/week/date).
 * - isForecastTurn: keeps short follow-ups ("what about March?", "and love?")
 *   inside the forecast conversation.
 * - buildForecastFocusBlock: tells the model exactly what to narrow to, which
 *   DHF cards to stay consistent with, and the mandatory honesty framing.
 * - deterministicForecast: answers from the dasha timeline alone when every
 *   AI provider is down, so Zoe never goes silent (no tokens used).
 * - ensureForecastFraming: guarantees the before/after disclaimer is present.
 */
import { vimshottariDasha } from './ephemeris-precision.ts';
import { zonedTimeToUtc } from './astro-engine.ts';
import { needsLifeForecast, type AstroBirthProfile } from './astro-grounding.ts';

export type LifeArea = 'career' | 'money' | 'love' | 'family' | 'health' | 'personal' | 'education' | 'travel';

const AREA_WORDS: Record<LifeArea, RegExp> = {
  career: /\b(career|job|work|promotion|business|boss|office|offer|interview)\b/i,
  money: /\b(money|finance|finances|wealth|income|salary|savings|invest|debt|loan)\b/i,
  love: /\b(love|marriage|marry|partner|relationship|romance|spouse|dating|wife|husband)\b/i,
  family: /\b(family|parents?|mother|father|kids?|children|child|siblings?|home)\b/i,
  health: /\b(health|body|illness|energy|fitness|stress|sleep)\b/i,
  personal: /\b(personal|myself|spiritual|growth|peace|mind|wish(es)?)\b/i,
  education: /\b(admission|exam|study|studies|college|university|course|degree)\b/i,
  travel: /\b(travel|abroad|visa|relocat\w*|move|moving)\b/i,
};

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

export interface ForecastWindow { kind: 'year' | 'month' | 'week' | 'date' | 'default'; start: Date; end: Date; label: string }
export interface ForecastFocus { areas: LifeArea[]; window: ForecastWindow; explicitTime: boolean }

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function parseForecastFocus(text: string, now: Date = new Date()): ForecastFocus {
  const t = (text || '').toLowerCase();
  const areas = (Object.keys(AREA_WORDS) as LifeArea[]).filter((a) => AREA_WORDS[a].test(t));
  const y = now.getUTCFullYear();
  let window: ForecastWindow | null = null;

  const dateMatch = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) || null;
  const dayMonth = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`));
  const monthDay = t.match(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4}))?`));
  const monthOnly = t.match(new RegExp(`\\b(${MONTHS.join('|')}|${MONTHS.map((m) => m.slice(0, 3)).join('|')})\\b(?:\\s+(\\d{4}))?`));
  const yearOnly = t.match(/\b(20\d{2})\b/);

  const nextMonthStart = (m: number, year?: number) => {
    let yy = year ?? y;
    if (!year && m < now.getUTCMonth()) yy += 1;
    return new Date(Date.UTC(yy, m, 1));
  };

  if (dateMatch) {
    const d = new Date(Date.UTC(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]));
    window = { kind: 'date', start: d, end: new Date(d.getTime() + 86_400_000), label: iso(d) };
  } else if (dayMonth || monthDay) {
    const dd = dayMonth ? +dayMonth[1] : +monthDay![2];
    const mm = MONTHS.indexOf(dayMonth ? dayMonth[2] : monthDay![1]);
    const yy = dayMonth?.[3] ? +dayMonth[3] : monthDay?.[3] ? +monthDay[3] : undefined;
    const base = nextMonthStart(mm, yy);
    const d = new Date(Date.UTC(base.getUTCFullYear(), mm, dd));
    window = { kind: 'date', start: d, end: new Date(d.getTime() + 86_400_000), label: iso(d) };
  } else if (/\b(next|coming)\s+week\b/.test(t) || /\bthis\s+week\b/.test(t)) {
    const offset = /this\s+week/.test(t) ? 0 : 7;
    const s = new Date(now.getTime() + offset * 86_400_000);
    window = { kind: 'week', start: s, end: new Date(s.getTime() + 7 * 86_400_000), label: `week of ${iso(s)}` };
  } else if (monthOnly) {
    const key = monthOnly[1];
    const mm = MONTHS.findIndex((m) => m === key || m.slice(0, 3) === key);
    const s = nextMonthStart(mm, monthOnly[2] ? +monthOnly[2] : undefined);
    const e = new Date(Date.UTC(s.getUTCFullYear(), mm + 1, 1));
    window = { kind: 'month', start: s, end: e, label: s.toISOString().slice(0, 7) };
  } else if (/\b(next|coming)\s+month\b/.test(t) || /\bthis\s+month\b/.test(t)) {
    const add = /this\s+month/.test(t) ? 0 : 1;
    const s = new Date(Date.UTC(y, now.getUTCMonth() + add, 1));
    window = { kind: 'month', start: s, end: new Date(Date.UTC(y, now.getUTCMonth() + add + 1, 1)), label: s.toISOString().slice(0, 7) };
  } else if (yearOnly) {
    const yy = +yearOnly[1];
    window = { kind: 'year', start: new Date(Date.UTC(yy, 0, 1)), end: new Date(Date.UTC(yy + 1, 0, 1)), label: String(yy) };
  } else if (/\bthis\s+year\b/.test(t)) {
    window = { kind: 'year', start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)), label: String(y) };
  }

  const explicitTime = !!window;
  if (!window) {
    window = { kind: 'default', start: now, end: new Date(now.getTime() + 365 * 86_400_000), label: 'the next 12 months' };
  }
  return { areas, window, explicitTime };
}

const FOLLOW_UP = /^(and|what about|how about|ok(ay)?|then|also|tell me more|more on|in|for|during)\b|\?$/i;

/** True when this turn, or a short follow-up to a recent forecast turn, needs the forecast. */
export function isForecastTurn(messages: Array<{ role: string; content: string }>): boolean {
  const users = messages.filter((m) => m.role === 'user').map((m) => String(m.content || ''));
  const last = users[users.length - 1] || '';
  if (needsLifeForecast(last)) return true;
  const recent = users.slice(-4, -1).some((u) => needsLifeForecast(u));
  if (!recent) return false;
  const f = parseForecastFocus(last);
  return last.length <= 120 && (f.areas.length > 0 || f.explicitTime || FOLLOW_UP.test(last.trim()));
}

export interface DhfCardSignal { category?: string | null; headline?: string | null; short_summary?: string | null; slot_time?: string | null; post_date?: string | null }

export function buildForecastFocusBlock(focus: ForecastFocus, cards: DhfCardSignal[], hasBirth: boolean): string {
  const areaText = focus.areas.length ? focus.areas.join(', ') : 'not specified';
  const cardLines = cards.slice(0, 6).map((c) =>
    `- [${c.post_date ?? ''} ${c.slot_time ?? ''}] ${c.category ?? 'DHF'}: ${c.headline ?? ''}${c.short_summary ? ` — ${String(c.short_summary).slice(0, 140)}` : ''}`);
  return '\n\n═══ LIFE-FORECAST FOCUS (this turn) ═══\n' +
    `- Life area(s) asked: ${areaText}\n` +
    `- Time window: ${focus.window.label} (${iso(focus.window.start)} → ${iso(focus.window.end)})${focus.explicitTime ? '' : ' — user did not name one'}\n` +
    (cardLines.length ? `- Today's DHF cards this member already saw (stay CONSISTENT with them, never contradict):\n${cardLines.join('\n')}\n` : '- No DHF cards today.\n') +
    (hasBirth ? '' : '- NO BIRTH DETAILS: do not give a reading. Explain kindly and ask for birth date, time and city.\n') +
    'ANSWER FORMAT (plain sentences, easy to speak aloud):\n' +
    '1. Open with ONE short line: this is guidance from their chart and how they live, not a certainty.\n' +
    '2. Narrow ONLY to the asked area(s) and window; use the sub-periods and months from the FACTS block that overlap it.\n' +
    '3. For each point give the reason (period lord / slow-planet sign) and a confidence word: "stronger signal", "mixed signal" or "weak signal".\n' +
    '4. Turn it into 1-2 practical actions they control.\n' +
    '5. Health, money and legal: add that a doctor / financial adviser / lawyer should guide real decisions.\n' +
    '6. Close with ONE line that it is not 100% accurate; their choices shape the outcome. Then offer a follow-up: another area, or a specific year, month, week or date.\n' +
    '- Never say "will definitely", "guaranteed", or give a yes/no verdict on a wish.\n' +
    '═══════════════════════════════════════\n';
}

const LORD_THEMES: Record<string, Partial<Record<LifeArea, string>>> = {
  Sun: { career: 'visibility and leadership', health: 'vitality — watch overwork', personal: 'confidence' },
  Moon: { family: 'home and emotional bonds', personal: 'moods and intuition', love: 'emotional closeness' },
  Mars: { career: 'drive and competition', money: 'bold moves — avoid rash spending', health: 'energy; watch injuries' },
  Mercury: { career: 'communication, study and deals', education: 'exams and learning', money: 'trade and planning' },
  Jupiter: { career: 'growth and mentors', money: 'expansion', education: 'higher study', family: 'blessings at home', love: 'commitment' },
  Venus: { love: 'romance and harmony', money: 'comfort and gains', personal: 'creativity' },
  Saturn: { career: 'slow, steady effort that pays later', money: 'discipline and saving', health: 'routine and rest' },
  Rahu: { career: 'sudden openings and ambition', travel: 'foreign links', money: 'unconventional gains — double-check' },
  Ketu: { personal: 'inner growth and letting go', health: 'rest and detachment', career: 'rethinking direction' },
};

export const FORECAST_OPENING = "A gentle note first: this is guidance drawn from your birth chart and how you live — not a certainty.";
export const FORECAST_CLOSING = "Remember, no reading is 100% accurate. Your choices and effort shape what actually happens — use this to plan, not to worry.";

/** Zero-token reading from the dasha timeline. Used when every provider is down. */
export function deterministicForecast(birth: AstroBirthProfile | null, focus: ForecastFocus, fallbackTz = 'Asia/Kolkata', todayCard?: DhfCardSignal | null): string {
  if (!birth?.birth_date) {
    return 'I can read your year only from your real birth chart, and I don\'t have your birth details yet. Share your date, time (roughly is fine) and city of birth, and I\'ll walk you through it part by part.';
  }
  const tz = birth.birth_timezone || fallbackTz;
  const natalUtc = zonedTimeToUtc(String(birth.birth_date).slice(0, 10), (birth.birth_time || '12:00').slice(0, 5), tz);
  const periods: Array<{ maha: string; antar: string; start: string; end: string }> = [];
  for (const maha of vimshottariDasha(natalUtc, 9).timeline) {
    for (const a of maha.antardashas ?? []) {
      if (Date.parse(a.end) > focus.window.start.getTime() && Date.parse(a.start) < focus.window.end.getTime()) {
        periods.push({ maha: maha.lord, antar: a.lord, start: a.start.slice(0, 10), end: a.end.slice(0, 10) });
      }
    }
  }
  const areas: LifeArea[] = focus.areas.length ? focus.areas : ['career', 'money', 'love', 'family'];
  const lines = [FORECAST_OPENING, `For ${focus.window.label}:`];
  for (const p of periods.slice(0, 3)) {
    const themes = areas
      .map((a) => { const x = LORD_THEMES[p.antar]?.[a] ?? LORD_THEMES[p.maha]?.[a]; return x ? `${a}: ${x}` : null; })
      .filter(Boolean);
    lines.push(`From ${p.start} to ${p.end} you're in ${p.maha}–${p.antar}. ${themes.length ? themes.join('; ') + '.' : 'A quieter stretch for these areas.'} (${themes.length > 1 ? 'stronger' : 'mixed'} signal)`);
  }
  if (todayCard?.headline) lines.push(`Today's DHF card says: "${todayCard.headline}"${todayCard.short_summary ? ` — ${String(todayCard.short_summary).slice(0, 160)}` : ''}.`);
  if (areas.includes('health') || areas.includes('money')) lines.push('For health or money decisions, let a doctor or financial adviser guide the real steps.');
  lines.push(FORECAST_CLOSING);
  lines.push('Want me to go deeper on one area, or a specific year, month, week or date?');
  return lines.join(' ');
}

/** Guarantee the before/after honesty framing on every forecast answer. */
export function ensureForecastFraming(text: string): string {
  let out = String(text || '').trim();
  if (!/not (a |an )?(absolute )?(certain|promise)|not 100|no reading is|guidance|gentle/i.test(out.slice(0, 300))) out = `${FORECAST_OPENING} ${out}`;
  if (!/100%|your choices/i.test(out.slice(-320))) out = `${out} ${FORECAST_CLOSING}`;
  return out;
}

export const FORECAST_FOLLOW_UPS = [
  'Career this year', 'Money next 6 months', 'Love this month', 'Family next week', 'Health this month', 'Pick a specific date',
];

/** Stable cache key for a forecast question: same areas + same window = same answer. */
export function forecastCacheKey(focus: ForecastFocus): string {
  const areas = [...focus.areas].sort().join(',') || 'all';
  return `forecast:${areas}:${iso(focus.window.start)}:${iso(focus.window.end)}`;
}

export interface ProjectedPeriod {
  maha: string; antar: string; start: string; end: string;
  areas: Partial<Record<LifeArea, string>>;
  signal: 'stronger' | 'mixed' | 'quiet';
}

/** Zero-token life timeline: every dasha sub-period overlapping the next N months, themed per life area. */
export function projectLifeTimeline(birth: AstroBirthProfile, months = 24, fallbackTz = 'Asia/Kolkata', now = new Date()): ProjectedPeriod[] {
  if (!birth?.birth_date) return [];
  const tz = birth.birth_timezone || fallbackTz;
  const natalUtc = zonedTimeToUtc(String(birth.birth_date).slice(0, 10), (birth.birth_time || '12:00').slice(0, 5), tz);
  const end = new Date(now); end.setMonth(end.getMonth() + months);
  const out: ProjectedPeriod[] = [];
  const core: LifeArea[] = ['career', 'money', 'love', 'family'];
  for (const maha of vimshottariDasha(natalUtc, 9).timeline) {
    for (const a of maha.antardashas ?? []) {
      if (Date.parse(a.end) <= now.getTime() || Date.parse(a.start) >= end.getTime()) continue;
      const areas: Partial<Record<LifeArea, string>> = {};
      for (const area of core) { const t = LORD_THEMES[a.lord]?.[area] ?? LORD_THEMES[maha.lord]?.[area]; if (t) areas[area] = t; }
      const n = Object.keys(areas).length;
      out.push({ maha: maha.lord, antar: a.lord, start: a.start.slice(0, 10), end: a.end.slice(0, 10), areas, signal: n > 1 ? 'stronger' : n === 1 ? 'mixed' : 'quiet' });
    }
  }
  return out;
}
