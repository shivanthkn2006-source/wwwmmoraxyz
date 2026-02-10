// ═══════════════════════════════════════════════════════════════════════════════
// SEASONS SYSTEM - Four Seasons with Dynamic Environment Changes
// Winter, Spring, Summer, Fall with weather, lighting, and visual effects
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

export interface SeasonConfig {
  skyColor: string;
  groundColor: string;
  fogColor: string;
  fogDensity: number;
  sunPosition: [number, number, number];
  sunIntensity: number;
  ambientIntensity: number;
  temperature: number; // -20 to 40 Celsius
  weatherProbability: {
    clear: number;
    rain: number;
    snow: number;
    fog: number;
    storm: number;
  };
  treeColors: string[];
  grassColor: string;
  waterColor: string;
}

// Season configurations
export const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  winter: {
    skyColor: '#b0c4de',
    groundColor: '#f0f8ff',
    fogColor: '#e8f4f8',
    fogDensity: 0.02,
    sunPosition: [100, 30, 100],
    sunIntensity: 0.6,
    ambientIntensity: 0.4,
    temperature: -5,
    weatherProbability: { clear: 0.3, rain: 0, snow: 0.5, fog: 0.15, storm: 0.05 },
    treeColors: ['#2d4a3e', '#1a3328'],
    grassColor: '#f5f5f5',
    waterColor: '#a5c8d4',
  },
  spring: {
    skyColor: '#87ceeb',
    groundColor: '#90ee90',
    fogColor: '#e0f0e0',
    fogDensity: 0.008,
    sunPosition: [100, 60, 100],
    sunIntensity: 0.9,
    ambientIntensity: 0.5,
    temperature: 15,
    weatherProbability: { clear: 0.5, rain: 0.35, snow: 0, fog: 0.1, storm: 0.05 },
    treeColors: ['#90ee90', '#98fb98', '#00ff7f', '#32cd32'],
    grassColor: '#7cfc00',
    waterColor: '#4169e1',
  },
  summer: {
    skyColor: '#1e90ff',
    groundColor: '#228b22',
    fogColor: '#f0f8ff',
    fogDensity: 0.003,
    sunPosition: [100, 80, 100],
    sunIntensity: 1.2,
    ambientIntensity: 0.6,
    temperature: 28,
    weatherProbability: { clear: 0.7, rain: 0.1, snow: 0, fog: 0.05, storm: 0.15 },
    treeColors: ['#228b22', '#006400', '#2e8b57'],
    grassColor: '#32cd32',
    waterColor: '#00ced1',
  },
  fall: {
    skyColor: '#deb887',
    groundColor: '#d2691e',
    fogColor: '#f5deb3',
    fogDensity: 0.01,
    sunPosition: [100, 45, 100],
    sunIntensity: 0.8,
    ambientIntensity: 0.45,
    temperature: 12,
    weatherProbability: { clear: 0.4, rain: 0.3, snow: 0.05, fog: 0.2, storm: 0.05 },
    treeColors: ['#ff6347', '#ff8c00', '#ffd700', '#dc143c', '#8b4513'],
    grassColor: '#daa520',
    waterColor: '#5f9ea0',
  },
};

// Get current real-world season based on date and hemisphere
export const getCurrentRealSeason = (hemisphere: 'north' | 'south' = 'north'): Season => {
  const month = new Date().getMonth();
  const northSeasons: Record<number, Season> = {
    0: 'winter', 1: 'winter', 2: 'spring',
    3: 'spring', 4: 'spring', 5: 'summer',
    6: 'summer', 7: 'summer', 8: 'fall',
    9: 'fall', 10: 'fall', 11: 'winter',
  };
  
  const season = northSeasons[month];
  if (hemisphere === 'south') {
    const opposite: Record<Season, Season> = {
      winter: 'summer', summer: 'winter',
      spring: 'fall', fall: 'spring',
    };
    return opposite[season];
  }
  return season;
};

// Seasonal Ground Component
export const SeasonalGround: React.FC<{ season: Season; size?: number }> = ({ 
  season, 
  size = 500 
}) => {
  const config = SEASON_CONFIGS[season];
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Snow accumulation for winter
  const snowHeight = useMemo(() => {
    if (season !== 'winter') return 0;
    return 0.3; // Snow depth
  }, [season]);

  return (
    <group>
      {/* Main ground */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, snowHeight, 0]} receiveShadow>
        <planeGeometry args={[size, size, 128, 128]} />
        <meshStandardMaterial 
          color={config.groundColor}
          roughness={season === 'winter' ? 0.3 : 0.8}
          metalness={season === 'winter' ? 0.1 : 0}
        />
      </mesh>
      
      {/* Snow layer for winter */}
      {season === 'winter' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial 
            color="#ffffff"
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      
      {/* Fallen leaves for fall */}
      {season === 'fall' && (
        <FallenLeaves count={500} areaSize={size * 0.6} />
      )}
    </group>
  );
};

// Fallen Leaves Component
const FallenLeaves: React.FC<{ count: number; areaSize: number }> = ({ count, areaSize }) => {
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  
  const leafColors = useMemo(() => ['#ff6347', '#ff8c00', '#ffd700', '#dc143c', '#8b4513'], []);
  
  useEffect(() => {
    if (!leavesRef.current) return;
    
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * areaSize,
        0.02 + Math.random() * 0.05,
        (Math.random() - 0.5) * areaSize
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(0.1 + Math.random() * 0.1);
      dummy.updateMatrix();
      leavesRef.current.setMatrixAt(i, dummy.matrix);
      
      color.set(leafColors[Math.floor(Math.random() * leafColors.length)]);
      leavesRef.current.setColorAt(i, color);
    }
    
    leavesRef.current.instanceMatrix.needsUpdate = true;
    if (leavesRef.current.instanceColor) {
      leavesRef.current.instanceColor.needsUpdate = true;
    }
  }, [count, areaSize, leafColors]);

  return (
    <instancedMesh ref={leavesRef} args={[undefined, undefined, count]}>
      <circleGeometry args={[0.5, 6]} />
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

// Seasonal Trees Component
export const SeasonalTrees: React.FC<{ 
  season: Season; 
  count?: number; 
  areaSize?: number 
}> = ({ season, count = 100, areaSize = 200 }) => {
  const config = SEASON_CONFIGS[season];
  const treesRef = useRef<THREE.Group>(null);
  
  const treePositions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * areaSize,
      z: (Math.random() - 0.5) * areaSize,
      scale: 0.8 + Math.random() * 0.6,
      colorIndex: Math.floor(Math.random() * config.treeColors.length),
    }));
  }, [count, areaSize, config.treeColors.length]);

  return (
    <group ref={treesRef}>
      {treePositions.map((tree, i) => (
        <SeasonalTree
          key={i}
          position={[tree.x, 0, tree.z]}
          scale={tree.scale}
          season={season}
          foliageColor={config.treeColors[tree.colorIndex]}
        />
      ))}
    </group>
  );
};

// Single Seasonal Tree
const SeasonalTree: React.FC<{
  position: [number, number, number];
  scale: number;
  season: Season;
  foliageColor: string;
}> = ({ position, scale, season, foliageColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animate tree sway
  useFrame((state) => {
    if (groupRef.current) {
      const windStrength = season === 'fall' ? 0.03 : 0.01;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime + position[0]) * windStrength;
    }
  });

  const trunkColor = season === 'winter' ? '#4a4a4a' : '#8b4513';
  const hasLeaves = season !== 'winter' || Math.random() > 0.7; // Some trees keep leaves in winter
  const snowCap = season === 'winter';

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color={trunkColor} />
      </mesh>
      
      {/* Foliage layers */}
      {hasLeaves && (
        <>
          <mesh position={[0, 5, 0]} castShadow>
            <coneGeometry args={[2, 3, 8]} />
            <meshStandardMaterial color={foliageColor} />
          </mesh>
          <mesh position={[0, 6.5, 0]} castShadow>
            <coneGeometry args={[1.5, 2.5, 8]} />
            <meshStandardMaterial color={foliageColor} />
          </mesh>
          <mesh position={[0, 7.8, 0]} castShadow>
            <coneGeometry args={[1, 2, 8]} />
            <meshStandardMaterial color={foliageColor} />
          </mesh>
        </>
      )}
      
      {/* Snow cap for winter */}
      {snowCap && (
        <>
          <mesh position={[0, 5.5, 0]}>
            <coneGeometry args={[2.1, 0.5, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <coneGeometry args={[1.6, 0.4, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 8.2, 0]}>
            <coneGeometry args={[1.1, 0.3, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}
    </group>
  );
};

// Season Lighting Component
export const SeasonLighting: React.FC<{ season: Season }> = ({ season }) => {
  const config = SEASON_CONFIGS[season];
  const lightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={config.ambientIntensity} color={config.skyColor} />
      
      {/* Sun/Directional Light */}
      <directionalLight
        ref={lightRef}
        position={config.sunPosition}
        intensity={config.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        color={season === 'winter' ? '#e8e8ff' : season === 'fall' ? '#ffe4b5' : '#ffffff'}
      />
      
      {/* Hemisphere Light for more natural lighting */}
      <hemisphereLight
        args={[config.skyColor, config.groundColor, 0.3]}
      />
    </>
  );
};

// Season Sky Component
export const SeasonSky: React.FC<{ season: Season }> = ({ season }) => {
  const config = SEASON_CONFIGS[season];
  
  const skyParams = useMemo(() => {
    switch (season) {
      case 'winter':
        return { turbidity: 8, rayleigh: 0.5, mieCoefficient: 0.01, mieDirectionalG: 0.8 };
      case 'spring':
        return { turbidity: 10, rayleigh: 2, mieCoefficient: 0.005, mieDirectionalG: 0.9 };
      case 'summer':
        return { turbidity: 10, rayleigh: 3, mieCoefficient: 0.003, mieDirectionalG: 0.99 };
      case 'fall':
        return { turbidity: 12, rayleigh: 1, mieCoefficient: 0.02, mieDirectionalG: 0.7 };
    }
  }, [season]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={config.sunPosition}
        {...skyParams}
      />
      
      {/* Clouds */}
      {season !== 'winter' && (
        <>
          {Array.from({ length: 15 }).map((_, i) => (
            <Cloud
              key={i}
              position={[
                (Math.random() - 0.5) * 400,
                50 + Math.random() * 30,
                (Math.random() - 0.5) * 400
              ]}
              opacity={0.5}
              speed={0.2}
              segments={20}
            />
          ))}
        </>
      )}
      
      {/* Stars visible in winter evenings */}
      {season === 'winter' && (
        <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} fade speed={1} />
      )}
    </>
  );
};

// Season Fog Component
export const SeasonFog: React.FC<{ season: Season }> = ({ season }) => {
  const { scene } = useThree();
  const config = SEASON_CONFIGS[season];
  
  useEffect(() => {
    scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    scene.background = new THREE.Color(config.skyColor);
    
    return () => {
      scene.fog = null;
    };
  }, [scene, config]);

  return null;
};

// Main Seasons Environment Component
export const SeasonsEnvironment: React.FC<{
  season: Season;
  showTrees?: boolean;
  showGround?: boolean;
  areaSize?: number;
}> = ({ 
  season, 
  showTrees = true, 
  showGround = true,
  areaSize = 300 
}) => {
  return (
    <group>
      <SeasonLighting season={season} />
      <SeasonSky season={season} />
      <SeasonFog season={season} />
      
      {showGround && <SeasonalGround season={season} size={areaSize} />}
      {showTrees && <SeasonalTrees season={season} count={80} areaSize={areaSize * 0.7} />}
    </group>
  );
};

// Season Manager Hook
export const useSeasonManager = () => {
  const [currentSeason, setCurrentSeason] = useState<Season>(getCurrentRealSeason());
  const [autoSeasonEnabled, setAutoSeasonEnabled] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(1);

  const changeSeason = useCallback((newSeason: Season) => {
    setTransitionProgress(0);
    
    // Smooth transition animation
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setTransitionProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentSeason(newSeason);
        toast.success(`Season changed to ${newSeason}`, {
          description: `Temperature: ${SEASON_CONFIGS[newSeason].temperature}°C`,
        });
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  const cycleSeason = useCallback(() => {
    const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    const nextIndex = (currentIndex + 1) % seasons.length;
    changeSeason(seasons[nextIndex]);
  }, [currentSeason, changeSeason]);

  // Voice command listener
  useEffect(() => {
    const handleSeasonCommand = (event: CustomEvent) => {
      const { action } = event.detail;
      
      switch (action) {
        case 'set_winter':
          changeSeason('winter');
          break;
        case 'set_spring':
          changeSeason('spring');
          break;
        case 'set_summer':
          changeSeason('summer');
          break;
        case 'set_fall':
        case 'set_autumn':
          changeSeason('fall');
          break;
        case 'cycle_season':
        case 'next_season':
          cycleSeason();
          break;
        case 'auto_season':
          setAutoSeasonEnabled(prev => !prev);
          toast.info(autoSeasonEnabled ? 'Auto season disabled' : 'Auto season enabled');
          break;
      }
    };

    window.addEventListener('vr-season', handleSeasonCommand as EventListener);
    return () => window.removeEventListener('vr-season', handleSeasonCommand as EventListener);
  }, [changeSeason, cycleSeason, autoSeasonEnabled]);

  // Auto season based on real-world date
  useEffect(() => {
    if (!autoSeasonEnabled) return;
    
    const checkSeason = () => {
      const realSeason = getCurrentRealSeason();
      if (realSeason !== currentSeason) {
        changeSeason(realSeason);
      }
    };

    const interval = setInterval(checkSeason, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [autoSeasonEnabled, currentSeason, changeSeason]);

  return {
    currentSeason,
    setCurrentSeason: changeSeason,
    cycleSeason,
    transitionProgress,
    autoSeasonEnabled,
    setAutoSeasonEnabled,
    config: SEASON_CONFIGS[currentSeason],
  };
};

export default SeasonsEnvironment;
