/**
 * SPOKEN INTENT ROUTER — one place that turns what a member says into a real
 * platform action.
 *
 * Only deterministic, do-something intents live here (open a page, open
 * notifications, start a message, jump to astrology). Everything else returns
 * `null` so the turn falls through to the canonical `askZoe()` brain, which
 * answers naturally from live platform + web grounding instead of a script.
 */

import { SITE_MAP } from '@/config/siteMap';
import { normalizeVoicePhrase, ZOE_WAKE_PHRASES } from './phrases';

export type VoiceIntent =
  | { kind: 'navigate'; path: string; label: string; speak: string }
  | { kind: 'notifications'; speak: string }
  | { kind: 'orb-chat'; speak: string }
  | { kind: 'message'; recipient: string; speak: string };

/** Spoken aliases that are not the page label ("chat" → Messages). */
const ALIASES: Record<string, string> = {
  home: '/home',
  'home page': '/home',
  feed: '/home',
  timeline: '/universal-timeline',
  chat: '/chat',
  chats: '/chat',
  messages: '/chat',
  inbox: '/chat',
  dm: '/chat',
  mosaic: '/mosaic',
  profile: '/profile',
  settings: '/settings',
  astrology: '/astrology',
  horoscope: '/astrology',
  'my chart': '/astrology',
  vault: '/vault',
  'digital vault': '/vault',
  legacy: '/legacy',
  growth: '/growth-insights',
  'growth insights': '/growth-insights',
  compass: '/compass',
  search: '/search',
  create: '/create',
  'zoe audio': '/zoe-audio',
  audio: '/zoe-audio',
  headset: '/zoe-audio',
  bluetooth: '/zoe-audio',
  help: '/help',
  map: '/map',
  'site map': '/map',
  'kronos anima': '/kronos-anima',
  'agasthya vision': '/agasthya-vision',
  vision: '/agasthya-vision',
};

const NAV_VERB = /\b(open|go\s+to|goto|take\s+me\s+to|show\s+me|show|navigate\s+to|switch\s+to|launch|bring\s+up)\b/;

/** Strip a leading wake word so "Zoe open chat" resolves like "open chat". */
function stripWake(text: string): string {
  let t = normalizeVoicePhrase(text);
  const sorted = [...ZOE_WAKE_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    const p = normalizeVoicePhrase(phrase);
    if (t === p) return '';
    if (t.startsWith(`${p} `)) {
      t = t.slice(p.length + 1);
      break;
    }
  }
  return t.trim();
}

/** Page targets, longest label first so "growth insights" beats "growth". */
function targets(): Array<{ key: string; path: string; label: string }> {
  const rows: Array<{ key: string; path: string; label: string }> = [];
  for (const [key, path] of Object.entries(ALIASES)) {
    const entry = SITE_MAP.find((e) => e.path === path);
    rows.push({ key: normalizeVoicePhrase(key), path, label: entry?.label ?? key });
  }
  for (const entry of SITE_MAP) {
    const key = normalizeVoicePhrase(entry.label);
    if (!key || key.length < 3) continue;
    rows.push({ key, path: entry.path, label: entry.label });
  }
  return rows.sort((a, b) => b.key.length - a.key.length);
}

export function resolveVoiceIntent(rawText: string): VoiceIntent | null {
  const text = stripWake(rawText || '');
  if (!text) return null;

  // "send a message to asha soosan" / "message asha"
  const message = text.match(/^(?:send\s+(?:a\s+)?(?:message|text|dm)\s+to|message|text|dm)\s+(.+)$/);
  if (message) {
    const recipient = message[1].replace(/\bsaying\b.*$/, '').trim();
    if (recipient && recipient.length > 1) {
      return {
        kind: 'message',
        recipient,
        speak: `Opening messages so you can send that to ${recipient}. I will not send anything until you confirm the wording.`,
      };
    }
  }

  // notifications
  if (/\b(notification|notifications|alerts?)\b/.test(text) && !/\bsettings\b/.test(text)) {
    return { kind: 'notifications', speak: 'Opening your notifications.' };
  }

  const hasVerb = NAV_VERB.test(text);
  const bare = text.replace(NAV_VERB, '').replace(/\bpage\b/g, '').replace(/\s+/g, ' ').trim();

  for (const target of targets()) {
    const isWholeMatch = bare === target.key;
    const mentioned = new RegExp(`(?:^|\\s)${target.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(bare);
    // A bare page name ("Zoe home") navigates; otherwise a navigation verb is
    // required so questions like "what is my astrology this week" still reach
    // Zoe's brain instead of silently jumping pages.
    if (isWholeMatch || (hasVerb && mentioned)) {
      return {
        kind: 'navigate',
        path: target.path,
        label: target.label,
        speak: `Opening ${target.label}.`,
      };
    }
  }

  return null;
}
