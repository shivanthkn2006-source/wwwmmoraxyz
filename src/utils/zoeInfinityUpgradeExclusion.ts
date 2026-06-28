/**
 * PLATFORM UPGRADE EXCLUSION
 * Zoe Infinity is its own sovereign experience and must NOT be touched by
 * platform-wide UI upgrade flows, "What's new in MMORA" banners, app-wide
 * Plan upgrade CTAs, etc.
 *
 * Any platform upgrade surface should call shouldShowPlatformUpgrade() and
 * skip rendering when it returns false on a Zoe Infinity route.
 */

export const ZOE_INFINITY_ROUTE_PREFIX = '/zoe-infinity';

export function isOnZoeInfinityRoute(pathname?: string): boolean {
  const p = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return typeof p === 'string' && p.startsWith(ZOE_INFINITY_ROUTE_PREFIX);
}

/** Returns true ONLY if a platform-wide upgrade surface is allowed to render. */
export function shouldShowPlatformUpgrade(pathname?: string): boolean {
  return !isOnZoeInfinityRoute(pathname);
}

/** Hook-friendly variant — re-evaluates on every render. */
export function useZoeInfinityUpgradeExclusion(): { excluded: boolean } {
  return { excluded: isOnZoeInfinityRoute() };
}
