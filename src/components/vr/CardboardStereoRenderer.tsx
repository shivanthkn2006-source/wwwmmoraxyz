// ═══════════════════════════════════════════════════════════════════════════════
// CARDBOARD STEREOSCOPIC RENDERER
// Split-screen rendering for Google Cardboard / Phone VR headsets
// Renders the scene twice with eye offset for 3D effect
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CardboardRendererProps {
  enabled: boolean;
  eyeSeparation?: number; // Distance between eyes in world units
  focalLength?: number; // Distance to convergence plane
}

// Stereo Camera Effect Component - use inside Canvas
export const CardboardStereoEffect: React.FC<CardboardRendererProps> = ({
  enabled,
  eyeSeparation = 0.064, // ~64mm average human IPD
  focalLength = 5,
}) => {
  const { gl, camera, scene, size } = useThree();
  const stereoCamera = useRef(new THREE.StereoCamera());
  
  useEffect(() => {
    if (enabled) {
      stereoCamera.current.eyeSep = eyeSeparation;
      // Store original pixel ratio
      gl.setPixelRatio(window.devicePixelRatio);
    }
  }, [enabled, eyeSeparation, gl]);

  useFrame(() => {
    if (!enabled) return;
    
    const stereo = stereoCamera.current;
    
    // Update stereo camera from main camera
    if (camera instanceof THREE.PerspectiveCamera) {
      stereo.update(camera);
      
      // Get the canvas dimensions
      const width = size.width;
      const height = size.height;
      
      // Store original settings
      const originalScissorTest = gl.getScissorTest();
      
      // Enable scissor test for split rendering
      gl.setScissorTest(true);
      
      // Clear the entire frame
      gl.clear();
      
      // Render left eye (left half of screen)
      gl.setViewport(0, 0, width / 2, height);
      gl.setScissor(0, 0, width / 2, height);
      gl.render(scene, stereo.cameraL);
      
      // Render right eye (right half of screen)
      gl.setViewport(width / 2, 0, width / 2, height);
      gl.setScissor(width / 2, 0, width / 2, height);
      gl.render(scene, stereo.cameraR);
      
      // Restore original scissor test state
      gl.setScissorTest(originalScissorTest);
      
      // Reset viewport for next frame's potential non-stereo use
      gl.setViewport(0, 0, width, height);
    }
  }, 1); // Priority 1 = runs after default render

  return null;
};

// Cardboard Frame Overlay - renders on top of the Canvas
interface CardboardOverlayProps {
  onExit: () => void;
}

export const CardboardOverlay: React.FC<CardboardOverlayProps> = ({ onExit }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Center divider line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black" />
      
      {/* Cardboard frame corners */}
      <div className="absolute inset-0 border-4 border-black rounded-3xl" />
      
      {/* Nose cutout hint */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-16 h-8 bg-black rounded-t-full" />
      
      {/* Exit button (tap anywhere in center) */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 pointer-events-auto"
        onTouchStart={onExit}
        onClick={onExit}
      />
      
      {/* Instructions (visible briefly) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/30 text-xs font-mono animate-pulse">
        TAP CENTER TO EXIT
      </div>
    </div>
  );
};

// Hook for managing cardboard mode state
export const useCardboardMode = () => {
  const [isCardboardMode, setIsCardboardMode] = useState(false);
  const [ipd, setIpd] = useState(0.064); // Interpupillary distance

  const enterCardboardMode = useCallback(async () => {
    // Request fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.warn('[Cardboard] Fullscreen not available');
    }

    // Lock to landscape
    try {
      // @ts-ignore - Non-standard API
      if (screen.orientation?.lock) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch (e) {
      console.warn('[Cardboard] Orientation lock not available');
    }

    setIsCardboardMode(true);
  }, []);

  const exitCardboardMode = useCallback(async () => {
    // Exit fullscreen
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {
        console.warn('[Cardboard] Could not exit fullscreen');
      }
    }

    // Unlock orientation
    try {
      // @ts-ignore
      if (screen.orientation?.unlock) {
        // @ts-ignore
        screen.orientation.unlock();
      }
    } catch (e) {
      console.warn('[Cardboard] Could not unlock orientation');
    }

    setIsCardboardMode(false);
  }, []);

  const adjustIpd = useCallback((delta: number) => {
    setIpd(prev => Math.max(0.05, Math.min(0.08, prev + delta)));
  }, []);

  return {
    isCardboardMode,
    ipd,
    enterCardboardMode,
    exitCardboardMode,
    adjustIpd,
  };
};

export default CardboardStereoEffect;
