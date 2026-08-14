// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-ANCHORING CIRCUIT BREAKER
// Meta-agent observer: watches the last assistant turns and, when the model
// starts repeating itself ("no-progress loop"), injects a hidden system
// override right before the provider call. The user never sees the trigger.
// ═══════════════════════════════════════════════════════════════════════════

export interface LoopMessage { role: string; content: string }

export const CIRCUIT_BREAKER_INSTRUCTION =
  '[CIRCUIT BREAKER INITIATED: You are repeating yourself and stuck in a conversational loop. ' +
  'You must immediately drop the current topic, acknowledge the user\'s last input directly, ' +
  'and pivot the conversation forward. Do not repeat any sentence, question, or canned phrase ' +
  'you have already used in this conversation.]';

const SIMILARITY_THRESHOLD = 0.82;

function normalize(text: string): string {
  return String(text ?? '')
    .replace(/<(scratchpad|thinking|think)>[\s\S]*?<\/\1>/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dice coefficient over word bigrams — cheap, no deps, stable for short replies. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const grams = (s: string) => {
    const w = s.split(' ');
    if (w.length < 2) return [s];
    return w.slice(0, -1).map((x, i) => `${x} ${w[i + 1]}`);
  };
  const ga = grams(na);
  const gb = new Map<string, number>();
  for (const g of grams(nb)) gb.set(g, (gb.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of ga) {
    const c = gb.get(g) ?? 0;
    if (c > 0) { hits++; gb.set(g, c - 1); }
  }
  return (2 * hits) / (ga.length + grams(nb).length);
}

/**
 * True when the last 2-3 assistant turns are effectively the same answer.
 * Also fires when a canned fallback phrase is emitted twice in a row.
 */
export function detectLoop(messages: LoopMessage[]): boolean {
  const assistant = (messages ?? [])
    .filter((m) => m?.role === 'assistant' && typeof m.content === 'string' && normalize(m.content).length > 0)
    .slice(-3)
    .map((m) => m.content);

  if (assistant.length < 2) return false;

  for (let i = 1; i < assistant.length; i++) {
    if (similarity(assistant[i - 1], assistant[i]) >= SIMILARITY_THRESHOLD) return true;
  }

  // Three turns that all share the same opening clause = no-progress loop.
  if (assistant.length === 3) {
    const heads = assistant.map((t) => normalize(t).split(' ').slice(0, 8).join(' '));
    if (heads[0] && heads[0] === heads[1] && heads[1] === heads[2]) return true;
  }
  return false;
}

/**
 * Returns the messages array to send to the provider, with a hidden system
 * override appended when a loop is detected. Never mutates the input.
 */
export function applyCircuitBreaker<T extends LoopMessage>(messages: T[]): T[] {
  if (!detectLoop(messages)) return messages;
  const already = messages.some((m) => m.role === 'system' && String(m.content).includes('CIRCUIT BREAKER INITIATED'));
  if (already) return messages;
  console.log('[circuit-breaker] loop detected — injecting anti-loop system override');
  return [...messages, { role: 'system', content: CIRCUIT_BREAKER_INSTRUCTION } as T];
}
