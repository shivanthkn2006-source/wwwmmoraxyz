// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL LIQUID UNIVERSE: Context Provider
// Purpose: Global device awareness state for the entire app
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect } from 'react';
import useLiquidUniverse, { 
  type DeviceSoul, 
  getLiquidCSSVars 
} from '@/hooks/useLiquidUniverse';

interface LiquidUniverseContextType extends DeviceSoul {
  // Quick access helpers
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isCompactMode: boolean;
  shouldReduceAnimations: boolean;
}

const LiquidUniverseContext = createContext<LiquidUniverseContextType | null>(null);

export const LiquidUniverseProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const deviceSoul = useLiquidUniverse();
  
  // Apply CSS classes to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    const body = document.body;
    
    // Remove old form factor classes
    const oldClasses = Array.from(body.classList).filter(
      cls => cls.startsWith('form-') || 
             cls.startsWith('interact-') ||
             cls.startsWith('is-') ||
             cls === 'portrait' ||
             cls === 'landscape' ||
             cls === 'reduce-motion' ||
             cls === 'high-contrast' ||
             cls === 'low-power' ||
             cls === 'hdr-display'
    );
    oldClasses.forEach(cls => body.classList.remove(cls));
    
    // Add new classes
    deviceSoul.cssClasses.split(' ').forEach(cls => {
      if (cls) body.classList.add(cls);
    });
    
    // Set CSS custom properties
    const cssVars = getLiquidCSSVars(deviceSoul);
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Log device detection in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LiquidUniverse] Form Factor: ${deviceSoul.formFactor}, Mode: ${deviceSoul.interactionMode}`);
    }
  }, [deviceSoul]);
  
  // Computed helpers
  const isMobile = ['phone', 'phone-tall', 'fold-cover', 'flip-cover'].includes(deviceSoul.formFactor);
  const isTablet = ['tablet', 'fold-open'].includes(deviceSoul.formFactor);
  const isDesktop = ['desktop', 'ultrawide', 'tv'].includes(deviceSoul.formFactor);
  const isCompactMode = ['watch', 'fold-cover', 'flip-cover'].includes(deviceSoul.formFactor);
  const shouldReduceAnimations = deviceSoul.prefersReducedMotion || 
                                  deviceSoul.isLowPower || 
                                  deviceSoul.isFridge || 
                                  deviceSoul.isCar;
  
  const value: LiquidUniverseContextType = {
    ...deviceSoul,
    isMobile,
    isTablet,
    isDesktop,
    isCompactMode,
    shouldReduceAnimations,
  };
  
  return (
    <LiquidUniverseContext.Provider value={value}>
      {children}
    </LiquidUniverseContext.Provider>
  );
};

export const useLiquidUniverseContext = (): LiquidUniverseContextType => {
  const context = useContext(LiquidUniverseContext);
  if (!context) {
    throw new Error('useLiquidUniverseContext must be used within LiquidUniverseProvider');
  }
  return context;
};

// Optional hook for components that can work without provider
export const useLiquidUniverseOptional = (): LiquidUniverseContextType | null => {
  return useContext(LiquidUniverseContext);
};

export default LiquidUniverseContext;
