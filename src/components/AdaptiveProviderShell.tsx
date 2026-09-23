// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE PROVIDER SHELL - Device-Tier Based Provider Injection
// Samsung M05 → iPhone 17 Pro Max compatibility layer
// Prevents low-end device crashes by conditional GOD MODE loading
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, lazy, Suspense, useEffect, useState } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { markStartupPhase } from '@/lib/startupTiming';


// Heavy providers - only loaded on capable devices
const AdaptiveHoloProvider = lazy(() => 
  import('@/components/holo/AdaptiveHoloProvider').then(m => ({ default: m.AdaptiveHoloProvider }))
);
const GenesisEngineProvider = lazy(() => 
  import('@/components/genesis/GenesisEngineProvider').then(m => ({ default: m.GenesisEngineProvider }))
);
const ZoeCoreUnifiedProvider = lazy(() => 
  import('@/components/core/ZoeCoreUnifiedProvider').then(m => ({ default: m.ZoeCoreUnifiedProvider }))
);

// Lite mode fallback provider - minimal overhead
const LiteModeProvider = memo(({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    console.log('[AdaptiveShell] 🪶 LITE MODE ACTIVE - Heavy providers disabled for device preservation');
  }, []);
  return <>{children}</>;
});
LiteModeProvider.displayName = 'LiteModeProvider';

// Standard mode provider - some features enabled
const StandardModeProvider = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<>{children}</>}>
      <GenesisEngineProvider autoScan={false} scanInterval={30}>
        <ZoeCoreUnifiedProvider autoScan={false}>
          {children}
        </ZoeCoreUnifiedProvider>
      </GenesisEngineProvider>
    </Suspense>
  );
});
StandardModeProvider.displayName = 'StandardModeProvider';

// Full GOD MODE provider - all features enabled with Adaptive Holo
const GodModeProvider = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<>{children}</>}>
      <AdaptiveHoloProvider enableOrb={true} enableGlow={true} enableHUD={true}>
        <GenesisEngineProvider autoScan={true} scanInterval={10}>
          <ZoeCoreUnifiedProvider autoScan={true}>
            {children}
          </ZoeCoreUnifiedProvider>
        </GenesisEngineProvider>
      </AdaptiveHoloProvider>
    </Suspense>
  );
});
GodModeProvider.displayName = 'GodModeProvider';

interface AdaptiveProviderShellProps {
  children: React.ReactNode;
  forceMode?: 'lite' | 'standard' | 'god';
}

/**
 * Adaptive Provider Shell
 * 
 * Detects device tier and injects appropriate level of providers:
 * - Tier C (M05, iPhone 11, etc): LITE MODE - No heavy providers
 * - Tier B (iPhone 12/13, mid Android): STANDARD MODE - Limited providers
 * - Tier A/S (iPhone 14+, flagships): GOD MODE - Full providers
 * 
 * This prevents crashes on low-end devices while maintaining
 * full functionality on capable hardware.
 */
export const AdaptiveProviderShell = memo(({ children, forceMode }: AdaptiveProviderShellProps) => {
  const [mode, setMode] = useState<'lite' | 'standard' | 'god'>('standard');
  const [initialized, setInitialized] = useState(false);
  const [providersReady, setProvidersReady] = useState(false);
  
  let tierContext: ReturnType<typeof useDeviceTierContext> | null = null;
  try {
    tierContext = useDeviceTierContext();
  } catch {
    // Context not available yet - use safe defaults
  }
  
  const capabilities = tierContext?.capabilities;
  const tier = tierContext?.tier;
  const isDetecting = tierContext?.isDetecting ?? true;

  // Always run the auth flow with the lightest possible shell.
  // This prevents dynamic-import module failures from heavy providers from blocking login.
  const isAuthRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/auth' ||
    window.location.pathname.startsWith('/auth') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/signup' ||
    window.location.pathname.startsWith('/password-recovery') ||
    window.location.pathname.startsWith('/voice-auth')
  );

  // Determine mode based on device tier
  useEffect(() => {
    // Force lite mode for authentication routes
    if (isAuthRoute) {
      setMode('lite');
      setInitialized(true);
      return;
    }

    if (isDetecting && !forceMode) return;

    if (forceMode) {
      setMode(forceMode);
      setInitialized(true);
      console.log(`[AdaptiveShell] Forced mode: ${forceMode.toUpperCase()}`);
      return;
    }

    if (capabilities?.isLowPowerDevice || tier === 'C') {
      setMode('lite');
      console.log('[AdaptiveShell] 📱 Low-power device detected → LITE MODE');
    } else if (tier === 'B') {
      setMode('standard');
      console.log('[AdaptiveShell] 📱 Standard device detected → STANDARD MODE');
    } else if (tier === 'A' || tier === 'S') {
      setMode('god');
      console.log('[AdaptiveShell] 🚀 High-performance device detected → GOD MODE');
    } else {
      // Fallback to standard
      setMode('standard');
    }

    setInitialized(true);
  }, [tier, capabilities?.isLowPowerDevice, isDetecting, forceMode, isAuthRoute]);

  // Keep the first paint and session hydration independent of the diagnostic
  // provider graph. Mount it only after the page is interactive and the browser
  // has an idle window, avoiding the post-sign-in /user request burst.
  useEffect(() => {
    if (!initialized || isAuthRoute || mode === 'lite') {
      setProvidersReady(false);
      return;
    }

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const enable = () => {
      setProvidersReady(true);
      markStartupPhase('providers-ready');
    };


    if ('requestIdleCallback' in window) {
      idleId = (window as Window & { requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number })
        .requestIdleCallback(enable, { timeout: 8_000 });
    } else {
      timeoutId = setTimeout(enable, 5_000);
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initialized, isAuthRoute, mode]);

  // Memory pressure monitoring - downgrade if needed
  useEffect(() => {
    if (mode === 'lite') return; // Already at minimum
    
    const checkMemory = () => {
      const perf = performance as any;
      if (perf.memory) {
        const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
        if (usedMB > 300 && mode === 'god') {
          console.warn('[AdaptiveShell] ⚠️ High memory pressure, downgrading to STANDARD');
          setMode('standard');
        } else if (usedMB > 400) {
          console.warn('[AdaptiveShell] 🚨 Critical memory pressure, forcing LITE MODE');
          setMode('lite');
        }
      }
    };

    const interval = setInterval(checkMemory, 15000);
    return () => clearInterval(interval);
  }, [mode]);

  // Keep the route subtree at the same React position for the lifetime of the
  // session. Late-mount providers render as a sibling so enabling diagnostics
  // can never wipe forms, scroll position, or page-local state.
  const DeferredProviders = mode === 'god' ? GodModeProvider : StandardModeProvider;
  const mountDeferredProviders = initialized && providersReady && mode !== 'lite';

  return (
    <>
      {children}
      {mountDeferredProviders && (
        <DeferredProviders>
          <span hidden aria-hidden="true" />
        </DeferredProviders>
      )}
    </>
  );
});

AdaptiveProviderShell.displayName = 'AdaptiveProviderShell';

export default AdaptiveProviderShell;
