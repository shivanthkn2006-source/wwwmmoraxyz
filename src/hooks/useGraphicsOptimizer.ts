// ═══════════════════════════════════════════════════════════════════════════════
// GPU TIER DETECTION & GRAPHICS OPTIMIZER - Ready Player One Performance Scaling
// Automatically detects device capabilities and configures optimal graphics settings
// UPGRADED: Cross-browser WebGL safety with graceful degradation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { detectWebGLCapabilities, type WebGLCapabilities } from './useWebGLCapabilities';

export type GPUTier = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsConfig {
  // Tier info
  tier: GPUTier;
  isMobile: boolean;
  
  // WebGL Status
  webglSupported: boolean;
  webgl2Supported: boolean;
  
  // Post-Processing
  enableBloom: boolean;
  bloomIntensity: number;
  enableChromaticAberration: boolean;
  chromaticAberrationOffset: number;
  enableFilmGrain: boolean;
  filmGrainIntensity: number;
  enableGodRays: boolean;
  enableVignette: boolean;
  
  // Shadows
  shadowMapSize: number;
  enableShadows: boolean;
  shadowType: THREE.ShadowMapType;
  
  // Anti-aliasing
  enableAntialias: boolean;
  antialiasType: 'none' | 'fxaa' | 'smaa';
  
  // Scene Quality
  maxInstances: number;
  lodBias: number;
  textureQuality: 'low' | 'medium' | 'high';
  
  // Fog & Atmosphere
  fogDensity: number;
  enableVolumetricFog: boolean;
  
  // Performance
  pixelRatio: number;
  maxFPS: number;
}

// Default configs for each tier
const TIER_CONFIGS: Record<GPUTier, Omit<GraphicsConfig, 'tier' | 'isMobile' | 'webglSupported' | 'webgl2Supported'>> = {
  low: {
    enableBloom: false,
    bloomIntensity: 0,
    enableChromaticAberration: false,
    chromaticAberrationOffset: 0,
    enableFilmGrain: false,
    filmGrainIntensity: 0,
    enableGodRays: false,
    enableVignette: false,
    shadowMapSize: 512,
    enableShadows: false,
    shadowType: THREE.BasicShadowMap,
    enableAntialias: false,
    antialiasType: 'none',
    maxInstances: 100,
    lodBias: 2,
    textureQuality: 'low',
    fogDensity: 0.015,
    enableVolumetricFog: false,
    pixelRatio: 1,
    maxFPS: 30,
  },
  medium: {
    enableBloom: true,
    bloomIntensity: 0.8,
    enableChromaticAberration: false,
    chromaticAberrationOffset: 0,
    enableFilmGrain: false,
    filmGrainIntensity: 0,
    enableGodRays: false,
    enableVignette: true,
    shadowMapSize: 1024,
    enableShadows: true,
    shadowType: THREE.PCFShadowMap,
    enableAntialias: true,
    antialiasType: 'fxaa',
    maxInstances: 300,
    lodBias: 1,
    textureQuality: 'medium',
    fogDensity: 0.012,
    enableVolumetricFog: false,
    pixelRatio: 1.5,
    maxFPS: 60,
  },
  high: {
    enableBloom: true,
    bloomIntensity: 1.2,
    enableChromaticAberration: true,
    chromaticAberrationOffset: 0.002,
    enableFilmGrain: true,
    filmGrainIntensity: 0.1,
    enableGodRays: true,
    enableVignette: true,
    shadowMapSize: 2048,
    enableShadows: true,
    shadowType: THREE.PCFSoftShadowMap,
    enableAntialias: true,
    antialiasType: 'smaa',
    maxInstances: 500,
    lodBias: 0,
    textureQuality: 'high',
    fogDensity: 0.008,
    enableVolumetricFog: true,
    pixelRatio: 2,
    maxFPS: 60,
  },
  ultra: {
    enableBloom: true,
    bloomIntensity: 1.5,
    enableChromaticAberration: true,
    chromaticAberrationOffset: 0.003,
    enableFilmGrain: true,
    filmGrainIntensity: 0.15,
    enableGodRays: true,
    enableVignette: true,
    shadowMapSize: 4096,
    enableShadows: true,
    shadowType: THREE.PCFSoftShadowMap,
    enableAntialias: true,
    antialiasType: 'smaa',
    maxInstances: 1000,
    lodBias: 0,
    textureQuality: 'high',
    fogDensity: 0.006,
    enableVolumetricFog: true,
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
    maxFPS: 120,
  },
};

// Map WebGL capabilities to GPU tier
const mapCapabilitiesToTier = (caps: WebGLCapabilities): GPUTier => {
  if (!caps.canRender3D) return 'low';
  
  switch (caps.recommendedTier) {
    case 'ultra': return 'ultra';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low':
    case 'fallback':
    default:
      return 'low';
  }
};

// Detect if running on mobile (legacy helper)
const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'webos', 'blackberry', 'windows phone'];
  
  return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1);
};

// Safe GPU tier detection using new capability detector
const detectGPUTier = (): { tier: GPUTier; capabilities: WebGLCapabilities } => {
  try {
    const capabilities = detectWebGLCapabilities();
    const tier = mapCapabilitiesToTier(capabilities);
    console.log(`[GraphicsOptimizer] Detected tier: ${tier}, WebGL: ${capabilities.contextType}, Browser: ${capabilities.browser}, GPU: ${capabilities.renderer}`);
    return { tier, capabilities };
  } catch (e) {
    console.warn('[GraphicsOptimizer] Detection failed, falling back to low tier:', e);
    return {
      tier: 'low',
      capabilities: {
        webglSupported: false,
        webgl2Supported: false,
        contextType: 'none',
        renderer: 'unknown',
        vendor: 'unknown',
        browser: 'unknown',
        isMobile: detectMobile(),
        isIOS: false,
        isAndroid: false,
        isMac: false,
        isVRHeadset: false,
        isQuest: false,
        canRender3D: false,
        recommendedTier: 'fallback',
        maxTextureSize: 0,
        maxRenderbufferSize: 0,
        maxViewportDims: [0, 0],
        floatTexturesSupported: false,
        depthTextureSupported: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        errorCode: 'unknown',
      },
    };
  }
}

// FPS-based dynamic adjustment
const measureFPS = (callback: (fps: number) => void): (() => void) => {
  let frameCount = 0;
  let lastTime = performance.now();
  let rafId: number;
  
  const measure = () => {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
      callback(frameCount);
      frameCount = 0;
      lastTime = now;
    }
    
    rafId = requestAnimationFrame(measure);
  };
  
  rafId = requestAnimationFrame(measure);
  
  return () => cancelAnimationFrame(rafId);
};

export const useGraphicsOptimizer = () => {
  const [webglCapabilities, setWebglCapabilities] = useState<WebGLCapabilities | null>(null);
  const [currentTier, setCurrentTier] = useState<GPUTier>('medium');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [autoAdjust, setAutoAdjust] = useState(true);
  
  // Initial detection
  useEffect(() => {
    const { tier, capabilities } = detectGPUTier();
    setCurrentTier(tier);
    setWebglCapabilities(capabilities);
    setIsMobile(capabilities.isMobile);
  }, []);
  
  // Auto-adjust tier based on FPS
  useEffect(() => {
    if (!autoAdjust) return;
    
    const cleanup = measureFPS((measuredFps) => {
      setFps(measuredFps);
      
      // Downgrade if FPS is consistently low
      if (measuredFps < 25 && currentTier !== 'low') {
        const tiers: GPUTier[] = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = tiers.indexOf(currentTier);
        if (currentIndex > 0) {
          setCurrentTier(tiers[currentIndex - 1]);
          console.log(`[GraphicsOptimizer] Downgrading to ${tiers[currentIndex - 1]} due to low FPS`);
        }
      }
    });
    
    return cleanup;
  }, [autoAdjust, currentTier]);
  
  // Build final graphics config
  const graphicsConfig = useMemo<GraphicsConfig>(() => {
    const baseConfig = TIER_CONFIGS[currentTier];
    
    return {
      ...baseConfig,
      tier: currentTier,
      isMobile,
      webglSupported: webglCapabilities?.webglSupported ?? true,
      webgl2Supported: webglCapabilities?.webgl2Supported ?? false,
      // Override certain settings on mobile regardless of tier
      ...(isMobile && {
        enableBloom: currentTier !== 'low',
        enableChromaticAberration: false,
        enableFilmGrain: false,
        enableGodRays: false,
        pixelRatio: 1,
        maxInstances: Math.min(baseConfig.maxInstances, 200),
      }),
    };
  }, [currentTier, isMobile, webglCapabilities]);
  
  // Manual tier override
  const setTier = (tier: GPUTier) => {
    setAutoAdjust(false);
    setCurrentTier(tier);
  };
  
  // Reset to auto-detection
  const resetToAuto = () => {
    setAutoAdjust(true);
    const { tier, capabilities } = detectGPUTier();
    setCurrentTier(tier);
    setWebglCapabilities(capabilities);
  };
  
  return {
    graphicsConfig,
    currentTier,
    isMobile,
    fps,
    setTier,
    resetToAuto,
    autoAdjust,
    setAutoAdjust,
    webglCapabilities,
  };
};

export default useGraphicsOptimizer;
