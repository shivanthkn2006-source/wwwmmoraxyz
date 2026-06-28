/**
 * ZOE RECALL POLICY
 * Centralised rules for proactive memory recall.
 *
 *  - RECALL_THRESHOLD: minimum total messages in the session before Zoe is
 *    allowed to proactively surface a past memory (prevents creepy early recall).
 *  - RECALL_BLOCKLIST: topics Zoe never proactively re-injects. User can still
 *    ask explicitly and they remain in cortical storage; we just don't bring
 *    them up unprompted.
 */

export const RECALL_THRESHOLD = 25;

export const RECALL_BLOCKLIST: ReadonlyArray<string> = [
  'father', 'dad',
  'mother', 'mom', 'mum',
  'family',
  'trauma', 'traumatic',
  'abuse', 'abused',
  'suicide', 'self-harm', 'self harm',
  'death', 'died', 'funeral',
  'divorce', 'breakup', 'breakdown',
];

const BLOCK_RE = new RegExp(`\\b(${RECALL_BLOCKLIST.join('|')})\\b`, 'i');

/** True if the memory text contains any blocklisted topic. */
export function isBlockedRecall(memoryText: string): boolean {
  if (!memoryText) return false;
  return BLOCK_RE.test(memoryText);
}

/** True if Zoe is allowed to proactively surface memories right now. */
export function canProactivelyRecall(messageCount: number): boolean {
  return messageCount >= RECALL_THRESHOLD;
}

/** Filter a list of candidate memories through the blocklist. */
export function filterRecallCandidates<T extends { content?: string; value?: string }>(
  memories: T[],
): T[] {
  return memories.filter(m => !isBlockedRecall(m.content ?? m.value ?? ''));
}
