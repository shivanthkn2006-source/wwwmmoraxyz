/**
 * CANONICAL ROUTE REGISTRY
 *
 * One source of truth for every route in the app. `routeRegistry.generated.ts`
 * is produced from src/App.tsx by scripts/generate-route-registry.ts; this file
 * adds the human/agent-facing view used by the Unified Search Dock and by Zoe's
 * platform-state injection, so a new menu can never exist without Zoe knowing.
 */
import { CANONICAL_ROUTES, type CanonicalRoute } from './routeRegistry.generated';

export type { CanonicalRoute };
export { CANONICAL_ROUTES };

/** Routes that are never user-navigable menus. */
const HIDDEN = new Set(['*', '/access-denied', '/password-recovery']);

export interface RegistryEntry extends CanonicalRoute {
  /** Coarse grouping used by the dock and by Zoe when explaining the platform. */
  group: 'core' | 'zoe' | 'dhf' | 'admin' | 'tools' | 'auth';
}

function groupFor(path: string): RegistryEntry['group'] {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/dhf') || path.includes('dhf')) return 'dhf';
  if (path.startsWith('/zoe') || path.includes('zoe') || path.startsWith('/god-mode')) return 'zoe';
  if (['/auth', '/voice-auth', '/password-recovery', '/access-denied'].includes(path)) return 'auth';
  if (['/', '/home', '/chat', '/profile', '/camera', '/huddle', '/webdrop', '/about'].includes(path)) return 'core';
  return 'tools';
}

export const ROUTE_REGISTRY: RegistryEntry[] = CANONICAL_ROUTES.map((route) => ({
  ...route,
  group: groupFor(route.path),
}));

/** Static, navigable routes (no params, no internal-only screens). */
export const NAVIGABLE_ROUTES: RegistryEntry[] = ROUTE_REGISTRY.filter(
  (entry) => !entry.dynamic && !HIDDEN.has(entry.path),
);

export function findRoute(path: string): RegistryEntry | undefined {
  return ROUTE_REGISTRY.find((entry) => entry.path === path);
}

/** Plain-text menu map injected into Zoe's platform state. */
export function routeRegistryAsPrompt(): string {
  return NAVIGABLE_ROUTES.map((entry) => `${entry.label} [${entry.group}]: ${entry.path}`).join('\n');
}
