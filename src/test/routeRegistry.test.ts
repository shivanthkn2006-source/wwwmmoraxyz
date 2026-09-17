import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractRoutes, buildRegistrySource } from '../../scripts/generate-route-registry';
import { CANONICAL_ROUTES } from '@/config/routeRegistry.generated';
import { NAVIGABLE_ROUTES, routeRegistryAsPrompt, findRoute } from '@/config/routeRegistry';
import { getZoePlatformPageContext } from '@/lib/zoePlatformContext';
import { buildExtraDockItems, DOCK_RESERVED_ROUTES } from '@/components/home/dockExtraActions';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('canonical route registry', () => {
  it('matches the routes mounted in App.tsx (no drift)', () => {
    const paths = extractRoutes(read('src/App.tsx'));
    const generated = buildRegistrySource(paths);
    expect(generated).toBe(read('src/config/routeRegistry.generated.ts'));
  });

  it('covers every mounted route', () => {
    const paths = new Set(extractRoutes(read('src/App.tsx')));
    for (const path of paths) expect(findRoute(path), `${path} missing from registry`).toBeTruthy();
    expect(CANONICAL_ROUTES.length).toBeGreaterThanOrEqual(88);
  });

  it('excludes dynamic and internal routes from the navigable list', () => {
    expect(NAVIGABLE_ROUTES.some((r) => r.dynamic)).toBe(false);
    expect(NAVIGABLE_ROUTES.some((r) => r.path === '/access-denied')).toBe(false);
  });

  it('feeds Zoe platform-state injection from the same source', () => {
    const prompt = routeRegistryAsPrompt();
    expect(prompt).toContain('/home');
    expect(prompt).toContain('/dhf-dashboard');
    const context = getZoePlatformPageContext();
    for (const entry of NAVIGABLE_ROUTES.slice(0, 20)) {
      expect(context).toContain(entry.path);
    }
  });
});

describe('dock ↔ registry consistency', () => {
  it('every dock action points at a real registered route', async () => {
    const source = read('src/components/home/dockExtraActions.tsx');
    const routes = [...source.matchAll(/route: '([^']+)'/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(10);
    for (const route of routes) {
      expect(findRoute(route), `dock route ${route} is not mounted in App.tsx`).toBeTruthy();
    }
  });

  it('automatically gives every static page a Home-menu action', () => {
    const items = buildExtraDockItems(() => {}, DOCK_RESERVED_ROUTES);
    const itemLabels = new Set(items.map((item) => item.label));
    const excludedPrefixes = ['/zoe-infinity'];
    const excluded = new Set(['/', '/auth', '/signup', '/voice-auth', '/welcome', '/demo']);

    for (const route of NAVIGABLE_ROUTES) {
      if (DOCK_RESERVED_ROUTES.includes(route.path) || excluded.has(route.path)) continue;
      if (excludedPrefixes.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`))) continue;
      expect(itemLabels.has(route.label), `${route.path} missing from Home menu`).toBe(true);
    }
  });
});
