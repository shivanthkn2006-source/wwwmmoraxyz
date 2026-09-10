/**
 * MEMBER-FACING SITE MAP
 *
 * Groups every canonical route (from routeRegistry.generated.ts, which is
 * produced from App.tsx) into plain-language areas with a one-line purpose and
 * an access tier. Nothing here changes routing — it only describes it, for the
 * /map page, the /help guides and Zoe's page awareness.
 */
import { CANONICAL_ROUTES } from './routeRegistry.generated';

export type SiteArea =
  | 'Start'
  | 'Daily'
  | 'Create'
  | 'Connect'
  | 'Zoe'
  | 'Growth'
  | 'Vault'
  | 'Settings'
  | 'Admin'
  | 'Internal';

/** public = open on day one · earned = unlocks with real use · admin = staff only. */
export type AccessTier = 'public' | 'earned' | 'admin';

export interface SiteMapEntry {
  path: string;
  label: string;
  area: SiteArea;
  tier: AccessTier;
  /** One line a 10-year-old can read. */
  purpose: string;
}

/** Routes members never navigate to directly. */
const HIDDEN = new Set(['*', '/access-denied', '/password-recovery', '/source']);

/** Hand-written purposes. Anything missing falls back to a generic line. */
const PURPOSE: Record<string, string> = {
  '/auth': 'Create your account or sign back in.',
  '/home': 'Everything from the people you follow, newest first.',
  '/demo': 'A real shared account anyone can open to look around before joining.',
  '/import/x': 'Paste a link to a public post on X and keep its words, picture and date here.',

  '/mosaic': 'A quieter grid of posts, ordered by who you are closest to.',
  '/selfie-city': 'Photos pinned to the places they were taken.',
  '/universal-timeline': 'Your whole story on one line, year by year.',
  '/camera': 'Take a photo or a short loop.',
  '/quantum-camera': 'Camera with live effects and filters.',
  '/webdrop': 'Send a file straight to someone nearby.',
  '/chat': 'Your messages.',
  '/huddle': 'Find people, add friends, see who is around.',
  '/profile': 'How other people see you.',
  '/compass': 'A daily direction from your DHF.',
  '/dhf-dashboard': 'Your Digital Human Footprint — what Zoe has learned about you.',
  '/growth-insights': 'Small daily lessons picked for you.',
  '/astrology': 'Your sign, your day, and what it means for you.',
  '/zoe-ai': 'Talk to Zoe in a full window.',
  '/zoe/brain': "Zoe's health: how fast she answers and what is failing.",
  '/legacy': 'Your Digital Vault — memories you want kept.',
  '/privacy': 'Download everything we hold, or delete your account.',
  '/terms': 'The rules of using M\u2019Mora.',
  '/data-policy': 'What we store, why, and for how long.',
  '/about': 'Who built this and why.',
  '/install': 'Put M\u2019Mora on your phone home screen.',
  '/help': 'Short guides for getting started.',
  '/map': 'Every page in M\u2019Mora, grouped and explained.',
  '/bug-report': 'Tell us something is broken.',
  '/notification-preferences': 'Choose what you get told about.',
  '/notification-history': 'Everything we have sent you.',
  '/voice-commands': 'Things you can say out loud.',
  '/zoe-audio': 'Connect Bluetooth headphones and route Zoe\u2019s voice to your ear.',
  '/beta': 'Early-access information.',
};

const AREA_RULES: Array<[SiteArea, (p: string) => boolean]> = [
  ['Admin', (p) => p.startsWith('/admin') || p.startsWith('/god-mode') || p === '/sentinel' || p === '/security' || p === '/attack-response' || p === '/root-scan' || p === '/platform-audit'],
  ['Start', (p) => ['/', '/auth', '/voice-auth', '/about', '/install', '/beta', '/help', '/map', '/terms', '/data-policy'].includes(p)],
  ['Daily', (p) => ['/home', '/mosaic', '/selfie-city', '/universal-timeline', '/compass'].includes(p)],
  ['Create', (p) => ['/camera', '/quantum-camera', '/webdrop', '/merchant'].includes(p)],
  ['Connect', (p) => p.startsWith('/chat') || p.startsWith('/profile') || ['/huddle', '/exodus', '/exodus-map'].includes(p)],
  ['Vault', (p) => ['/legacy', '/privacy', '/activity-export', '/agent-memory'].includes(p)],
  ['Growth', (p) => ['/growth-insights', '/astrology', '/anka-shastra', '/career-divinity', '/compatibility-report', '/vastu-scan', '/vitruvian', '/kronos-anima', '/agasthya-vision'].includes(p)],
  ['Zoe', (p) => p.includes('zoe') || p.includes('dhf') || ['/ai-companion', '/phoenix-core', '/omega-evolution', '/orbital-command', '/resleeve'].includes(p)],
  ['Settings', (p) => p.startsWith('/notification') || p.startsWith('/voice-command') || ['/bug-report'].includes(p)],
];

function areaFor(path: string): SiteArea {
  for (const [area, test] of AREA_RULES) if (test(path)) return area;
  return 'Internal';
}

/** Features that stay locked until someone has actually used the platform. */
const EARNED = new Set([
  '/legacy',
  '/astrology',
  '/anka-shastra',
  '/career-divinity',
  '/compatibility-report',
  '/vastu-scan',
  '/kronos-anima',
  '/agasthya-vision',
  '/dhf-dashboard',
  '/compass',
  '/growth-insights',
  '/universal-timeline',
]);

function tierFor(path: string, area: SiteArea): AccessTier {
  if (area === 'Admin' || area === 'Internal') return 'admin';
  if (EARNED.has(path)) return 'earned';
  return 'public';
}

/** Extra member-facing pages that are not (yet) in the generated registry. */
const EXTRA: Array<{ path: string; label: string }> = [
  { path: '/map', label: 'Site map' },
  { path: '/help', label: 'Help' },
  { path: '/zoe-audio', label: 'Zoe audio & Bluetooth' },
];

// EXTRA wins on label; deduped by path so a route present in both appears once.
const BY_PATH = new Map<string, { path: string; label: string }>();
for (const r of CANONICAL_ROUTES) {
  if (r.dynamic || HIDDEN.has(r.path)) continue;
  BY_PATH.set(r.path, { path: r.path, label: r.label });
}
for (const e of EXTRA) BY_PATH.set(e.path, e);
const ALL = [...BY_PATH.values()];

export const SITE_MAP: SiteMapEntry[] = ALL.map(({ path, label }) => {
  const area = areaFor(path);
  return {
    path,
    label: path === '/' ? 'Start here' : label,
    area,
    tier: tierFor(path, area),
    purpose: PURPOSE[path] ?? `${label} — part of the ${area.toLowerCase()} area.`,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

export const SITE_AREAS: SiteArea[] = [
  'Start',
  'Daily',
  'Create',
  'Connect',
  'Zoe',
  'Growth',
  'Vault',
  'Settings',
  'Admin',
  'Internal',
];

export function siteMapByArea(includeAdmin: boolean): Array<{ area: SiteArea; entries: SiteMapEntry[] }> {
  return SITE_AREAS.filter((a) => includeAdmin || (a !== 'Admin' && a !== 'Internal'))
    .map((area) => ({ area, entries: SITE_MAP.filter((e) => e.area === area) }))
    .filter((g) => g.entries.length > 0);
}

/**
 * Per-page briefing Zoe gets on top of the purpose line: what she can actually
 * do for the member while they are standing on this page.
 */
const PAGE_ABILITIES: Record<string, string> = {
  '/astrology':
    'On this page you can answer questions about the member\u2019s chart, today\u2019s transits, ' +
    'their sign and compatibility, using their saved birth details. If birth details are ' +
    'missing, ask for date, time and place instead of guessing. Do not invent placements.',
  '/legacy':
    'This is the Digital Vault. Here you can help the member save, find, retitle or read back ' +
    'a memory or a legacy message, and explain who will be able to see it. Never read vault ' +
    'contents aloud unless the member asks on this page.',
  '/vault':
    'This is the Digital Vault. Here you can help the member save, find, retitle or read back ' +
    'a memory or a legacy message, and explain who will be able to see it.',
  '/chat':
    'This is Messages. Here you can help draft or shorten a reply, summarise an unread thread, ' +
    'find an old message, or say who is waiting on an answer. Never send a message without ' +
    'the member confirming the wording first.',
};

/** Short "what you can do here" line Zoe injects for the current route. */
export function pageContextLine(path: string): string {
  const entry = SITE_MAP.find((e) => e.path === path);
  const abilities = PAGE_ABILITIES[path];
  if (!entry) return abilities ? `Current page: ${path}. ${abilities}` : '';
  const base = `Current page: ${entry.label} (${entry.area}). ${entry.purpose}`;
  return abilities ? `${base} ${abilities}` : base;
}

/** Friendly page name for spoken replies ("You're on Home"). */
export function resolvePageTitle(path: string): string | null {
  const entry = SITE_MAP.find((e) => e.path === path);
  if (entry) return entry.label;
  const segment = path.split('/').filter(Boolean)[0];
  if (!segment) return null;
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
