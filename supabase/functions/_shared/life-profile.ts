/**
 * LIFE PROFILE BLOCK
 * ==================
 * Everything Zoe already knows about the person she is talking to — food they
 * love, things they are allergic to, where they live, who matters to them —
 * pulled from `zoe_life_context` under the caller's own RLS and folded into the
 * system prompt.
 *
 * Two rules make this useful instead of creepy:
 *   1. Health facts (allergies, conditions) are treated as safety-critical and
 *      must never be contradicted by a suggestion.
 *   2. Zoe weaves a fact into conversation naturally; she never recites the list.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

export interface LifeProfileResult {
  block: string;
  count: number;
  hasHealthFacts: boolean;
}

const EMPTY: LifeProfileResult = { block: '', count: 0, hasHealthFacts: false };

export async function buildLifeProfileBlock(authHeader: string, limit = 40): Promise<LifeProfileResult> {
  if (!authHeader || !SUPABASE_URL || !ANON) return EMPTY;

  const db = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await db
    .from('zoe_life_context')
    .select('category, fact_key, fact_value, confidence, last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (error || !data || data.length === 0) return EMPTY;

  // Health first: an allergy must be the first thing she reads, not the last.
  const rank = (category: string) =>
    category === 'health' ? 0 : category === 'food' ? 1 : category === 'people' ? 2 : 3;
  const rows = [...data].sort((a, b) => rank(String(a.category)) - rank(String(b.category)));

  const health = rows.filter((r) => String(r.category) === 'health');
  const lines = rows.map(
    (r) => `- ${r.category}/${r.fact_key}: ${r.fact_value}${Number(r.confidence) < 0.7 ? ' (unconfirmed)' : ''}`,
  );

  const safety = health.length
    ? `\nSAFETY: the health facts above are non-negotiable. Never suggest food, plans or products that conflict with them, and say why when you steer around one.`
    : '';

  const block = `\n\nWHAT YOU ALREADY KNOW ABOUT THIS PERSON (their own words, remembered):\n${lines.join('\n')}${safety}
Use these naturally — one detail, in passing, the way a friend remembers. Never read the list out, never say "according to my records", and never ask again for something already listed here.`;

  return { block, count: rows.length, hasHealthFacts: health.length > 0 };
}
