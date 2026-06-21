let authTransportRecoveryAttempted = false;

const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;

  try {
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Supabase auth token keys: sb-<project-ref>-auth-token
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore localStorage access errors
  }

  try {
    sessionStorage.removeItem('zoe_infinity_session_valid');
  } catch {
    // ignore sessionStorage access errors
  }
};

const clearBrowserCaches = async () => {
  if (typeof window === 'undefined' || !("caches" in window)) return;

  const cacheNames = await caches.keys();
  await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
};

const unregisterServiceWorkers = async () => {
  if (typeof navigator === 'undefined' || !("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.map((registration) => registration.unregister()));
};

/**
 * One-time per-tab transport recovery for Safari/main-window stale state issues.
 * Returns true when recovery actions were attempted, false when skipped.
 */
export const recoverAuthTransportOncePerSession = async (_reason: 'signin' | 'signup') => {
  if (authTransportRecoveryAttempted) return false;

  authTransportRecoveryAttempted = true;

  clearAuthStorage();

  try {
    await Promise.allSettled([clearBrowserCaches(), unregisterServiceWorkers()]);
  } catch {
    // ignore
  }

  return true;
};
