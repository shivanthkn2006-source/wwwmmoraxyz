/**
 * GETTING TO KNOW YOU
 * ===================
 * Zoe learns tastes the way a person does: not with a form on day one, but by
 * asking one small question once a conversation is already flowing, and then
 * remembering the answer forever.
 *
 * Rules that keep this from feeling like an interrogation:
 *   - never on the opening turn (the conversation has to have started)
 *   - at most one question per conversation, and one per 20 hours per person
 *   - never asks about something already stored in `zoe_life_context`
 *   - never stacks a question onto a reply that already asks one
 *
 * The answer to a probe is captured explicitly on the following turn, because a
 * bare reply like "eggs" carries no pattern for the extractor to match.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProbeTopic {
  category: string;
  factKey: string;
  ask: string;
}

/** Ordered by how useful the answer is to Zoe. Allergies first — it is safety. */
export const PROBE_TOPICS: ProbeTopic[] = [
  {
    category: 'health',
    factKey: 'allergies',
    ask: "While I think of it — is there anything you're allergic to? Food or otherwise. I'd rather know than guess.",
  },
  { category: 'food', factKey: 'likes', ask: 'What food do you actually look forward to?' },
  { category: 'food', factKey: 'dislikes', ask: "And anything you'd never order?" },
  { category: 'preference', factKey: 'music', ask: 'What do you put on when you want to think?' },
  { category: 'work', factKey: 'role', ask: 'What do you spend most of your working day on?' },
  { category: 'location', factKey: 'home', ask: 'Where are you based these days?' },
  { category: 'preference', factKey: 'weekend', ask: 'What does a good weekend look like for you?' },
];

const COOLDOWN_MS = 20 * 60 * 60 * 1000;
const STORAGE_KEY = 'zoe.probe.lastAsked';
const NEGATIVE = /^(no|nope|none|nothing|not really|nah|skip|later|prefer not)\b/i;

let knownKeys: Set<string> | null = null;
let loadingKnown = false;
let askedThisSession = false;
let pendingTopic: ProbeTopic | null = null;

/** Test hook: forget everything this module has cached. */
export function resetPreferenceProbe(): void {
  knownKeys = null;
  loadingKnown = false;
  askedThisSession = false;
  pendingTopic = null;
}

function lastAskedAt(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function markAsked(): void {
  askedThisSession = true;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode — the session guard still holds */
  }
}

/** Warm the "what do I already know" cache in the background. Never blocks a turn. */
function warmKnownFacts(): void {
  if (knownKeys || loadingKnown) return;
  loadingKnown = true;
  void supabase.functions
    .invoke('zoe-life-context', { body: { mode: 'recall', limit: 100 } })
    .then(({ data }) => {
      const facts = (data as { facts?: Array<{ category: string; fact_key: string }> } | null)?.facts ?? [];
      knownKeys = new Set(facts.map((f) => `${f.category}:${f.fact_key}`));
    })
    .catch(() => {
      knownKeys = new Set();
    })
    .finally(() => {
      loadingKnown = false;
    });
}

export function pickProbeTopic(known: Set<string>): ProbeTopic | null {
  return PROBE_TOPICS.find((t) => !known.has(`${t.category}:${t.factKey}`)) ?? null;
}

export interface ProbeInput {
  /** How many turns already happened in this conversation. */
  turnIndex: number;
  /** Zoe's reply for this turn — a reply that already asks something is left alone. */
  replyText: string;
}

/**
 * Returns one short getting-to-know-you question to append to Zoe's reply, or
 * null when now is not the moment.
 */
export function maybePreferenceProbe({ turnIndex, replyText }: ProbeInput): string | null {
  warmKnownFacts();
  if (askedThisSession) return null;
  if (turnIndex < 2) return null; // not straight away — the conversation has to be running
  if (!replyText || replyText.trim().length < 12) return null;
  if (/\?\s*$/.test(replyText.trim())) return null; // she already asked something
  if (Date.now() - lastAskedAt() < COOLDOWN_MS) return null;
  if (!knownKeys) return null; // cache still warming — ask next time, never stall a turn

  const topic = pickProbeTopic(knownKeys);
  if (!topic) return null;

  pendingTopic = topic;
  markAsked();
  return topic.ask;
}

/**
 * The turn after a probe: whatever the person said IS the answer. Stored
 * explicitly so a one-word reply ("eggs") still becomes a durable fact.
 */
export async function capturePreferenceAnswer(text: string): Promise<boolean> {
  const topic = pendingTopic;
  if (!topic) return false;
  pendingTopic = null;

  const value = (text || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!value || value.length < 2) return false;
  if (NEGATIVE.test(value) && topic.category === 'health') {
    // "no allergies" is itself worth remembering, so she stops asking.
    return storeFact(topic, 'none reported');
  }
  if (NEGATIVE.test(value)) return false;
  return storeFact(topic, value);
}

async function storeFact(topic: ProbeTopic, value: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('zoe-life-context', {
      body: {
        mode: 'ingest',
        facts: [
          {
            category: topic.category,
            fact_key: topic.factKey,
            fact_value: value,
            confidence: 0.95,
          },
        ],
      },
    });
    if (error) return false;
    knownKeys?.add(`${topic.category}:${topic.factKey}`);
    return true;
  } catch {
    return false;
  }
}

/** Exposed for tests and diagnostics. */
export function pendingProbeTopic(): ProbeTopic | null {
  return pendingTopic;
}
