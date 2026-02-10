// ============================================
// GLOBE TEXTURE MANAGER
// Tier-based texture loading with quality scaling
// ============================================

import { useMemo } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import type { DeviceTier } from '@/hooks/useDeviceTier';

// ============================================
// TEXTURE QUALITY CONFIGURATIONS
// ============================================

interface TextureConfig {
  day: string;
  night: string;
  clouds: string;
  bump: string;
  specular: string;
  resolution: string;
  enableClouds: boolean;
  enableBump: boolean;
  enableSpecular: boolean;
  enableAtmosphere: boolean;
  sphereSegments: number;
  cloudSegments: number;
  anisotropy: number;
}

// Base URLs for different quality textures - using reliable three.js example textures
const TEXTURE_SOURCES = {
  // Standard quality (2k) - Default/Fallback
  standard: {
    day: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    night: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
    clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    bump: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
    specular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  },
  // High quality (4k) - Using same source but higher detail settings
  high: {
    day: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    night: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
    clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    bump: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
    specular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  },
  // Ultra quality (8k) - Same source, maximum detail
  ultra: {
    day: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    night: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
    clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    bump: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
    specular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  },
};

// Tier-specific texture configurations
const TIER_TEXTURE_CONFIG: Record<DeviceTier, TextureConfig> = {
  // Tier C (iPhone SE, low-end): 2k textures, minimal features
  C: {
    ...TEXTURE_SOURCES.standard,
    resolution: '2k',
    enableClouds: false, // Disable cloud layer for performance
    enableBump: false,   // Disable bump mapping
    enableSpecular: false, // Disable specular highlights
    enableAtmosphere: true, // Keep basic atmosphere
    sphereSegments: 32,  // Lower polygon count
    cloudSegments: 16,
    anisotropy: 4,
  },
  // Tier B (iPhone 12/13, mid-range): Standard quality
  B: {
    ...TEXTURE_SOURCES.standard,
    resolution: '2k',
    enableClouds: true,
    enableBump: true,
    enableSpecular: true,
    enableAtmosphere: true,
    sphereSegments: 48,
    cloudSegments: 32,
    anisotropy: 8,
  },
  // Tier A (iPhone 14/15 Pro): High quality
  A: {
    ...TEXTURE_SOURCES.high,
    resolution: '4k',
    enableClouds: true,
    enableBump: true,
    enableSpecular: true,
    enableAtmosphere: true,
    sphereSegments: 64,
    cloudSegments: 48,
    anisotropy: 16,
  },
  // Tier S (iPhone 16+ Pro Max): Ultra quality with all features
  S: {
    ...TEXTURE_SOURCES.ultra,
    resolution: '8k',
    enableClouds: true,
    enableBump: true,
    enableSpecular: true,
    enableAtmosphere: true,
    sphereSegments: 96,  // Maximum detail
    cloudSegments: 64,
    anisotropy: 16,
  },
};

// ============================================
// HOOK: useGlobeTextures
// ============================================

export interface GlobeTextureSettings {
  textureUrls: {
    day: string;
    night: string;
    clouds: string;
    bump: string;
    specular: string;
  };
  config: TextureConfig;
  tier: DeviceTier;
  tierName: string;
  particleMultiplier: number;
  dpr: [number, number]; // Device pixel ratio range
  maxFPS: number;
}

export const useGlobeTextures = (): GlobeTextureSettings => {
  const { tier, capabilities, isLiteMode, particleCount, maxFPS } = useDeviceTierContext();
  
  return useMemo(() => {
    const config = TIER_TEXTURE_CONFIG[tier];
    
    // Calculate particle multiplier based on tier
    // Tier C gets 50% particles, Tier S gets 100%+
    const particleMultiplier = tier === 'C' ? 0.5 : tier === 'B' ? 0.75 : tier === 'A' ? 1.0 : 1.5;
    
    // DPR (device pixel ratio) limits based on tier
    const dpr: [number, number] = tier === 'C' 
      ? [1, 1] 
      : tier === 'B' 
        ? [1, 1.5] 
        : tier === 'A' 
          ? [1, 2] 
          : [1, 2];
    
    return {
      textureUrls: {
        day: config.day,
        night: config.night,
        clouds: config.clouds,
        bump: config.bump,
        specular: config.specular,
      },
      config,
      tier,
      tierName: capabilities?.tierName || 'Standard',
      particleMultiplier,
      dpr,
      maxFPS,
    };
  }, [tier, capabilities, isLiteMode, particleCount, maxFPS]);
};

// ============================================
// UTILITY: Get Weather Particle Count
// ============================================

export const getWeatherParticleCount = (tier: DeviceTier): number => {
  switch (tier) {
    case 'C':
      return 500;  // 50% reduction
    case 'B':
      return 1000;
    case 'A':
      return 1500;
    case 'S':
      return 2000;
    default:
      return 1000;
  }
};

export default useGlobeTextures;
