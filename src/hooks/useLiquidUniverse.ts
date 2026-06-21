// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL LIQUID UNIVERSE: Device Awareness & Form Factor Detection
// Purpose: Real-time device soul detection for adaptive UI morphing
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FACTOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type FormFactor = 
  | 'watch'           // Smart watches (< 280px)
  | 'fold-cover'      // Z Fold outer screen (280-340px)
  | 'flip-cover'      // Z Flip cover screen (~340-380px)
  | 'phone'           // Standard phones (380-768px)
  | 'phone-tall'      // Z Flip open (22:9 aspect)
  | 'tablet'          // Tablets (768-1024px)
  | 'fold-open'       // Z Fold open (tablet-ish 6:5)
  | 'fridge'          // Samsung Family Hub (1080x1920 portrait)
  | 'desktop'         // Standard desktop
  | 'car'             // Car displays (landscape, touch)
  | 'kiosk'           // Kiosk/POS systems
  | 'tv'              // Smart TVs
  | 'ultrawide'       // Ultrawide monitors
  | 'unknown';

export type InteractionMode = 
  | 'touch'           // Primary touch input
  | 'mouse'           // Primary mouse/trackpad
  | 'stylus'          // Pen/Stylus input
  | 'remote'          // TV remote/voice
  | 'gesture';        // Gesture-based (VR/AR)

export interface DeviceSoul {
  // Core identity
  formFactor: FormFactor;
  interactionMode: InteractionMode;
  
  // Screen metrics
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  
  // Form factor flags
  isWatch: boolean;
  isFoldable: boolean;
  isFolded: boolean;      // Cover screen active
  isUnfolded: boolean;    // Inner screen active
  isFridge: boolean;
  isCar: boolean;
  isKiosk: boolean;
  isTV: boolean;
  
  // Capability flags
  hasHinge: boolean;
  hasSafeAreas: boolean;
  hasHighRefresh: boolean;
  isPWA: boolean;
  isLowPower: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  isHDR: boolean;
  
  // Layout recommendations
  layout: {
    columns: number;
    touchTargetSize: number;  // in px
    baseFontScale: number;    // multiplier
    spacingScale: number;     // multiplier
    maxContentWidth: string;
    enableAnimations: boolean;
    enableBlur: boolean;
    enableShadows: boolean;
  };
  
  // CSS class string for body
  cssClasses: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const detectFormFactor = (width: number, height: number): FormFactor => {
  const aspectRatio = width / height;
  const isPortrait = height > width;
  
  // Watch (tiny screens)
  if (width <= 280 && height <= 400) return 'watch';
  
  // Z Fold Cover Screen (outer)
  if (width >= 280 && width <= 340 && isPortrait) return 'fold-cover';
  
  // Z Flip Cover Screen
  if (width >= 340 && width <= 380 && height <= 400) return 'flip-cover';
  
  // Samsung Fridge (tall portrait, large)
  if (width >= 1000 && height >= 1900 && isPortrait) return 'fridge';
  
  // Kiosk (tall portrait, medium-large)
  if (width >= 1000 && height >= 1400 && isPortrait) return 'kiosk';
  
  // Z Flip Open (very tall aspect ratio 22:9)
  if (aspectRatio >= 2.4) return 'phone-tall';
  
  // Z Fold Open (6:5 aspect, tablet-ish)
  if (width >= 1536 && aspectRatio <= 1.2 && aspectRatio >= 0.8) return 'fold-open';
  
  // TV (large landscape)
  if (width >= 1920 && height >= 1000) return 'tv';
  
  // Car (landscape, medium height)
  if (width >= 800 && height <= 600 && !isPortrait) return 'car';
  
  // Ultrawide
  if (aspectRatio >= 2.2 && width >= 2560) return 'ultrawide';
  
  // Standard devices
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  
  return 'desktop';
};

const detectInteractionMode = (): InteractionMode => {
  if (typeof window === 'undefined') return 'mouse';
  
  // Check for stylus
  if (window.matchMedia('(pointer: fine) and (hover: none)').matches) {
    return 'stylus';
  }
  
  // Check for touch
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return 'touch';
  }
  
  // Check for TV/Remote
  if (window.matchMedia('(min-width: 1920px) and (min-height: 1000px)').matches) {
    return 'remote';
  }
  
  return 'mouse';
};

const getLayoutRecommendations = (
  formFactor: FormFactor, 
  interactionMode: InteractionMode,
  prefersReducedMotion: boolean,
  isLowPower: boolean
) => {
  const baseConfig = {
    columns: 1,
    touchTargetSize: 44,
    baseFontScale: 1,
    spacingScale: 1,
    maxContentWidth: '100%',
    enableAnimations: !prefersReducedMotion && !isLowPower,
    enableBlur: !isLowPower,
    enableShadows: !isLowPower,
  };
  
  switch (formFactor) {
    case 'watch':
      return {
        ...baseConfig,
        columns: 1,
        touchTargetSize: 48,
        baseFontScale: 0.75,
        spacingScale: 0.5,
        maxContentWidth: '100%',
        enableAnimations: false,
        enableBlur: false,
        enableShadows: false,
      };
      
    case 'fold-cover':
    case 'flip-cover':
      return {
        ...baseConfig,
        columns: 1,
        touchTargetSize: 48,
        baseFontScale: 0.85,
        spacingScale: 0.6,
        maxContentWidth: '100%',
        enableAnimations: false,
        enableBlur: false,
      };
      
    case 'phone':
    case 'phone-tall':
      return {
        ...baseConfig,
        columns: 1,
        touchTargetSize: 44,
        baseFontScale: 1,
        spacingScale: 1,
        maxContentWidth: '100%',
      };
      
    case 'tablet':
    case 'fold-open':
      return {
        ...baseConfig,
        columns: 2,
        touchTargetSize: 44,
        baseFontScale: 1.05,
        spacingScale: 1.2,
        maxContentWidth: '768px',
      };
      
    case 'fridge':
      return {
        ...baseConfig,
        columns: 2,
        touchTargetSize: 64,  // Larger for appliance use
        baseFontScale: 1.25,
        spacingScale: 1.5,
        maxContentWidth: '900px',
        enableAnimations: false,  // Save appliance CPU
      };
      
    case 'car':
      return {
        ...baseConfig,
        columns: 2,
        touchTargetSize: 72,  // Safety - large targets
        baseFontScale: 1.3,
        spacingScale: 1.5,
        maxContentWidth: '100%',
        enableAnimations: false,  // Driver safety
        enableBlur: false,
      };
      
    case 'kiosk':
      return {
        ...baseConfig,
        columns: 2,
        touchTargetSize: 56,
        baseFontScale: 1.2,
        spacingScale: 1.3,
        maxContentWidth: '900px',
      };
      
    case 'tv':
      return {
        ...baseConfig,
        columns: 4,
        touchTargetSize: 80,  // Remote navigation
        baseFontScale: 1.5,
        spacingScale: 2,
        maxContentWidth: '1400px',
      };
      
    case 'ultrawide':
      return {
        ...baseConfig,
        columns: 4,
        touchTargetSize: 44,
        baseFontScale: 1.1,
        spacingScale: 1.2,
        maxContentWidth: '1920px',
      };
      
    case 'desktop':
    default:
      return {
        ...baseConfig,
        columns: 3,
        touchTargetSize: 44,
        baseFontScale: 1,
        spacingScale: 1,
        maxContentWidth: '1280px',
      };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useLiquidUniverse = (): DeviceSoul => {
  const [deviceSoul, setDeviceSoul] = useState<DeviceSoul>(() => getInitialState());
  
  const detectDevice = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    const pixelRatio = window.devicePixelRatio || 1;
    const orientation = height > width ? 'portrait' : 'landscape';
    
    const formFactor = detectFormFactor(width, height);
    const interactionMode = detectInteractionMode();
    
    // Media query checks
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const hasHinge = window.matchMedia('(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)').matches;
    const isHDR = window.matchMedia('(dynamic-range: high)').matches;
    const isLowPower = 'connection' in navigator 
      ? ((navigator as any).connection?.saveData === true)
      : false;
    
    // Safe areas check
    const hasSafeAreas = CSS.supports('padding-top: env(safe-area-inset-top)');
    
    // High refresh rate detection
    const hasHighRefresh = 'getDisplayMedia' in navigator.mediaDevices;
    
    // Form factor flags
    const isWatch = formFactor === 'watch';
    const isFoldable = ['fold-cover', 'fold-open', 'flip-cover', 'phone-tall'].includes(formFactor);
    const isFolded = ['fold-cover', 'flip-cover'].includes(formFactor);
    const isUnfolded = ['fold-open', 'phone-tall'].includes(formFactor);
    const isFridge = formFactor === 'fridge';
    const isCar = formFactor === 'car';
    const isKiosk = formFactor === 'kiosk';
    const isTV = formFactor === 'tv';
    
    // Layout recommendations
    const layout = getLayoutRecommendations(formFactor, interactionMode, prefersReducedMotion, isLowPower);
    
    // Generate CSS classes
    const cssClasses = [
      `form-${formFactor}`,
      `interact-${interactionMode}`,
      orientation,
      isPWA && 'is-pwa',
      hasHinge && 'has-hinge',
      isFoldable && 'is-foldable',
      isFolded && 'is-folded',
      isUnfolded && 'is-unfolded',
      isFridge && 'is-fridge',
      isCar && 'is-car',
      isTV && 'is-tv',
      isWatch && 'is-watch',
      prefersReducedMotion && 'reduce-motion',
      prefersHighContrast && 'high-contrast',
      isLowPower && 'low-power',
      isHDR && 'hdr-display',
    ].filter(Boolean).join(' ');
    
    setDeviceSoul({
      formFactor,
      interactionMode,
      screenWidth: width,
      screenHeight: height,
      aspectRatio,
      pixelRatio,
      orientation,
      isWatch,
      isFoldable,
      isFolded,
      isUnfolded,
      isFridge,
      isCar,
      isKiosk,
      isTV,
      hasHinge,
      hasSafeAreas,
      hasHighRefresh,
      isPWA,
      isLowPower,
      prefersReducedMotion,
      prefersHighContrast,
      isHDR,
      layout,
      cssClasses,
    });
  }, []);
  
  useEffect(() => {
    detectDevice();
    
    // Listen for resize
    window.addEventListener('resize', detectDevice);
    
    // Listen for orientation change
    window.addEventListener('orientationchange', detectDevice);
    
    // Listen for fold/unfold on foldables
    const hingeQuery = window.matchMedia('(horizontal-viewport-segments: 2)');
    hingeQuery.addEventListener?.('change', detectDevice);
    
    // Listen for PWA mode changes
    const pwaQuery = window.matchMedia('(display-mode: standalone)');
    pwaQuery.addEventListener?.('change', detectDevice);
    
    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener?.('change', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
      hingeQuery.removeEventListener?.('change', detectDevice);
      pwaQuery.removeEventListener?.('change', detectDevice);
      motionQuery.removeEventListener?.('change', detectDevice);
    };
  }, [detectDevice]);
  
  return deviceSoul;
};

// Initial state for SSR
function getInitialState(): DeviceSoul {
  const isClient = typeof window !== 'undefined';
  const width = isClient ? window.innerWidth : 375;
  const height = isClient ? window.innerHeight : 812;
  
  return {
    formFactor: 'phone',
    interactionMode: 'touch',
    screenWidth: width,
    screenHeight: height,
    aspectRatio: width / height,
    pixelRatio: isClient ? window.devicePixelRatio : 1,
    orientation: height > width ? 'portrait' : 'landscape',
    isWatch: false,
    isFoldable: false,
    isFolded: false,
    isUnfolded: false,
    isFridge: false,
    isCar: false,
    isKiosk: false,
    isTV: false,
    hasHinge: false,
    hasSafeAreas: false,
    hasHighRefresh: false,
    isPWA: false,
    isLowPower: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    isHDR: false,
    layout: {
      columns: 1,
      touchTargetSize: 44,
      baseFontScale: 1,
      spacingScale: 1,
      maxContentWidth: '100%',
      enableAnimations: true,
      enableBlur: true,
      enableShadows: true,
    },
    cssClasses: 'form-phone interact-touch portrait',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Get CSS Variables for Layout
// ═══════════════════════════════════════════════════════════════════════════════

export const getLiquidCSSVars = (soul: DeviceSoul): Record<string, string> => ({
  '--liquid-columns': String(soul.layout.columns),
  '--liquid-touch-target': `${soul.layout.touchTargetSize}px`,
  '--liquid-font-scale': String(soul.layout.baseFontScale),
  '--liquid-spacing-scale': String(soul.layout.spacingScale),
  '--liquid-max-content': soul.layout.maxContentWidth,
  '--liquid-aspect-ratio': String(soul.aspectRatio.toFixed(2)),
});

export default useLiquidUniverse;
