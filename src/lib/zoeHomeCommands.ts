export type ZoeHomeDetectedCommand =
  | 'hide-loops'
  | 'unhide-loops'
  | 'toggle-loops'
  | 'stop-scrolling'
  | 'start-scrolling'
  | 'unknown';

export type ZoeHomeDebugStage = 'parse' | 'route' | 'handler' | 'state';

export interface ZoeHomeCommandDetection {
  raw: string;
  transcript: string;
  normalized: string;
  command: ZoeHomeDetectedCommand;
  homeSurface: boolean;
  reason: string;
}

export interface ZoeHomeDebugDetail {
  stage: ZoeHomeDebugStage;
  transcript?: string;
  normalized?: string;
  detectedCommand?: ZoeHomeDetectedCommand;
  handler?: string;
  source?: string;
  eventName?: string;
  reason?: string;
  loopsHidden?: boolean;
  headerVisible?: boolean;
  autoScrollEnabled?: boolean;
  feedAutoPassCompleted?: boolean;
  loopRailPassCompleted?: boolean;
  at?: number;
}

export const ZOE_HOME_DEBUG_EVENT = 'mmora:zoe-home-debug';
export const ZOE_HOME_STATE_EVENT = 'mmora:zoe-home-state';

export const ZOE_HOME_TRANSCRIPT_EVENTS = [
  'zoe:transcript', 'zoe-transcript', 'zoe:command', 'zoe-command',
  'zoe-voice-command', 'zoe-global-voice-command', 'vr-voice-input',
  'zoe-navigate', 'zoe-heard', 'zoe-user-said',
  'mmora:transcript', 'mmora:voice-transcript', 'speech:transcript',
];

export function normalizeZoeHomeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractZoeHomeEventText(detail: unknown): string {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (typeof detail !== 'object') return '';

  const d = detail as Record<string, unknown>;
  const direct = d.command ?? d.action ?? d.intent ?? d.transcript ?? d.text ?? d.query ?? d.message ?? d.speech ?? d.raw;
  if (typeof direct === 'string') return direct;

  const nested = d.detail ?? d.payload ?? d.data;
  if (nested && nested !== detail) return extractZoeHomeEventText(nested);
  return '';
}

export function stripZoeWakePhrase(value: string) {
  return normalizeZoeHomeText(value).replace(/^(hey|ok|okay|hi|hello)?\s*zoe\s+/, '').trim();
}

export function detectZoeHomeCommand(input: string): ZoeHomeCommandDetection {
  const transcript = normalizeZoeHomeText(input);
  const normalized = stripZoeWakePhrase(transcript);
  const compact = normalized.replace(/-/g, ' ');
  const mentionsHomeSurface = /\b(loop|loops|rail|timeline|feed|scroll|scrolling|header|home)\b/.test(compact);
  const hasAction = /\b(hide|unhide|show|open|close|toggle|stop|pause|start|resume|play)\b/.test(compact);
  const homeSurface = mentionsHomeSurface && hasAction;

  let command: ZoeHomeDetectedCommand = 'unknown';
  let reason = homeSurface ? 'home-surface-match' : 'not-a-home-surface-command';

  if (/\b(unhide|show|open)\b/.test(compact) && /\bloops?\b/.test(compact)) {
    command = 'unhide-loops';
    reason = 'loops-unhide';
  } else if (/\bhide\b/.test(compact) && /\bloops?\b/.test(compact) && !/\bunhide\b/.test(compact)) {
    command = 'hide-loops';
    reason = 'loops-hide';
  } else if (/\btoggle\b/.test(compact) && /\bloops?\b/.test(compact)) {
    command = 'toggle-loops';
    reason = 'loops-toggle';
  } else if (/\b(stop|pause)\b/.test(compact) && /\b(scroll|scrolling|timeline|feed)\b/.test(compact)) {
    command = 'stop-scrolling';
    reason = 'timeline-stop';
  } else if (/\b(start|resume|play)\b/.test(compact) && /\b(scroll|scrolling|timeline|feed)\b/.test(compact)) {
    command = 'start-scrolling';
    reason = 'timeline-start';
  }

  return { raw: input, transcript, normalized, command, homeSurface, reason };
}

export function logZoeHomeCommand(detail: ZoeHomeDebugDetail) {
  const enriched: ZoeHomeDebugDetail = { ...detail, at: detail.at ?? Date.now() };
  try {
    if (typeof window !== 'undefined') {
      const key = '__mmoraZoeHomeCommandLog';
      const current = Array.isArray((window as any)[key]) ? (window as any)[key] : [];
      (window as any)[key] = [enriched, ...current].slice(0, 80);
      (window as any).__mmoraLastZoeHomeCommand = enriched;
      window.dispatchEvent(new CustomEvent(ZOE_HOME_DEBUG_EVENT, { detail: enriched }));
    }
  } catch {
    // Debug logging must never break app controls.
  }
  try {
    // Always log in production too; this is the production failure trace.
    console.info('[ZoeHomeCommand]', enriched);
  } catch {
    // ignore console failures
  }
}
