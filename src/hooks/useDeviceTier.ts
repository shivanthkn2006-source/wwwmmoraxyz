// ═══════════════════════════════════════════════════════════════════════════════
// LIQUID SCALABILITY ENGINE - Adaptive Tiered Rendering System
// Hardware Profiling + Real-time Performance Scaling for iPhone SE → iPhone 19 Pro Max
// SILENT DOWNGRADE PROTOCOL: Automatic mode switching for low-memory devices
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ═══ DEVICE TIER DEFINITIONS ═══
export type DeviceTier = 'C' | 'B' | 'A' | 'S';

// Memory thresholds (Safari on iPhone 11 crashes at ~200MB)
const MEMORY_THRESHOLDS = {
  CRITICAL: 150 * 1024 * 1024,  // 150MB - Force Lite Mode
  WARNING: 100 * 1024 * 1024,   // 100MB - Disable 3D
  SAFE: 50 * 1024 * 1024,       // 50MB - Normal operation
};

// Low-power device indicators
const LOW_POWER_INDICATORS = {
  maxCores: 6,              // iPhone 11 has 6 cores
  maxGPUScore: 65,          // A13 chip threshold
  safariMemoryLimit: true,  // Safari has strict limits
};

export interface TierCapabilities {
  tier: DeviceTier;
  tierName: string;
  
  // Display
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isHighRefreshRate: boolean;
  refreshRate: number;
  
  // Hardware
  gpuScore: number;
  memoryEstimate: 'low' | 'medium' | 'high' | 'ultra';
  coreCount: number;
  
  // Features
  enableBlur: boolean;
  enableParticles: boolean;
  particleCount: number;
  enable3DAnimations: boolean;
  enableGlassmorphism: boolean;
  enableWebGL: boolean;
  enableShadows: boolean;
  enableGodRays: boolean;
  maxFPS: number;
  
  // Layout
  forceCompact: boolean;
  reducedMotion: boolean;
  liteMode: boolean;
  
  // Device Info
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  deviceModel: string;
  
  // SILENT DOWNGRADE: New memory management flags
  isLowPowerDevice: boolean;
  useMapbox2D: boolean;        // Use 2D map instead of 3D globe
  disablePostProcessing: boolean;
  limitAnimationFPS: boolean;
  aggressiveMemoryCleanup: boolean;
}

// ═══ TIER CONFIGURATIONS ═══
const TIER_CONFIGS: Record<DeviceTier, Partial<TierCapabilities>> = {
  // Tier C - Legacy/SE: iPhone SE, iPhone 11, older Android, low-end devices
  // OPTIMIZED: Still enable basic WebGL for globe rendering, but with reduced features
  C: {
    tierName: 'Legacy',
    enableBlur: false,
    enableParticles: false,      // Disabled for memory
    particleCount: 0,            // Zero particles
    enable3DAnimations: false,
    enableGlassmorphism: false,
    enableWebGL: true,           // FIXED: Enable WebGL (required for globe)
    enableShadows: false,
    enableGodRays: false,
    maxFPS: 30,
    forceCompact: true,
    liteMode: true,
    memoryEstimate: 'low',
    // SILENT DOWNGRADE flags
    isLowPowerDevice: true,
    useMapbox2D: false,          // FIXED: Keep 3D globe (simpler version)
    disablePostProcessing: true,
    limitAnimationFPS: true,
    aggressiveMemoryCleanup: true,
  },
  // Tier B - Standard: iPhone 12/13, mid-range Android
  B: {
    tierName: 'Standard',
    enableBlur: true,
    enableParticles: true,
    particleCount: 300,          // Reduced from 500
    enable3DAnimations: true,
    enableGlassmorphism: true,
    enableWebGL: true,
    enableShadows: true,
    enableGodRays: false,
    maxFPS: 60,
    forceCompact: false,
    liteMode: false,
    memoryEstimate: 'medium',
    isLowPowerDevice: false,
    useMapbox2D: false,
    disablePostProcessing: false,
    limitAnimationFPS: false,
    aggressiveMemoryCleanup: false,
  },
  // Tier A - Pro: iPhone 14/15 Pro, flagship Android
  A: {
    tierName: 'Pro',
    enableBlur: true,
    enableParticles: true,
    particleCount: 800,          // Reduced from 1000
    enable3DAnimations: true,
    enableGlassmorphism: true,
    enableWebGL: true,
    enableShadows: true,
    enableGodRays: true,
    maxFPS: 120,
    forceCompact: false,
    liteMode: false,
    memoryEstimate: 'high',
    isLowPowerDevice: false,
    useMapbox2D: false,
    disablePostProcessing: false,
    limitAnimationFPS: false,
    aggressiveMemoryCleanup: false,
  },
  // Tier S - God/Ultra: iPhone 16+ Pro Max, future devices
  S: {
    tierName: 'God',
    enableBlur: true,
    enableParticles: true,
    particleCount: 1500,         // Reduced from 2000
    enable3DAnimations: true,
    enableGlassmorphism: true,
    enableWebGL: true,
    enableShadows: true,
    enableGodRays: true,
    maxFPS: 120,
    forceCompact: false,
    liteMode: false,
    memoryEstimate: 'ultra',
    isLowPowerDevice: false,
    useMapbox2D: false,
    disablePostProcessing: false,
    limitAnimationFPS: false,
    aggressiveMemoryCleanup: false,
  },
};

// ═══ HARDWARE DETECTION ═══

// SILENT DOWNGRADE: Check if device is low-power (iPhone 11 and below)
const detectIsLowPowerDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const coreCount = navigator.hardwareConcurrency || 4;
  
  // iPhone 11 and older detection
  if (/iphone/.test(ua)) {
    // iPhone 11 and older have 6 or fewer cores
    if (coreCount <= LOW_POWER_INDICATORS.maxCores) {
      // Check for specific older models
      const oldModels = ['iphone 11', 'iphone x', 'iphone 8', 'iphone 7', 'iphone 6', 'iphone se'];
      if (oldModels.some(model => ua.includes(model))) {
        console.log('[DeviceTier] SILENT DOWNGRADE: Low-power iPhone detected');
        return true;
      }
    }
    // Pro models are safe
    if (ua.includes('pro')) return false;
  }
  
  // Android low-end detection
  if (/android/.test(ua)) {
    // Check RAM via deviceMemory API (if available)
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory && deviceMemory <= 4) {
      console.log('[DeviceTier] SILENT DOWNGRADE: Low-memory Android detected');
      return true;
    }
  }
  
  // Safari-specific memory limits
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  if (isSafari && coreCount <= 6) {
    console.log('[DeviceTier] SILENT DOWNGRADE: Safari with limited cores');
    return true;
  }
  
  return false;
};

// Check current memory pressure (Chrome only, fallback for others)
const detectMemoryPressure = (): 'low' | 'medium' | 'high' | 'critical' => {
  if (typeof window === 'undefined') return 'medium';
  
  const performance = window.performance as any;
  const memory = performance?.memory;
  
  if (memory) {
    const usedHeap = memory.usedJSHeapSize;
    if (usedHeap > MEMORY_THRESHOLDS.CRITICAL) return 'critical';
    if (usedHeap > MEMORY_THRESHOLDS.WARNING) return 'high';
    if (usedHeap > MEMORY_THRESHOLDS.SAFE) return 'medium';
    return 'low';
  }
  
  // Safari doesn't expose memory API, use heuristics
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  if (isSafari) {
    const coreCount = navigator.hardwareConcurrency || 4;
    if (coreCount <= 6) return 'high'; // Assume high pressure on older Safari
  }
  
  return 'medium';
};

const detectGPUScore = (): number => {
  if (typeof window === 'undefined') return 50;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 20;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 40;
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    
    // Cleanup canvas immediately to save memory
    canvas.width = 1;
    canvas.height = 1;
    
    // High-end GPU detection
    if (renderer.includes('apple gpu') || renderer.includes('apple m')) {
      // Apple Silicon detection
      if (renderer.includes('m2') || renderer.includes('m3') || renderer.includes('m4')) return 100;
      if (renderer.includes('a17') || renderer.includes('a16') || renderer.includes('a15')) return 95;
      if (renderer.includes('a14')) return 80;
      if (renderer.includes('a13')) return 60; // iPhone 11 - DOWNGRADE
      if (renderer.includes('a12') || renderer.includes('a11')) return 45; // Even older
      return 55;
    }
    
    if (renderer.includes('adreno 7') || renderer.includes('adreno 6')) return 85;
    if (renderer.includes('mali-g7') || renderer.includes('mali-g6')) return 80;
    if (renderer.includes('nvidia') || renderer.includes('radeon')) return 90;
    
    // Low-end detection
    if (renderer.includes('adreno 5') || renderer.includes('mali-g5')) return 45;
    if (renderer.includes('powervr') || renderer.includes('intel')) return 35;
    
    return 55;
  } catch {
    return 40;
  }
};

const detectRefreshRate = (): { isHigh: boolean; rate: number } => {
  if (typeof window === 'undefined') return { isHigh: false, rate: 60 };
  
  // Check for high refresh rate displays
  const screenRate = (window.screen as any).refreshRate || 60;
  
  // Heuristic: Modern Pro iPhones and flagships have 120Hz
  const ua = navigator.userAgent.toLowerCase();
  const isProDevice = ua.includes('iphone') && 
    (ua.includes('14 pro') || ua.includes('15 pro') || ua.includes('16') || ua.includes('17') || ua.includes('18') || ua.includes('19'));
  
  if (isProDevice || screenRate > 60) {
    return { isHigh: true, rate: 120 };
  }
  
  return { isHigh: false, rate: 60 };
};

const detectDeviceModel = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  
  // iOS detection
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone\s*(\d+)/);
    if (match) return `iPhone ${match[1]}`;
    if (/iPhone\s*SE/.test(ua)) return 'iPhone SE';
    return 'iPhone';
  }
  
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/;\s*([^;]+)\s+Build/);
    return match ? match[1].trim() : 'Android';
  }
  
  return 'Desktop';
};

const detectCoreCount = (): number => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4;
};

const detectReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// ═══ TIER CALCULATION ═══
const calculateTier = (
  screenWidth: number,
  screenHeight: number,
  pixelRatio: number,
  gpuScore: number,
  coreCount: number,
  isHighRefreshRate: boolean,
  isSafari: boolean = false // FIX 2: THE SAFARI CAP - Add Safari detection
): DeviceTier => {
  // Tier C: Small screens or low GPU
  if (screenWidth < 380 || gpuScore < 35 || coreCount <= 2) {
    return 'C';
  }
  
  // Tier B: Standard devices
  if (screenWidth < 430 || gpuScore < 65 || coreCount <= 4) {
    return 'B';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FIX 2: THE SAFARI CAP - Prevent "God Mode" overload on Safari/Mac
  // Safari's WebGL engine is less efficient than Chrome's. Even on M1 Max,
  // the "God Mode" particle effects (1500+) are too heavy for Safari's memory
  // limit, causing thermal throttle. Cap Safari at Tier A (High) max.
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSafari) {
    // Safari cannot handle Tier S (God Mode) - cap at Tier A
    const wouldBeTierS = isHighRefreshRate && gpuScore >= 90 && screenWidth >= 430 && pixelRatio >= 3;
    if (wouldBeTierS) {
      console.log('[DeviceTier] SAFARI CAP: Capped from Tier S (God) → Tier A (Pro) for Safari thermal safety');
      return 'A';
    }
    
    // Also cap particle counts for Safari - already handled by tier, but log it
    console.log('[DeviceTier] Safari detected - WebGL optimizations enabled');
  }
  
  // Tier S: God tier - high refresh + high GPU + large screen
  if (isHighRefreshRate && gpuScore >= 90 && screenWidth >= 430 && pixelRatio >= 3) {
    return 'S';
  }
  
  // Tier A: Pro devices
  if (gpuScore >= 75 || isHighRefreshRate) {
    return 'A';
  }
  
  return 'B';
};

// ═══ MAIN HOOK ═══
export const useDeviceTier = () => {
  const [capabilities, setCapabilities] = useState<TierCapabilities | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const fpsHistoryRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const capabilitiesRef = useRef<TierCapabilities | null>(null);

  // Keep a stable ref to the latest capabilities for RAF callbacks
  useEffect(() => {
    capabilitiesRef.current = capabilities;
  }, [capabilities]);

  // Detect device capabilities
  const detectCapabilities = useCallback((): TierCapabilities => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const gpuScore = detectGPUScore();
    const { isHigh: isHighRefreshRate, rate: refreshRate } = detectRefreshRate();
    const coreCount = detectCoreCount();
    const reducedMotion = detectReducedMotion();
    const deviceModel = detectDeviceModel();

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(ua);
    const isTablet = /ipad/.test(ua) || (isMobile && screenWidth >= 768);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
    
    // SILENT DOWNGRADE: Detect low-power devices
    const isLowPowerDevice = detectIsLowPowerDevice();
    const memoryPressure = detectMemoryPressure();

    // Calculate tier - force Tier C for low-power devices or high memory pressure
    let tier: DeviceTier;
    if (reducedMotion || isLowPowerDevice || memoryPressure === 'critical') {
      tier = 'C';
      console.log(`[DeviceTier] SILENT DOWNGRADE: Forced to Tier C (lowPower: ${isLowPowerDevice}, memPressure: ${memoryPressure})`);
    } else if (memoryPressure === 'high') {
      tier = 'B';
      console.log(`[DeviceTier] SILENT DOWNGRADE: Limited to Tier B (memPressure: ${memoryPressure})`);
    } else {
      tier = calculateTier(
        screenWidth,
        screenHeight,
        pixelRatio,
        gpuScore,
        coreCount,
        isHighRefreshRate,
        isSafari // FIX 2: Pass Safari flag for tier capping
      );
    }

    const tierConfig = TIER_CONFIGS[tier];

    return {
      tier,
      tierName: tierConfig.tierName || 'Unknown',
      screenWidth,
      screenHeight,
      pixelRatio,
      isHighRefreshRate,
      refreshRate,
      gpuScore,
      memoryEstimate: tierConfig.memoryEstimate || 'medium',
      coreCount,
      enableBlur: tierConfig.enableBlur ?? true,
      enableParticles: tierConfig.enableParticles ?? true,
      particleCount: tierConfig.particleCount ?? 500,
      enable3DAnimations: tierConfig.enable3DAnimations ?? true,
      enableGlassmorphism: tierConfig.enableGlassmorphism ?? true,
      enableWebGL: tierConfig.enableWebGL ?? true,
      enableShadows: tierConfig.enableShadows ?? true,
      enableGodRays: tierConfig.enableGodRays ?? false,
      maxFPS: tierConfig.maxFPS ?? 60,
      forceCompact: tierConfig.forceCompact ?? false,
      reducedMotion,
      liteMode: tierConfig.liteMode ?? false,
      isMobile,
      isTablet,
      isIOS,
      isAndroid,
      isSafari,
      deviceModel,
      // SILENT DOWNGRADE: New memory management flags
      isLowPowerDevice: tierConfig.isLowPowerDevice ?? isLowPowerDevice,
      useMapbox2D: tierConfig.useMapbox2D ?? (tier === 'C'),
      disablePostProcessing: tierConfig.disablePostProcessing ?? (tier === 'C'),
      limitAnimationFPS: tierConfig.limitAnimationFPS ?? (tier === 'C'),
      aggressiveMemoryCleanup: tierConfig.aggressiveMemoryCleanup ?? (tier === 'C'),
    };
  }, []);

  // FPS monitoring for dynamic tier adjustment - MOBILE OPTIMIZED: Reduced frequency
  const startFPSMonitoring = useCallback(() => {
    // MOBILE OPTIMIZATION: Skip FPS monitoring on low-power devices to save battery
    const currentCaps = capabilitiesRef.current;
    if (currentCaps?.isLowPowerDevice || currentCaps?.tier === 'C') {
      console.log('[DeviceTier] Skipping FPS monitoring on low-power device');
      return () => {};
    }
    
    // Sample FPS every 30 seconds instead of 10 seconds to reduce CPU usage
    const intervalId = setInterval(() => {
      let frameCount = 0;
      let lastTime = performance.now();
      let rafId: number;
      
      const countFrames = () => {
        frameCount++;
        const now = performance.now();
        
        if (now - lastTime >= 1000) {
          const fps = frameCount;
          fpsHistoryRef.current.push(fps);

          // Keep last 3 samples (reduced from 5)
          if (fpsHistoryRef.current.length > 3) {
            fpsHistoryRef.current.shift();
          }

          const caps = capabilitiesRef.current;
          const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;

          if (avgFps < 25 && caps && caps.tier !== 'C') {
            console.log(`[DeviceTier] FPS drop detected (${avgFps.toFixed(0)}), considering downgrade`);
            setCapabilities((prev) => {
              if (!prev) return prev;
              const newTier: DeviceTier = prev.tier === 'S' ? 'A' : prev.tier === 'A' ? 'B' : 'C';
              return { ...prev, ...TIER_CONFIGS[newTier], tier: newTier } as TierCapabilities;
            });
          }
          cancelAnimationFrame(rafId);
          return; // Stop after 1 second measurement
        }
        
        rafId = requestAnimationFrame(countFrames);
      };
      
      rafId = requestAnimationFrame(countFrames);
    }, 30000); // Every 30 seconds instead of 10 seconds

    return intervalId;
  }, []);

  // Initial detection (run once, with session caching)
  useEffect(() => {
    // Check session cache first
    try {
      const cached = sessionStorage.getItem('mmora_device_tier');
      if (cached) {
        const caps = JSON.parse(cached) as TierCapabilities;
        setCapabilities(caps);
        setIsDetecting(false);
        console.log(`[DeviceTier] Loaded from cache: Tier ${caps.tier}`);
        return;
      }
    } catch {
      // Ignore cache errors
    }

    const caps = detectCapabilities();
    setCapabilities(caps);
    setIsDetecting(false);

    // Store in sessionStorage
    try {
      sessionStorage.setItem('mmora_device_tier', JSON.stringify(caps));
    } catch {
      // Ignore storage errors
    }

    console.log(`[DeviceTier] Detected: Tier ${caps.tier} (${caps.tierName}) | GPU: ${caps.gpuScore} | ${caps.deviceModel}`);

    // Start FPS monitoring (delayed)
    const intervalId = setTimeout(() => startFPSMonitoring(), 5000);

    return () => {
      clearTimeout(intervalId);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [detectCapabilities, startFPSMonitoring]);

  // Listen for orientation changes
  useEffect(() => {
    const handleResize = () => {
      if (capabilitiesRef.current) {
        setCapabilities((prev) => ({
          ...prev!,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          forceCompact: window.innerWidth < 380 || prev?.forceCompact || false,
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // CSS class generator
  const tierClasses = useMemo(() => {
    if (!capabilities) return '';
    
    const classes: string[] = [`tier-${capabilities.tier.toLowerCase()}`];
    
    if (capabilities.liteMode) classes.push('lite-mode');
    if (capabilities.forceCompact) classes.push('compact-mode');
    if (!capabilities.enableBlur) classes.push('no-blur');
    if (!capabilities.enableGlassmorphism) classes.push('no-glass');
    if (capabilities.reducedMotion) classes.push('reduced-motion');
    if (capabilities.isMobile) classes.push('is-mobile');
    if (capabilities.isIOS) classes.push('is-ios');
    if (capabilities.isSafari) classes.push('is-safari');
    
    return classes.join(' ');
  }, [capabilities]);
  
  // Manual tier override
  const setTierOverride = useCallback((tier: DeviceTier) => {
    setCapabilities(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...TIER_CONFIGS[tier],
        tier,
      } as TierCapabilities;
    });
  }, []);
  
  return {
    capabilities,
    tier: capabilities?.tier || 'B',
    tierClasses,
    isDetecting,
    setTierOverride,
    // Quick access helpers
    isLiteMode: capabilities?.liteMode ?? false,
    isCompact: capabilities?.forceCompact ?? false,
    enableBlur: capabilities?.enableBlur ?? true,
    enableParticles: capabilities?.enableParticles ?? true,
    particleCount: capabilities?.particleCount ?? 500,
    enable3DAnimations: capabilities?.enable3DAnimations ?? true,
    enableGlassmorphism: capabilities?.enableGlassmorphism ?? true,
    maxFPS: capabilities?.maxFPS ?? 60,
    // SILENT DOWNGRADE: Quick access helpers
    isLowPowerDevice: capabilities?.isLowPowerDevice ?? false,
    useMapbox2D: capabilities?.useMapbox2D ?? false,
    disablePostProcessing: capabilities?.disablePostProcessing ?? false,
    aggressiveMemoryCleanup: capabilities?.aggressiveMemoryCleanup ?? false,
  };
};

// ═══ GPU ACCELERATION UTILITIES ═══
export const GPU_ACCELERATED_STYLE: React.CSSProperties = {
  transform: 'translate3d(0, 0, 0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

export const applyGPUAcceleration = (element: HTMLElement | null) => {
  if (!element) return;
  element.style.transform = 'translate3d(0, 0, 0)';
  element.style.willChange = 'transform';
  element.style.backfaceVisibility = 'hidden';
};

export default useDeviceTier;
