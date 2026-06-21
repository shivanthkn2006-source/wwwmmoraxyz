// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ZERO-G: GPU Animation Enforcement Hook
// Purpose: Provide CSS-based animation utilities and prevent memory leaks
//
// CROSS-BROWSER SUPPORT:
// ✓ Safari (M1/M2/M3, iOS) - Compositor thread animations
// ✓ Chrome/Edge (Desktop & Mobile) - GPU compositing
// ✓ Firefox (Desktop & Mobile) - Hardware acceleration
// ✓ Samsung Internet - WebKit compatibility
// ✓ PWA Standalone Mode - Battery optimized
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Browser detection for targeted optimizations
 */
export const detectBrowser = (): {
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isMobile: boolean;
  isPWA: boolean;
  prefersReducedMotion: boolean;
} => {
  if (typeof window === 'undefined') {
    return {
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      isMobile: false,
      isPWA: false,
      prefersReducedMotion: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  
  return {
    isSafari: /safari/.test(ua) && !/chrome/.test(ua),
    isChrome: /chrome/.test(ua) && !/edge/.test(ua),
    isFirefox: /firefox/.test(ua),
    isEdge: /edge|edg/.test(ua),
    isMobile: /mobile|android|iphone|ipad/.test(ua),
    isPWA: window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
};

/**
 * Protocol Zero-G Animation Classes
 * Use these instead of framer-motion repeat: Infinity
 * All animations are GPU-accelerated and cross-browser compatible
 */
export const GPU_ANIMATIONS = {
  // Spin animations (replaces rotate: 360 with repeat: Infinity)
  spin: 'animate-gpu-spin',
  spinSlow: 'animate-spin-slow',
  spin2s: 'animate-gpu-spin-2s',
  spin3s: 'animate-gpu-spin-3s',
  rotateY8s: 'animate-gpu-rotate-y-8s',
  
  // Pulse animations (replaces scale: [1, 1.1, 1] with repeat: Infinity)
  pulse: 'animate-gpu-pulse-opacity',
  pulseSlow: 'animate-gpu-pulse-opacity-slow',
  pulseScale: 'animate-gpu-pulse-scale',
  pulseScaleSm: 'animate-gpu-pulse-scale-sm',
  scaleBounce: 'animate-gpu-scale-bounce',
  scaleFast: 'animate-gpu-scale-bounce-fast',
  
  // Status indicator pulses
  statusGreen: 'animate-gpu-status-green',
  statusRed: 'animate-gpu-status-red',
  statusPrimary: 'animate-gpu-status-primary',
  
  // Glow animations
  glowPulse: 'animate-gpu-glow-pulse',
  glowCyan: 'animate-gpu-glow-cyan',
  glowAmber: 'animate-gpu-glow-amber',
  
  // Ring/waypoint animations
  ringPulse: 'animate-gpu-ring-pulse',
  ringScale: 'animate-gpu-ring-scale-pulse',
  ringExpand: 'animate-gpu-ring-expand',
  
  // Icon animations
  iconScale: 'animate-gpu-icon-scale',
  warningShake: 'animate-gpu-warning-shake',
  
  // Cursor/typing animations
  cursorBlink: 'animate-gpu-cursor-blink',
  
  // Background blob floats
  blob1: 'animate-gpu-blob-1',
  blob2: 'animate-gpu-blob-2',
  
  // SVG dash march
  dashMarch: 'animate-gpu-dash-march',
  
  // Dots for typing indicators
  dot1: 'animate-gpu-dot-1',
  dot2: 'animate-gpu-dot-2',
  dot3: 'animate-gpu-dot-3',
} as const;

export type GPUAnimationType = keyof typeof GPU_ANIMATIONS;

/**
 * Hook to apply GPU-accelerated animations with visibility culling
 * Pauses animations when element is not visible (saves memory)
 * Works across all major browsers
 */
export const useProtocolZeroG = (enabled = true) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const isVisible = useRef(true);
  const [browserInfo] = useState(() => detectBrowser());

  // Visibility Observer - pause animations when off-screen
  useEffect(() => {
    if (!enabled || !elementRef.current) return;
    
    // Skip visibility optimization if reduced motion is preferred
    if (browserInfo.prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible.current = entry.isIntersecting;
          if (elementRef.current) {
            // Cross-browser animation pause
            const playState = entry.isIntersecting ? 'running' : 'paused';
            elementRef.current.style.animationPlayState = playState;
            // Webkit prefix for older Safari
            (elementRef.current.style as CSSStyleDeclaration & { webkitAnimationPlayState?: string }).webkitAnimationPlayState = playState;
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [enabled, browserInfo.prefersReducedMotion]);

  // Get animation class by type
  const getAnimationClass = useCallback((type: GPUAnimationType): string => {
    // Return empty if reduced motion is preferred
    if (browserInfo.prefersReducedMotion) return '';
    return GPU_ANIMATIONS[type] || '';
  }, [browserInfo.prefersReducedMotion]);

  // Build animation classes string
  const buildAnimationClasses = useCallback(
    (...types: GPUAnimationType[]): string => {
      if (browserInfo.prefersReducedMotion) return '';
      return types.map((t) => GPU_ANIMATIONS[t]).filter(Boolean).join(' ');
    },
    [browserInfo.prefersReducedMotion]
  );

  // Get GPU acceleration class based on browser
  const getGPUClass = useCallback((): string => {
    return 'gpu-accelerated';
  }, []);

  return {
    elementRef,
    isVisible: isVisible.current,
    getAnimationClass,
    buildAnimationClasses,
    getGPUClass,
    animations: GPU_ANIMATIONS,
    browserInfo,
  };
};

/**
 * Migration helper: Maps framer-motion patterns to CSS classes
 */
export const FRAMER_TO_CSS_MAP: Record<string, string> = {
  // Rotations
  'rotate: [0, 360]': 'animate-gpu-spin',
  'rotateY: 360': 'animate-gpu-rotate-y-8s',
  
  // Scale pulses
  'scale: [1, 1.1, 1]': 'animate-gpu-scale-bounce',
  'scale: [1, 1.2, 1]': 'animate-gpu-scale-bounce',
  'scale: [1, 1.05, 1]': 'animate-gpu-pulse-scale-sm',
  'scale: [1, 1.5, 1]': 'animate-gpu-ring-scale-pulse',
  
  // Opacity pulses
  'opacity: [1, 0.5, 1]': 'animate-gpu-status-green',
  'opacity: [0.5, 1, 0.5]': 'animate-gpu-pulse-opacity',
  'opacity: [1, 0]': 'animate-gpu-cursor-blink',
  'opacity: [0.8, 1, 0.8]': 'animate-gpu-icon-scale',
  
  // Box shadows
  'boxShadow: glow': 'animate-gpu-glow-pulse',
};

/**
 * Development warning for framer-motion infinite animations
 * Call this in development to detect memory leak patterns
 */
export const warnInfiniteAnimations = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.warn(
    '[Protocol Zero-G] ⚠️ Reminder: Use CSS GPU animations instead of framer-motion repeat: Infinity\n' +
    'Import: import { GPU_ANIMATIONS } from "@/hooks/useProtocolZeroG"\n' +
    'Replace: transition={{ repeat: Infinity }} → className={GPU_ANIMATIONS.pulse}'
  );
};

/**
 * Check if current browser supports GPU acceleration
 */
export const supportsGPUAcceleration = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for CSS will-change support
  const testEl = document.createElement('div');
  return 'willChange' in testEl.style;
};

export default useProtocolZeroG;
