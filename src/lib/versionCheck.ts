/**
 * Version-based cache busting to ensure users always get the latest code.
 *
 * APP_VERSION is injected at build time (see vite.config.ts).
 * 
 * FIX: Debounce refresh to prevent Safari infinite reload loops
 */
const APP_VERSION = (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev") as string;
const VERSION_KEY = "mmora_app_version";
const RELOAD_GUARD_KEY = "mmora_app_version_reload_guard";
const REFRESH_COOLDOWN_KEY = "mmora_last_hard_refresh";
const REFRESH_COOLDOWN_MS = 30000; // 30 second cooldown between refreshes

const clearCachesAndServiceWorkers = async () => {
  // Clear caches
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.allSettled(names.map((name) => caches.delete(name)));
    }
  } catch {
    // ignore
  }

  // Unregister service workers (they'll re-register on next load)
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
};

/**
 * Check if we're in a refresh cooldown to prevent infinite loops
 */
const isInRefreshCooldown = (): boolean => {
  try {
    const lastRefresh = sessionStorage.getItem(REFRESH_COOLDOWN_KEY);
    if (!lastRefresh) return false;
    const elapsed = Date.now() - parseInt(lastRefresh, 10);
    return elapsed < REFRESH_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const setRefreshCooldown = (): void => {
  try {
    sessionStorage.setItem(REFRESH_COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

export const checkAppVersion = () => {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion === APP_VERSION) return;

    localStorage.setItem(VERSION_KEY, APP_VERSION);

    // Prevent reload loops - check cooldown AND guard
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === APP_VERSION) return;
    if (isInRefreshCooldown()) {
      console.warn('[VersionCheck] In cooldown, skipping refresh');
      return;
    }
    
    sessionStorage.setItem(RELOAD_GUARD_KEY, APP_VERSION);
    setRefreshCooldown();

    void (async () => {
      await clearCachesAndServiceWorkers();

      // Change the URL to force a network navigation even in stubborn cache/SW states
      const url = new URL(window.location.href);
      url.searchParams.set("v", APP_VERSION);
      window.location.replace(url.toString());
    })();
  } catch {
    // ignore
  }
};

export const forceAppRefresh = () => {
  // FIX: Prevent infinite refresh loops in Safari
  if (isInRefreshCooldown()) {
    console.warn('[forceAppRefresh] Blocked - in cooldown period to prevent refresh loop');
    return;
  }
  
  setRefreshCooldown();
  
  // Always force a true network navigation by clearing SW + caches.
  // This is used for chunk mismatch errors like:
  // "Importing a module script failed." (Safari) / "ChunkLoadError".
  void (async () => {
    try {
      await clearCachesAndServiceWorkers();
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem(VERSION_KEY);
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      // ignore
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("hard_refresh", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  })();
};
