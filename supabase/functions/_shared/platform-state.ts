// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM STATE INJECTION
// Audit fix (OMNI_GRAPH SEP03 #15): Zoe's brain had zero knowledge of the
// platform she lives in — no routes, no capabilities — so she could not answer
// "what can mmora do" or "where do I change my growth preferences".
// This is a versioned, compact snapshot injected into every brain call.
// ═══════════════════════════════════════════════════════════════════════════════

export const PLATFORM_STATE_VERSION = '2026-09-03';

export interface PlatformCapability {
  name: string;
  route: string;
  what: string;
}

/** Canonical, user-facing capability registry (keep in sync with the dock). */
export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  { name: 'Home feed', route: '/home', what: 'chronological posts, loops, growth cards, search results inline' },
  { name: 'Loops', route: '/loops', what: 'short vertical videos, autoplay once, muted by default' },
  { name: 'Create post', route: '/home', what: 'mixed upload of images, videos and PDFs in one picker' },
  { name: 'Search', route: '/home', what: 'unified dock search: platform, web, images, videos, news, weather, shopping' },
  { name: 'Growth insights', route: '/growth-insights', what: 'personalised habit + reflection cards delivered five times a day' },
  { name: 'Growth preferences', route: '/growth-onboarding', what: 'pick focus areas, delivery styles and timing windows' },
  { name: 'Daily Compass (DHF)', route: '/dhf', what: 'daily essays and guidance from the human-figure roster' },
  { name: 'Zoe Infinity', route: '/zoe-infinity', what: 'voice + text conversation with Zoe, memory, deep thinking' },
  { name: 'Zoe Astro', route: '/zoe-astro', what: 'Swiss-ephemeris astrology, four dispatches a day' },
  { name: 'Birth details', route: '/zoe-astro/birth', what: 'edit birth date, time and place used by astrology + compass' },
  { name: 'Chat', route: '/chat', what: 'direct messages between members' },
  { name: 'Notifications', route: '/notifications', what: 'likes, comments, follows, growth and DHF alerts' },
  { name: 'Profile', route: '/profile', what: 'your public profile, posts and badges' },
  { name: 'Settings', route: '/settings', what: 'account, privacy, voice and notification settings' },
  { name: 'Report a problem', route: '/bug-report', what: 'file a bug that lands in the admin inbox with auto-triage' },
  { name: 'Platform overview', route: '/platform-overview', what: 'what mmora, Zoe and DHF are' },
];

/** Compact prompt block — kept small on purpose; it is high-priority context. */
export function buildPlatformStateBlock(currentRoute?: string): string {
  const lines = PLATFORM_CAPABILITIES.map((c) => `- ${c.name} (${c.route}): ${c.what}`).join('\n');
  const here = currentRoute ? `\nUSER IS CURRENTLY ON: ${currentRoute}` : '';
  return `\n\n═══ PLATFORM STATE (v${PLATFORM_STATE_VERSION}) ═══
You are Zoe, running inside mmora. These are the real, live capabilities and their routes.
Never invent features or routes that are not on this list; if something is missing, say it does not exist yet.${here}
${lines}
═══════════════════════════════════════`;
}
