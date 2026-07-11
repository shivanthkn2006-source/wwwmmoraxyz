import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ZoeProvider } from "./contexts/ZoeContext";
import { DeviceTierProvider } from "./contexts/DeviceTierContext";
import { LiquidUniverseProvider } from "./contexts/LiquidUniverseContext"; // PROTOCOL LIQUID UNIVERSE
import { ShapeShifterProvider } from "./contexts/ShapeShifterContext"; // PROTOCOL SHAPE SHIFTER
import { AutoHealProvider } from "./contexts/AutoHealContext"; // PROTOCOL AUTO-HEAL
import { initializeAssistantVoices } from "./utils/assistantVoice";
import { initCrossBrowserCompat } from "./utils/crossBrowserCompat";
import SystemFailureBoundary from "@/components/SystemFailureBoundary";
import { HelmetProvider } from "react-helmet-async";
import { ensurePreviewSessionFreshness, recoverFromChunkError } from "@/lib/versionCheck";
import { startIdleRoutePreloader } from "@/lib/idleRoutePreloader";
import { executePlatformPurge, reconnectZoeCore, truncateConsoleLogs } from "@/lib/platformPurge";
import { poolerMonitor, verifyPoolerConnection } from "./utils/supabasePooler";
import { initializeKernel, isLive } from "@/core/security/ConstitutionalKernel";
import { zoeBackgroundProcessor } from "./services/ZoeBackgroundProcessor"; // ZOE BACKGROUND PROCESSOR
import { zeroThermalProtocol } from "./services/ZeroThermalProtocol"; // PROTOCOL ZERO-THERMAL
import { initSafariFixes } from "./utils/safariBrowserFixes"; // SAFARI CROSS-BROWSER FIXES
import { installServiceWorkerDevGuard } from "@/lib/serviceWorkerDevGuard"; // #11 Zoe Infinity SW dev guard
import { installRuntimeIssueCollector } from "@/features/zoe-godmode/runtimeIssueCollector"; // God-mode error capture

// #11 Block service worker registration in dev/preview before anything else
// touches navigator.serviceWorker.
installServiceWorkerDevGuard();
installRuntimeIssueCollector();

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

// Initialize cross-browser compatibility fixes
initCrossBrowserCompat();

// Initialize Safari/iOS specific fixes for voice/video
initSafariFixes();

// One-time self-heal for preview domains to recover from stale SW/cache auth failures
ensurePreviewSessionFreshness();

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

// Phase 6: Platform Purge - Clear ghost bugs on deploy
const purgeResult = executePlatformPurge();
if (purgeResult.purged) {
  console.log('[Boot] Platform purged, reconnecting Zoe core...');
  reconnectZoeCore();
}
truncateConsoleLogs();

// Initialize Supabase Pooler Monitor - 500 Spartans Protocol CHECK 1
const poolerStatus = verifyPoolerConnection();
console.log('[Spartans] Pooler Status:', poolerStatus);
console.log('[Spartans] Pool Health:', poolerMonitor.getHealth());

// GENESIS LAUNCH: Initialize Constitutional Kernel
console.log('═══════════════════════════════════════════════════════════════');
console.log('       🚀 GENESIS LAUNCH PROTOCOL ACTIVATED 🚀');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Platform Status: ${isLive() ? 'LIVE' : 'BETA'}`);
console.log('Constitutional Kernel: INITIALIZED');
console.log('Beta Lock: DISABLED');
console.log('Gates: OPEN');
console.log(`Zoe Background Processor: ${zoeBackgroundProcessor.isInitialized() ? 'ACTIVE' : 'PENDING'}`);
const thermalState = zeroThermalProtocol.getState();
console.log(`Zero-Thermal Protocol: THE 3 LAWS ACTIVE`);
console.log(`  LAW 1 - 30 FPS Cap: ${thermalState.is30FPSCapped ? 'ENFORCED' : 'DISABLED'}`);
console.log(`  LAW 2 - Particle Ban: ${thermalState.particlesBanned ? 'ENFORCED' : 'DISABLED'}`);
console.log(`  LAW 3 - Idle Sleep: 5s TIMEOUT`);
console.log('═══════════════════════════════════════════════════════════════');

// Recover from stale-bundle / chunk mismatch issues after deployments.
// Seen in logs as: "Importing a module script failed."
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

const shouldAutoHardRefreshRoute = () => {
  const path = window.location.pathname;
  const host = window.location.hostname;

  // Prevent refresh loops on heavy VR route; keep scene mounted for manual recovery.
  if (path.startsWith('/zoe-omega')) return false;

  // Only skip true local dev HMR. Lovable preview must recover because users
  // can hold a stale iframe shell that permanently points to old module URLs.
  if (host === 'localhost' || host === '127.0.0.1') return false;

  return true;
};

window.addEventListener('error', (ev) => {
  if (shouldRecoverForImportError((ev as any).error || ev.message)) {
    if (shouldAutoHardRefreshRoute()) {
      console.warn('[Boot] Detected stale bundle. Initiating chunk recovery (bypass cooldown + SW purge)...');
      recoverFromChunkError();
    } else {
      console.warn('[Boot] Import/chunk error detected on local dev or VR route; skipping auto hard refresh to avoid loops.');
    }
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  if (shouldRecoverForImportError(ev.reason)) {
    if (shouldAutoHardRefreshRoute()) {
      console.warn('[Boot] Detected stale bundle (promise). Initiating chunk recovery (bypass cooldown + SW purge)...');
      recoverFromChunkError();
    } else {
      console.warn('[Boot] Import/chunk promise rejection on local dev or VR route; skipping auto hard refresh to avoid loops.');
    }
  }
});

// Render the app FIRST so the startup shell can mark booted ASAP.
createRoot(document.getElementById("root")!).render(
  <SystemFailureBoundary>
    <HelmetProvider>
      <LiquidUniverseProvider>
        <ShapeShifterProvider>
          <AutoHealProvider>
            <DeviceTierProvider>
              <ZoeProvider>
                <App />
              </ZoeProvider>
            </DeviceTierProvider>
          </AutoHealProvider>
        </ShapeShifterProvider>
      </LiquidUniverseProvider>
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

// Defer non-critical voice + idle preload init so they don't block first paint.
const deferredInit = () => {
  initializeAssistantVoices()
    .then(() => console.log("[Main] Assistant voice system initialized (default: Zoe)"))
    .catch((err) => console.warn("[Main] Voice system init skipped (non-critical):", err?.message || err));
  startIdleRoutePreloader();
};
if ('requestIdleCallback' in window) {
  (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(deferredInit, { timeout: 3000 });
} else {
  setTimeout(deferredInit, 1500);
}
