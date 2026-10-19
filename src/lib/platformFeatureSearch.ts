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
  const ranked = [...destinations, ...APP_FEATURES.filter((entry) => isMemberMenuRoute(entry.location))].map((feature, index) => {
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
