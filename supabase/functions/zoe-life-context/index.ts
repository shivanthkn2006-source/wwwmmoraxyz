/**
 * ZOE LIFE CONTEXT
 * ================
 * Distils a conversation turn into durable facts about the person — events and
 * dates, work, places, food, clothing, people, preferences — and stores them in
 * `zoe_life_context` plus the DHF memory store, so Zoe can think from the past
 * instead of starting cold every time.
 *
 * Two modes:
 *   POST { mode: 'ingest', text, role, sourceId }  → extract + store
 *   POST { mode: 'recall', limit }                 → compact context for prompts
 *
 * Extraction is deterministic and free (pattern-based). No model call, so this
 * scales to every message at 500+ users without adding cost or latency.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveClaims } from '../_shared/auth-claims.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Fact {
  category: string;
  fact_key: string;
  fact_value: string;
  confidence: number;
  occurred_on?: string;
}

/** Ordered so the most specific pattern wins; each capture becomes one fact. */
const PATTERNS: Array<{ category: string; key: string; re: RegExp; confidence: number }> = [
  { category: 'food', key: 'likes', re: /\bi (?:really )?(?:love|like|enjoy) (?:eating |having )?([a-z0-9'\- ]{3,40})/i, confidence: 0.7 },
  { category: 'food', key: 'dislikes', re: /\bi (?:really )?(?:hate|dislike|can'?t stand) (?:eating |having )?([a-z0-9'\- ]{3,40})/i, confidence: 0.7 },
  { category: 'work', key: 'role', re: /\bi(?:'m| am) (?:a|an|the) ([a-z0-9'\- ]{3,40}?)(?: at | in |\.|,|$)/i, confidence: 0.75 },
  { category: 'work', key: 'employer', re: /\bi work (?:at|for) ([a-z0-9'\-& ]{2,40})/i, confidence: 0.8 },
  { category: 'work', key: 'project', re: /\bi(?:'m| am) (?:building|working on) ([a-z0-9'\- ]{3,60})/i, confidence: 0.7 },
  { category: 'location', key: 'home', re: /\bi live in ([a-z0-9'\- ]{2,40})/i, confidence: 0.85 },
  { category: 'location', key: 'from', re: /\bi(?:'m| am) from ([a-z0-9'\- ]{2,40})/i, confidence: 0.8 },
  { category: 'location', key: 'travel', re: /\bi(?:'m| am) (?:going|travelling|traveling|flying) to ([a-z0-9'\- ]{2,40})/i, confidence: 0.65 },
  { category: 'clothes', key: 'style', re: /\bi (?:usually |always )?wear ([a-z0-9'\- ]{3,40})/i, confidence: 0.65 },
  { category: 'clothes', key: 'size', re: /\bmy (?:shirt |shoe |dress )?size is ([a-z0-9'\-. ]{1,20})/i, confidence: 0.8 },
  { category: 'people', key: 'relation', re: /\bmy (wife|husband|partner|mother|father|mom|dad|son|daughter|brother|sister|friend|boss) (?:is |is called |is named )?([a-z0-9'\- ]{2,30})/i, confidence: 0.75 },
  { category: 'preference', key: 'general', re: /\bi prefer ([a-z0-9'\- ]{3,50})/i, confidence: 0.7 },
  // HEALTH — highest confidence in the set. An allergy is safety information,
  // so every ordinary way of saying it is matched, including third person
  // ("Asha has an egg allergy") when the member is describing themselves.
  { category: 'health', key: 'allergies', re: /\b(?:i(?:'m| am)?\s*)?allergic to ([a-z0-9'\- ,]{2,60})/i, confidence: 0.95 },
  { category: 'health', key: 'allergies', re: /\bi have (?:an?\s+)?([a-z0-9'\- ]{2,40}?) allerg(?:y|ies)\b/i, confidence: 0.95 },
  { category: 'health', key: 'allergies', re: /\bmy allerg(?:y|ies) (?:is|are) ([a-z0-9'\- ,]{2,60})/i, confidence: 0.95 },
  { category: 'health', key: 'intolerance', re: /\bi (?:can'?t|cannot|must not) (?:eat|have|drink|take) ([a-z0-9'\- ,]{2,50})/i, confidence: 0.85 },
  { category: 'health', key: 'diet', re: /\bi(?:'m| am) (vegan|vegetarian|pescatarian|gluten free|lactose intolerant|diabetic)\b/i, confidence: 0.9 },
  { category: 'preference', key: 'favourite', re: /\bmy favou?rite ([a-z0-9'\- ]{2,25}) is ([a-z0-9'\- ]{2,40})/i, confidence: 0.85 },
  { category: 'preference', key: 'music', re: /\bi listen to ([a-z0-9'\- ]{2,40})/i, confidence: 0.65 },
];

const DATE_RE = /\b(?:on |this |next |last )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{4}-\d{2}-\d{2})\b/i;
const EVENT_RE = /\b(?:i (?:have|had|got)|my) ([a-z0-9'\- ]{3,50}?)(?: on | at |\.|,|$)/i;

// People run several statements into one breath ("I live in Kochi and I work
// at M'Mora"), so a captured value is cut at the first joining word. Without
// this, one fact swallows the next sentence.
const STOP_RE = /\s+(?:and|but|so|because|then|while|although|though|however|also|plus)\s+.*$/i;
const clean = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(STOP_RE, '')
    .replace(/[.,!?;]+$/, '')
    .slice(0, 200);

export function extractFacts(text: string): Fact[] {
  const facts: Fact[] = [];
  const source = (text || '').slice(0, 4000);
  if (!source.trim()) return facts;

  for (const p of PATTERNS) {
    const m = source.match(p.re);
    if (!m) continue;
    const value = clean(m[2] ?? m[1] ?? '');
    if (value.length < 2) continue;
    const key = p.category === 'people' && m[2] ? clean(m[1]).toLowerCase() : p.key;
    facts.push({ category: p.category, fact_key: key, fact_value: value, confidence: p.confidence });
  }

  const dateMatch = source.match(DATE_RE);
  const eventMatch = source.match(EVENT_RE);
  if (dateMatch && eventMatch) {
    const label = clean(eventMatch[1]);
    if (label.length > 2) {
      facts.push({
        category: 'event',
        fact_key: label.toLowerCase().slice(0, 60),
        fact_value: `${label} — ${clean(dateMatch[1])}`,
        confidence: 0.6,
      });
    }
  }

  // Keep one fact per (category,key); later matches are usually noisier.
  const seen = new Set<string>();
  return facts.filter((f) => {
    const id = `${f.category}:${f.fact_key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: claims } = await resolveClaims(authClient, token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const mode = typeof body.mode === 'string' ? body.mode : 'ingest';

  if (mode === 'recall') {
    const limit = Math.min(Number(body.limit) || 40, 100);
    const { data, error } = await db
      .from('zoe_life_context')
      .select('category, fact_key, fact_value, occurred_on, last_seen_at')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(limit);
    if (error) return json({ ok: false, error: error.message }, 500);
    const lines = (data ?? []).map((f) => `- ${f.category}/${f.fact_key}: ${f.fact_value}`);
    return json({ ok: true, facts: data ?? [], summary: lines.join('\n') });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) return json({ ok: true, stored: 0, facts: [] });

  const facts = extractFacts(text);
  if (facts.length === 0) return json({ ok: true, stored: 0, facts: [] });

  const now = new Date().toISOString();
  const rows = facts.map((f) => ({
    user_id: userId,
    category: f.category,
    fact_key: f.fact_key,
    fact_value: f.fact_value,
    confidence: f.confidence,
    source: 'conversation',
    source_id: typeof body.sourceId === 'string' ? body.sourceId : null,
    last_seen_at: now,
  }));

  const { error } = await db.from('zoe_life_context').upsert(rows, { onConflict: 'user_id,category,fact_key' });
  if (error) return json({ ok: false, error: error.message }, 500);

  // Mirror into DHF long-term memory so the wider brain sees it too.
  try {
    await db.from('mmora_memories').insert(
      facts.map((f) => ({
        user_id: userId,
        content: `${f.category}: ${f.fact_value}`,
        type: 'life_context',
      })),
    );
  } catch {
    /* DHF mirroring is best-effort; the canonical row is already stored */
  }

  return json({ ok: true, stored: rows.length, facts });
});
