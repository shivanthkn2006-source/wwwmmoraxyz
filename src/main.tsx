import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ZoeProvider } from "./contexts/ZoeContext";
import { DeviceTierProvider } from "./contexts/DeviceTierContext";
import { LiquidUniverseProvider } from "./contexts/LiquidUniverseContext";
import { ShapeShifterProvider } from "./contexts/ShapeShifterContext";
import { AutoHealProvider } from "./contexts/AutoHealContext";
import { initializeAssistantVoices } from "./utils/assistantVoice";
import { initCrossBrowserCompat } from "./utils/crossBrowserCompat";
import SystemFailureBoundary from "@/components/SystemFailureBoundary";
import { HelmetProvider } from "react-helmet-async";
import { forceAppRefresh } from "@/lib/versionCheck";
import { initSafariFixes } from "./utils/safariBrowserFixes";

// Initialize cross-browser compatibility fixes
initCrossBrowserCompat();

// Initialize Safari/iOS specific fixes
initSafariFixes();

// Recover from stale-bundle / chunk mismatch issues after deployments.
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

// Initialize assistant voice system early
initializeAssistantVoices()
  .then(() => {
    console.log("[Main] Assistant voice system initialized (default: Zoe)");
  })
  .catch((err) => {
    console.warn("[Main] Voice system init skipped (non-critical):", err?.message || err);
  });

// Render the app
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

console.log('[Boot] Zoe Infinity standalone render completed');
