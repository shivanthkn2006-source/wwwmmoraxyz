// ═══════════════════════════════════════════════════════════════════════════════
// VR CONTROL SYSTEM - 360° Controls + Hardware Optimization
// Joystick, Rotation, Adaptive Graphics
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// GPU Tier detection
export type GPUTier = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsSettings {
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  particleCount: number;
  drawDistance: number;
  textureQuality: 'low' | 'medium' | 'high';
  postProcessing: boolean;
  antialias: boolean;
  maxFPS: number;
  npcCount: number;
  animalCount: number;
}

// Detect hardware capabilities
export const detectGPUTier = (): GPUTier => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) return 'low';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
  
  // Check for high-end GPUs
  const highEndKeywords = ['RTX', 'GTX 10', 'GTX 16', 'GTX 20', 'GTX 30', 'GTX 40', 'Radeon RX 5', 'Radeon RX 6', 'Radeon RX 7', 'Apple M1', 'Apple M2', 'Apple M3'];
  const midEndKeywords = ['GTX 9', 'Radeon RX 4', 'Intel Iris', 'Adreno 6', 'Mali-G7'];
  
  const rendererLower = renderer.toLowerCase();
  
  if (highEndKeywords.some(k => renderer.includes(k))) return 'ultra';
  if (midEndKeywords.some(k => renderer.includes(k))) return 'high';
  
  // Check device memory
  if ('deviceMemory' in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory >= 8) return 'high';
    if (memory >= 4) return 'medium';
  }
  
  // Check mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) return 'low';
  
  return 'medium';
};

// Get graphics settings based on tier
export const getGraphicsSettings = (tier: GPUTier): GraphicsSettings => {
  const settings: Record<GPUTier, GraphicsSettings> = {
    low: {
      shadowQuality: 'off',
      particleCount: 500,
      drawDistance: 50,
      textureQuality: 'low',
      postProcessing: false,
      antialias: false,
      maxFPS: 30,
      npcCount: 10,
      animalCount: 5,
    },
    medium: {
      shadowQuality: 'low',
      particleCount: 2000,
      drawDistance: 100,
      textureQuality: 'medium',
      postProcessing: false,
      antialias: true,
      maxFPS: 45,
      npcCount: 25,
      animalCount: 15,
    },
    high: {
      shadowQuality: 'medium',
      particleCount: 5000,
      drawDistance: 200,
      textureQuality: 'high',
      postProcessing: true,
      antialias: true,
      maxFPS: 60,
      npcCount: 50,
      animalCount: 25,
    },
    ultra: {
      shadowQuality: 'high',
      particleCount: 10000,
      drawDistance: 500,
      textureQuality: 'high',
      postProcessing: true,
      antialias: true,
      maxFPS: 120,
      npcCount: 100,
      animalCount: 50,
    },
  };
  
  return settings[tier];
};

// 360° Camera Controller Component
export const RotationController: React.FC<{
  enabled?: boolean;
  rotationSpeed?: number;
}> = ({ enabled = true, rotationSpeed = 2 }) => {
  const { camera } = useThree();
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const isRotating = useRef(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleRotate = (e: CustomEvent) => {
      const { direction, degrees } = e.detail;
      const radians = (degrees * Math.PI) / 180;
      
      switch (direction) {
        case 'left':
          targetRotation.current -= radians;
          break;
        case 'right':
          targetRotation.current += radians;
          break;
        case 'around':
          targetRotation.current += Math.PI;
          break;
        case 'full':
          targetRotation.current += Math.PI * 2;
          break;
      }
      
      isRotating.current = true;
    };
    
    window.addEventListener('vr-rotate-360', handleRotate as EventListener);
    return () => window.removeEventListener('vr-rotate-360', handleRotate as EventListener);
  }, [enabled]);
  
  useFrame((_, delta) => {
    if (!isRotating.current) return;
    
    const diff = targetRotation.current - currentRotation.current;
    
    if (Math.abs(diff) < 0.01) {
      currentRotation.current = targetRotation.current;
      isRotating.current = false;
      return;
    }
    
    const step = diff * Math.min(rotationSpeed * delta, 1);
    currentRotation.current += step;
    
    // Apply rotation to camera orbit
    const orbitRadius = Math.sqrt(
      camera.position.x * camera.position.x + 
      camera.position.z * camera.position.z
    );
    
    camera.position.x = Math.sin(currentRotation.current) * orbitRadius;
    camera.position.z = Math.cos(currentRotation.current) * orbitRadius;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
};

// Virtual Joystick for Mobile
export const VirtualJoystick: React.FC<{
  onMove: (x: number, y: number) => void;
  position?: 'left' | 'right';
}> = ({ onMove, position = 'left' }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const centerRef = useRef({ x: 0, y: 0 });
  
  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, []);
  
  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    
    const maxDistance = 40;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    
    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;
    
    setKnobPosition({ x, y });
    onMove(x / maxDistance, y / maxDistance);
  }, [isDragging, onMove]);
  
  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mouseup', handleEnd);
    }
    
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);
  
  return (
    <div
      ref={joystickRef}
      className={`absolute bottom-24 ${position === 'left' ? 'left-6' : 'right-6'} w-24 h-24 rounded-full bg-black/40 backdrop-blur-sm border-2 border-white/20 touch-none`}
      onTouchStart={handleStart}
      onMouseDown={handleStart}
    >
      <div
        ref={knobRef}
        className="absolute w-12 h-12 rounded-full bg-white/30 border-2 border-white/50"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-[8px] pointer-events-none">
        {position === 'left' ? 'MOVE' : 'LOOK'}
      </div>
    </div>
  );
};

// 360° Rotation Buttons
export const RotationButtons: React.FC = () => {
  const handleRotate = (direction: string, degrees: number) => {
    window.dispatchEvent(new CustomEvent('vr-rotate-360', {
      detail: { direction, degrees }
    }));
  };
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
      <button
        onClick={() => handleRotate('left', 45)}
        className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        ↺
      </button>
      <button
        onClick={() => handleRotate('around', 180)}
        className="w-12 h-12 rounded-full bg-purple-600/80 backdrop-blur-md border border-purple-400/50 text-white flex items-center justify-center hover:bg-purple-500 transition-colors"
      >
        ⟲
      </button>
      <button
        onClick={() => handleRotate('right', 45)}
        className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        ↻
      </button>
    </div>
  );
};

// Hardware Optimization Provider
export const useHardwareOptimization = () => {
  const [gpuTier, setGpuTier] = useState<GPUTier>('medium');
  const [settings, setSettings] = useState<GraphicsSettings>(getGraphicsSettings('medium'));
  const [fps, setFps] = useState(60);
  
  useEffect(() => {
    const tier = detectGPUTier();
    setGpuTier(tier);
    setSettings(getGraphicsSettings(tier));
    
    console.log(`[VR Control] GPU Tier detected: ${tier}`);
  }, []);
  
  // FPS monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
        
        // Auto-downgrade if FPS too low
        if (frameCount < 20 && gpuTier !== 'low') {
          const tiers: GPUTier[] = ['ultra', 'high', 'medium', 'low'];
          const currentIndex = tiers.indexOf(gpuTier);
          if (currentIndex < tiers.length - 1) {
            const newTier = tiers[currentIndex + 1];
            setGpuTier(newTier);
            setSettings(getGraphicsSettings(newTier));
            console.log(`[VR Control] Auto-downgrading to ${newTier} tier`);
          }
        }
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    const animId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animId);
  }, [gpuTier]);
  
  return { gpuTier, settings, fps, setGpuTier };
};

export default RotationController;
