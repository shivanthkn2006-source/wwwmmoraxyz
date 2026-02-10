// ═══════════════════════════════════════════════════════════════════════════════
// VR CAPABILITIES DETECTION HOOK
// Detects WebXR, Device Orientation, Touch, and platform capabilities
// For testing across PC, Mobile, Tablet, VR headsets, and emulators
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export interface VRCapabilities {
  // WebXR Support
  webxrSupported: boolean;
  webxrImmersiveVR: boolean;
  webxrImmersiveAR: boolean;
  webxrInlineSession: boolean;
  isWebXREmulator: boolean;
  
  // Device Orientation (Gyroscope)
  deviceOrientationSupported: boolean;
  deviceOrientationPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  hasGyroscope: boolean;
  hasAccelerometer: boolean;
  
  // Touch & Pointer
  isTouchDevice: boolean;
  hasMultiTouch: boolean;
  maxTouchPoints: number;
  
  // Platform Detection
  platform: 'desktop' | 'mobile' | 'tablet' | 'vr-headset' | 'unknown';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'oculus' | 'unknown';
  
  // WebGL
  webglSupported: boolean;
  webgl2Supported: boolean;
  gpuRenderer: string;
  
  // Screen
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isLandscape: boolean;
  
  // Recommended Mode
  recommendedMode: 'desktop-3d' | 'mobile-gyro' | 'cardboard-vr' | 'webxr-vr' | 'webxr-ar';
}

export interface UseVRCapabilitiesReturn extends VRCapabilities {
  requestOrientationPermission: () => Promise<boolean>;
  enterCardboardMode: () => void;
  exitCardboardMode: () => void;
  isCardboardMode: boolean;
  refreshCapabilities: () => void;
  isLoading: boolean;
}

export const useVRCapabilities = (): UseVRCapabilitiesReturn => {
  const [capabilities, setCapabilities] = useState<VRCapabilities>({
    webxrSupported: false,
    webxrImmersiveVR: false,
    webxrImmersiveAR: false,
    webxrInlineSession: false,
    isWebXREmulator: false,
    deviceOrientationSupported: false,
    deviceOrientationPermission: 'unknown',
    hasGyroscope: false,
    hasAccelerometer: false,
    isTouchDevice: false,
    hasMultiTouch: false,
    maxTouchPoints: 0,
    platform: 'unknown',
    os: 'unknown',
    browser: 'unknown',
    webglSupported: false,
    webgl2Supported: false,
    gpuRenderer: 'unknown',
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    isLandscape: window.innerWidth > window.innerHeight,
    recommendedMode: 'desktop-3d',
  });
  
  const [isCardboardMode, setIsCardboardMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const detectPlatform = useCallback((): VRCapabilities['platform'] => {
    const ua = navigator.userAgent.toLowerCase();
    
    // Check for VR headsets first
    if (ua.includes('oculus') || ua.includes('quest') || ua.includes('vive') || ua.includes('pico')) {
      return 'vr-headset';
    }
    
    // Check for tablet (before mobile since tablets also have touch)
    const isTablet = (
      (ua.includes('ipad')) ||
      (ua.includes('android') && !ua.includes('mobile')) ||
      (window.innerWidth >= 768 && 'ontouchstart' in window)
    );
    if (isTablet) return 'tablet';
    
    // Check for mobile
    const isMobile = (
      ua.includes('iphone') ||
      ua.includes('ipod') ||
      (ua.includes('android') && ua.includes('mobile')) ||
      ua.includes('windows phone')
    );
    if (isMobile) return 'mobile';
    
    return 'desktop';
  }, []);

  const detectOS = useCallback((): VRCapabilities['os'] => {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || platform.includes('mac') && 'ontouchstart' in window) {
      return 'ios';
    }
    if (ua.includes('android')) return 'android';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    return 'unknown';
  }, []);

  const detectBrowser = useCallback((): VRCapabilities['browser'] => {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('oculusbrowser')) return 'oculus';
    if (ua.includes('edg/')) return 'edge';
    if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    return 'unknown';
  }, []);

  const detectWebGL = useCallback(() => {
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | null = null;
    let gl2: WebGL2RenderingContext | null = null;
    let renderer = 'unknown';
    
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext;
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
      }
    } catch (e) {
      console.warn('[VR Capabilities] WebGL detection failed:', e);
    }
    
    return {
      webglSupported: !!gl,
      webgl2Supported: !!gl2,
      gpuRenderer: renderer,
    };
  }, []);

  const detectWebXR = useCallback(async () => {
    const result = {
      webxrSupported: false,
      webxrImmersiveVR: false,
      webxrImmersiveAR: false,
      webxrInlineSession: false,
      isWebXREmulator: false,
    };

    if (!('xr' in navigator)) {
      return result;
    }

    result.webxrSupported = true;

    try {
      // Check for WebXR Emulator extension
      // @ts-ignore - WebXR Emulator adds this property
      if (navigator.xr?.isEmulator || window.__WEBXR_EMULATOR__) {
        result.isWebXREmulator = true;
      }

      result.webxrImmersiveVR = await navigator.xr!.isSessionSupported('immersive-vr');
      result.webxrImmersiveAR = await navigator.xr!.isSessionSupported('immersive-ar');
      result.webxrInlineSession = await navigator.xr!.isSessionSupported('inline');
    } catch (e) {
      console.warn('[VR Capabilities] WebXR detection error:', e);
    }

    return result;
  }, []);

  const detectDeviceOrientation = useCallback(async () => {
    const result: {
      deviceOrientationSupported: boolean;
      deviceOrientationPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
      hasGyroscope: boolean;
      hasAccelerometer: boolean;
    } = {
      deviceOrientationSupported: false,
      deviceOrientationPermission: 'unknown',
      hasGyroscope: false,
      hasAccelerometer: false,
    };

    // Check if DeviceOrientationEvent exists
    if (!('DeviceOrientationEvent' in window)) {
      return result;
    }

    result.deviceOrientationSupported = true;

    // Check for iOS 13+ permission requirement
    // @ts-ignore - iOS specific
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // Don't actually request, just check if we can
        result.deviceOrientationPermission = 'prompt';
      } catch (e) {
        result.deviceOrientationPermission = 'denied';
      }
    } else {
      // Non-iOS or older iOS - assume granted
      result.deviceOrientationPermission = 'granted';
    }

    // Test for actual sensor data
    if ('Gyroscope' in window) {
      result.hasGyroscope = true;
    }
    if ('Accelerometer' in window) {
      result.hasAccelerometer = true;
    }

    return result;
  }, []);

  const detectTouchCapabilities = useCallback(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    
    return {
      isTouchDevice,
      hasMultiTouch: maxTouchPoints > 1,
      maxTouchPoints,
    };
  }, []);

  const determineRecommendedMode = useCallback((caps: Partial<VRCapabilities>): VRCapabilities['recommendedMode'] => {
    // Priority order: WebXR VR > WebXR AR > Cardboard > Mobile Gyro > Desktop 3D
    
    if (caps.webxrImmersiveVR) {
      return 'webxr-vr';
    }
    
    if (caps.webxrImmersiveAR) {
      return 'webxr-ar';
    }
    
    if (caps.platform === 'mobile' && caps.deviceOrientationSupported) {
      // Mobile with gyroscope - can do cardboard or gyro mode
      return 'cardboard-vr';
    }
    
    if (caps.platform === 'tablet' && caps.deviceOrientationSupported) {
      return 'mobile-gyro';
    }
    
    return 'desktop-3d';
  }, []);

  const refreshCapabilities = useCallback(async () => {
    setIsLoading(true);
    
    const platform = detectPlatform();
    const os = detectOS();
    const browser = detectBrowser();
    const webgl = detectWebGL();
    const touch = detectTouchCapabilities();
    const webxr = await detectWebXR();
    const orientation = await detectDeviceOrientation();
    
    const newCaps: VRCapabilities = {
      ...webxr,
      ...orientation,
      ...touch,
      ...webgl,
      platform,
      os,
      browser,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      isLandscape: window.innerWidth > window.innerHeight,
      recommendedMode: 'desktop-3d', // Will be set below
    };
    
    newCaps.recommendedMode = determineRecommendedMode(newCaps);
    
    setCapabilities(newCaps);
    setIsLoading(false);
    
    console.log('[VR Capabilities] Detected:', newCaps);
  }, [detectPlatform, detectOS, detectBrowser, detectWebGL, detectTouchCapabilities, detectWebXR, detectDeviceOrientation, determineRecommendedMode]);

  const requestOrientationPermission = useCallback(async (): Promise<boolean> => {
    // @ts-ignore - iOS specific
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-ignore
        const permission = await DeviceOrientationEvent.requestPermission();
        setCapabilities(prev => ({
          ...prev,
          deviceOrientationPermission: permission === 'granted' ? 'granted' : 'denied',
        }));
        return permission === 'granted';
      } catch (e) {
        console.error('[VR Capabilities] Orientation permission denied:', e);
        setCapabilities(prev => ({
          ...prev,
          deviceOrientationPermission: 'denied',
        }));
        return false;
      }
    }
    return true; // Non-iOS, assume granted
  }, []);

  const enterCardboardMode = useCallback(() => {
    setIsCardboardMode(true);
    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.warn);
    }
    // Lock orientation to landscape (non-standard API)
    try {
      // @ts-ignore - Non-standard API
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        // @ts-ignore
        screen.orientation.lock('landscape').catch(console.warn);
      }
    } catch (e) {
      console.warn('[VR] Orientation lock not supported');
    }
  }, []);

  const exitCardboardMode = useCallback(() => {
    setIsCardboardMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    }
    try {
      // @ts-ignore - Non-standard API
      if (screen.orientation && typeof screen.orientation.unlock === 'function') {
        // @ts-ignore
        screen.orientation.unlock();
      }
    } catch (e) {
      console.warn('[VR] Orientation unlock not supported');
    }
  }, []);

  // Initial detection
  useEffect(() => {
    refreshCapabilities();
    
    // Listen for resize/orientation changes
    const handleResize = () => {
      setCapabilities(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        isLandscape: window.innerWidth > window.innerHeight,
      }));
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [refreshCapabilities]);

  return {
    ...capabilities,
    requestOrientationPermission,
    enterCardboardMode,
    exitCardboardMode,
    isCardboardMode,
    refreshCapabilities,
    isLoading,
  };
};

export default useVRCapabilities;
