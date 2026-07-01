// ═══════════════════════════════════════════════════════════════════════════════
// ZOE COMMAND BUS — "Zoe Run" / "Zoe End" wake-phrase router
// Self-contained. Any feature can subscribe via addEventListener.
// ═══════════════════════════════════════════════════════════════════════════════

export type ZoeFeatureName = 'decorator' | 'hairstyle' | 'vision' | 'chat';

export const ZOE_RUN_EVENT = 'zoe-command:run';
export const ZOE_END_EVENT = 'zoe-command:end';

export interface ZoeCommand {
  matched: boolean;
  action?: 'run' | 'end';
  feature?: ZoeFeatureName;
  raw: string;
}

const RUN_RE = /\b(?:hey\s+)?zoe[\s,]+run\b\s*(.*)/i;
const END_RE = /\b(?:hey\s+)?zoe[\s,]+(?:end|stop|close|exit|dismiss)\b/i;

const FEATURE_ALIASES: Array<[RegExp, ZoeFeatureName]> = [
  [/\b(decorat|redesign|interior|garden|landscape|room|home)\b/i, 'decorator'],
  [/\b(hair(style)?|haircut|barber)\b/i, 'hairstyle'],
  [/\b(vision|camera|see\s+me|look)\b/i, 'vision'],
  [/\b(chat|talk|conversation)\b/i, 'chat'],
];

export function detectZoeCommand(text: string): ZoeCommand {
  if (!text || typeof text !== 'string') return { matched: false, raw: text };
  const trimmed = text.trim();

  if (END_RE.test(trimmed)) {
    return { matched: true, action: 'end', raw: trimmed };
  }
  const runMatch = trimmed.match(RUN_RE);
  if (runMatch) {
    const rest = (runMatch[1] || '').trim();
    let feature: ZoeFeatureName | undefined;
    for (const [re, f] of FEATURE_ALIASES) { if (re.test(rest)) { feature = f; break; } }
    return { matched: true, action: 'run', feature, raw: trimmed };
  }
  return { matched: false, raw: trimmed };
}

export function emitZoeRun(feature: ZoeFeatureName, detail: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZOE_RUN_EVENT, { detail: { feature, ...detail } }));
}

export function emitZoeEnd(feature?: ZoeFeatureName) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZOE_END_EVENT, { detail: { feature } }));
}
