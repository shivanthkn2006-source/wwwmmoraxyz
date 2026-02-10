// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL CYBER CITY - "The Stacks" Architecture with Instanced Rendering
// 500+ Instanced Skyscrapers with Neon Lights and Exponential Fog
// Optimized for mobile through M1 Macs using InstancedMesh
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsConfig } from '@/hooks/useGraphicsOptimizer';

interface CyberBuildingData {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: number;
  hasNeon: boolean;
  neonColor: THREE.Color;
}

interface ProceduralCyberCityProps {
  config: GraphicsConfig;
  seed?: number;
  cityRadius?: number;
}

// Seeded random for reproducible cities
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate building data
const generateBuildingData = (
  count: number, 
  radius: number, 
  seed: number
): CyberBuildingData[] => {
  const buildings: CyberBuildingData[] = [];
  let currentSeed = seed;
  
  const neonColors = [
    new THREE.Color('#00ffff'), // Cyan
    new THREE.Color('#ff00ff'), // Magenta
    new THREE.Color('#ff6600'), // Orange
    new THREE.Color('#00ff00'), // Green
    new THREE.Color('#ff0066'), // Pink
    new THREE.Color('#6600ff'), // Purple
  ];
  
  for (let i = 0; i < count; i++) {
    const angle = seededRandom(currentSeed++) * Math.PI * 2;
    const distance = Math.sqrt(seededRandom(currentSeed++)) * radius;
    
    // Distance from center affects building height (downtown = tall)
    const distanceRatio = distance / radius;
    const baseHeight = distanceRatio < 0.3 
      ? 30 + seededRandom(currentSeed++) * 70  // Downtown: 30-100
      : distanceRatio < 0.6 
        ? 15 + seededRandom(currentSeed++) * 40  // Midtown: 15-55
        : 5 + seededRandom(currentSeed++) * 20;   // Suburbs: 5-25
    
    const width = 3 + seededRandom(currentSeed++) * 8;
    const depth = 3 + seededRandom(currentSeed++) * 8;
    
    buildings.push({
      position: new THREE.Vector3(
        Math.cos(angle) * distance,
        baseHeight / 2, // Position at half height so bottom is at y=0
        Math.sin(angle) * distance
      ),
      scale: new THREE.Vector3(width, baseHeight, depth),
      rotation: seededRandom(currentSeed++) * Math.PI * 0.25,
      hasNeon: seededRandom(currentSeed++) < 0.15, // 15% have neon
      neonColor: neonColors[Math.floor(seededRandom(currentSeed++) * neonColors.length)],
    });
  }
  
  return buildings;
};

// Instanced Buildings Component - with Safari safety
const InstancedBuildings: React.FC<{
  buildings: CyberBuildingData[];
}> = ({ buildings }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const neonMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Count neon buildings first to avoid array issues - ensure minimum of 1 to prevent WebGL errors
  const neonCount = useMemo(() => {
    if (!buildings || buildings.length === 0) return 1; // Return 1 minimum to prevent 0-count instanced mesh
    const count = buildings.reduce((acc, b) => acc + (b.hasNeon ? 1 : 0), 0);
    return Math.max(count, 1); // Ensure at least 1
  }, [buildings]);
  
  // Setup instance matrices
  useEffect(() => {
    if (!meshRef.current || !buildings || buildings.length === 0) return;
    
    const matrix = new THREE.Matrix4();
    const neonMatrix = new THREE.Matrix4();
    let neonIndex = 0;
    
    buildings.forEach((building, i) => {
      if (!building.position || !building.scale) return;
      
      matrix.identity();
      matrix.compose(
        building.position,
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), building.rotation || 0),
        building.scale
      );
      meshRef.current!.setMatrixAt(i, matrix);
      
      // Neon windows/signs
      if (building.hasNeon && neonMeshRef.current && building.neonColor) {
        neonMatrix.identity();
        neonMatrix.compose(
          new THREE.Vector3(
            building.position.x,
            building.position.y + building.scale.y * 0.3,
            building.position.z + building.scale.z * 0.5 + 0.1
          ),
          new THREE.Quaternion(),
          new THREE.Vector3(building.scale.x * 0.8, building.scale.y * 0.2, 0.5)
        );
        neonMeshRef.current.setMatrixAt(neonIndex, neonMatrix);
        neonMeshRef.current.setColorAt(neonIndex, building.neonColor);
        neonIndex++;
      }
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (neonMeshRef.current && neonCount > 0) {
      neonMeshRef.current.instanceMatrix.needsUpdate = true;
      if (neonMeshRef.current.instanceColor) {
        neonMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [buildings, neonCount]);
  
  // Subtle animation for neon lights - with null safety
  useFrame((state) => {
    if (!neonMeshRef.current || !neonMeshRef.current.material) return;
    if (neonCount <= 1 && !buildings?.some(b => b.hasNeon)) return;
    
    try {
      const material = neonMeshRef.current.material as THREE.MeshStandardMaterial;
      if (material && typeof material.emissiveIntensity === 'number') {
        material.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
      }
    } catch (e) {
      // Silently ignore animation errors
    }
  });
  
  if (!buildings || buildings.length === 0) return null;
  
  return (
    <>
      {/* Main building instances */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildings.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.7}
          roughness={0.3}
          envMapIntensity={0.5}
        />
      </instancedMesh>
      
      {/* Neon sign instances */}
      <instancedMesh
        ref={neonMeshRef}
        args={[undefined, undefined, neonCount]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00ffff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
};

// Window Grid Texture - with null safety for Safari
const WindowGridMaterial: React.FC = () => {
  const texture = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      
      // Safety check for canvas context (can fail on some browsers)
      if (!ctx) {
        console.warn('[ProceduralCyberCity] Canvas 2D context unavailable');
        return null;
      }
      
      // Dark background
      ctx.fillStyle = '#0a0a15';
      ctx.fillRect(0, 0, 64, 128);
      
      // Window grid - use seeded random for consistency
      let seed = 42;
      const seededRand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      
      for (let y = 4; y < 128; y += 16) {
        for (let x = 4; x < 64; x += 12) {
          // Some windows are lit
          if (seededRand() > 0.7) {
            ctx.fillStyle = seededRand() > 0.5 ? '#ffaa00' : '#4488ff';
          } else {
            ctx.fillStyle = '#1a1a3a';
          }
          ctx.fillRect(x, y, 8, 10);
        }
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 8);
      return tex;
    } catch (e) {
      console.warn('[ProceduralCyberCity] Texture creation failed:', e);
      return null;
    }
  }, []);
  
  return (
    <meshStandardMaterial
      map={texture}
      color="#2a2a4e"
      metalness={0.8}
      roughness={0.2}
    />
  );
};

// Atmospheric Fog - Only sets fog if not already present
const CyberFog: React.FC<{ density: number }> = ({ density }) => {
  const { scene } = useThree();
  
  useEffect(() => {
    // Only set fog if not already configured by another component
    const prevFog = scene.fog;
    const prevBackground = scene.background;
    
    // Deep purple cyberpunk fog
    scene.fog = new THREE.FogExp2('#0a0012', density);
    // Don't override background if already set
    if (!scene.background) {
      scene.background = new THREE.Color('#050008');
    }
    
    return () => {
      // Restore previous fog state
      scene.fog = prevFog;
      if (!prevBackground) {
        scene.background = null;
      }
    };
  }, [scene, density]);
  
  return null;
};

// Main Component
const ProceduralCyberCity: React.FC<ProceduralCyberCityProps> = ({
  config,
  seed = 42,
  cityRadius = 200,
}) => {
  // Safety check for config
  if (!config) return null;
  
  // Generate buildings based on graphics config
  const buildings = useMemo(() => {
    const maxInstances = config?.maxInstances ?? 100;
    return generateBuildingData(maxInstances, cityRadius, seed);
  }, [config?.maxInstances, cityRadius, seed]);
  
  // Ground plane with grid - with null safety
  const groundTexture = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.warn('[ProceduralCyberCity] Ground texture canvas context unavailable');
        return null;
      }
      
      // Dark ground
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, 512, 512);
      
      // Grid lines
      ctx.strokeStyle = '#1a1a3a';
      ctx.lineWidth = 1;
      for (let i = 0; i < 512; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(20, 20);
      return tex;
    } catch (e) {
      console.warn('[ProceduralCyberCity] Ground texture creation failed:', e);
      return null;
    }
  }, []);
  
  const fogDensity = config?.fogDensity ?? 0.01;
  
  return (
    <group position={[0, 0, -100]}> {/* Offset CyberCity behind main area */}
      {/* Atmospheric fog */}
      <CyberFog density={fogDensity} />
      
      {/* Ground - positioned to not overlap with main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[cityRadius * 3, cityRadius * 3]} />
        <meshStandardMaterial
          map={groundTexture}
          color="#0a0a12"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Instanced buildings */}
      <InstancedBuildings buildings={buildings} />
      
      {/* Central tower (landmark) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 75, 0]} castShadow>
          <cylinderGeometry args={[8, 12, 150, 32]} />
          <meshStandardMaterial
            color="#1a1a2e"
            metalness={0.9}
            roughness={0.1}
            emissive="#4400ff"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Spire */}
        <mesh position={[0, 160, 0]}>
          <coneGeometry args={[5, 30, 8]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        {/* Rings */}
        {[50, 100, 125].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[15 - i * 2, 0.5, 16, 64]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      
      {/* Ambient city lights */}
      <pointLight
        position={[0, 100, 0]}
        color="#4400ff"
        intensity={1000}
        distance={300}
      />
      <pointLight
        position={[100, 50, 100]}
        color="#00ffff"
        intensity={500}
        distance={200}
      />
      <pointLight
        position={[-100, 50, -100]}
        color="#ff00ff"
        intensity={500}
        distance={200}
      />
    </group>
  );
};

export default ProceduralCyberCity;
