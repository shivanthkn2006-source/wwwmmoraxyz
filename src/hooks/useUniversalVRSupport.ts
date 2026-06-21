// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL VR SUPPORT - Cross-Platform VR/AR Headset & Browser Compatibility
// Supports: Quest, Meta, Apple Vision Pro, Google Cardboard, Pico, HTC Vive, etc.
// Browsers: Chrome, Firefox, Safari, Edge, Opera, Brave, Samsung Internet, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export interface HeadsetInfo {
  type: 'quest' | 'quest_pro' | 'quest_3' | 'vision_pro' | 'cardboard' | 'pico' | 'vive' | 'index' | 'wmr' | 'psvr' | 'unknown';
  name: string;
  manufacturer: string;
  features: string[];
  maxRefreshRate: number;
  resolution: { width: number; height: number };
  hasHandTracking: boolean;
  hasPassthrough: boolean;
  hasEyeTracking: boolean;
}

export interface BrowserConfig {
  name: string;
  version: string;
  isVRCapable: boolean;
  webxrSupport: boolean;
  webglVersion: number;
  recommendedSettings: {
    pixelRatio: number;
    antialias: boolean;
    shadowQuality: 'none' | 'low' | 'medium' | 'high';
    maxLights: number;
    postProcessing: boolean;
  };
}

export interface UniversalVRSupport {
  isLoading: boolean;
  isSecureContext: boolean;
  
  // WebXR Support
  webxrSupported: boolean;
  immersiveVRSupported: boolean;
  immersiveARSupported: boolean;
  inlineSupported: boolean;
  
  // Headset Detection
  detectedHeadset: HeadsetInfo | null;
  isHeadsetConnected: boolean;
  
  // Browser Info
  browserConfig: BrowserConfig;
  
  // Features
  handTrackingSupported: boolean;
  hitTestSupported: boolean;
  anchorsSupported: boolean;
  planeDetectionSupported: boolean;
  meshDetectionSupported: boolean;
  depthSensingSupported: boolean;
  lightEstimationSupported: boolean;
  
  // Actions
  enterVR: () => Promise<XRSession | null>;
  enterAR: () => Promise<XRSession | null>;
  enterCardboardMode: () => void;
  exitSession: () => Promise<void>;
  
  // Utils
  getOptimalSettings: () => BrowserConfig['recommendedSettings'];
  getTroubleshootingTips: () => string[];
  refreshCapabilities: () => Promise<void>;
}

const HEADSET_SIGNATURES: Record<string, Partial<HeadsetInfo>> = {
  'quest 3': {
    type: 'quest_3',
    name: 'Meta Quest 3',
    manufacturer: 'Meta',
    maxRefreshRate: 120,
    resolution: { width: 2064, height: 2208 },
    hasHandTracking: true,
    hasPassthrough: true,
    hasEyeTracking: false,
    features: ['hand-tracking', 'passthrough', 'spatial-audio', 'controllers']
  },
  'quest pro': {
    type: 'quest_pro',
    name: 'Meta Quest Pro',
    manufacturer: 'Meta',
    maxRefreshRate: 90,
    resolution: { width: 1800, height: 1920 },
    hasHandTracking: true,
    hasPassthrough: true,
    hasEyeTracking: true,
    features: ['hand-tracking', 'eye-tracking', 'face-tracking', 'passthrough', 'controllers']
  },
  'quest 2': {
    type: 'quest',
    name: 'Meta Quest 2',
    manufacturer: 'Meta',
    maxRefreshRate: 120,
    resolution: { width: 1832, height: 1920 },
    hasHandTracking: true,
    hasPassthrough: false,
    hasEyeTracking: false,
    features: ['hand-tracking', 'controllers']
  },
  'oculus quest': {
    type: 'quest',
    name: 'Meta Quest',
    manufacturer: 'Meta',
    maxRefreshRate: 72,
    resolution: { width: 1440, height: 1600 },
    hasHandTracking: true,
    hasPassthrough: false,
    hasEyeTracking: false,
    features: ['hand-tracking', 'controllers']
  },
  'apple vision': {
    type: 'vision_pro',
    name: 'Apple Vision Pro',
    manufacturer: 'Apple',
    maxRefreshRate: 90,
    resolution: { width: 3660, height: 3200 },
    hasHandTracking: true,
    hasPassthrough: true,
    hasEyeTracking: true,
    features: ['hand-tracking', 'eye-tracking', 'spatial-audio', 'passthrough']
  },
  'pico 4': {
    type: 'pico',
    name: 'Pico 4',
    manufacturer: 'Pico',
    maxRefreshRate: 90,
    resolution: { width: 2160, height: 2160 },
    hasHandTracking: true,
    hasPassthrough: true,
    hasEyeTracking: false,
    features: ['hand-tracking', 'passthrough', 'controllers']
  },
  'vive': {
    type: 'vive',
    name: 'HTC Vive',
    manufacturer: 'HTC',
    maxRefreshRate: 90,
    resolution: { width: 1080, height: 1200 },
    hasHandTracking: false,
    hasPassthrough: false,
    hasEyeTracking: false,
    features: ['controllers', 'room-scale']
  },
  'index': {
    type: 'index',
    name: 'Valve Index',
    manufacturer: 'Valve',
    maxRefreshRate: 144,
    resolution: { width: 1440, height: 1600 },
    hasHandTracking: false,
    hasPassthrough: false,
    hasEyeTracking: false,
    features: ['controllers', 'finger-tracking', 'room-scale']
  }
};

const detectBrowser = (): Omit<BrowserConfig, 'recommendedSettings'> => {
  const ua = navigator.userAgent.toLowerCase();
  
  let name = 'unknown';
  let version = '0';
  let isVRCapable = false;
  let webxrSupport = 'xr' in navigator;
  let webglVersion = 0;
  
  // Detect WebGL version
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2')) {
      webglVersion = 2;
    } else if (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) {
      webglVersion = 1;
    }
  } catch (e) {
    webglVersion = 0;
  }
  
  // Browser detection
  if (ua.includes('oculusbrowser')) {
    name = 'Oculus Browser';
    version = ua.match(/oculusbrowser\/(\d+)/)?.[1] || '0';
    isVRCapable = true;
  } else if (ua.includes('samsungbrowser')) {
    name = 'Samsung Internet';
    version = ua.match(/samsungbrowser\/(\d+)/)?.[1] || '0';
    isVRCapable = true;
  } else if (ua.includes('firefox') && ua.includes('mobile vr')) {
    name = 'Firefox Reality';
    version = ua.match(/firefox\/(\d+)/)?.[1] || '0';
    isVRCapable = true;
  } else if (ua.includes('wolvic')) {
    name = 'Wolvic';
    version = ua.match(/wolvic\/(\d+)/)?.[1] || '0';
    isVRCapable = true;
  } else if (ua.includes('edg/')) {
    name = 'Edge';
    version = ua.match(/edg\/(\d+)/)?.[1] || '0';
    isVRCapable = webxrSupport;
  } else if (ua.includes('brave')) {
    name = 'Brave';
    version = ua.match(/chrome\/(\d+)/)?.[1] || '0';
    isVRCapable = webxrSupport;
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    name = 'Opera';
    version = ua.match(/(?:opera|opr)\/(\d+)/)?.[1] || '0';
    isVRCapable = webxrSupport;
  } else if (ua.includes('firefox')) {
    name = 'Firefox';
    version = ua.match(/firefox\/(\d+)/)?.[1] || '0';
    isVRCapable = webxrSupport;
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    name = 'Safari';
    version = ua.match(/version\/(\d+)/)?.[1] || '0';
    isVRCapable = false; // Safari has limited WebXR
  } else if (ua.includes('chrome')) {
    name = 'Chrome';
    version = ua.match(/chrome\/(\d+)/)?.[1] || '0';
    isVRCapable = webxrSupport;
  }
  
  return { name, version, isVRCapable, webxrSupport, webglVersion };
};

const getRecommendedSettings = (browser: string, webglVersion: number, isMobile: boolean): BrowserConfig['recommendedSettings'] => {
  const isLowEnd = webglVersion < 2 || isMobile;
  const isSafari = browser.toLowerCase() === 'safari';
  
  if (isSafari) {
    return {
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      antialias: false,
      shadowQuality: 'low',
      maxLights: 2,
      postProcessing: false
    };
  }
  
  if (isLowEnd) {
    return {
      pixelRatio: 1,
      antialias: false,
      shadowQuality: 'none',
      maxLights: 1,
      postProcessing: false
    };
  }
  
  return {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    antialias: true,
    shadowQuality: 'high',
    maxLights: 4,
    postProcessing: true
  };
};

export const useUniversalVRSupport = (): UniversalVRSupport => {
  const [isLoading, setIsLoading] = useState(true);
  const [webxrSupported, setWebxrSupported] = useState(false);
  const [immersiveVRSupported, setImmersiveVRSupported] = useState(false);
  const [immersiveARSupported, setImmersiveARSupported] = useState(false);
  const [inlineSupported, setInlineSupported] = useState(false);
  const [detectedHeadset, setDetectedHeadset] = useState<HeadsetInfo | null>(null);
  const [isHeadsetConnected, setIsHeadsetConnected] = useState(false);
  const [browserConfig, setBrowserConfig] = useState<BrowserConfig>({
    name: 'unknown',
    version: '0',
    isVRCapable: false,
    webxrSupport: false,
    webglVersion: 0,
    recommendedSettings: {
      pixelRatio: 1,
      antialias: false,
      shadowQuality: 'none',
      maxLights: 1,
      postProcessing: false
    }
  });
  const [handTrackingSupported, setHandTrackingSupported] = useState(false);
  const [hitTestSupported, setHitTestSupported] = useState(false);
  const [anchorsSupported, setAnchorsSupported] = useState(false);
  const [planeDetectionSupported, setPlaneDetectionSupported] = useState(false);
  const [meshDetectionSupported, setMeshDetectionSupported] = useState(false);
  const [depthSensingSupported, setDepthSensingSupported] = useState(false);
  const [lightEstimationSupported, setLightEstimationSupported] = useState(false);
  const [currentSession, setCurrentSession] = useState<XRSession | null>(null);
  const [isCardboardMode, setIsCardboardMode] = useState(false);

  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

  const detectHeadset = useCallback(async () => {
    const ua = navigator.userAgent.toLowerCase();
    
    for (const [signature, info] of Object.entries(HEADSET_SIGNATURES)) {
      if (ua.includes(signature)) {
        return {
          ...info,
          type: info.type || 'unknown',
          name: info.name || 'Unknown Headset',
          manufacturer: info.manufacturer || 'Unknown',
          features: info.features || [],
          maxRefreshRate: info.maxRefreshRate || 60,
          resolution: info.resolution || { width: 1920, height: 1080 },
          hasHandTracking: info.hasHandTracking || false,
          hasPassthrough: info.hasPassthrough || false,
          hasEyeTracking: info.hasEyeTracking || false
        } as HeadsetInfo;
      }
    }
    
    // Try to detect via WebXR if available
    if ('xr' in navigator && navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (supported) {
          return {
            type: 'unknown',
            name: 'VR Headset',
            manufacturer: 'Unknown',
            features: ['controllers'],
            maxRefreshRate: 90,
            resolution: { width: 1920, height: 1080 },
            hasHandTracking: false,
            hasPassthrough: false,
            hasEyeTracking: false
          } as HeadsetInfo;
        }
      } catch (e) {
        console.log('[UniversalVR] WebXR detection failed:', e);
      }
    }
    
    return null;
  }, []);

  const refreshCapabilities = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Detect browser
      const browserInfo = detectBrowser();
      const settings = getRecommendedSettings(browserInfo.name, browserInfo.webglVersion, isMobile);
      setBrowserConfig({ ...browserInfo, recommendedSettings: settings });
      
      // Check WebXR support
      if ('xr' in navigator && navigator.xr) {
        setWebxrSupported(true);
        
        const [vrSupport, arSupport, inlineSupport] = await Promise.all([
          navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
          navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
          navigator.xr.isSessionSupported('inline').catch(() => false)
        ]);
        
        setImmersiveVRSupported(vrSupport);
        setImmersiveARSupported(arSupport);
        setInlineSupported(inlineSupport);
        
        // Feature detection (best effort)
        setHandTrackingSupported(vrSupport || arSupport);
        setHitTestSupported(arSupport);
        setAnchorsSupported(arSupport);
        setPlaneDetectionSupported(arSupport);
        setMeshDetectionSupported(arSupport);
        setDepthSensingSupported(arSupport);
        setLightEstimationSupported(arSupport);
        
        console.log('[UniversalVR] WebXR capabilities:', { vrSupport, arSupport, inlineSupport });
      } else {
        setWebxrSupported(false);
        console.log('[UniversalVR] WebXR not available');
      }
      
      // Detect headset
      const headset = await detectHeadset();
      setDetectedHeadset(headset);
      setIsHeadsetConnected(!!headset);
      
      console.log('[UniversalVR] Detected headset:', headset);
      console.log('[UniversalVR] Browser config:', browserInfo);
      
    } catch (error) {
      console.error('[UniversalVR] Capability detection error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [detectHeadset, isMobile]);

  const enterVR = useCallback(async (): Promise<XRSession | null> => {
    if (!webxrSupported || !immersiveVRSupported) {
      console.warn('[UniversalVR] VR not supported');
      return null;
    }
    
    if (!isSecureContext) {
      console.error('[UniversalVR] Secure context required for WebXR');
      return null;
    }
    
    try {
      const session = await navigator.xr!.requestSession('immersive-vr', {
        optionalFeatures: [
          'local-floor',
          'bounded-floor',
          'hand-tracking',
          'layers'
        ]
      });
      
      session.addEventListener('end', () => {
        setCurrentSession(null);
        console.log('[UniversalVR] VR session ended');
      });
      
      setCurrentSession(session);
      console.log('[UniversalVR] VR session started');
      return session;
    } catch (error) {
      console.error('[UniversalVR] Failed to start VR session:', error);
      return null;
    }
  }, [webxrSupported, immersiveVRSupported, isSecureContext]);

  const enterAR = useCallback(async (): Promise<XRSession | null> => {
    if (!webxrSupported || !immersiveARSupported) {
      console.warn('[UniversalVR] AR not supported');
      return null;
    }
    
    try {
      const session = await navigator.xr!.requestSession('immersive-ar', {
        optionalFeatures: [
          'hit-test',
          'plane-detection',
          'anchors',
          'light-estimation'
        ]
      });
      
      session.addEventListener('end', () => {
        setCurrentSession(null);
      });
      
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('[UniversalVR] Failed to start AR session:', error);
      return null;
    }
  }, [webxrSupported, immersiveARSupported]);

  const enterCardboardMode = useCallback(() => {
    setIsCardboardMode(true);
    // Enable stereoscopic rendering mode
    document.body.classList.add('cardboard-mode');
    console.log('[UniversalVR] Cardboard mode enabled');
  }, []);

  const exitSession = useCallback(async () => {
    if (currentSession) {
      await currentSession.end();
      setCurrentSession(null);
    }
    if (isCardboardMode) {
      setIsCardboardMode(false);
      document.body.classList.remove('cardboard-mode');
    }
  }, [currentSession, isCardboardMode]);

  const getOptimalSettings = useCallback(() => {
    return browserConfig.recommendedSettings;
  }, [browserConfig]);

  const getTroubleshootingTips = useCallback((): string[] => {
    const tips: string[] = [];
    
    if (!isSecureContext) {
      tips.push('WebXR requires HTTPS. Please access this site via HTTPS.');
    }
    
    if (!webxrSupported) {
      tips.push('Your browser does not support WebXR. Try Chrome, Firefox, or Edge.');
    }
    
    if (browserConfig.name === 'Safari') {
      tips.push('Safari has limited WebXR support. For best VR experience, use Chrome or Firefox.');
    }
    
    if (browserConfig.webglVersion < 2) {
      tips.push('WebGL 2 not available. Some features may be limited.');
    }
    
    if (isMobile && !detectedHeadset) {
      tips.push('For mobile VR, try using a Cardboard viewer or connect a VR headset.');
    }
    
    if (!immersiveVRSupported && webxrSupported) {
      tips.push('No VR headset detected. Connect a headset and refresh.');
    }
    
    return tips;
  }, [isSecureContext, webxrSupported, browserConfig, isMobile, detectedHeadset, immersiveVRSupported]);

  useEffect(() => {
    refreshCapabilities();
  }, [refreshCapabilities]);

  return {
    isLoading,
    isSecureContext,
    webxrSupported,
    immersiveVRSupported,
    immersiveARSupported,
    inlineSupported,
    detectedHeadset,
    isHeadsetConnected,
    browserConfig,
    handTrackingSupported,
    hitTestSupported,
    anchorsSupported,
    planeDetectionSupported,
    meshDetectionSupported,
    depthSensingSupported,
    lightEstimationSupported,
    enterVR,
    enterAR,
    enterCardboardMode,
    exitSession,
    getOptimalSettings,
    getTroubleshootingTips,
    refreshCapabilities
  };
};

export default useUniversalVRSupport;
