import { APP_FEATURES, type AppFeature } from '@/data/appFeatures';
import { NAVIGABLE_ROUTES } from '@/config/routeRegistry';
import { DOCK_EXTRA_DEFS, isMemberMenuRoute } from '@/components/home/dockExtraActions';

const ALIASES: Record<string, string[]> = {
  '/vr-world': ['village', 'mmora village', "m'mora village", 'mmora world', "m'mora world", 'vr', 'game', 'inventory', 'box', 'w-870', 'w870'],
  '/compass': ['dhf', 'dhf feed', 'neural feed', 'compass'],
  '/zoe-ai': ['zoe', 'zoe chat', 'orb', 'assistant'],
  '/growth-insights': ['growth', 'personal growth'],
  '/notification-history': ['notifications', 'bell', 'alerts'],
  '/chat': ['messages', 'dm', 'inbox'],
};
// Profile settings sections, addressable through Home/Zoe search. Each has a
// distinct /profile#anchor location so the location de-dupe keeps them all,
// and ProfilePage scrolls to the matching section id.
const PROFILE_SETTINGS: AppFeature[] = [
  {
    id: 'settings:quick-unlock', name: 'Quick Unlock',
    description: "Set a 5-digit code that unlocks M'Mora after 5 minutes away",
    keywords: ['quick unlock', 'passcode', 'pass code', 'pin', 'pin code', 'lock code', 'lock screen', 'unlock code', '5 digit', 'digit code'],
    category: 'settings', location: '/profile#quick-unlock', icon: 'Lock',
  },
  {
    id: 'settings:account', name: 'Account & Devices',
    description: 'Email, sign-in methods and signed-in devices',
    keywords: ['account', 'email', 'sign in methods', 'devices', 'sessions', 'sign out devices', 'member since'],
    category: 'settings', location: '/profile#account', icon: 'UserCog',
  },
  {
    id: 'settings:identity-photo', name: 'Locked Identity Photo',
    description: 'Private reference photo Zoe uses for images that look like you',
    keywords: ['identity photo', 'face', 'face photo', 'reference photo', 'vault photo', 'verify photo'],
    category: 'settings', location: '/profile#identity-photo', icon: 'ScanFace',
  },
  {
    id: 'settings:zoe-email', name: 'Zoe by Email',
    description: 'Where Zoe should write to, plus the daily recap',
    keywords: ['zoe email', 'daily recap', 'email me', 'conversations email'],
    category: 'settings', location: '/profile#zoe-email', icon: 'Mail',
  },
  {
    id: 'settings:karma-swap', name: 'Karma Swap',
    description: 'Swap 100 karma for 1 credit',
    keywords: ['karma', 'karma swap', 'credits', 'swap'],
    category: 'settings', location: '/profile#karma-swap', icon: 'Coins',
  },
  {
    id: 'settings:faith', name: 'Faith & Planetary Mood',
    description: 'Faith setting and today’s planetary mood',
    keywords: ['faith', 'religion', 'planetary', 'mood', 'devotional'],
    category: 'settings', location: '/profile#faith', icon: 'Sparkles',
  },
];
const menuByRoute = new Map(DOCK_EXTRA_DEFS.map((entry) => [entry.route, entry]));
const destinations: AppFeature[] = NAVIGABLE_ROUTES.filter((entry) => isMemberMenuRoute(entry.path)).map(({ path, label }) => {
  const menu = menuByRoute.get(path);
  return {
    id: menu?.id ?? `destination:${path}`, name: menu?.label ?? label,
    description: path === '/vr-world' ? "Village inside M'Mora World" : 'Inside M’Mora',
    keywords: [path.replace(/[/-]/g, ' ').trim(), ...(ALIASES[path] ?? [])], category: 'social',
    location: path === '/vr-world' ? '/zoe-omega?vr=1' : path, icon: 'Compass',
  };
});
const normal = (text: string) => text.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
export function searchPlatformFeatures(query: string): AppFeature[] {
  const term = normal(query);
  if (!term) return [];
  const words = term.split(' ');
  const ranked = [...PROFILE_SETTINGS, ...destinations, ...APP_FEATURES.filter((entry) => isMemberMenuRoute(entry.location))].map((feature, index) => {
    const name = normal(feature.name), keys = feature.keywords.map(normal);
    const text = normal([feature.name, feature.description, ...feature.keywords].join(' '));
    const score = name === term ? 4 : keys.includes(term) ? 3 : name.includes(term) ? 2 : words.every((word) => text.includes(word)) ? 1 : 0;
    return { feature, score, index };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const seen = new Set<string>();
  return ranked.filter(({ feature }) => {
    if (seen.has(feature.location)) return false;
    seen.add(feature.location); return true;
  }).slice(0, 12).map(({ feature }) => feature);
}
