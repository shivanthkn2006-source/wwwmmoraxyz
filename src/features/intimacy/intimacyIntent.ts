/**
 * Lets Zoe answer questions about the closeness layer and the Legacy Vault
 * from live data instead of guessing: "who am I closest to?", "how does my
 * feed rank?", "what's in my vault?".
 */
import { fetchIntimacyEdges, recomputeIntimacy } from './intimacyGraph';
import { listLegacyMemories, isUnlocked } from '@/features/legacy/legacyVault';
import { supabase } from '@/integrations/supabase/client';

export type IntimacyIntent = 'intimacy_circle' | 'intimacy_explain' | 'legacy_vault' | null;

const CIRCLE = /\b(who\s+am\s+i\s+(?:closest|closer|most connected)|my\s+(?:inner\s+circle|close(?:st)?\s+(?:people|friends)|closeness)|intimacy\s+(?:score|graph|circle))\b/i;
const EXPLAIN = /\b(how\s+(?:does|do)\s+(?:my\s+)?feed\s+(?:rank|work|order|sort)|why\s+(?:do\s+)?i\s+see\s+th(?:is|ese)\s+posts?|feed\s+ranking|algorithm)\b/i;
const LEGACY = /\b(legacy\s+vault|my\s+vault|sealed\s+(?:memor(?:y|ies)|message)|time\s+capsule|leave\s+behind)\b/i;

export function classifyIntimacyIntent(text: string): IntimacyIntent {
  const t = (text || '').trim();
  if (!t || t.length > 240) return null;
  if (LEGACY.test(t)) return 'legacy_vault';
  if (CIRCLE.test(t)) return 'intimacy_circle';
  if (EXPLAIN.test(t)) return 'intimacy_explain';
  return null;
}

async function displayNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from('public_profiles')
    .select('user_id, username, display_name')
    .in('user_id', ids);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ user_id: string; username?: string | null; display_name?: string | null }>) {
    map.set(row.user_id, row.display_name || row.username || 'someone in your circle');
  }
  return map;
}

async function circleReply(): Promise<string> {
  const edges = (await recomputeIntimacy()).slice(0, 5);
  if (edges.length === 0) {
    return "I don't have enough signal yet to name your inner circle. Once you've been reading, replying and saving for a few days, I'll be able to tell you exactly who you're closest to — and I'd rather say that than invent names.";
  }
  const names = await displayNames(edges.map((e) => e.targetUserId));
  const lines = edges.map((e, i) => {
    const name = names.get(e.targetUserId) ?? 'someone in your circle';
    const recip = Math.round(e.reciprocity * 100);
    const depth = Math.round(e.depthRatio * 100);
    return `${i + 1}. **${name}** — closeness ${e.score.toFixed(1)} · ${recip}% mutual · ${depth}% of it is real conversation (${e.eventCount} interactions)`;
  });
  return `Here's your circle right now, measured from how you actually engage — not from follower counts:\n\n${lines.join('\n')}`;
}

async function explainReply(): Promise<string> {
  const edges = await fetchIntimacyEdges();
  return [
    'Your feed ordering is closeness-first, not virality-first:',
    '',
    '• **Closeness** — people you reply to, save and message rank highest. Depth counts more than volume.',
    '• **Recency** — freshness decays smoothly over about three days.',
    '• **Velocity cap** — a post that is merely popular can never outrank someone close to you.',
    '• **Diversity** — no single person can take two of your first five slots.',
    '',
    edges.length > 0
      ? `I currently hold ${edges.length} closeness edge${edges.length === 1 ? '' : 's'} for you, recomputed from your own activity in the last 90 days.`
      : "I don't have closeness edges for you yet, so ordering stays chronological until there's real signal.",
  ].join('\n');
}

async function legacyReply(): Promise<string> {
  const items = await listLegacyMemories();
  if (items.length === 0) {
    return "Your Legacy Vault is empty. It's the private place for messages, recordings and memories you want to leave for specific people — you can seal an entry until a date you choose. Open it at /legacy whenever you're ready.";
  }
  const sealed = items.filter((m) => !isUnlocked(m)).length;
  const preview = items.slice(0, 5).map((m) => `• ${m.title}${isUnlocked(m) ? '' : ' *(sealed)*'}`);
  return `You have ${items.length} entr${items.length === 1 ? 'y' : 'ies'} in your Legacy Vault${sealed ? `, ${sealed} still sealed` : ''}:\n\n${preview.join('\n')}\n\nYou can open the full vault at /legacy.`;
}

export async function answerIntimacyQuestion(text: string): Promise<string | null> {
  const intent = classifyIntimacyIntent(text);
  if (!intent) return null;
  if (intent === 'intimacy_circle') return circleReply();
  if (intent === 'intimacy_explain') return explainReply();
  return legacyReply();
}
