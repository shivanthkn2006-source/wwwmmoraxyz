/**
 * RESPONSIVE VR/AR UTILITIES
 * Supports screens from 4.1" mobile to 95" displays
 * VR/AR device detection and optimization
 */

import { useState, useEffect, useCallback } from 'react';

// Screen size breakpoints (in pixels)
export const BREAKPOINTS = {
  xs: 320,     // 4.1" - 5" mobile
  sm: 480,     // 5" - 6" mobile
  md: 768,     // Tablets
  lg: 1024,    // Small desktop / large tablet
  xl: 1280,    // Desktop
  '2xl': 1536, // Large desktop
  '3xl': 1920, // Full HD
  '4xl': 2560, // 2K displays
  '5xl': 3840, // 4K / 95" displays
} as const;

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

export interface DeviceCapabilities {
  isVR: boolean;
  isAR: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
  hasTouch: boolean;
  hasGyro: boolean;
  hasSpatialTracking: boolean;
  screenSize: ScreenSize;
  orientation: 'portrait' | 'landscape';
  pixelDensity: number;
  maxFPS: number;
}

export interface ResponsiveConfig {
  // UI Scale
  uiScale: number;
  // Icon sizes
  iconSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  // Font sizes
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  // Compact mode
  compactMode: boolean;
  // Show labels with icons
  showLabels: boolean;
  // Panel sizes
  panelWidth: number;
  panelHeight: number;
  // Touch targets
  minTouchTarget: number;
  // Spacing
  spacing: number;
}

// Detect VR/AR devices
const detectVRARDevice = (): { isVR: boolean; isAR: boolean } => {
  if (typeof navigator === 'undefined') return { isVR: false, isAR: false };
  
  // Check for WebXR
  const xr = (navigator as any).xr;
  
  // Check user agent for known VR/AR devices
  const ua = navigator.userAgent.toLowerCase();
  const vrPatterns = [
    'oculus', 'quest', 'rift', 'vive', 'valve index', 
    'windows mixed reality', 'wmr', 'pico', 'varjo',
    'pimax', 'hp reverb', 'samsung odyssey'
  ];
  const arPatterns = [
    'hololens', 'magic leap', 'nreal', 'xreal', 'ray-ban',
    'apple vision', 'visionos'
  ];
  
  const isVR = vrPatterns.some(p => ua.includes(p)) || 
               (xr?.isSessionSupported?.('immersive-vr') || false);
  const isAR = arPatterns.some(p => ua.includes(p)) ||
               (xr?.isSessionSupported?.('immersive-ar') || false);
  
  return { isVR, isAR };
};

// Get screen size category
const getScreenSize = (width: number): ScreenSize => {
  if (width < BREAKPOINTS.sm) return 'xs';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS['2xl']) return 'xl';
  if (width < BREAKPOINTS['3xl']) return '2xl';
  if (width < BREAKPOINTS['4xl']) return '3xl';
  if (width < BREAKPOINTS['5xl']) return '4xl';
  return '5xl';
};

// Get device capabilities
export const getDeviceCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined') {
    return {
      isVR: false,
      isAR: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTV: false,
      hasTouch: false,
      hasGyro: false,
      hasSpatialTracking: false,
      screenSize: 'lg',
      orientation: 'landscape',
      pixelDensity: 1,
      maxFPS: 60
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const { isVR, isAR } = detectVRARDevice();
  
  const isMobile = width < BREAKPOINTS.md && 'ontouchstart' in window;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg && 'ontouchstart' in window;
  const isTV = width >= BREAKPOINTS['4xl'] && !('ontouchstart' in window);
  const isDesktop = !isMobile && !isTablet && !isTV && !isVR && !isAR;
  
  return {
    isVR,
    isAR,
    isMobile,
    isTablet,
    isDesktop,
    isTV,
    hasTouch: 'ontouchstart' in window,
    hasGyro: 'DeviceOrientationEvent' in window,
    hasSpatialTracking: isVR || isAR,
    screenSize: getScreenSize(width),
    orientation: width > height ? 'landscape' : 'portrait',
    pixelDensity: window.devicePixelRatio || 1,
    maxFPS: isVR ? 90 : (isTV ? 120 : 60)
  };
};

// Get responsive configuration based on device
export const getResponsiveConfig = (device: DeviceCapabilities): ResponsiveConfig => {
  const { screenSize, isMobile, isTablet, isTV, isVR, isAR, orientation } = device;
  
  // Base scale factor
  let uiScale = 1;
  if (screenSize === 'xs') uiScale = 0.75;
  else if (screenSize === 'sm') uiScale = 0.85;
  else if (screenSize === 'md') uiScale = 0.9;
  else if (screenSize === '4xl' || screenSize === '5xl') uiScale = 1.5;
  else if (isTV) uiScale = 2;
  else if (isVR || isAR) uiScale = 1.2;
  
  // Compact mode for small screens in landscape or VR HUD
  const compactMode = (isMobile && orientation === 'landscape') || 
                      (isTablet && orientation === 'portrait') ||
                      (isMobile && screenSize === 'sm') ||
                      isVR;
  
  // Icon sizes
  const iconSize: ResponsiveConfig['iconSize'] = 
    compactMode ? 'xs' :
    isMobile ? 'sm' :
    isTV ? 'xl' :
    isVR ? 'lg' :
    'md';
  
  // Font sizes
  const fontSize: ResponsiveConfig['fontSize'] = 
    isMobile && screenSize === 'sm' ? 'xs' :
    isMobile ? 'sm' :
    isTV ? 'xl' :
    'base';
  
  // Show labels (hide on very small screens or VR compact mode)
  const showLabels = !compactMode && !(isMobile && screenSize === 'sm');
  
  // Panel dimensions - based on isMobile check instead of xs
  const panelWidth = 
    isMobile && screenSize === 'sm' ? 140 :
    isMobile ? 180 :
    isTablet ? 280 :
    isTV ? 400 :
    isVR ? 240 :
    320;
  
  const panelHeight = 
    compactMode ? 120 :
    isMobile ? 180 :
    isTV ? 500 :
    280;
  
  // Touch targets (44px minimum for accessibility)
  const minTouchTarget = 
    isMobile || isTablet ? 44 :
    isTV ? 60 :
    isVR ? 48 :
    36;
  
  // Spacing
  const spacing = 
    compactMode ? 4 :
    isMobile ? 8 :
    isTV ? 24 :
    16;
  
  return {
    uiScale,
    iconSize,
    fontSize,
    compactMode,
    showLabels,
    panelWidth,
    panelHeight,
    minTouchTarget,
    spacing
  };
};

// React hook for responsive VR/AR
export const useResponsiveVR = () => {
  const [device, setDevice] = useState<DeviceCapabilities>(getDeviceCapabilities);
  const [config, setConfig] = useState<ResponsiveConfig>(() => getResponsiveConfig(device));
  
  const updateDevice = useCallback(() => {
    const newDevice = getDeviceCapabilities();
    setDevice(newDevice);
    setConfig(getResponsiveConfig(newDevice));
  }, []);
  
  useEffect(() => {
    updateDevice();
    
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);
    
    // VR session detection
    if ((navigator as any).xr) {
      (navigator as any).xr.addEventListener?.('sessionstart', updateDevice);
      (navigator as any).xr.addEventListener?.('sessionend', updateDevice);
    }
    
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, [updateDevice]);
  
  return { device, config, updateDevice };
};

// CSS classes for responsive sizing
export const getResponsiveClasses = (config: ResponsiveConfig) => {
  const { compactMode, iconSize, fontSize, showLabels } = config;
  
  return {
    container: compactMode ? 'p-1 gap-1' : 'p-3 gap-3',
    panel: compactMode ? 'rounded-lg' : 'rounded-xl',
    icon: {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8'
    }[iconSize],
    text: {
      xs: 'text-[9px]',
      sm: 'text-xs',
      base: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    }[fontSize],
    button: compactMode ? 'p-1' : 'p-2',
    label: showLabels ? '' : 'sr-only',
    touchTarget: `min-w-[${config.minTouchTarget}px] min-h-[${config.minTouchTarget}px]`
  };
};

export default useResponsiveVR;
