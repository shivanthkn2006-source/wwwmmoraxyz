// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-BROWSER COMPATIBILITY UTILITY
// Centralized polyfills, feature detection, and browser-specific fixes
// Supports: Chrome, Firefox, Safari, Edge, Opera, Brave, Samsung Internet, iOS, Android
// ═══════════════════════════════════════════════════════════════════════════════

export interface BrowserInfo {
  name: string;
  version: string;
  engine: 'blink' | 'gecko' | 'webkit' | 'unknown';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
}

export interface FeatureSupport {
  webgl: boolean;
  webgl2: boolean;
  webxr: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  mediaDevices: boolean;
  geolocation: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  notifications: boolean;
  vibration: boolean;
  fullscreen: boolean;
  pointerLock: boolean;
  gamepad: boolean;
  bluetooth: boolean;
  usb: boolean;
  share: boolean;
  clipboard: boolean;
  wakeLock: boolean;
  audioContext: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
  mutationObserver: boolean;
  cssBackdropFilter: boolean;
  cssGrid: boolean;
  cssFlexGap: boolean;
}

// Detect browser information
export const detectBrowser = (): BrowserInfo => {
  if (typeof navigator === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      engine: 'unknown',
      os: 'unknown',
      isMobile: false,
      isTablet: false,
      isTouch: false
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  // Detect browser name and version
  let name = 'unknown';
  let version = '0';
  let engine: BrowserInfo['engine'] = 'unknown';

  if (ua.includes('edg/')) {
    name = 'edge';
    version = ua.match(/edg\/(\d+)/)?.[1] || '0';
    engine = 'blink';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    name = 'opera';
    version = ua.match(/(?:opr|opera)\/(\d+)/)?.[1] || '0';
    engine = 'blink';
  } else if (ua.includes('brave')) {
    name = 'brave';
    version = ua.match(/chrome\/(\d+)/)?.[1] || '0';
    engine = 'blink';
  } else if (ua.includes('samsungbrowser')) {
    name = 'samsung';
    version = ua.match(/samsungbrowser\/(\d+)/)?.[1] || '0';
    engine = 'blink';
  } else if (ua.includes('firefox')) {
    name = 'firefox';
    version = ua.match(/firefox\/(\d+)/)?.[1] || '0';
    engine = 'gecko';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    name = 'safari';
    version = ua.match(/version\/(\d+)/)?.[1] || '0';
    engine = 'webkit';
  } else if (ua.includes('chrome')) {
    name = 'chrome';
    version = ua.match(/chrome\/(\d+)/)?.[1] || '0';
    engine = 'blink';
  }

  // Detect OS
  let os: BrowserInfo['os'] = 'unknown';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'ios';
  } else if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('mac')) {
    os = 'macos';
  } else if (ua.includes('win')) {
    os = 'windows';
  } else if (ua.includes('linux')) {
    os = 'linux';
  }

  // Detect device type
  const isMobile = /android|iphone|ipod|blackberry|windows phone/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua) || 
    (platform === 'macintel' && navigator.maxTouchPoints > 1);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return { name, version, engine, os, isMobile, isTablet, isTouch };
};

// Detect feature support
export const detectFeatures = (): FeatureSupport => {
  if (typeof window === 'undefined') {
    return {
      webgl: false, webgl2: false, webxr: false, speechRecognition: false,
      speechSynthesis: false, mediaDevices: false, geolocation: false,
      localStorage: false, indexedDB: false, serviceWorker: false,
      notifications: false, vibration: false, fullscreen: false,
      pointerLock: false, gamepad: false, bluetooth: false, usb: false,
      share: false, clipboard: false, wakeLock: false, audioContext: false,
      intersectionObserver: false, resizeObserver: false, mutationObserver: false,
      cssBackdropFilter: false, cssGrid: false, cssFlexGap: false
    };
  }

  // Check CSS support
  const checkCSS = (property: string, value: string): boolean => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      return CSS.supports(property, value);
    }
    const el = document.createElement('div');
    el.style.cssText = `${property}: ${value}`;
    return el.style.cssText.length > 0;
  };

  return {
    webgl: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch { return false; }
    })(),
    webgl2: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('webgl2');
      } catch { return false; }
    })(),
    webxr: 'xr' in navigator,
    speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    geolocation: 'geolocation' in navigator,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch { return false; }
    })(),
    indexedDB: 'indexedDB' in window,
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    vibration: 'vibrate' in navigator,
    fullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
    pointerLock: 'pointerLockElement' in document || 'webkitPointerLockElement' in document,
    gamepad: 'getGamepads' in navigator,
    bluetooth: 'bluetooth' in navigator,
    usb: 'usb' in navigator,
    share: 'share' in navigator,
    clipboard: 'clipboard' in navigator,
    wakeLock: 'wakeLock' in navigator,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    cssBackdropFilter: checkCSS('backdrop-filter', 'blur(10px)') || checkCSS('-webkit-backdrop-filter', 'blur(10px)'),
    cssGrid: checkCSS('display', 'grid'),
    cssFlexGap: checkCSS('gap', '1px')
  };
};

// Get cross-browser AudioContext
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  
  try {
    return new AudioContextClass();
  } catch {
    return null;
  }
};

// Get cross-browser SpeechRecognition
export const getSpeechRecognition = (): any | null => {
  if (typeof window === 'undefined') return null;
  
  if ('SpeechRecognition' in window) {
    return (window as any).SpeechRecognition;
  }
  
  if ('webkitSpeechRecognition' in window) {
    return (window as any).webkitSpeechRecognition;
  }
  
  return null;
};

// Cross-browser fullscreen API
export const requestFullscreen = (element: HTMLElement): Promise<void> => {
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    return (element as any).webkitRequestFullscreen();
  } else if ((element as any).mozRequestFullScreen) {
    return (element as any).mozRequestFullScreen();
  } else if ((element as any).msRequestFullscreen) {
    return (element as any).msRequestFullscreen();
  }
  return Promise.reject(new Error('Fullscreen not supported'));
};

export const exitFullscreen = (): Promise<void> => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    return (document as any).webkitExitFullscreen();
  } else if ((document as any).mozCancelFullScreen) {
    return (document as any).mozCancelFullScreen();
  } else if ((document as any).msExitFullscreen) {
    return (document as any).msExitFullscreen();
  }
  return Promise.reject(new Error('Exit fullscreen not supported'));
};

export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

// Cross-browser visibility API
export const getVisibilityState = (): 'visible' | 'hidden' | 'prerender' => {
  if (typeof document === 'undefined') return 'hidden';
  
  if ('visibilityState' in document) {
    return document.visibilityState as 'visible' | 'hidden' | 'prerender';
  } else if ('webkitVisibilityState' in document) {
    return (document as any).webkitVisibilityState;
  } else if ('mozVisibilityState' in document) {
    return (document as any).mozVisibilityState;
  } else if ('msVisibilityState' in document) {
    return (document as any).msVisibilityState;
  }
  return 'visible';
};

// Cross-browser pointer lock
export const requestPointerLock = (element: HTMLElement): void => {
  if (element.requestPointerLock) {
    element.requestPointerLock();
  } else if ((element as any).mozRequestPointerLock) {
    (element as any).mozRequestPointerLock();
  } else if ((element as any).webkitRequestPointerLock) {
    (element as any).webkitRequestPointerLock();
  }
};

export const exitPointerLock = (): void => {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  } else if ((document as any).mozExitPointerLock) {
    (document as any).mozExitPointerLock();
  } else if ((document as any).webkitExitPointerLock) {
    (document as any).webkitExitPointerLock();
  }
};

// Safari-specific fixes
export const applySafariFixes = (): void => {
  const browser = detectBrowser();
  
  if (browser.name === 'safari' || browser.os === 'ios') {
    // Fix for 100vh on iOS Safari
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    
    // Fix for audio context on Safari
    const resumeAudioContext = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    document.addEventListener('touchstart', resumeAudioContext, { once: true });
    document.addEventListener('click', resumeAudioContext, { once: true });
  }
};

// Get browser-specific CSS prefix
export const getCSSPrefix = (): string => {
  const browser = detectBrowser();
  
  switch (browser.engine) {
    case 'webkit': return '-webkit-';
    case 'gecko': return '-moz-';
    case 'blink': return '';
    default: return '';
  }
};

// Check if running in secure context (required for many APIs)
export const isSecureContext = (): boolean => {
  return typeof window !== 'undefined' && window.isSecureContext === true;
};

// Get recommended graphics settings based on browser/device
export const getRecommendedGraphicsSettings = (): {
  pixelRatio: number;
  antialias: boolean;
  shadowQuality: 'none' | 'low' | 'medium' | 'high';
  maxLights: number;
  postProcessing: boolean;
} => {
  const browser = detectBrowser();
  const features = detectFeatures();
  
  // Default settings
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let antialias = true;
  let shadowQuality: 'none' | 'low' | 'medium' | 'high' = 'medium';
  let maxLights = 4;
  let postProcessing = true;
  
  // Mobile optimizations
  if (browser.isMobile) {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    antialias = false;
    shadowQuality = 'low';
    maxLights = 2;
    postProcessing = false;
  }
  
  // Safari/iOS optimizations
  if (browser.name === 'safari' || browser.os === 'ios') {
    antialias = false;
    postProcessing = false;
    shadowQuality = 'low';
  }
  
  // No WebGL2 - reduce quality
  if (!features.webgl2) {
    shadowQuality = 'none';
    postProcessing = false;
  }
  
  return { pixelRatio, antialias, shadowQuality, maxLights, postProcessing };
};

// Initialize all browser fixes
export const initCrossBrowserCompat = (): void => {
  applySafariFixes();
  
  // Log browser info for debugging
  if (process.env.NODE_ENV === 'development') {
    const browser = detectBrowser();
    const features = detectFeatures();
    console.log('[CrossBrowser] Browser:', browser);
    console.log('[CrossBrowser] Features:', features);
  }
};

// Export singleton browser info
let cachedBrowserInfo: BrowserInfo | null = null;
let cachedFeatures: FeatureSupport | null = null;

export const getBrowserInfo = (): BrowserInfo => {
  if (!cachedBrowserInfo) {
    cachedBrowserInfo = detectBrowser();
  }
  return cachedBrowserInfo;
};

export const getFeatureSupport = (): FeatureSupport => {
  if (!cachedFeatures) {
    cachedFeatures = detectFeatures();
  }
  return cachedFeatures;
};
