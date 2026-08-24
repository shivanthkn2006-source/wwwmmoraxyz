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
const PREVIEW_HEAL_KEY = "mmora_preview_self_heal_done";
const PREVIEW_HEAL_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

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

export const ensurePreviewSessionFreshness = () => {
  try {
    const host = window.location.hostname;
    const isPreviewHost =
      host.includes("lovableproject.com") ||
      host.startsWith("id-preview--");

    if (!isPreviewHost) return;

    // Never run preview self-heal on auth routes; Safari can break module loading
    // if cache/SW cleanup races with dynamic imports during login/signup.
    const isAuthPath =
      window.location.pathname.startsWith('/auth') ||
      window.location.pathname.startsWith('/login') ||
      window.location.pathname.startsWith('/signup') ||
      window.location.pathname.startsWith('/password-recovery') ||
      window.location.pathname.startsWith('/voice-auth') ||
      window.location.pathname.startsWith('/zoe-infinity/auth');

    if (isAuthPath) return;

    const key = `${PREVIEW_HEAL_KEY}:${host}`;
    const lastRun = localStorage.getItem(key);
    const lastRunAt = Number(lastRun || '0');
    const hasPreviewHealParam = new URL(window.location.href).searchParams.has('preview_heal');
    if (hasPreviewHealParam) return;
    if (lastRunAt && Date.now() - lastRunAt < PREVIEW_HEAL_TTL_MS) return;

    // Only self-heal if the React root is actually blank. The previous eager
    // navigation ran before React painted and could look like a white/black
    // screen in preview even when the app was healthy.
    const root = document.getElementById('root');
    const rootText = (root?.textContent || '').replace(/\s+/g, ' ').trim();
    const rootHasVisuals = !!root?.querySelector('button,input,textarea,select,a,canvas,svg,video,[role],details');
    if (rootText.length >= 8 || rootHasVisuals) return;

    localStorage.setItem(key, String(Date.now()));

    showRecoveryOverlay();

    // Soft self-heal only: avoid destructive cache/SW purge here.
    const url = new URL(window.location.href);
    url.searchParams.set("preview_heal", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    // ignore
  }
};

export const checkAppVersion = () => {
  // DETERMINISTIC version check.
  //
  // Reaching this code means the current bundle (main.tsx) was successfully
  // imported and React mounted — therefore the user IS already on APP_VERSION.
  // The previous implementation triggered a `location.replace` reload whenever
  // the stored version differed, causing a "double navigation" black screen
  // on first load (especially in incognito after the 302 from
  // mmora-app.lovable.app -> www.mmora.xyz).
  //
  // Fix: just record the active version. Stale-bundle / chunk-load errors are
  // handled separately by `recoverFromChunkError` via the global error
  // listeners in main.tsx.
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
    // Clear any leftover guards from prior recovery attempts.
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    sessionStorage.removeItem(REFRESH_COOLDOWN_KEY);
    // Reaching here means the bundle loaded fine, so any recovery attempt
    // succeeded. Clear the one-shot guard and strip the recovery markers from
    // the URL (history.replaceState — no navigation, no re-render) so the app
    // can't get stuck on `?chunk_recovery=...` forever.
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    const url = new URL(window.location.href);
    let changed = false;
    for (const param of ['chunk_recovery', 'hard_refresh', 'preview_heal']) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + (url.search ? url.search : '') + url.hash
      );
    }
  } catch {
    // ignore
  }
};

/**
 * Chunk-error recovery: bypasses the standard 30s cooldown.
 * Stale `index.html` referencing deleted lazy chunks (e.g. after a deploy)
 * must be purged immediately, otherwise the user sees a permanent stall
 * on Zoe Infinity sovereign sub-modules.
 *
 * We use a SEPARATE one-shot guard (per-version) so we can't loop forever,
 * but we are NOT blocked by the global refresh cooldown.
 */
const CHUNK_RECOVERY_KEY = 'mmora_chunk_recovery_attempted';

/**
 * STEP 2 — Visible recovery overlay so the user never sees a black screen
 * during the cache purge + reload window (~1-2s on slow Safari).
 */
const showRecoveryOverlay = () => {
  try {
    if (document.getElementById('__mmora_recovery_overlay__')) return;
    const el = document.createElement('div');
    el.id = '__mmora_recovery_overlay__';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = [
      'position:fixed','inset:0','z-index:2147483647',
      'display:flex','flex-direction:column','align-items:center','justify-content:center',
      'background:#000','color:#fff',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'gap:16px','padding:24px','text-align:center'
    ].join(';');
    el.innerHTML = `
      <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.2);border-top-color:#10b981;border-radius:50%;animation:mmora-spin 0.9s linear infinite"></div>
      <div style="font-size:15px;font-weight:600;letter-spacing:.2px">Updating M'mora to the latest version…</div>
      <div style="font-size:12px;opacity:.6">Clearing cache and reloading</div>
      <style>@keyframes mmora-spin{to{transform:rotate(360deg)}}</style>
    `;
    (document.body || document.documentElement).appendChild(el);
  } catch { /* ignore */ }
};

/** Bound a promise so SW/cache APIs can never hang the recovery flow. */
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | void> =>
  Promise.race([p, new Promise<void>((resolve) => setTimeout(resolve, ms))]);

export const recoverFromChunkError = () => {
  try {
    // One-shot per session: if we already tried, fall through to normal path
    const already = sessionStorage.getItem(CHUNK_RECOVERY_KEY);
    if (already) {
      console.warn('[ChunkRecovery] Already attempted this session, falling back to normal refresh');
      return forceAppRefresh();
    }
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
  } catch {
    // ignore
  }

  console.warn('[ChunkRecovery] Bypassing cooldown — purging SW + caches and reloading with cache-bust');

  // Paint visible overlay BEFORE async work — no black screen.
  showRecoveryOverlay();

  // Hard safety net: if purge or reload hangs (Safari edge case),
  // force-navigate after 2.5s no matter what.
  const hardFallback = setTimeout(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('chunk_recovery', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }, 2500);

  void (async () => {
    // Bounded purge — never wait more than 1.5s for SW/cache APIs.
    try { await withTimeout(clearCachesAndServiceWorkers(), 1500); } catch { /* ignore */ }

    try {
      localStorage.removeItem(VERSION_KEY);
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      sessionStorage.removeItem(REFRESH_COOLDOWN_KEY);
    } catch { /* ignore */ }

    clearTimeout(hardFallback);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('chunk_recovery', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  })();
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
