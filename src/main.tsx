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
import { forceAppRefresh } from "@/lib/versionCheck";
import { executePlatformPurge, reconnectZoeCore, truncateConsoleLogs } from "@/lib/platformPurge";
import { poolerMonitor, verifyPoolerConnection } from "./utils/supabasePooler";
import { initializeKernel, isLive } from "@/core/security/ConstitutionalKernel";
import { zoeBackgroundProcessor } from "./services/ZoeBackgroundProcessor"; // ZOE BACKGROUND PROCESSOR
import { zeroThermalProtocol } from "./services/ZeroThermalProtocol"; // PROTOCOL ZERO-THERMAL
import { initSafariFixes } from "./utils/safariBrowserFixes"; // SAFARI CROSS-BROWSER FIXES

// Initialize cross-browser compatibility fixes
initCrossBrowserCompat();

// Initialize Safari/iOS specific fixes for voice/video
initSafariFixes();

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
const shouldHardRefreshForError = (e: unknown) => {
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
  if (shouldHardRefreshForError((ev as any).error || ev.message)) {
    console.warn('[Boot] Detected stale bundle. Hard refreshing...');
    forceAppRefresh();
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  if (shouldHardRefreshForError(ev.reason)) {
    console.warn('[Boot] Detected stale bundle (promise). Hard refreshing...');
    forceAppRefresh();
  }
});

// Initialize assistant voice system early for faster first-speak
initializeAssistantVoices()
  .then(() => {
    console.log("[Main] Assistant voice system initialized (default: Zoe)");
  })
  .catch((err) => {
    // Gracefully handle voice initialization failure - system continues working
    console.warn("[Main] Voice system init skipped (non-critical):", err?.message || err);
  });

// Render the app
createRoot(document.getElementById("root")!).render(
  <SystemFailureBoundary>
    <HelmetProvider>
      <LiquidUniverseProvider> {/* PROTOCOL LIQUID UNIVERSE: Universal device morphing */}
        <ShapeShifterProvider> {/* PROTOCOL SHAPE SHIFTER: Exotic hardware awareness */}
          <AutoHealProvider> {/* PROTOCOL AUTO-HEAL: Self-healing typography */}
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
