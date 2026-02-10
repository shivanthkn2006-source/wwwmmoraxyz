// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL SHAPE SHIFTER: Device Form Factor Detection & Hardware Self-Awareness
// Purpose: Give Zoe "self-awareness" of the device she inhabits
// Exotic Hardware: Fridges, Foldables, Flips, IoT, Cars, Kiosks, Watches
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// EXOTIC DEVICE MODES
// ═══════════════════════════════════════════════════════════════════════════════

export type ExoticDeviceMode =
  | 'STANDARD'           // Normal phone/tablet/desktop
  | 'KITCHEN_HUB'        // Samsung Family Hub fridge, Tizen appliances
  | 'CAR_DISPLAY'        // Android Auto, CarPlay, Tesla, etc.
  | 'KIOSK_MODE'         // POS systems, public displays
  | 'SMART_TV'           // WebOS, Tizen TV, Fire TV
  | 'WATCH_FACE'         // WearOS, watchOS web views
  | 'FLIP_FLEX'          // Z Flip half-folded (L-shape mode)
  | 'FOLD_TABLET'        // Z Fold fully open (tablet mode)
  | 'FOLD_COVER'         // Z Fold cover screen
  | 'IOT_DEVICE'         // Generic IoT with limited capabilities
  | 'VR_HEADSET'         // Quest Browser, Vision Pro
  | 'AR_GLASSES';        // Lightweight AR displays

export type FoldState =
  | 'flat'               // Fully open
  | 'half-folded'        // L-shape (Flex mode)
  | 'folded'             // Closed
  | 'tent'               // Tent mode (less common)
  | 'unknown';

export interface ZoeHardwareAwareness {
  // Core Identity - What Zoe knows about her home
  deviceMode: ExoticDeviceMode;
  modeName: string;
  modeDescription: string;
  
  // Foldable State
  foldState: FoldState;
  hingeAngle: number | null;       // 0-180 degrees if available
  isFlexMode: boolean;             // L-shape detected
  
  // IoT/Appliance Detection
  isKitchenHub: boolean;           // Fridge, cooking displays
  isCarDisplay: boolean;           // Automotive head units
  isSmartTV: boolean;              // Large displays with remote
  isWearable: boolean;             // Watch-sized screens
  isVRHeadset: boolean;            // VR/AR headsets
  isIoT: boolean;                  // Generic IoT
  
  // User Agent Analysis
  detectedPlatform: string;        // Tizen, webOS, Android, iOS, etc.
  detectedBrand: string | null;    // Samsung, LG, Tesla, etc.
  detectedModel: string | null;    // Specific model if detectable
  
  // Layout Adaptations (Zoe's auto-fixes)
  adaptations: {
    touchTargetScale: number;      // 1.0 = normal, 1.5 = 150% larger
    voiceControlPosition: 'default' | 'bottom-center' | 'top-right';
    videoFeedPosition: 'full' | 'top-half' | 'picture-in-picture';
    controlsPosition: 'default' | 'bottom-half' | 'sidebar';
    sidebarVisibility: 'auto' | 'always' | 'never';
    fontScale: number;
    buttonSize: 'sm' | 'md' | 'lg' | 'xl';
    enableVoicePriority: boolean;  // Prioritize voice controls
    safeDistanceMode: boolean;     // For devices viewed from distance
  };
  
  // CSS classes for styling
  cssClasses: string;
  
  // Zoe's self-awareness message
  zoeSelfAwareness: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect Samsung Family Hub (Fridge) and other kitchen appliances
 */
const detectKitchenHub = (ua: string): boolean => {
  const kitchenPatterns = [
    'tizen',           // Samsung Tizen OS (fridges, TVs)
    'familyhub',       // Samsung Family Hub fridge
    'smart fridge',    // Generic smart fridge
    'kitchen',         // Kitchen display patterns
    'refrigerator',    // Direct refrigerator mention
    'bixby',           // Samsung Bixby (common on appliances)
  ];
  
  const lowerUA = ua.toLowerCase();
  return kitchenPatterns.some(pattern => lowerUA.includes(pattern));
};

/**
 * Detect automotive head units
 */
const detectCarDisplay = (ua: string): boolean => {
  const carPatterns = [
    'android auto',
    'carplay',
    'tesla',
    'automotive',
    'carlife',         // Baidu CarLife
    'mirrorlink',
    'weblink',
    'head unit',
    'infotainment',
  ];
  
  const lowerUA = ua.toLowerCase();
  
  // Also check for car-like aspect ratios (very wide, low height)
  const isCarAspect = typeof window !== 'undefined' && 
    window.innerWidth >= 800 && 
    window.innerHeight <= 480 &&
    window.innerWidth / window.innerHeight >= 2;
  
  return carPatterns.some(pattern => lowerUA.includes(pattern)) || isCarAspect;
};

/**
 * Detect Smart TVs
 */
const detectSmartTV = (ua: string): boolean => {
  const tvPatterns = [
    'smart-tv',
    'smarttv',
    'webos',           // LG WebOS
    'web0s',
    'netcast',         // LG NetCast
    'hbbtv',           // Hybrid Broadcast Broadband TV
    'viera',           // Panasonic Viera
    'bravia',          // Sony Bravia
    'roku',            // Roku
    'firetv',          // Amazon Fire TV
    'fire tv',
    'appletv',         // Apple TV
    'chromecast',
    'googletv',        // Google TV
    'android tv',
    'tvos',            // Apple tvOS
  ];
  
  const lowerUA = ua.toLowerCase();
  
  // Also check for TV-like dimensions
  const isTVSize = typeof window !== 'undefined' &&
    window.innerWidth >= 1280 &&
    window.innerHeight >= 720 &&
    window.devicePixelRatio <= 2; // TVs usually have lower DPI
  
  return tvPatterns.some(pattern => lowerUA.includes(pattern)) || 
    (isTVSize && window.innerWidth >= 1920);
};

/**
 * Detect wearables (watches)
 */
const detectWearable = (ua: string): boolean => {
  const wearablePatterns = [
    'watch',
    'wearos',
    'wear os',
    'tizen watch',
    'galaxy watch',
    'fitbit',
  ];
  
  const lowerUA = ua.toLowerCase();
  
  // Also check for watch-like dimensions
  const isWatchSize = typeof window !== 'undefined' &&
    window.innerWidth <= 280 &&
    window.innerHeight <= 400;
  
  return wearablePatterns.some(pattern => lowerUA.includes(pattern)) || isWatchSize;
};

/**
 * Detect VR/AR headsets
 */
const detectVRHeadset = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined') return false;
  
  // Check WebXR API
  if ('xr' in navigator) {
    try {
      const xr = (navigator as any).xr;
      const isVRSupported = await xr?.isSessionSupported?.('immersive-vr');
      const isARSupported = await xr?.isSessionSupported?.('immersive-ar');
      if (isVRSupported || isARSupported) return true;
    } catch {
      // WebXR not available
    }
  }
  
  // User agent fallback
  const ua = navigator.userAgent.toLowerCase();
  const vrPatterns = ['oculus', 'quest', 'vive', 'pico', 'vision pro', 'hololens'];
  return vrPatterns.some(pattern => ua.includes(pattern));
};

/**
 * Detect foldable state using various APIs
 */
const detectFoldState = (): { state: FoldState; angle: number | null; isFlexMode: boolean } => {
  if (typeof window === 'undefined') {
    return { state: 'unknown', angle: null, isFlexMode: false };
  }
  
  let angle: number | null = null;
  
  // Method 1: Device Posture API (experimental)
  if ('devicePosture' in navigator) {
    const posture = (navigator as any).devicePosture;
    if (posture?.type) {
      switch (posture.type) {
        case 'continuous':
          return { state: 'flat', angle: 180, isFlexMode: false };
        case 'folded':
          return { state: 'half-folded', angle: posture.angle || 90, isFlexMode: true };
        case 'folded-over':
          return { state: 'folded', angle: 0, isFlexMode: false };
      }
    }
  }
  
  // Method 2: Screen Fold API (Samsung-specific)
  if ('screen' in window && 'fold' in (window.screen as any)) {
    const fold = (window.screen as any).fold;
    if (fold?.posture) {
      const isFlexMode = fold.posture === 'laptop' || fold.posture === 'tent';
      return { 
        state: isFlexMode ? 'half-folded' : 'flat',
        angle: fold.angle || null,
        isFlexMode
      };
    }
  }
  
  // Method 3: Viewport Segments API
  const hasHorizontalFold = window.matchMedia('(horizontal-viewport-segments: 2)').matches;
  const hasVerticalFold = window.matchMedia('(vertical-viewport-segments: 2)').matches;
  
  if (hasHorizontalFold || hasVerticalFold) {
    // Check aspect ratio to determine fold state
    const aspectRatio = window.innerWidth / window.innerHeight;
    
    // Z Flip in Flex Mode typically has aspectRatio close to 1 when half-folded
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
      return { state: 'half-folded', angle: 90, isFlexMode: true };
    }
    
    return { state: 'flat', angle: 180, isFlexMode: false };
  }
  
  // Method 4: Window Controls Overlay (PWA foldables)
  const hasOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
  if (hasOverlay) {
    return { state: 'flat', angle: 180, isFlexMode: false };
  }
  
  // Method 5: Aspect ratio heuristics for known foldables
  const aspectRatio = window.innerWidth / window.innerHeight;
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Z Flip open (very tall - 22:9 aspect)
  if (aspectRatio >= 2.4) {
    return { state: 'flat', angle: 180, isFlexMode: false };
  }
  
  // Z Flip cover screen (small, portrait)
  if (width <= 380 && height <= 400) {
    return { state: 'folded', angle: 0, isFlexMode: false };
  }
  
  // Z Fold open (tablet-ish 6:5 aspect)
  if (width >= 1536 && aspectRatio <= 1.2 && aspectRatio >= 0.8) {
    return { state: 'flat', angle: 180, isFlexMode: false };
  }
  
  // Z Fold cover screen
  if (width >= 280 && width <= 340 && height >= 640) {
    return { state: 'folded', angle: 0, isFlexMode: false };
  }
  
  return { state: 'unknown', angle: null, isFlexMode: false };
};

/**
 * Extract brand and platform from user agent
 */
const extractDeviceInfo = (ua: string): { platform: string; brand: string | null; model: string | null } => {
  const lowerUA = ua.toLowerCase();
  
  // Platform detection
  let platform = 'unknown';
  if (lowerUA.includes('tizen')) platform = 'Tizen';
  else if (lowerUA.includes('webos')) platform = 'webOS';
  else if (lowerUA.includes('tvos')) platform = 'tvOS';
  else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) platform = 'iOS';
  else if (lowerUA.includes('android')) platform = 'Android';
  else if (lowerUA.includes('windows')) platform = 'Windows';
  else if (lowerUA.includes('mac')) platform = 'macOS';
  else if (lowerUA.includes('linux')) platform = 'Linux';
  
  // Brand detection
  let brand: string | null = null;
  if (lowerUA.includes('samsung') || lowerUA.includes('sm-')) brand = 'Samsung';
  else if (lowerUA.includes('lg')) brand = 'LG';
  else if (lowerUA.includes('sony')) brand = 'Sony';
  else if (lowerUA.includes('tesla')) brand = 'Tesla';
  else if (lowerUA.includes('apple') || lowerUA.includes('iphone') || lowerUA.includes('ipad')) brand = 'Apple';
  else if (lowerUA.includes('google') || lowerUA.includes('pixel')) brand = 'Google';
  else if (lowerUA.includes('huawei')) brand = 'Huawei';
  else if (lowerUA.includes('xiaomi')) brand = 'Xiaomi';
  
  // Model detection (simplified)
  let model: string | null = null;
  const samsungMatch = ua.match(/SM-([A-Z]\d{3}[A-Z]?)/i);
  if (samsungMatch) model = `SM-${samsungMatch[1]}`;
  
  const iphoneMatch = ua.match(/iPhone\s*(\d+)?/i);
  if (iphoneMatch) model = iphoneMatch[0];
  
  return { platform, brand, model };
};

/**
 * Determine device mode based on all detections
 */
const determineDeviceMode = (
  isKitchenHub: boolean,
  isCarDisplay: boolean,
  isSmartTV: boolean,
  isWearable: boolean,
  isVRHeadset: boolean,
  foldState: FoldState,
  width: number,
  height: number
): ExoticDeviceMode => {
  // Priority order for mode detection
  if (isVRHeadset) return 'VR_HEADSET';
  if (isKitchenHub) return 'KITCHEN_HUB';
  if (isCarDisplay) return 'CAR_DISPLAY';
  if (isWearable) return 'WATCH_FACE';
  if (isSmartTV) return 'SMART_TV';
  
  // Foldable states
  if (foldState === 'half-folded') return 'FLIP_FLEX';
  if (foldState === 'folded' && width <= 380) return 'FOLD_COVER';
  
  // Check for tablet-sized foldable (Z Fold open)
  if (width >= 1536 && width / height <= 1.2) return 'FOLD_TABLET';
  
  // Kiosk detection (tall portrait displays)
  if (width >= 1000 && height >= 1400 && height > width) return 'KIOSK_MODE';
  
  return 'STANDARD';
};

/**
 * Generate adaptations based on device mode
 */
const generateAdaptations = (mode: ExoticDeviceMode): ZoeHardwareAwareness['adaptations'] => {
  const defaults = {
    touchTargetScale: 1.0,
    voiceControlPosition: 'default' as const,
    videoFeedPosition: 'full' as const,
    controlsPosition: 'default' as const,
    sidebarVisibility: 'auto' as const,
    fontScale: 1.0,
    buttonSize: 'md' as const,
    enableVoicePriority: false,
    safeDistanceMode: false,
  };
  
  switch (mode) {
    case 'KITCHEN_HUB':
      // Fridge: People stand 2 feet away, need larger targets
      return {
        ...defaults,
        touchTargetScale: 1.5,      // 150% larger buttons
        voiceControlPosition: 'bottom-center', // Reachable height
        fontScale: 1.3,
        buttonSize: 'xl',
        enableVoicePriority: true,
        safeDistanceMode: true,
      };
      
    case 'CAR_DISPLAY':
      // Car: Safety-first, minimal interaction, voice priority
      return {
        ...defaults,
        touchTargetScale: 1.8,      // Extra large for safety
        voiceControlPosition: 'bottom-center',
        fontScale: 1.4,
        buttonSize: 'xl',
        enableVoicePriority: true,
        safeDistanceMode: true,
        sidebarVisibility: 'never', // No distractions
      };
      
    case 'FLIP_FLEX':
      // Z Flip Flex Mode: Split screen - video top, controls bottom
      return {
        ...defaults,
        touchTargetScale: 1.0,
        videoFeedPosition: 'top-half',
        controlsPosition: 'bottom-half',
        fontScale: 0.95,
        buttonSize: 'md',
      };
      
    case 'FOLD_TABLET':
      // Z Fold Tablet Mode: Wide screen, always-visible sidebar
      return {
        ...defaults,
        touchTargetScale: 1.0,
        sidebarVisibility: 'always',
        fontScale: 1.05,
        buttonSize: 'md',
      };
      
    case 'FOLD_COVER':
      // Z Fold Cover: Tiny screen, compact everything
      return {
        ...defaults,
        touchTargetScale: 1.2,
        fontScale: 0.85,
        buttonSize: 'sm',
        sidebarVisibility: 'never',
      };
      
    case 'SMART_TV':
      // TV: Remote navigation, large text, high contrast
      return {
        ...defaults,
        touchTargetScale: 2.0,
        voiceControlPosition: 'top-right',
        fontScale: 1.5,
        buttonSize: 'xl',
        enableVoicePriority: true,
        safeDistanceMode: true,
        sidebarVisibility: 'always',
      };
      
    case 'WATCH_FACE':
      // Watch: Tiny, touch-only, minimal UI
      return {
        ...defaults,
        touchTargetScale: 1.3,
        fontScale: 0.75,
        buttonSize: 'lg', // Larger relative to tiny screen
        sidebarVisibility: 'never',
      };
      
    case 'VR_HEADSET':
      // VR: Gesture-based, large targets, minimal text
      return {
        ...defaults,
        touchTargetScale: 1.5,
        fontScale: 1.2,
        buttonSize: 'xl',
        enableVoicePriority: true,
      };
      
    case 'KIOSK_MODE':
      // Kiosk: Public use, large targets, accessible
      return {
        ...defaults,
        touchTargetScale: 1.4,
        voiceControlPosition: 'bottom-center',
        fontScale: 1.2,
        buttonSize: 'xl',
      };
      
    case 'IOT_DEVICE':
      // IoT: Limited capabilities, minimal UI
      return {
        ...defaults,
        touchTargetScale: 1.2,
        fontScale: 1.0,
        buttonSize: 'lg',
        sidebarVisibility: 'never',
      };
      
    default:
      return defaults;
  }
};

/**
 * Generate Zoe's self-awareness message
 */
const generateZoeSelfAwareness = (mode: ExoticDeviceMode, brand: string | null, model: string | null): string => {
  const deviceName = model || brand || 'this device';
  
  switch (mode) {
    case 'KITCHEN_HUB':
      return `I'm living in your kitchen on ${brand || 'a smart'} appliance. I've enlarged all touch targets and moved voice controls to a reachable height. Let's cook something up! 🍳`;
    case 'CAR_DISPLAY':
      return `I'm riding with you in ${brand || 'your'} vehicle. Safety first - I've maximized button sizes and enabled voice priority. Keep your eyes on the road! 🚗`;
    case 'FLIP_FLEX':
      return `I see you're in Flex Mode on ${brand || 'your foldable'}. Video is on top, controls are on bottom - perfect for hands-free viewing! 📱`;
    case 'FOLD_TABLET':
      return `Tablet mode activated on ${brand || 'your foldable'}! I've enabled the always-visible sidebar for enhanced navigation. 📖`;
    case 'FOLD_COVER':
      return `I'm on the cover screen of ${brand || 'your foldable'}. Compact mode engaged - only essentials here! 📲`;
    case 'SMART_TV':
      return `I'm on your ${brand || 'smart'} TV! Large text, voice priority, and remote-friendly navigation are active. Sit back and relax! 📺`;
    case 'WATCH_FACE':
      return `I'm on your wrist! Minimal UI mode engaged - only the essentials fit here. ⌚`;
    case 'VR_HEADSET':
      return `I'm in your headset! Gesture-optimized controls and spatial UI are active. Welcome to the immersive experience! 🥽`;
    case 'KIOSK_MODE':
      return `Kiosk mode detected. Public-friendly interface with large, accessible controls is active. 🖥️`;
    case 'IOT_DEVICE':
      return `I'm running on an IoT device. Lightweight mode with essential features only. 🔌`;
    default:
      return `I'm running on ${deviceName}. Standard mode active - full features available! ✨`;
  }
};

/**
 * Generate CSS classes for device mode
 */
const generateCSSClasses = (mode: ExoticDeviceMode, foldState: FoldState, adaptations: ZoeHardwareAwareness['adaptations']): string => {
  const classes: string[] = [
    `device-${mode.toLowerCase().replace(/_/g, '-')}`,
    `fold-${foldState}`,
  ];
  
  if (adaptations.safeDistanceMode) classes.push('safe-distance');
  if (adaptations.enableVoicePriority) classes.push('voice-priority');
  if (adaptations.sidebarVisibility === 'always') classes.push('sidebar-always');
  if (adaptations.sidebarVisibility === 'never') classes.push('sidebar-never');
  if (adaptations.touchTargetScale >= 1.5) classes.push('touch-xl');
  if (adaptations.videoFeedPosition === 'top-half') classes.push('video-top-half');
  if (adaptations.controlsPosition === 'bottom-half') classes.push('controls-bottom-half');
  
  return classes.join(' ');
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK: useDeviceFormFactor
// ═══════════════════════════════════════════════════════════════════════════════

export const useDeviceFormFactor = (): ZoeHardwareAwareness => {
  const [awareness, setAwareness] = useState<ZoeHardwareAwareness>(() => getInitialState());
  
  const detectDevice = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Detect exotic devices
    const isKitchenHub = detectKitchenHub(ua);
    const isCarDisplay = detectCarDisplay(ua);
    const isSmartTV = detectSmartTV(ua);
    const isWearable = detectWearable(ua);
    const isVRHeadset = await detectVRHeadset();
    
    // Detect fold state
    const { state: foldState, angle: hingeAngle, isFlexMode } = detectFoldState();
    
    // Extract device info
    const { platform, brand, model } = extractDeviceInfo(ua);
    
    // Determine mode
    const deviceMode = determineDeviceMode(
      isKitchenHub,
      isCarDisplay,
      isSmartTV,
      isWearable,
      isVRHeadset,
      foldState,
      width,
      height
    );
    
    // Generate adaptations
    const adaptations = generateAdaptations(deviceMode);
    
    // Mode name and description
    const modeNames: Record<ExoticDeviceMode, { name: string; description: string }> = {
      STANDARD: { name: 'Standard', description: 'Normal phone, tablet, or desktop' },
      KITCHEN_HUB: { name: 'Kitchen Hub', description: 'Smart refrigerator or cooking display' },
      CAR_DISPLAY: { name: 'Car Display', description: 'Automotive head unit or infotainment' },
      KIOSK_MODE: { name: 'Kiosk', description: 'Public or point-of-sale display' },
      SMART_TV: { name: 'Smart TV', description: 'Television or large display' },
      WATCH_FACE: { name: 'Watch', description: 'Smartwatch or wearable' },
      FLIP_FLEX: { name: 'Flex Mode', description: 'Foldable in L-shape position' },
      FOLD_TABLET: { name: 'Tablet Mode', description: 'Foldable fully open' },
      FOLD_COVER: { name: 'Cover Screen', description: 'Foldable outer display' },
      IOT_DEVICE: { name: 'IoT', description: 'Internet of Things device' },
      VR_HEADSET: { name: 'VR/AR', description: 'Virtual or augmented reality headset' },
      AR_GLASSES: { name: 'AR Glasses', description: 'Lightweight augmented reality display' },
    };
    
    const { name: modeName, description: modeDescription } = modeNames[deviceMode];
    
    // Generate CSS classes
    const cssClasses = generateCSSClasses(deviceMode, foldState, adaptations);
    
    // Generate Zoe's self-awareness message
    const zoeSelfAwareness = generateZoeSelfAwareness(deviceMode, brand, model);
    
    const newAwareness: ZoeHardwareAwareness = {
      deviceMode,
      modeName,
      modeDescription,
      foldState,
      hingeAngle,
      isFlexMode,
      isKitchenHub,
      isCarDisplay,
      isSmartTV,
      isWearable,
      isVRHeadset,
      isIoT: deviceMode === 'IOT_DEVICE',
      detectedPlatform: platform,
      detectedBrand: brand,
      detectedModel: model,
      adaptations,
      cssClasses,
      zoeSelfAwareness,
    };
    
    setAwareness(newAwareness);
    
    // Log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ShapeShifter] Device Mode: ${deviceMode}, Fold: ${foldState}, Brand: ${brand || 'Unknown'}`);
      console.log(`[ShapeShifter] Zoe says: "${zoeSelfAwareness}"`);
    }
  }, []);
  
  // Initial detection and event listeners
  useEffect(() => {
    detectDevice();
    
    // Re-detect on resize (fold/unfold changes dimensions)
    window.addEventListener('resize', detectDevice);
    
    // Re-detect on orientation change
    window.addEventListener('orientationchange', detectDevice);
    
    // Listen for fold state changes (Device Posture API)
    if ('devicePosture' in navigator) {
      (navigator as any).devicePosture.addEventListener('change', detectDevice);
    }
    
    // Listen for viewport segment changes (foldables)
    const hingeQueryH = window.matchMedia('(horizontal-viewport-segments: 2)');
    const hingeQueryV = window.matchMedia('(vertical-viewport-segments: 2)');
    hingeQueryH.addEventListener?.('change', detectDevice);
    hingeQueryV.addEventListener?.('change', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
      if ('devicePosture' in navigator) {
        (navigator as any).devicePosture.removeEventListener('change', detectDevice);
      }
      hingeQueryH.removeEventListener?.('change', detectDevice);
      hingeQueryV.removeEventListener?.('change', detectDevice);
    };
  }, [detectDevice]);
  
  return awareness;
};

/**
 * Initial state for SSR
 */
function getInitialState(): ZoeHardwareAwareness {
  return {
    deviceMode: 'STANDARD',
    modeName: 'Standard',
    modeDescription: 'Normal phone, tablet, or desktop',
    foldState: 'unknown',
    hingeAngle: null,
    isFlexMode: false,
    isKitchenHub: false,
    isCarDisplay: false,
    isSmartTV: false,
    isWearable: false,
    isVRHeadset: false,
    isIoT: false,
    detectedPlatform: 'unknown',
    detectedBrand: null,
    detectedModel: null,
    adaptations: {
      touchTargetScale: 1.0,
      voiceControlPosition: 'default',
      videoFeedPosition: 'full',
      controlsPosition: 'default',
      sidebarVisibility: 'auto',
      fontScale: 1.0,
      buttonSize: 'md',
      enableVoicePriority: false,
      safeDistanceMode: false,
    },
    cssClasses: 'device-standard fold-unknown',
    zoeSelfAwareness: 'Initializing hardware awareness...',
  };
}

export default useDeviceFormFactor;
