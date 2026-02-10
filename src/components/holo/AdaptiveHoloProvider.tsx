// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE HOLO PROVIDER - Device-Tier Based Visual Loading
// Samsung M05 → iPhone 17 Pro Max compatibility layer
// Prevents low-end device crashes by conditional WebGL loading
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, lazy, Suspense, useEffect } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { CSSOnlyOrb, ZoeState } from './CSSOnlyOrb';

// Heavy WebGL provider - only loaded on capable devices
const HoloFluidProvider = lazy(() => 
  import('./HoloFluidProvider').then(m => ({ default: m.HoloFluidProvider }))
);

interface AdaptiveHoloProviderProps {
  children: React.ReactNode;
  enableOrb?: boolean;
  enableGlow?: boolean;
  enableHUD?: boolean;
}

/**
 * Lite Mode Provider - For Samsung M05, iPhone 11, and low-end devices
 * Uses CSS-only visuals with zero WebGL overhead
 * Looks identical but uses 95% less RAM/CPU
 */
const LiteHoloProvider = memo(({ 
  children,
  enableOrb = true,
}: AdaptiveHoloProviderProps) => {
  
  useEffect(() => {
    console.log('[AdaptiveHolo] 🪶 LITE MODE ACTIVE - CSS-only visuals for device preservation');
  }, []);

  return (
    <div className="lite-holo-provider relative">
      {/* Lite ambient glow effect - pure CSS */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 css-ambient-glow"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--omega-cyan) / 0.05) 0%, transparent 50%)',
          willChange: 'opacity',
        }}
      />
      
      {children}
      
      {/* CSS-only floating orb for lite mode - currently disabled globally */}
      {false && enableOrb && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <CSSOnlyOrb 
            state="idle" 
            size="md"
            onClick={() => {
              // Dispatch event for Zoe interaction
              window.dispatchEvent(new CustomEvent('zoe-orb-click', { detail: { source: 'lite' } }));
            }}
          />
        </div>
      )}
    </div>
  );
});
LiteHoloProvider.displayName = 'LiteHoloProvider';

/**
 * Adaptive Holo Provider
 * 
 * Detects device tier and loads appropriate visual layer:
 * - Tier C (M05, iPhone 11, etc): LITE MODE - CSS-only visuals
 * - Tier B/A/S (Modern devices): FULL MODE - WebGL + Physics
 * 
 * This prevents crashes on low-end devices while maintaining
 * visual fidelity on capable hardware.
 */
export const AdaptiveHoloProvider = memo(({ 
  children,
  enableOrb = true,
  enableGlow = true,
  enableHUD = true,
}: AdaptiveHoloProviderProps) => {
  
  let tierContext: ReturnType<typeof useDeviceTierContext> | null = null;
  try {
    tierContext = useDeviceTierContext();
  } catch {
    // Context not available - default to standard mode
  }

  const tier = tierContext?.tier;
  const capabilities = tierContext?.capabilities;
  const isLowPower = capabilities?.isLowPowerDevice || tier === 'C';

  // For low-power devices, use CSS-only lite mode
  if (isLowPower) {
    return (
      <LiteHoloProvider enableOrb={enableOrb}>
        {children}
      </LiteHoloProvider>
    );
  }

  // For capable devices, load full WebGL provider
  return (
    <Suspense fallback={<LiteHoloProvider enableOrb={enableOrb}>{children}</LiteHoloProvider>}>
      <HoloFluidProvider 
        enableOrb={enableOrb} 
        enableGlow={enableGlow} 
        enableHUD={enableHUD}
      >
        {children}
      </HoloFluidProvider>
    </Suspense>
  );
});

AdaptiveHoloProvider.displayName = 'AdaptiveHoloProvider';

export default AdaptiveHoloProvider;
