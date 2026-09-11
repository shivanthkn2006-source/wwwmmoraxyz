/**
 * LIFE TIMELINE RECALL
 * ====================
 * Semantic recall (omni-recall) is great at "find the thing I mean" and bad at
 * "what happened between Monday and Sunday" — a date range is not a meaning.
 * So questions like "what was I doing last week", "where was I on Tuesday" or
 * "whose birthday is coming up" used to come back empty even though the rows
 * existed.
 *
 * This helper detects a time window in the question and pulls the member's own
 * timeline for that window. Every query runs through the CALLER'S JWT, never
 * the service role, so Postgres RLS decides what may be read — a member can
 * only ever see their own history.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export type TimelineWindow = {
  fromISO: string;
  toISO: string;
  label: string;
};

const DAY = 24 * 60 * 60 * 1000;

/** Detects an explicit time range in a natural question. Null when there is none. */
export function detectTimeWindow(question: string, now = new Date()): TimelineWindow | null {
  const q = (question || '').toLowerCase();
  if (!q) return null;

  const at = (daysAgoStart: number, daysAgoEnd: number, label: string): TimelineWindow => ({
    fromISO: new Date(now.getTime() - daysAgoStart * DAY).toISOString(),
    toISO: new Date(now.getTime() - daysAgoEnd * DAY).toISOString(),
    label,
  });

  // Only treat it as a timeline question when it is actually about the person.
  const isPersonal = /\b(i|me|my|we|our)\b/.test(q) || /\bbirthday|anniversary\b/.test(q);
  if (!isPersonal) return null;

  if (/\b(yesterday)\b/.test(q)) return at(2, 0, 'yesterday');
  if (/\b(today|so far today|this morning|tonight)\b/.test(q)) return at(1, 0, 'today');
  if (/\blast week\b/.test(q)) return at(14, 0, 'last week');
  if (/\bthis week\b/.test(q)) return at(7, 0, 'this week');
  if (/\blast month\b/.test(q)) return at(60, 0, 'last month');
  if (/\bthis month\b/.test(q)) return at(31, 0, 'this month');
  if (/\blast year\b/.test(q)) return at(730, 0, 'last year');
  if (/\b(recently|lately|these days|past few days)\b/.test(q)) return at(10, 0, 'the past few days');

  const nDays = q.match(/\b(\d{1,3})\s*days?\s*ago\b/);
  if (nDays) {
    const n = Math.min(Number(nDays[1]), 730);
    return at(n + 1, Math.max(n - 1, 0), `${n} days ago`);
  }

  // "what was I doing" / "where was I" with no explicit range still deserves
  // a recent window rather than nothing at all.
  if (/\b(what (was|were) (i|we)|where (was|were) (i|we)|what did i do|what have i been)\b/.test(q)) {
    return at(14, 0, 'the past two weeks');
  }

  return null;
}

type TimelineEntry = { when: string; kind: string; text: string };

function fmt(iso: string | null | undefined): string {
  if (!iso) return 'unknown date';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown date' : d.toISOString().slice(0, 10);
}

/**
 * Builds a plain-text timeline of what the member actually did in the window.
 * Returns an empty string when nothing is recorded, so Zoe can say so honestly
 * instead of inventing a week.
 */
export async function buildLifeTimelineBlock(
  authHeader: string,
  question: string,
  now = new Date(),
): Promise<{ block: string; window: TimelineWindow | null; entryCount: number }> {
  const window = detectTimeWindow(question, now);
  if (!window) return { block: '', window: null, entryCount: 0 };

  const url = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!url || !anon || !authHeader) return { block: '', window, entryCount: 0 };

  const db = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const inWindow = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
    q: T,
    column: string,
  ) => q.gte(column, window.fromISO).lte(column, window.toISO);

  const [posts, memories, lifeFacts, dates, orbTurns] = await Promise.all([
    inWindow(
      db.from('posts').select('content,media_type,created_at').order('created_at', { ascending: false }).limit(25) as never,
      'created_at',
    ),
    inWindow(
      db.from('mmora_memories').select('content,type,created_at').order('created_at', { ascending: false }).limit(25) as never,
      'created_at',
    ),
    db.from('zoe_life_context')
      .select('category,fact_key,fact_value,occurred_on,last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(30),
    db.from('important_dates')
      .select('title,date_type,date_value,is_recurring')
      .limit(30),
    inWindow(
      db.from('ai_companion_messages')
        .select('role,content,created_at')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(20) as never,
      'created_at',
    ),
  ]);

  const entries: TimelineEntry[] = [];

  for (const row of ((posts as { data?: Array<Record<string, unknown>> }).data) || []) {
    const body = String(row.content || '').trim();
    entries.push({
      when: fmt(row.created_at as string),
      kind: `Posted${row.media_type ? ` (${row.media_type})` : ''}`,
      text: body ? body.slice(0, 240) : 'a media post',
    });
  }

  for (const row of ((memories as { data?: Array<Record<string, unknown>> }).data) || []) {
    const body = String(row.content || '').trim();
    if (body) entries.push({ when: fmt(row.created_at as string), kind: `Memory (${row.type || 'note'})`, text: body.slice(0, 240) });
  }

  for (const row of ((orbTurns as { data?: Array<Record<string, unknown>> }).data) || []) {
    const body = String(row.content || '').trim();
    if (body) entries.push({ when: fmt(row.created_at as string), kind: 'Said to Zoe', text: body.slice(0, 200) });
  }

  entries.sort((a, b) => (a.when < b.when ? 1 : -1));

  const factLines = (lifeFacts.data || [])
    .map((f) => `- ${f.category}/${f.fact_key}: ${f.fact_value}`)
    .slice(0, 20);

  const dateLines = (dates.data || [])
    .map((d) => `- ${d.date_type || 'date'}: ${d.title || 'untitled'} on ${d.date_value}${d.is_recurring ? ' (yearly)' : ''}`)
    .slice(0, 20);

  if (!entries.length && !factLines.length && !dateLines.length) {
    return {
      block: `[THEIR TIMELINE — ${window.label}]\nNothing is recorded for this period. Say so plainly; do not invent activity.`,
      window,
      entryCount: 0,
    };
  }

  const sections = [
    `[THEIR TIMELINE — ${window.label}]`,
    entries.length ? entries.slice(0, 30).map((e) => `- ${e.when} · ${e.kind}: ${e.text}`).join('\n') : '(no activity recorded in this period)',
    factLines.length ? `\n[WHAT ZOE KNOWS ABOUT THEIR LIFE]\n${factLines.join('\n')}` : '',
    dateLines.length ? `\n[THEIR SAVED DATES]\n${dateLines.join('\n')}` : '',
    '\nAnswer only from the entries above. If something is not listed, say you do not have it recorded.',
  ].filter(Boolean);

  return { block: sections.join('\n'), window, entryCount: entries.length };
}
