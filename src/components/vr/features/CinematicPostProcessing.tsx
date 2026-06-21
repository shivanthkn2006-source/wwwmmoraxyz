// ═══════════════════════════════════════════════════════════════════════════════
// CINEMATIC POST-PROCESSING PIPELINE - Ready Player One Visual Effects
// Unreal Bloom, Chromatic Aberration, Film Grain, ACES Tone Mapping
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { 
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';
import { 
  BlendFunction, 
  KernelSize,
} from 'postprocessing';
import * as THREE from 'three';
import { GraphicsConfig } from '@/hooks/useGraphicsOptimizer';

interface CinematicPostProcessingProps {
  config: GraphicsConfig;
  enabled?: boolean;
}

// God Rays / Volumetric Light Effect (simplified for WebGL)
const GodRaysEffect: React.FC<{ 
  sunPosition?: THREE.Vector3;
  enabled: boolean;
}> = ({ enabled }) => {
  // God rays are expensive - use a simplified bloom-based approach
  if (!enabled) return null;
  
  return (
    <Bloom
      intensity={0.3}
      luminanceThreshold={0.9}
      luminanceSmoothing={0.9}
      kernelSize={KernelSize.LARGE}
      mipmapBlur
    />
  );
};

// Detect Safari browser
const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
};

// Detect iOS for additional safety
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const CinematicPostProcessing: React.FC<CinematicPostProcessingProps> = ({ 
  config, 
  enabled = true 
}) => {
  const { gl } = useThree();
  
  // Memoize browser detection to avoid recalculating on every render
  const safari = useMemo(() => isSafari(), []);
  const ios = useMemo(() => isIOS(), []);
  
  // Configure renderer for cinematic output - only if gl is available
  useMemo(() => {
    if (!gl) return;
    try {
      // ACES Filmic for photorealistic HDR tone mapping
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = safari ? 1.0 : 1.2; // Slightly lower for Safari
      gl.outputColorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn('[CinematicPostProcessing] Renderer config failed:', e);
    }
  }, [gl, safari]);
  
  // IMPORTANT: All hooks MUST be called before any early returns (React hooks rules)
  // Chromatic aberration offset based on config - with safety bounds
  const chromaticOffset = useMemo(() => {
    const offset = Math.min(config?.chromaticAberrationOffset ?? 0, 0.01); // Cap at 0.01
    return new THREE.Vector2(offset, offset * 0.5);
  }, [config?.chromaticAberrationOffset]);

  // Compute multisampling - reduced on Safari for performance
  const multisampling = useMemo(() => {
    if (safari || ios) return 0; // Disable MSAA entirely on Apple devices
    return config?.antialiasType === 'smaa' ? 0 : Math.min(4, window.devicePixelRatio > 1.5 ? 2 : 4);
  }, [safari, ios, config?.antialiasType]);

  // Bloom settings adjusted for Safari
  const bloomSettings = useMemo(() => ({
    intensity: Math.min(config?.bloomIntensity ?? 1, safari ? 0.6 : 1.5),
    luminanceThreshold: safari ? 0.25 : 0.15,
    luminanceSmoothing: safari ? 0.6 : 0.5,
    kernelSize: safari ? KernelSize.SMALL : KernelSize.LARGE,
    mipmapBlur: !safari && !ios,
  }), [config?.bloomIntensity, safari, ios]);

  // Determine if we should skip rendering based on device/browser capabilities
  const shouldSkipRendering = useMemo(() => {
    if (!enabled) return true;
    if (!config) return true;
    if (config.tier === 'low') return true;
    if (ios) return true; // Skip all post-processing on iOS for stability
    if (safari && config.tier === 'medium') return true;
    return false;
  }, [enabled, config, ios, safari]);

  // Early return AFTER all hooks have been called
  if (shouldSkipRendering) {
    return null;
  }
  
  return (
    <EffectComposer multisampling={multisampling}>
      {/* SMAA Anti-aliasing - skip on Safari/iOS */}
      {config.antialiasType === 'smaa' && !safari && !ios && <SMAA />}
      
      {/* Unreal Bloom - The signature RPO neon glow */}
      {config.enableBloom && (
        <Bloom
          intensity={bloomSettings.intensity}
          luminanceThreshold={bloomSettings.luminanceThreshold}
          luminanceSmoothing={bloomSettings.luminanceSmoothing}
          kernelSize={bloomSettings.kernelSize}
          mipmapBlur={bloomSettings.mipmapBlur}
        />
      )}
      
      {/* God Rays - Volumetric light scattering (skip on Safari) */}
      {config.enableGodRays && !safari && !ios && (
        <GodRaysEffect enabled={config.enableGodRays} />
      )}
      
      {/* Chromatic Aberration - Sci-fi camera lens effect (skip on Safari) */}
      {config.enableChromaticAberration && !safari && !ios && (
        <ChromaticAberration
          offset={chromaticOffset}
          radialModulation={true}
          modulationOffset={0.5}
        />
      )}
      
      {/* Film Grain - Removes the "plastic" CGI look (skip on Safari) */}
      {config.enableFilmGrain && !safari && !ios && (
        <Noise
          premultiply
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={Math.min(config.filmGrainIntensity ?? 0.15, 0.2)}
        />
      )}
      
      {/* Vignette - Cinematic edge darkening - safe on all platforms */}
      {config.enableVignette && (
        <Vignette
          offset={safari ? 0.35 : 0.3}
          darkness={safari ? 0.35 : 0.6}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  );
};

export default CinematicPostProcessing;
