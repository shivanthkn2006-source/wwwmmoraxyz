// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM LAYOUT
// The single shell that owns cross-route platform services (persistent voice
// engine, thermal watchdog). Renders children untouched — zero visual change —
// so the existing home/loops/videos UI is unaffected.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { usePlatformStore } from '@/store/usePlatformStore';
import { AppErrorBoundary } from '@/components/core/ErrorBoundary';
import GlobalHomeDock from '@/components/home/GlobalHomeDock';
import useDhfUnlockReminders from '@/hooks/useDhfUnlockReminders';
import { ZoeCardNarrationProvider } from '@/components/voice/ZoeCardNarrationProvider';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const DeferredPlatformServices = lazy(() => import('@/components/platform/DeferredPlatformServices'));



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

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const [extrasReady, setExtrasReady] = useState(false);
  const isAuthenticationRoute =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery') ||
    pathname.startsWith('/voice-auth') ||
    pathname.startsWith('/beta');

  useEffect(() => {
    if (loading || !user || isAuthenticationRoute) {
      setExtrasReady(false);
      return;
    }
    const timer = window.setTimeout(() => setExtrasReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, [loading, user, isAuthenticationRoute]);

  // Authentication and the requested page own the critical path. The Home
  // control remains immediate; optional voice/call/monitoring systems follow.
  if (loading || !user || isAuthenticationRoute) return <>{children}</>;

  // The call engine wraps the page itself: the Calls page, call buttons and
  // the deferred incoming-call host all read it, so it cannot wait for the
  // deferred services (that gap caused "useCallEngine must be used within
  // CallEngineProvider" on /calls).
  return (
  <CallEngineProvider>
    <ZoeCardNarrationProvider>{children}</ZoeCardNarrationProvider>
    <AppErrorBoundary moduleName="platform:dock" severity="low" fallback={null}>
      <GlobalHomeDock />
    </AppErrorBoundary>
    {extrasReady && (
      <Suspense fallback={null}>
        <AppErrorBoundary moduleName="platform:deferred-services" severity="low" fallback={null}>
          <DeferredPlatformServices><PlatformServices /></DeferredPlatformServices>
        </AppErrorBoundary>
      </Suspense>
    )}
  </CallEngineProvider>
  );
};

export default PlatformLayout;
