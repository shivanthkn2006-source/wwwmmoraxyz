// ═══════════════════════════════════════════════════════════════════════════════
// VR SAFARI/iOS FIX - Cross-Browser Zoom & Touch Control Fixes
// Auto-detects browser and applies appropriate fixes for:
// - Safari Desktop & iOS (iPhone SE to iPhone 17 Ultra Pro Max)
// - Firefox, Chrome, Edge, Opera, Brave
// - Pinch-to-zoom stuck issues on WebKit-based browsers
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef, useState } from 'react';
import { detectBrowser, BrowserInfo } from '@/utils/crossBrowserCompat';

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSER-SPECIFIC ORBIT CONTROLS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
export interface VRBrowserConfig {
  rotateSpeed: number;
  zoomSpeed: number;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  enableDamping: boolean;
  enableZoom: boolean;
  enableRotate: boolean;
  touchAction: 'none' | 'manipulation' | 'auto';
  preventDefaultTouch: boolean;
  useGestureEvents: boolean;
}

// Default config for all browsers
const DEFAULT_CONFIG: VRBrowserConfig = {
  rotateSpeed: 0.5,
  zoomSpeed: 1.0,
  dampingFactor: 0.05,
  minDistance: 2,
  maxDistance: 50,
  enableDamping: true,
  enableZoom: true,
  enableRotate: true,
  touchAction: 'none',
  preventDefaultTouch: true,
  useGestureEvents: false,
};

// Safari Desktop config - Fix for zoom getting stuck
const SAFARI_DESKTOP_CONFIG: VRBrowserConfig = {
  ...DEFAULT_CONFIG,
  rotateSpeed: 0.4,
  zoomSpeed: 0.8,
  dampingFactor: 0.08,
  touchAction: 'manipulation',
  useGestureEvents: true,
};

// iOS Safari config - Enhanced for iPhone SE to iPhone 17 Ultra Pro Max
const IOS_CONFIG: VRBrowserConfig = {
  ...DEFAULT_CONFIG,
  rotateSpeed: 0.35, // Slower for precise control
  zoomSpeed: 0.6, // Reduced to prevent zoom jumps
  dampingFactor: 0.12, // More damping for smoother feel
  minDistance: 1.5, // Allow closer zoom on mobile
  maxDistance: 80, // Allow further zoom out
  enableDamping: true,
  touchAction: 'none', // Prevent browser gestures interfering
  preventDefaultTouch: true,
  useGestureEvents: true,
};

// Firefox config
const FIREFOX_CONFIG: VRBrowserConfig = {
  ...DEFAULT_CONFIG,
  rotateSpeed: 0.45,
  zoomSpeed: 1.2, // Firefox wheel zoom is slower, compensate
  dampingFactor: 0.06,
};

// Chrome/Edge/Brave config (Blink-based)
const BLINK_CONFIG: VRBrowserConfig = {
  ...DEFAULT_CONFIG,
  rotateSpeed: 0.5,
  zoomSpeed: 1.0,
  dampingFactor: 0.05,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET CONFIG FOR CURRENT BROWSER
// ═══════════════════════════════════════════════════════════════════════════════
export const getVRConfigForBrowser = (browser?: BrowserInfo): VRBrowserConfig => {
  const info = browser || detectBrowser();
  
  // iOS devices (iPhone/iPad)
  if (info.os === 'ios') {
    console.log('[VR Safari Fix] iOS detected - applying touch-optimized config');
    return IOS_CONFIG;
  }
  
  // Safari on macOS
  if (info.name === 'safari' && info.os === 'macos') {
    console.log('[VR Safari Fix] Safari macOS detected - applying Safari config');
    return SAFARI_DESKTOP_CONFIG;
  }
  
  // Firefox
  if (info.name === 'firefox') {
    console.log('[VR Safari Fix] Firefox detected - applying Firefox config');
    return FIREFOX_CONFIG;
  }
  
  // Blink-based browsers (Chrome, Edge, Opera, Brave)
  if (info.engine === 'blink') {
    console.log(`[VR Safari Fix] ${info.name} (Blink) detected - applying standard config`);
    return BLINK_CONFIG;
  }
  
  console.log('[VR Safari Fix] Unknown browser - using default config');
  return DEFAULT_CONFIG;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useVRSafariFix - Auto-applies browser-specific fixes
// ═══════════════════════════════════════════════════════════════════════════════
export const useVRSafariFix = (canvasRef?: React.RefObject<HTMLElement>) => {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [config, setConfig] = useState<VRBrowserConfig>(DEFAULT_CONFIG);
  const [isFixed, setIsFixed] = useState(false);
  const gestureHandlerRef = useRef<((e: Event) => void) | null>(null);
  
  // Detect browser on mount
  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);
    setConfig(getVRConfigForBrowser(info));
    console.log('[VR Safari Fix] Browser detected:', info);
  }, []);
  
  // Apply Safari/iOS specific fixes
  const applySafariFixes = useCallback((element: HTMLElement) => {
    if (!browserInfo) return;
    
    const isSafariOrIOS = browserInfo.name === 'safari' || browserInfo.os === 'ios';
    
    if (isSafariOrIOS) {
      // Prevent default touch behavior that causes zoom stuck
      element.style.touchAction = config.touchAction;
      element.style.webkitUserSelect = 'none';
      element.style.userSelect = 'none';
      
      // Disable iOS Safari's smart zooming
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        const currentContent = metaViewport.getAttribute('content') || '';
        if (!currentContent.includes('maximum-scale')) {
          metaViewport.setAttribute('content', 
            `${currentContent}, maximum-scale=1.0, user-scalable=no`
          );
        }
      }
      
      // Handle gesturestart/gesturechange/gestureend for Safari pinch-zoom
      if (config.useGestureEvents) {
        const handleGesture = (e: Event) => {
          e.preventDefault();
          
          // Dispatch our own zoom event for OrbitControls to handle
          const gestureEvent = e as any;
          if (gestureEvent.scale !== undefined) {
            window.dispatchEvent(new CustomEvent('vr-pinch-zoom', {
              detail: {
                scale: gestureEvent.scale,
                rotation: gestureEvent.rotation || 0,
              }
            }));
          }
        };
        
        gestureHandlerRef.current = handleGesture;
        element.addEventListener('gesturestart', handleGesture, { passive: false });
        element.addEventListener('gesturechange', handleGesture, { passive: false });
        element.addEventListener('gestureend', handleGesture, { passive: false });
      }
      
      // Prevent touch move from causing stuck zoom on iOS
      const handleTouchMove = (e: TouchEvent) => {
        // Only prevent if it's a multi-touch (pinch) gesture
        if (e.touches.length >= 2 && config.preventDefaultTouch) {
          e.preventDefault();
        }
      };
      
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      console.log('[VR Safari Fix] Safari/iOS fixes applied');
    }
    
    setIsFixed(true);
  }, [browserInfo, config]);
  
  // Apply fixes when canvas ref is available
  useEffect(() => {
    if (canvasRef?.current) {
      applySafariFixes(canvasRef.current);
    } else {
      // Try to find the canvas element
      const canvas = document.querySelector('canvas');
      if (canvas) {
        applySafariFixes(canvas);
      }
    }
    
    return () => {
      // Cleanup gesture handlers
      if (gestureHandlerRef.current) {
        const canvas = canvasRef?.current || document.querySelector('canvas');
        if (canvas) {
          canvas.removeEventListener('gesturestart', gestureHandlerRef.current);
          canvas.removeEventListener('gesturechange', gestureHandlerRef.current);
          canvas.removeEventListener('gestureend', gestureHandlerRef.current);
        }
      }
    };
  }, [canvasRef, applySafariFixes]);
  
  // Force reset zoom - call this if zoom gets stuck
  const forceResetZoom = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-force-reset-zoom'));
    console.log('[VR Safari Fix] Force reset zoom triggered');
  }, []);
  
  return {
    browserInfo,
    config,
    isFixed,
    isSafari: browserInfo?.name === 'safari',
    isIOS: browserInfo?.os === 'ios',
    isMobile: browserInfo?.isMobile || false,
    forceResetZoom,
    applySafariFixes,
  };
};

export default useVRSafariFix;
