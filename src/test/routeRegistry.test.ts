import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractRoutes, buildRegistrySource } from '../../scripts/generate-route-registry';
import { CANONICAL_ROUTES } from '@/config/routeRegistry.generated';
import { NAVIGABLE_ROUTES, routeRegistryAsPrompt, findRoute } from '@/config/routeRegistry';
import { getZoePlatformPageContext } from '@/lib/zoePlatformContext';

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
