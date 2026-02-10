// ═══════════════════════════════════════════════════════════════════════════════
// GAUSSIAN SPLAT VIEWER - 3D Gaussian Splatting for Hyper-Realistic Environments
// Loads and renders .splat files for photo-realistic real-world scans
// The "2120 Feature" - Next-gen graphics that surpass traditional 3D models
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface GaussianSplatViewerProps {
  url?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface SplatData {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  rotations: Float32Array;
  count: number;
}

// Parse .splat file format
const parseSplatFile = async (buffer: ArrayBuffer): Promise<SplatData> => {
  const dataView = new DataView(buffer);
  
  // Simple splat format: each splat is 32 bytes
  // Position (3 floats = 12 bytes)
  // Scale (3 floats = 12 bytes)  
  // Color (4 bytes RGBA)
  // Rotation (4 bytes quaternion compressed)
  
  const splatSize = 32;
  const count = Math.floor(buffer.byteLength / splatSize);
  
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  
  for (let i = 0; i < count; i++) {
    const offset = i * splatSize;
    
    // Position
    positions[i * 3] = dataView.getFloat32(offset, true);
    positions[i * 3 + 1] = dataView.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = dataView.getFloat32(offset + 8, true);
    
    // Scale
    scales[i * 3] = dataView.getFloat32(offset + 12, true);
    scales[i * 3 + 1] = dataView.getFloat32(offset + 16, true);
    scales[i * 3 + 2] = dataView.getFloat32(offset + 20, true);
    
    // Color (normalized)
    colors[i * 4] = dataView.getUint8(offset + 24) / 255;
    colors[i * 4 + 1] = dataView.getUint8(offset + 25) / 255;
    colors[i * 4 + 2] = dataView.getUint8(offset + 26) / 255;
    colors[i * 4 + 3] = dataView.getUint8(offset + 27) / 255;
    
    // Rotation (simplified - just identity for now)
    rotations[i * 4] = 0;
    rotations[i * 4 + 1] = 0;
    rotations[i * 4 + 2] = 0;
    rotations[i * 4 + 3] = 1;
  }
  
  return { positions, colors, scales, rotations, count };
};

// Gaussian Splat Shader Material
const GaussianSplatMaterial = () => {
  const vertexShader = `
    attribute vec3 splatColor;
    attribute float splatScale;
    
    varying vec3 vColor;
    varying vec2 vUv;
    
    void main() {
      vColor = splatColor;
      vUv = uv;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = splatScale * (300.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 100.0);
    }
  `;
  
  const fragmentShader = `
    varying vec3 vColor;
    varying vec2 vUv;
    
    void main() {
      // Gaussian falloff
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center) * 2.0;
      float alpha = exp(-dist * dist * 2.0);
      
      if (alpha < 0.01) discard;
      
      gl_FragColor = vec4(vColor, alpha);
    }
  `;
  
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
};

// Demo splat point cloud (for when no URL is provided)
const generateDemoSplats = (count: number = 10000): SplatData => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  
  for (let i = 0; i < count; i++) {
    // Sphere distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 5 + Math.random() * 3;
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    // Gradient colors
    const hue = (positions[i * 3] + 5) / 10;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    colors[i * 4] = color.r;
    colors[i * 4 + 1] = color.g;
    colors[i * 4 + 2] = color.b;
    colors[i * 4 + 3] = 0.8;
    
    scales[i * 3] = 0.05 + Math.random() * 0.1;
    scales[i * 3 + 1] = 0.05 + Math.random() * 0.1;
    scales[i * 3 + 2] = 0.05 + Math.random() * 0.1;
    
    rotations[i * 4 + 3] = 1;
  }
  
  return { positions, colors, scales, rotations, count };
};

const GaussianSplatViewer: React.FC<GaussianSplatViewerProps> = ({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onLoad,
  onError,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [splatData, setSplatData] = useState<SplatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load splat file
  useEffect(() => {
    if (!url) {
      // Use demo splats if no URL
      setSplatData(generateDemoSplats(15000));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.arrayBuffer();
      })
      .then(parseSplatFile)
      .then(data => {
        setSplatData(data);
        setLoading(false);
        onLoad?.();
      })
      .catch(err => {
        console.error('Gaussian splat load error:', err);
        setError(err.message);
        setLoading(false);
        onError?.(err);
        // Fallback to demo
        setSplatData(generateDemoSplats(10000));
      });
  }, [url, onLoad, onError]);
  
  // Create geometry from splat data with Safari-safe attribute handling
  const geometry = useMemo(() => {
    if (!splatData || splatData.count === 0) return null;
    
    try {
      const geo = new THREE.BufferGeometry();
      
      // Validate data before creating attributes
      if (!splatData.positions || splatData.positions.length < splatData.count * 3) {
        console.warn('[GaussianSplatViewer] Invalid positions data');
        return null;
      }
      
      // Cap splat count for performance - mobile devices struggle with large point counts
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const maxSplats = isMobile ? 5000 : 15000;
      const effectiveCount = Math.min(splatData.count, maxSplats);
      
      // Position attribute (required) - use only effectiveCount
      const positions = splatData.positions.slice(0, effectiveCount * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Extract RGB colors safely
      const rgbColors = new Float32Array(effectiveCount * 3);
      const hasColors = splatData.colors && splatData.colors.length >= effectiveCount * 4;
      for (let i = 0; i < effectiveCount; i++) {
        rgbColors[i * 3] = hasColors ? splatData.colors[i * 4] : 0.5;
        rgbColors[i * 3 + 1] = hasColors ? splatData.colors[i * 4 + 1] : 0.5;
        rgbColors[i * 3 + 2] = hasColors ? splatData.colors[i * 4 + 2] : 0.8;
      }
      geo.setAttribute('splatColor', new THREE.BufferAttribute(rgbColors, 3));
      
      // Extract X scales safely
      const xScales = new Float32Array(effectiveCount);
      const hasScales = splatData.scales && splatData.scales.length >= effectiveCount * 3;
      for (let i = 0; i < effectiveCount; i++) {
        xScales[i] = hasScales ? splatData.scales[i * 3] : 0.1;
      }
      geo.setAttribute('splatScale', new THREE.BufferAttribute(xScales, 1));
      
      // Set bounding sphere for frustum culling
      geo.computeBoundingSphere();
      
      return geo;
    } catch (e) {
      console.error('[GaussianSplatViewer] Geometry creation failed:', e);
      return null;
    }
  }, [splatData]);
  
  // Create material
  const material = useMemo(() => GaussianSplatMaterial(), []);
  
  // Animate
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });
  
  if (loading) {
    return (
      <group position={position}>
        <Html center>
          <div className="bg-black/80 px-4 py-2 rounded-lg text-cyan-400 text-sm">
            Loading Gaussian Splat...
          </div>
        </Html>
      </group>
    );
  }
  
  if (!geometry) return null;
  
  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation.map(r => r * Math.PI / 180) as [number, number, number]}
      scale={scale}
    >
      <points ref={pointsRef} geometry={geometry} material={material} />
      
      {/* Info label */}
      <Html position={[0, 8, 0]} center distanceFactor={15}>
        <div className="bg-purple-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/30">
          <div className="text-purple-300 text-xs font-bold">
            ✨ Gaussian Splat Viewer
          </div>
          <div className="text-purple-400/70 text-[10px]">
            {splatData?.count.toLocaleString()} splats | {url ? 'Custom' : 'Demo Mode'}
          </div>
          {error && (
            <div className="text-red-400 text-[10px] mt-1">
              ⚠ {error} (showing demo)
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// Splat URL Input Component for user uploads
export const GaussianSplatLoader: React.FC<{
  onSplatLoaded: (url: string) => void;
}> = ({ onSplatLoaded }) => {
  const [url, setUrl] = useState('');
  
  return (
    <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg border border-purple-500/30">
      <h3 className="text-purple-300 font-bold mb-2">Load 3D Gaussian Splat</h3>
      <p className="text-gray-400 text-xs mb-3">
        Load a .splat file for hyper-realistic environment rendering
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter .splat file URL"
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        />
        <button
          onClick={() => url && onSplatLoaded(url)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm"
        >
          Load
        </button>
      </div>
    </div>
  );
};

export default GaussianSplatViewer;
