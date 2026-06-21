/**
 * STEP 4 — Idle Route Preloader
 *
 * Preloads high-traffic route chunks during browser idle time (after first paint),
 * so when the user clicks Home / Chat / Mmora / Profile, the chunk is already in
 * memory and there is no network round-trip → no chance of "Importing a module
 * script failed" if a deploy invalidates the chunk between page load and click.
 *
 * Strategy:
 *  - Wait for `load` event so we don't compete with first paint.
 *  - Use `requestIdleCallback` (fallback: setTimeout) to schedule preloads.
 *  - Skip preloading on:
 *      • slow connections (Save-Data on, or 2g/slow-2g effectiveType)
 *      • low-memory devices (deviceMemory < 2 GB)
 *  - Stagger imports 400 ms apart so we don't saturate the network.
 *  - Each import() failure is swallowed — preloading is best-effort.
 */

type Loader = () => Promise<unknown>;

// Highest-traffic routes ranked by user reports. Order matters — first ones load first.
const PRELOAD_TARGETS: Array<{ name: string; load: Loader }> = [
  { name: 'HomePage',        load: () => import('@/pages/HomePage') },
  { name: 'Mmora',           load: () => import('@/pages/Mmora') },
  { name: 'ChatPage',        load: () => import('@/pages/ChatPage') },
  { name: 'AICompanionPage', load: () => import('@/pages/AICompanionPage') },
  { name: 'ProfilePage',     load: () => import('@/pages/ProfilePage') },
];

const shouldSkipPreload = (): boolean => {
  try {
    const conn = (navigator as any).connection;
    if (conn?.saveData) return true;
    const eff = String(conn?.effectiveType || '');
    if (eff === '2g' || eff === 'slow-2g') return true;
    const mem = (navigator as any).deviceMemory;
    if (typeof mem === 'number' && mem > 0 && mem < 2) return true;
  } catch { /* ignore */ }
  return false;
};

const idle = (cb: () => void, timeout = 4000) => {
  const ric = (window as any).requestIdleCallback as
    | undefined
    | ((cb: () => void, opts?: { timeout: number }) => number);
  if (typeof ric === 'function') ric(cb, { timeout });
  else setTimeout(cb, 1500);
};

let started = false;

export const startIdleRoutePreloader = () => {
  if (started) return;
  started = true;

  const begin = () => {
    if (shouldSkipPreload()) {
      console.log('[IdlePreloader] Skipped (slow connection or low-memory device)');
      return;
    }

    let i = 0;
    const next = () => {
      if (i >= PRELOAD_TARGETS.length) return;
      const target = PRELOAD_TARGETS[i++];
      idle(() => {
        target.load()
          .then(() => console.log(`[IdlePreloader] Warmed ${target.name}`))
          .catch(() => { /* best-effort, ignore */ })
          .finally(() => setTimeout(next, 400));
      });
    };
    next();
  };

  if (document.readyState === 'complete') {
    idle(begin, 2500);
  } else {
    window.addEventListener('load', () => idle(begin, 2500), { once: true });
  }
};
