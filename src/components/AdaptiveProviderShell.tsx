// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE PROVIDER SHELL - Device-Tier Based Provider Injection
// Samsung M05 → iPhone 17 Pro Max compatibility layer
// Prevents low-end device crashes by conditional GOD MODE loading
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, lazy, Suspense, useEffect, useState } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';

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

  // Render appropriate provider based on mode
  if (!initialized) {
    // During detection, render children without heavy providers
    return <>{children}</>;
  }

  switch (mode) {
    case 'lite':
      return <LiteModeProvider>{children}</LiteModeProvider>;
    case 'standard':
      return <StandardModeProvider>{children}</StandardModeProvider>;
    case 'god':
      return <GodModeProvider>{children}</GodModeProvider>;
    default:
      return <StandardModeProvider>{children}</StandardModeProvider>;
  }
});

AdaptiveProviderShell.displayName = 'AdaptiveProviderShell';

export default AdaptiveProviderShell;
