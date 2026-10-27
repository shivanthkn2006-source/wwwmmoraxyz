import "./lib/domRemoveGuard";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ZoeProvider } from "./contexts/ZoeContext";
import { DeviceTierProvider } from "./contexts/DeviceTierContext";
import { ShapeShifterProvider } from "./contexts/ShapeShifterContext"; // PROTOCOL SHAPE SHIFTER
import { AutoHealProvider } from "./contexts/AutoHealContext"; // PROTOCOL AUTO-HEAL
import SystemFailureBoundary from "@/components/SystemFailureBoundary";
import { HelmetProvider } from "react-helmet-async";
import { runDeferredInitializers } from "./lib/deferredInitialization";

// Expose APP_VERSION + safe env to the startup shell so its diagnostics
// panel and integration health checks can read Supabase URL/key without
// importing the bundled client.
try {
  const w = window as unknown as { __APP_VERSION__: string; __MMORA_ENV__: Record<string, string> };
  w.__APP_VERSION__ = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  w.__MMORA_ENV__ = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
  };
} catch { /* ignore */ }

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE / SERVICE WORKER RECOVERY
// NOTE: Do NOT aggressively delete caches on every boot.
// Doing so can interrupt module loading in Safari and trigger:
// "Importing a module script failed."
//
// Instead, we rely on version-based refresh + error-triggered hard refresh.
// (see shouldHardRefreshForError + forceAppRefresh)
// ═══════════════════════════════════════════════════════════════════════════════


// NOTE: Removed "stuck-state auto reload".
// It caused reload loops on Safari when a chunk import fails.

// Detect stale-bundle / chunk mismatch issues after deployments.
// Never navigate automatically: Safari may report the same failure repeatedly,
// and automatic recovery turns one module fault into an app-wide reload loop.
const shouldRecoverForImportError = (e: unknown) => {
  const msg =
    (e instanceof Error ? e.message : String(e || "")) +
    " " +
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof (e as any)?.reason === 'object' ? JSON.stringify((e as any).reason) : String((e as any)?.reason || ""));

  return (
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError')
  );
};

window.addEventListener('error', (ev) => {
  if (shouldRecoverForImportError((ev as any).error || ev.message)) {
    console.error('[Boot] Module import failed; automatic reload is disabled.');
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  if (shouldRecoverForImportError(ev.reason)) {
    console.error('[Boot] Module import promise failed; automatic reload is disabled.');
  }
});

// Render the app FIRST so the startup shell can mark booted ASAP.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Application root is missing');
createRoot(rootElement).render(
  <SystemFailureBoundary>
    <HelmetProvider>
      <ShapeShifterProvider>
        <AutoHealProvider>
          <DeviceTierProvider>
            <ZoeProvider>
              <App />
            </ZoeProvider>
          </DeviceTierProvider>
        </AutoHealProvider>
      </ShapeShifterProvider>
    </HelmetProvider>
  </SystemFailureBoundary>
);

console.log('[Boot] App render completed');

// Mark booted ASAP — first paint after render.
try {
  requestAnimationFrame(() => {
    // @ts-expect-error injected by index.html bootstrap
    window.__MMORA_BOOT__?.markBooted?.();
  });
  // Safety net: also mark booted on full window load (Safari sometimes delays RAF).
  window.addEventListener('load', () => {
    // @ts-expect-error injected by index.html bootstrap
    window.__MMORA_BOOT__?.markBooted?.();
  }, { once: true });
} catch { /* ignore */ }

// Import diagnostics, compatibility and background systems only after the app
// has painted. Static imports here previously delayed every device before React
// could remove the startup screen, especially over cellular connections.
const deferredInit = () => runDeferredInitializers([
  { name: 'compatibility', run: async () => (await import('./utils/crossBrowserCompat')).initCrossBrowserCompat() },
  { name: 'Safari', run: async () => (await import('./utils/safariBrowserFixes')).initSafariFixes() },
  { name: 'platform purge', run: async () => {
    const purge = await import('@/lib/platformPurge');
    purge.truncateConsoleLogs();
    await purge.executePlatformPurge();
  } },
  { name: 'route preloader', run: async () => (await import('@/lib/idleRoutePreloader')).startIdleRoutePreloader() },
  { name: 'assistant voices', run: async () => {
    await (await import('./utils/assistantVoice')).initializeAssistantVoices();
    console.log('[Main] Assistant voice system initialized (default: Zoe)');
  } },
  { name: 'service worker guard', run: async () => (await import('@/lib/serviceWorkerDevGuard')).installServiceWorkerDevGuard() },
  { name: 'runtime diagnostics', run: async () => (await import('@/features/zoe-godmode/runtimeIssueCollector')).installRuntimeIssueCollector() },
  { name: 'performance diagnostics', run: async () => {
    const perf = await import('@/utils/perfLogger');
    perf.installFetchPerfLogger();
    perf.recordPageLoad();
  } },
  { name: 'media registry', run: async () => (await import('@/lib/mediaTrackRegistry')).installMediaTrackRegistry() },
]);
if ('requestIdleCallback' in window) {
  (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(deferredInit, { timeout: 3000 });
} else {
  setTimeout(deferredInit, 1500);
}

// Admin-only platform analytics: start after first paint, off the boot path.
window.setTimeout(() => {
  void import('@/lib/visitTracker').then((m) => m.startVisitTracker()).catch(() => {});
}, 1500);
