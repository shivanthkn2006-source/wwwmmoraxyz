// ═══════════════════════════════════════════════════════════════════════════════
// READY PLAYER ONE TERRAIN - Epic Mountains and Dramatic Landscape
// Cinematic entry from satellite/aerial/gods view with massive mountains
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Html, Stars, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import { Season, SEASON_CONFIGS } from './SeasonsSystem';

interface ReadyPlayerOneTerrainProps {
  season: Season;
  entryMode?: 'satellite' | 'aerial' | 'ground';
  onEntryComplete?: () => void;
}

// Epic Mountain Component
const EpicMountain: React.FC<{
  position: [number, number, number];
  height: number;
  baseRadius: number;
  season: Season;
  hasSnowCap?: boolean;
}> = ({ position, height, baseRadius, season, hasSnowCap = true }) => {
  const mountainRef = useRef<THREE.Group>(null);
  
  const mountainColor = useMemo(() => {
    switch (season) {
      case 'winter': return '#5a6c7d';
      case 'spring': return '#4a5d4a';
      case 'summer': return '#6b7b5a';
      case 'fall': return '#8b6b4a';
    }
  }, [season]);

  const snowLineHeight = height * (season === 'winter' ? 0.3 : 0.7);

  return (
    <group ref={mountainRef} position={position}>
      {/* Main mountain body */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={[baseRadius, height, 8, 4]} />
        <meshStandardMaterial 
          color={mountainColor}
          roughness={0.9}
          flatShading
        />
      </mesh>
      
      {/* Snow cap */}
      {hasSnowCap && (
        <mesh position={[0, (height - snowLineHeight) / 2 + snowLineHeight / 2, 0]}>
          <coneGeometry args={[baseRadius * (1 - snowLineHeight / height), height - snowLineHeight, 8, 2]} />
          <meshStandardMaterial 
            color="#ffffff"
            roughness={0.4}
            flatShading
          />
        </mesh>
      )}
      
      {/* Rocky details */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const rockHeight = height * (0.2 + Math.random() * 0.3);
        const rockRadius = baseRadius * (0.1 + Math.random() * 0.15);
        const distance = baseRadius * 0.7;
        
        return (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle) * distance,
              rockHeight / 2,
              Math.sin(angle) * distance
            ]}
            castShadow
          >
            <coneGeometry args={[rockRadius, rockHeight, 5, 2]} />
            <meshStandardMaterial color={mountainColor} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

// Floating Island Component (OASIS-style)
const FloatingIsland: React.FC<{
  position: [number, number, number];
  size: number;
  season: Season;
}> = ({ position, size, season }) => {
  const islandRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (islandRef.current) {
      islandRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 2;
      islandRef.current.rotation.y += 0.001;
    }
  });

  const grassColor = SEASON_CONFIGS[season].grassColor;

  return (
    <group ref={islandRef} position={position}>
      {/* Island top (grass) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[size, size * 0.8, size * 0.3, 16]} />
        <meshStandardMaterial color={grassColor} />
      </mesh>
      
      {/* Island bottom (rock) */}
      <mesh position={[0, -size * 0.5, 0]}>
        <coneGeometry args={[size * 0.8, size * 1.2, 8]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      
      {/* Waterfall */}
      <mesh position={[size * 0.6, -size * 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.5, size * 2, 8]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.7} />
      </mesh>
      
      {/* Trees on island */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const distance = size * 0.5;
        return (
          <group key={i} position={[
            Math.cos(angle) * distance,
            size * 0.2,
            Math.sin(angle) * distance
          ]}>
            <Cylinder args={[0.2, 0.3, 2, 6]} position={[0, 1, 0]}>
              <meshStandardMaterial color="#8b4513" />
            </Cylinder>
            <mesh position={[0, 3, 0]}>
              <coneGeometry args={[1.2, 2.5, 6]} />
              <meshStandardMaterial color={SEASON_CONFIGS[season].treeColors[0]} />
            </mesh>
          </group>
        );
      })}
      
      {/* Glowing crystal (OASIS beacon) */}
      <mesh position={[0, size * 0.5, 0]}>
        <octahedronGeometry args={[size * 0.15]} />
        <meshStandardMaterial 
          color="#00ffff" 
          emissive="#00ffff" 
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
};

// Massive Central Mountain (Like OASIS landmark)
const CentralPeak: React.FC<{ season: Season }> = ({ season }) => {
  const peakRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group ref={peakRef} position={[0, 0, -200]}>
      {/* Main massive peak */}
      <mesh castShadow>
        <coneGeometry args={[80, 250, 12, 8]} />
        <meshStandardMaterial 
          color={season === 'winter' ? '#4a5a6a' : '#3a4a3a'}
          roughness={0.85}
          flatShading
        />
      </mesh>
      
      {/* Snow cap */}
      <mesh position={[0, 75, 0]}>
        <coneGeometry args={[50, 100, 12, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} flatShading />
      </mesh>
      
      {/* Glowing peak beacon */}
      <mesh ref={glowRef} position={[0, 130, 0]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshStandardMaterial 
          color="#ff00ff" 
          emissive="#ff00ff" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Energy beams from peak */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 130, 0]} rotation={[0, (i * Math.PI) / 2, Math.PI / 6]}>
          <cylinderGeometry args={[0.5, 0.1, 100, 4]} />
          <meshStandardMaterial 
            color="#00ffff" 
            emissive="#00ffff"
            emissiveIntensity={0.5}
            transparent 
            opacity={0.3} 
          />
        </mesh>
      ))}
      
      {/* Surrounding peaks */}
      {[
        [-120, 0, -50, 150, 50],
        [120, 0, -80, 180, 55],
        [-80, 0, 100, 120, 40],
        [100, 0, 80, 140, 45],
        [-150, 0, -120, 100, 35],
        [160, 0, -150, 130, 42],
      ].map(([x, y, z, h, r], i) => (
        <EpicMountain
          key={i}
          position={[x, y, z]}
          height={h}
          baseRadius={r}
          season={season}
          hasSnowCap={h > 100}
        />
      ))}
      
      <Html position={[0, 160, 0]} center distanceFactor={100}>
        <div className="bg-purple-900/80 px-4 py-2 rounded-lg text-white border border-purple-400/50 text-center">
          <div className="text-2xl font-bold">⛰️ THE PEAK</div>
          <div className="text-sm opacity-70">OMEGA World Landmark</div>
        </div>
      </Html>
    </group>
  );
};

// Satellite Entry Animation Camera Controller
export const SatelliteEntryController: React.FC<{
  onEntryComplete: () => void;
}> = ({ onEntryComplete }) => {
  const { camera } = useThree();
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  const [enabled, setEnabled] = useState(true);
  
  const handleComplete = () => {
    setEnabled(false);
    onEntryComplete();
  };
  
  useEffect(() => {
    if (enabled) {
      startTime.current = Date.now();
      camera.position.set(0, 500, 500);
      camera.lookAt(0, 0, 0);
    }
  }, [enabled, camera]);
  
  useFrame(() => {
    if (!enabled) return;
    
    const elapsed = (Date.now() - startTime.current) / 1000;
    const duration = 8; // 8 second entry animation
    const t = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth deceleration
    const easeOut = 1 - Math.pow(1 - t, 3);
    
    // Animate from high altitude to ground level
    const startY = 500;
    const endY = 5;
    const startZ = 500;
    const endZ = 30;
    
    camera.position.y = startY + (endY - startY) * easeOut;
    camera.position.z = startZ + (endZ - startZ) * easeOut;
    camera.position.x = Math.sin(t * Math.PI * 0.5) * 50 * (1 - easeOut);
    
    camera.lookAt(0, 0, -50);
    
    setProgress(t);
    
    if (t >= 1) {
      handleComplete();
    }
  });

  if (!enabled) return null;

  return (
    <Html fullscreen>
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="absolute top-10 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 px-6 py-3 rounded-lg border border-cyan-500/50">
            <div className="text-cyan-400 text-lg font-bold mb-2">ENTERING OMEGA WORLD</div>
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-white/60 text-sm mt-2 text-center">
              {progress < 0.3 ? 'Satellite View' : progress < 0.6 ? 'Aerial Descent' : 'Ground Approach'}
            </div>
          </div>
        </div>
        
        {/* HUD elements during entry */}
        <div className="absolute bottom-10 left-10 text-green-400 font-mono text-sm">
          <div>ALT: {Math.floor(500 - progress * 495)}m</div>
          <div>SPD: {Math.floor(200 * (1 - progress))} m/s</div>
          <div>LAT: 0.000° N</div>
          <div>LON: 0.000° E</div>
        </div>
        
        {/* Scan lines effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {Array.from({ length: 50 }).map((_, i) => (
            <div 
              key={i} 
              className="h-px bg-cyan-500 w-full"
              style={{ marginTop: `${i * 20}px` }}
            />
          ))}
        </div>
      </div>
    </Html>
  );
};

// Main Ready Player One Terrain Component
const ReadyPlayerOneTerrain: React.FC<ReadyPlayerOneTerrainProps> = ({
  season,
  entryMode = 'satellite',
  onEntryComplete,
}) => {
  const [isEntering, setIsEntering] = useState(entryMode !== 'ground');
  const config = SEASON_CONFIGS[season];

  const handleEntryComplete = () => {
    setIsEntering(false);
    onEntryComplete?.();
  };

  // Generate mountain ranges
  const mountainRanges = useMemo(() => {
    const mountains: Array<{
      position: [number, number, number];
      height: number;
      radius: number;
    }> = [];

    // Northern range
    for (let i = 0; i < 20; i++) {
      const x = (i - 10) * 60 + (Math.random() - 0.5) * 30;
      mountains.push({
        position: [x, 0, -300 + (Math.random() - 0.5) * 100],
        height: 80 + Math.random() * 100,
        radius: 25 + Math.random() * 25,
      });
    }

    // Eastern range
    for (let i = 0; i < 15; i++) {
      const z = (i - 7) * 50;
      mountains.push({
        position: [350 + (Math.random() - 0.5) * 50, 0, z],
        height: 60 + Math.random() * 80,
        radius: 20 + Math.random() * 20,
      });
    }

    // Western range
    for (let i = 0; i < 15; i++) {
      const z = (i - 7) * 50;
      mountains.push({
        position: [-350 + (Math.random() - 0.5) * 50, 0, z],
        height: 60 + Math.random() * 80,
        radius: 20 + Math.random() * 20,
      });
    }

    return mountains;
  }, []);

  return (
    <group>
      {/* Entry Animation Controller - handled externally now */}
      {/* Central Landmark Peak */}
      <CentralPeak season={season} />
      
      {/* Mountain Ranges */}
      {mountainRanges.map((mountain, i) => (
        <EpicMountain
          key={i}
          position={mountain.position}
          height={mountain.height}
          baseRadius={mountain.radius}
          season={season}
          hasSnowCap={mountain.height > 100 || season === 'winter'}
        />
      ))}
      
      {/* Floating Islands (OASIS-style) */}
      {[
        [100, 80, -100, 15],
        [-120, 100, -80, 12],
        [80, 120, 50, 18],
        [-60, 90, 100, 10],
        [0, 150, -150, 20],
      ].map(([x, y, z, size], i) => (
        <FloatingIsland
          key={i}
          position={[x, y, z]}
          size={size}
          season={season}
        />
      ))}
      
      {/* Atmospheric clouds */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Cloud
          key={i}
          position={[
            (Math.random() - 0.5) * 600,
            100 + Math.random() * 100,
            (Math.random() - 0.5) * 600
          ]}
          opacity={0.4}
          speed={0.1}
          segments={20}
        />
      ))}
      
      {/* Stars (visible during entry and at night) */}
      <Stars 
        radius={400} 
        depth={100} 
        count={8000} 
        factor={6} 
        saturation={0} 
        fade 
        speed={0.5} 
      />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000, 64, 64]} />
        <meshStandardMaterial 
          color={config.groundColor}
          roughness={0.8}
        />
      </mesh>
      
      {/* Valley in the center (playable area) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[150, 32]} />
        <meshStandardMaterial 
          color={config.grassColor}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
};

export { ReadyPlayerOneTerrain };
export default ReadyPlayerOneTerrain;
