// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM LAYOUT
// The single shell that owns cross-route platform services (persistent voice
// engine, thermal watchdog). Renders children untouched — zero visual change —
// so the existing home/loops/videos UI is unaffected.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { usePlatformStore } from '@/store/usePlatformStore';
import { AppErrorBoundary } from '@/components/core/ErrorBoundary';
import GlobalBugReporter from '@/components/core/GlobalBugReporter';
import SentinelWatchHost from '@/components/security/SentinelWatchHost';
import GrowthCardAlertHost from '@/components/growth/GrowthCardAlertHost';
import GlobalHomeDock from '@/components/home/GlobalHomeDock';
import NotificationAlertHost from '@/components/notifications/NotificationAlertHost';
import useDhfUnlockReminders from '@/hooks/useDhfUnlockReminders';
import { ZoeCardNarrationProvider } from '@/components/voice/ZoeCardNarrationProvider';
import ZoeSpeechPauseBar from '@/components/voice/ZoeSpeechPauseBar';
import GuidedTour from '@/components/onboarding/GuidedTour';
import ZoeGlobalMount from '@/components/zoe/ZoeGlobalMount';



/** Auto-enables thermal safe mode on low-power devices / heavy module pressure. */
function useThermalWatchdog() {
  const heavyModules = usePlatformStore((s) => s.heavyModulesMounted);
  const setThermalSafeMode = usePlatformStore((s) => s.setThermalSafeMode);

  useEffect(() => {
    if (heavyModules > 2) setThermalSafeMode(true);
  }, [heavyModules, setThermalSafeMode]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<any> };
    let battery: any = null;
    const onChange = () => {
      if (battery && battery.charging === false && battery.level < 0.15) {
        usePlatformStore.getState().setThermalSafeMode(true);
      }
    };
    nav.getBattery?.()
      .then((b) => {
        battery = b;
        onChange();
        b.addEventListener?.('levelchange', onChange);
      })
      .catch(() => undefined);
    return () => battery?.removeEventListener?.('levelchange', onChange);
  }, []);
}

function PlatformServices() {
  useVoiceEngine();
  useThermalWatchdog();
  // Pre-notice cue + toast a few minutes before every Zoe's DHF unlock.
  useDhfUnlockReminders();
  return null;
}

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    {/* Services are crash-isolated: a recognizer failure can never blank the app. */}
    <AppErrorBoundary moduleName="platform:services" severity="low" fallback={null}>
      <PlatformServices />
    </AppErrorBoundary>
    {/* Top-of-screen insight alerts — isolated so a failure cannot blank a route. */}
    <AppErrorBoundary moduleName="growth:alerts" severity="low" fallback={null}>
      <GrowthCardAlertHost />
    </AppErrorBoundary>
    {/* Platform-wide notification sound / haptics / toast — every route. */}
    <AppErrorBoundary moduleName="platform:notification-alerts" severity="low" fallback={null}>
      <NotificationAlertHost />
    </AppErrorBoundary>
    {/* Pause / resume / stop anything Zoe is speaking (bottom-LEFT, dock stays clear). */}
    <AppErrorBoundary moduleName="platform:zoe-speech-bar" severity="low" fallback={null}>
      <ZoeSpeechPauseBar />
    </AppErrorBoundary>
    <ZoeCardNarrationProvider>{children}</ZoeCardNarrationProvider>

    {/* First-run guided walk (bottom-LEFT, never over the dock). */}
    <AppErrorBoundary moduleName="platform:guided-tour" severity="low" fallback={null}>
      <GuidedTour />
    </AppErrorBoundary>

    {/* Enterprise bug reporter — every route, crash-isolated. */}
    <AppErrorBoundary moduleName="platform:bug-reporter" severity="low" fallback={null}>
      <GlobalBugReporter />
      {/* Silent presence + tamper watch; renders nothing unless the visitor is blocked. */}
      <SentinelWatchHost />
    </AppErrorBoundary>

    {/* Same bottom-right home dock on every route (HomePage owns its own). */}
    <AppErrorBoundary moduleName="platform:dock" severity="low" fallback={null}>
      <GlobalHomeDock />
    </AppErrorBoundary>

    {/* Zoe's orb — one mount for the whole platform, crash-isolated. */}
    <AppErrorBoundary moduleName="platform:zoe-orb" severity="low" fallback={null}>
      <ZoeGlobalMount />
    </AppErrorBoundary>
  </>
);

export default PlatformLayout;
