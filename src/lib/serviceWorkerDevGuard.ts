/**
 * SERVICE WORKER DEV GUARD
 *
 * Zoe Infinity policy: NEVER run a service worker in dev or Lovable preview.
 * Stale SWs cache old chunks and break the Genesis flow, voice handlers, and
 * the staged-loading gate.
 *
 * This module:
 *  - Detects dev / preview environments (Vite DEV flag, hostname heuristics).
 *  - Unregisters any existing service worker.
 *  - Patches navigator.serviceWorker.register to a no-op in those envs.
 *
 * Production builds on the official domain still get SW registration if any
 * future PWA code opts in.
 */

const PREVIEW_HOST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '.lovable.app',
  '.lovableproject.com',
  '.sandbox.lovable.dev',
];

function isDevOrPreviewHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return PREVIEW_HOST_PATTERNS.some(p =>
    p.startsWith('.') ? host.endsWith(p) : host === p
  );
}

export function installServiceWorkerDevGuard(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const viteDev = (import.meta as any)?.env?.DEV === true;
  if (!viteDev && !isDevOrPreviewHost()) return;

  // 1) Unregister anything already installed.
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister().catch(() => {})))
    .catch(() => {});

  // 2) Block future registrations in this session.
  try {
    const sw = navigator.serviceWorker as any;
    const origRegister = sw.register?.bind(sw);
    sw.register = async (..._args: unknown[]) => {
      console.warn('[ZoeInfinity] Service worker registration BLOCKED in dev/preview.');
      // Return a benign object that quacks like a ServiceWorkerRegistration.
      return { unregister: async () => true, scope: '/', active: null, installing: null, waiting: null } as any;
    };
    (sw as any).__origRegister = origRegister;
  } catch (e) {
    console.warn('[ZoeInfinity] SW dev guard patch failed:', e);
  }
}
