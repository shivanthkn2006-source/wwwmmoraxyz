// ═══════════════════════════════════════════════════════════════════════════════
// VR FEATURE INTEGRATION COMPONENT
// Integrates all VR features (Weather, Buildings, Vehicles, Avatar, WebXR, Haptics)
// into the core VR OMEGA World
// UPGRADED: NPCs, Animals, Roads, Cars with full interaction
// SEASONS: Winter/Spring/Summer/Fall with geo-based avatars, buildings, vehicles
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useVRDHFLearning } from '@/hooks/useVRDHFLearning';
import { useVRAutoFix } from '@/hooks/useVRAutoFix';
import { useAuth } from '@/lib/auth';
import { NPCAvatarSystem } from './features/NPCAvatarSystem';
import { AnimalZooSystem } from './features/AnimalZooSystem';
import ProximityVoiceNarrator from './features/ProximityVoiceNarrator';
import { RotationController, useHardwareOptimization } from './features/VRControlSystem';
import { useSeasonManager, SeasonsEnvironment } from './features/SeasonsSystem';
import { SeasonalAvatar, useSeasonalAvatar } from './features/SeasonalAvatarSystem';
import { LocalPlayerAvatar } from './features/LocalPlayerAvatar';
import PlayerAvatarController from './features/PlayerAvatarController';
import CityBenches from './features/CityBenches';
import { SeasonalBuildingsGroup } from './features/SeasonalBuildings';
import { SeasonalVehiclesGroup } from './features/SeasonalVehicles';
import { ReadyPlayerOneTerrain, SatelliteEntryController } from './features/ReadyPlayerOneTerrain';
import { EverestMountainRange } from './features/EverestMountainRange';
import { CyclingTrailTerrain } from './features/CyclingTrailTerrain';
import { MountainRockFormations } from './features/MountainRockFormations';
import { ExpandedCityGrid, getCityPOIs } from './features/ExpandedCityGrid';
import { MetroTrainSystem } from './features/MetroTrainSystem';
import { F1CircuitSystem } from './features/F1CircuitSystem';
import { MetroFlyoverTrack } from './features/MetroFlyoverTrack';
import { YellowstoneSignBoard } from './features/YellowstoneSignBoard';
import { MetroDirectionSigns } from './features/MetroDirectionSigns';
import { PlatformCommuters } from './features/PlatformCommuters';
import { CitySkylineBackdrop } from './features/CitySkylineBackdrop';
import CityMarketDistrict from './features/CityMarketDistrict';
import CrowdAvatarSystem from './features/CrowdAvatarSystem';
import ScenicHeritageTrain from './features/ScenicHeritageTrain';
import CityBusSystem from './features/CityBusSystem';
import StreetLightSystem from './features/StreetLightSystem';
import { MotorcycleController } from './features/MotorcycleSystem';
const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;
const METRO_FALLBACK_UNLOCK_MS = 1200;
const SATELLITE_ENTRY_FAILSAFE_MS = 9000;
const PROXIMITY_SAMPLE_MS = 220;
const PROXIMITY_DELTA_MIN = 40;

// Weather particle system - with null safety for Safari/iOS
const WeatherParticles: React.FC<{ weather: string }> = ({ weather }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  
  const particleCount = weather === 'rain' ? 5000 : weather === 'snow' ? 2000 : 0;
  
  const positions = React.useMemo(() => {
    if (particleCount === 0) return new Float32Array(0);
    
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 50;
      pos[i + 1] = Math.random() * 30;
      pos[i + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!particlesRef.current || particleCount === 0) return;
    
    const posAttr = particlesRef.current.geometry.attributes.position;
    if (!posAttr) return;
    
    const posArray = posAttr.array as Float32Array;
    const speed = weather === 'rain' ? 20 : 5;
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i + 1] -= delta * speed;
      
      // Reset particle when it falls below ground
      if (posArray[i + 1] < 0) {
        posArray[i] = camera.position.x + (Math.random() - 0.5) * 50;
        posArray[i + 1] = 30;
        posArray[i + 2] = camera.position.z + (Math.random() - 0.5) * 50;
      }
    }
    
    posAttr.needsUpdate = true;
  });

  if (particleCount === 0 || positions.length === 0) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={weather === 'rain' ? 0.05 : 0.1}
        color={weather === 'rain' ? '#87ceeb' : '#ffffff'}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// Procedural building generator
const ProceduralBuilding: React.FC<{
  position: [number, number, number];
  type: string;
  scale?: number;
}> = ({ position, type, scale = 1 }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  const buildingConfig = React.useMemo(() => {
    const configs: Record<string, { color: string; height: number; width: number }> = {
      residential: { color: '#8b4513', height: 8, width: 4 },
      commercial: { color: '#4a90d9', height: 15, width: 6 },
      industrial: { color: '#6b7280', height: 10, width: 8 },
      hospital: { color: '#ffffff', height: 12, width: 10 },
      school: { color: '#fcd34d', height: 6, width: 12 },
      fire_station: { color: '#ef4444', height: 5, width: 6 },
      police_station: { color: '#1e40af', height: 6, width: 8 },
      gym: { color: '#f97316', height: 4, width: 10 },
      restaurant: { color: '#84cc16', height: 3, width: 5 },
      stadium: { color: '#7c3aed', height: 20, width: 30 },
    };
    return configs[type] || configs.residential;
  }, [type]);

  return (
    <group ref={meshRef} position={position} scale={[scale, scale, scale]}>
      {/* Main building body */}
      <mesh position={[0, buildingConfig.height / 2, 0]}>
        <boxGeometry args={[buildingConfig.width, buildingConfig.height, buildingConfig.width]} />
        <meshStandardMaterial color={buildingConfig.color} metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Windows */}
      {Array.from({ length: Math.floor(buildingConfig.height / 2) }).map((_, floor) => (
        <React.Fragment key={floor}>
          {Array.from({ length: 3 }).map((_, window) => (
            <mesh
              key={`${floor}-${window}`}
              position={[
                (window - 1) * (buildingConfig.width / 4),
                floor * 2 + 1.5,
                buildingConfig.width / 2 + 0.01
              ]}
            >
              <boxGeometry args={[0.8, 1, 0.02]} />
              <meshStandardMaterial
                color="#87ceeb"
                emissive="#87ceeb"
                emissiveIntensity={0.2}
              />
            </mesh>
          ))}
        </React.Fragment>
      ))}
      
      {/* Roof */}
      <mesh position={[0, buildingConfig.height + 0.5, 0]}>
        <boxGeometry args={[buildingConfig.width + 0.5, 1, buildingConfig.width + 0.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
};

// Vehicle component
const Vehicle: React.FC<{
  position: [number, number, number];
  type: string;
  isActive: boolean;
}> = ({ position, type, isActive }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  const vehicleColor = React.useMemo(() => {
    const colors: Record<string, string> = {
      car: '#ef4444',
      truck: '#3b82f6',
      motorcycle: '#22c55e',
      helicopter: '#f59e0b',
      boat: '#06b6d4',
    };
    return colors[type] || '#888888';
  }, [type]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isActive) {
      // Active vehicle = "engine on" => move forward so it feels like it's running
      meshRef.current.position.z -= delta * 6;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;

      // Loop vehicle around the play area
      if (meshRef.current.position.z < -120) {
        meshRef.current.position.z = 120;
      }
    } else {
      // Keep parked vehicles stable at their spawn position
      meshRef.current.position.x = position[0];
      meshRef.current.position.y = position[1];
      meshRef.current.position.z = position[2];
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Vehicle body */}
      <mesh>
        <boxGeometry args={[2, 0.8, 4]} />
        <meshStandardMaterial
          color={vehicleColor}
          metalness={0.6}
          roughness={0.3}
          emissive={isActive ? vehicleColor : '#000000'}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.6, 0.6, 2]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Wheels */}
      {[[-0.8, -0.3, 1.2], [0.8, -0.3, 1.2], [-0.8, -0.3, -1.2], [0.8, -0.3, -1.2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      
      {/* Headlights */}
      {isActive && (
        <>
          <pointLight position={[0.6, 0.2, 2.1]} color="#ffff99" intensity={0.5} distance={10} />
          <pointLight position={[-0.6, 0.2, 2.1]} color="#ffff99" intensity={0.5} distance={10} />
        </>
      )}
    </group>
  );
};

// Main VR Feature Integration Component
interface VRFeatureIntegrationProps {
  onFeatureEvent?: (feature: string, action: string, data?: any) => void;
  enableSatelliteEntry?: boolean;
  localDisplayName?: string;
  showTerrain?: boolean;
  showCity?: boolean;
  showInteractives?: boolean;
  showMetroSystem?: boolean;
  showF1System?: boolean;
  showNPCSystems?: boolean;
  showAnimalSystems?: boolean;
  showWeatherSystem?: boolean;
  showPOILabels?: boolean;
}

export const VRFeatureIntegration: React.FC<VRFeatureIntegrationProps> = ({ 
  onFeatureEvent,
  enableSatelliteEntry = true,
  localDisplayName = '@player',
  showTerrain = true,
  showCity = true,
  showInteractives = true,
  showMetroSystem: showMetroSystemProp = true,
  showF1System: showF1SystemProp = true,
  showNPCSystems = true,
  showAnimalSystems = true,
  showWeatherSystem = true,
  showPOILabels = true,
}) => {
  const { camera } = useThree();
  const { user } = useAuth();
  const resolvedLocalDisplayName = useMemo(() => {
    if (localDisplayName && localDisplayName !== '@player') return localDisplayName;

    const source =
      (user?.user_metadata?.username as string | undefined) ||
      (user?.user_metadata?.full_name as string | undefined) ||
      user?.email?.split('@')[0] ||
      user?.id?.slice(0, 6) ||
      'player';

    const normalized = source.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'player';
    return `@${normalized}`;
  }, [localDisplayName, user]);
  const [currentWeather, setCurrentWeather] = useState<string>('clear');
  // Real-world timezone-based time of day
  const [timeOfDay, setTimeOfDay] = useState<string>(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'night';
    if (hour < 7) return 'dawn';
    if (hour < 17) return 'day';
    if (hour < 19) return 'dusk';
    return 'night';
  });
  const [buildings, setBuildings] = useState<Array<{ id: string; position: [number, number, number]; type: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; position: [number, number, number]; type: string; isActive: boolean }>>([]);
  const [activeVehicle, setActiveVehicle] = useState<string | null>(null);
  const vehiclesRef = useRef(vehicles);
  const activeVehicleRef = useRef(activeVehicle);
  const [trees, setTrees] = useState<Array<{ id: string; position: [number, number, number]; scale: number }>>([]);
  const [roads, setRoads] = useState<Array<{ id: string; start: [number, number, number]; end: [number, number, number] }>>([]);
  const [hasEnteredWorld, setHasEnteredWorld] = useState(!enableSatelliteEntry);
  const [heavySystemsReady, setHeavySystemsReady] = useState(false);
  const [metroReady, setMetroReady] = useState(false);
  const [metroFallbackUnlocked, setMetroFallbackUnlocked] = useState(false);
  const [f1Ready, setF1Ready] = useState(false);
  const [npcReady, setNpcReady] = useState(false);
  const [animalReady, setAnimalReady] = useState(false);
  const [cityReady, setCityReady] = useState(false);
  const [metroLatched, setMetroLatched] = useState(false);
  const [f1Latched, setF1Latched] = useState(false);
  // Staggered terrain sub-gates to prevent GPU burst
  const [mountainsReady, setMountainsReady] = useState(false);
  const [skylineReady, setSkylineReady] = useState(false);
  const [flyoverReady, setFlyoverReady] = useState(false);

  const METRO_ENTER_DISTANCE = 500;
  const METRO_EXIT_DISTANCE = 420;
  const F1_ENTER_DISTANCE = 560;
  const F1_EXIT_DISTANCE = 640;

  const [nearMetroRing, setNearMetroRing] = useState(
    () => Math.hypot(camera.position.x - CITY_OFFSET_X, camera.position.z - CITY_OFFSET_Z) >= METRO_ENTER_DISTANCE,
  );
  const [nearF1Zone, setNearF1Zone] = useState(
    () => Math.hypot(camera.position.x - 1100, camera.position.z + 500) <= F1_ENTER_DISTANCE,
  );
  const nearMetroRingRef = useRef(nearMetroRing);
  const nearF1ZoneRef = useRef(nearF1Zone);
  const proximitySampleAtRef = useRef(0);

  useFrame((state) => {
    const nowMs = state.clock.elapsedTime * 1000;
    if (nowMs - proximitySampleAtRef.current < PROXIMITY_SAMPLE_MS) return;

    proximitySampleAtRef.current = nowMs;
    const cityDistance = Math.hypot(camera.position.x - CITY_OFFSET_X, camera.position.z - CITY_OFFSET_Z);
    const f1Distance = Math.hypot(camera.position.x - 1100, camera.position.z + 500);

    const nextNearMetro = nearMetroRingRef.current
      ? cityDistance >= METRO_EXIT_DISTANCE
      : cityDistance >= METRO_ENTER_DISTANCE;
    if (nextNearMetro !== nearMetroRingRef.current) {
      nearMetroRingRef.current = nextNearMetro;
      setNearMetroRing(nextNearMetro);
    }

    const nextNearF1 = nearF1ZoneRef.current
      ? f1Distance <= F1_EXIT_DISTANCE
      : f1Distance <= F1_ENTER_DISTANCE;
    if (nextNearF1 !== nearF1ZoneRef.current) {
      nearF1ZoneRef.current = nextNearF1;
      setNearF1Zone(nextNearF1);
    }
  });

  const showMetroSystem = showMetroSystemProp && hasEnteredWorld;
  const showF1System = showF1SystemProp && (nearF1Zone || f1Latched);

  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  useEffect(() => {
    activeVehicleRef.current = activeVehicle;
  }, [activeVehicle]);

  // Seasons System Integration
  const seasonManager = useSeasonManager();
  const { currentSeason, config: seasonConfig, setCurrentSeason } = seasonManager;
  const avatarManager = useSeasonalAvatar();

  const { trackWeatherChange, trackBuildingCreation, trackVehicleAction } = useVRDHFLearning();
  const { detectIssue, autoFixIssue, isAuthorized } = useVRAutoFix();
  
  // Sync avatar with current season
  useEffect(() => {
    avatarManager.setSeason(currentSeason);
    onFeatureEvent?.('season', 'change', { season: currentSeason });
  }, [currentSeason, onFeatureEvent]);

  // Report VR errors to global scanner queue
  const reportVRError = useCallback((message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    // Add to global VR error queue for scanner
    const vrErrors = (window as any).__vrErrors || [];
    vrErrors.push({
      message,
      severity,
      location: 'VRFeatureIntegration',
      timestamp: new Date().toISOString(),
    });
    (window as any).__vrErrors = vrErrors.slice(-20); // Keep last 20
    
    // Also dispatch event for VRAutoFix
    window.dispatchEvent(new CustomEvent('vr-error', {
      detail: { type: 'environment_glitch', description: message, severity }
    }));
  }, []);

  // Listen for VR fix events from the main scanner
  useEffect(() => {
    const handleForceRerender = () => {
      console.log('[VRFeatureIntegration] Force re-render requested');
      setCurrentWeather(prev => prev); // Trigger re-render
    };
    
    const handleReloadEnvironment = () => {
      console.log('[VRFeatureIntegration] Environment reload requested');
      setBuildings([]);
      setVehicles([]);
      setTrees([]);
      setRoads([]);
      setCurrentWeather('clear');
      setTimeOfDay('day');
    };
    
    const handleClearCache = () => {
      console.log('[VRFeatureIntegration] VR cache clear requested');
      (window as any).__vrErrors = [];
    };
    
    const handleResetPhysics = () => {
      console.log('[VRFeatureIntegration] Physics reset requested');
      setVehicles(prev => prev.map(v => ({ ...v, isActive: false })));
      setActiveVehicle(null);
    };

    window.addEventListener('vr-force-rerender', handleForceRerender);
    window.addEventListener('vr-reload-environment', handleReloadEnvironment);
    window.addEventListener('vr-clear-cache', handleClearCache);
    window.addEventListener('vr-reset-physics', handleResetPhysics);

    return () => {
      window.removeEventListener('vr-force-rerender', handleForceRerender);
      window.removeEventListener('vr-reload-environment', handleReloadEnvironment);
      window.removeEventListener('vr-clear-cache', handleClearCache);
      window.removeEventListener('vr-reset-physics', handleResetPhysics);
    };
  }, []);

  // Real-world clock sync: listen to SunLightCycle hour broadcasts + fallback interval
  useEffect(() => {
    const syncFromSunCycle = (e: Event) => {
      const hour = (e as CustomEvent).detail?.hour;
      if (typeof hour !== 'number') return;
      const nextTime = hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 17 ? 'day' : hour < 19 ? 'dusk' : 'night';
      setTimeOfDay(nextTime);
    };
    window.addEventListener('vr-sun-hour-change', syncFromSunCycle);

    const syncRealWorldTime = () => {
      const hour = new Date().getHours();
      const nextTime = hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 17 ? 'day' : hour < 19 ? 'dusk' : 'night';
      setTimeOfDay(nextTime);
    };
    const interval = setInterval(syncRealWorldTime, 60_000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('vr-sun-hour-change', syncFromSunCycle);
    };
  }, []);

  // Handle SPAWN commands for forests, roads, cars
  useEffect(() => {
    const CITY_ROAD_SPACING = 400;
    const CITY_ROAD_CLEARANCE = 56;

    const isNearRoadAxis = (value: number, clearance: number = CITY_ROAD_CLEARANCE): boolean => {
      const nearestRoad = Math.round(value / CITY_ROAD_SPACING) * CITY_ROAD_SPACING;
      return Math.abs(value - nearestRoad) < clearance;
    };

    const pushOffRoadAxis = (value: number, clearance: number = CITY_ROAD_CLEARANCE): number => {
      const nearestRoad = Math.round(value / CITY_ROAD_SPACING) * CITY_ROAD_SPACING;
      const delta = value - nearestRoad;

      if (Math.abs(delta) < clearance) {
        const direction = delta === 0 ? 1 : Math.sign(delta);
        return nearestRoad + direction * clearance;
      }

      return value;
    };

    const ensureOffRoadPosition = (
      x: number,
      z: number,
      clearance: number = CITY_ROAD_CLEARANCE,
    ): [number, number] => [pushOffRoadAxis(x, clearance), pushOffRoadAxis(z, clearance)];

    const handleSpawn = (e: CustomEvent) => {
      const { type, count = 1, style } = e.detail;
      console.log(`[VRFeatureIntegration] Spawning: ${type} x${count}`);
      
      switch (type) {
        case 'forest': {
          const createTreePosition = (): [number, number, number] => {
            for (let i = 0; i < 24; i++) {
              const angle = Math.random() * Math.PI * 2;
              const distance = 260 + Math.random() * 520;
              const rawX = Math.cos(angle) * distance;
              const rawZ = Math.sin(angle) * distance;
              const [safeX, safeZ] = ensureOffRoadPosition(rawX, rawZ, CITY_ROAD_CLEARANCE + 10);
              const inCityBounds = Math.abs(safeX) <= 790 && Math.abs(safeZ) <= 790;
              if (inCityBounds && !isNearRoadAxis(safeX) && !isNearRoadAxis(safeZ)) {
                return [safeX, 0, safeZ];
              }
            }

            const [fallbackX, fallbackZ] = ensureOffRoadPosition(
              300 + Math.random() * 220,
              -300 - Math.random() * 220,
              CITY_ROAD_CLEARANCE + 14,
            );
            return [fallbackX, 0, fallbackZ];
          };

          const newTrees = Array.from({ length: count }, () => ({
            id: crypto.randomUUID(),
            position: createTreePosition(),
            scale: 0.8 + Math.random() * 0.6,
          }));
          setTrees(prev => [...prev, ...newTrees]);
          onFeatureEvent?.('forest', 'spawn', { count: newTrees.length });
          break;
        }
          
        case 'car':
          const newCar = {
            id: crypto.randomUUID(),
            position: [
              (Math.random() - 0.5) * 20,
              0.5,
              (Math.random() - 0.5) * 20
            ] as [number, number, number],
            type: 'car',
            isActive: false,
          };
          setVehicles(prev => [...prev, newCar]);
          trackVehicleAction('spawn', 'car');
          onFeatureEvent?.('vehicle', 'spawn', { type: 'car' });
          break;
          
        case 'road':
          const newRoad = {
            id: crypto.randomUUID(),
            start: [-30, 0.15, (Math.random() - 0.5) * 40] as [number, number, number],
            end: [30, 0.15, (Math.random() - 0.5) * 40] as [number, number, number],
          };
          setRoads(prev => [...prev, newRoad]);
          onFeatureEvent?.('road', 'create', { road: newRoad });
          break;
          
        case 'city':
          // Spawn multiple buildings while preserving road corridors
          const cityBuildings = Array.from({ length: 15 }, (_, i) => {
            const angle = (i / 15) * Math.PI * 2 + Math.random() * 0.18;
            const radius = 220 + (i % 3) * 95 + Math.random() * 25;
            const [safeX, safeZ] = ensureOffRoadPosition(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              CITY_ROAD_CLEARANCE + 18,
            );

            return {
              id: crypto.randomUUID(),
              position: [safeX, 0, safeZ] as [number, number, number],
              type: ['residential', 'commercial', 'industrial'][Math.floor(Math.random() * 3)],
            };
          });
          setBuildings(prev => [...prev, ...cityBuildings]);
          onFeatureEvent?.('city', 'generate', { style, count: cityBuildings.length });
          break;
      }
    };

    window.addEventListener('vr-spawn', handleSpawn as EventListener);
    return () => window.removeEventListener('vr-spawn', handleSpawn as EventListener);
  }, [trackVehicleAction, onFeatureEvent]);

  // Handle environment changes
  useEffect(() => {
    const handleEnvironment = (e: CustomEvent) => {
      const action = e.detail.action as string;
      
      if (action.includes('rain') || action.includes('snow') || action.includes('sunny') || action.includes('cloudy') || action.includes('storm') || action.includes('fog')) {
        const weather = action.replace('set_', '');
        setCurrentWeather(weather);
        trackWeatherChange(weather, 'user');
        onFeatureEvent?.('weather', 'change', { weather });
      }
      
      if (action.includes('day') || action.includes('night') || action.includes('dawn') || action.includes('dusk')) {
        const time = action.replace('set_', '');
        setTimeOfDay(time);
        onFeatureEvent?.('time', 'change', { time });
      }
    };

    const cityPOIs = getCityPOIs().map((poi) => ({
      ...poi,
      position: [
        poi.position[0] + CITY_OFFSET_X,
        poi.position[1],
        poi.position[2] + CITY_OFFSET_Z,
      ] as [number, number, number],
    }));

    const findPOIByText = (value?: string) => {
      if (!value) return null;
      const normalized = value.toLowerCase();
      return cityPOIs.find((poi) => {
        const name = poi.name.toLowerCase();
        const type = poi.type.toLowerCase();
        return normalized.includes(name) || name.includes(normalized) || normalized.includes(type);
      }) || null;
    };

    const teleportToPOI = (poi: { position: [number, number, number]; name: string }) => {
      window.dispatchEvent(new CustomEvent('vr-teleport', {
        detail: {
          position: [poi.position[0], 1.6, poi.position[2] + 14],
          lookAt: [poi.position[0], 1.6, poi.position[2]],
          lockGround: true,
        }
      }));
    };

    const handleBuild = (e: CustomEvent) => {
      const type = e.detail.type as string;
      const rawX = (Math.random() - 0.5) * 760;
      const rawZ = (Math.random() - 0.5) * 760;
      const nearestRoadX = Math.abs(rawX - Math.round(rawX / 400) * 400);
      const nearestRoadZ = Math.abs(rawZ - Math.round(rawZ / 400) * 400);
      const buildClearance = nearestRoadX < nearestRoadZ ? 74 : 62;
      const [safeX, safeZ] = [
        (() => {
          const nearestRoad = Math.round(rawX / 400) * 400;
          const delta = rawX - nearestRoad;
          return Math.abs(delta) < buildClearance ? nearestRoad + (delta === 0 ? 1 : Math.sign(delta)) * buildClearance : rawX;
        })(),
        (() => {
          const nearestRoad = Math.round(rawZ / 400) * 400;
          const delta = rawZ - nearestRoad;
          return Math.abs(delta) < buildClearance ? nearestRoad + (delta === 0 ? 1 : Math.sign(delta)) * buildClearance : rawZ;
        })(),
      ];

      const newBuilding = {
        id: crypto.randomUUID(),
        position: [safeX, 0, safeZ] as [number, number, number],
        type,
      };
      setBuildings(prev => [...prev, newBuilding]);
      trackBuildingCreation(type, { x: newBuilding.position[0], y: newBuilding.position[1], z: newBuilding.position[2] });
      onFeatureEvent?.('building', 'create', { type, position: newBuilding.position });
    };

    const handleVehicle = (e: CustomEvent) => {
      const action = e.detail.action as string;
      const vehicleId = e.detail.vehicleId as string | undefined;
      const vehicleSnapshot = vehiclesRef.current;
      const activeVehicleSnapshot = activeVehicleRef.current;

      if (action === 'enter_vehicle') {
        const targetVehicle = vehicleId
          ? vehicleSnapshot.find(v => v.id === vehicleId)
          : vehicleSnapshot.find(v => !v.isActive);

        if (targetVehicle) {
          setActiveVehicle(targetVehicle.id);
          setVehicles(prev => prev.map(v => ({ ...v, isActive: v.id === targetVehicle.id })));
          trackVehicleAction('enter', targetVehicle.type);
        }
      } else if (action === 'exit_vehicle') {
        setActiveVehicle(null);
        setVehicles(prev => prev.map(v => ({ ...v, isActive: false })));
        trackVehicleAction('exit');
      } else if (action === 'spawn_vehicle') {
        const newVehicle = {
          id: crypto.randomUUID(),
          position: [
            (Math.random() - 0.5) * 20,
            0.5,
            (Math.random() - 0.5) * 20
          ] as [number, number, number],
          type: 'car',
          isActive: false,
        };
        setVehicles(prev => [...prev, newVehicle]);
        trackVehicleAction('spawn', 'car');
      } else if (action === 'start_all_cars') {
        setVehicles(prev => prev.map(v => ({ ...v, isActive: true })));
      } else if (action === 'stop_all_cars') {
        setVehicles(prev => prev.map(v => ({ ...v, isActive: false })));
        setActiveVehicle(null);
      } else if (['drive', 'drive_slow', 'drive_medium', 'drive_fast', 'accelerate', 'start_engine', 'manual_drive', 'autopilot'].includes(action)) {
        if (activeVehicleSnapshot) {
          setVehicles(prev => prev.map(v => ({ ...v, isActive: v.id === activeVehicleSnapshot ? true : v.isActive })));
        } else {
          const firstVehicle = vehicleSnapshot[0];
          if (firstVehicle) {
            setActiveVehicle(firstVehicle.id);
            setVehicles(prev => prev.map(v => ({ ...v, isActive: v.id === firstVehicle.id })));
          }
        }
      } else if (['brake', 'park', 'stop_engine'].includes(action)) {
        setVehicles(prev => prev.map(v => ({ ...v, isActive: false })));
      }

      onFeatureEvent?.('vehicle', action, { activeVehicle: activeVehicleRef.current });
    };

    const handleDoor = (e: CustomEvent) => {
      const action = e.detail?.action as string;
      onFeatureEvent?.('door', action || 'interact');
    };

    const handleSearch = (e: CustomEvent) => {
      const query = (e.detail?.query || '') as string;
      const type = (e.detail?.type || '') as string;
      const poi = findPOIByText(query || type);
      if (poi) {
        teleportToPOI(poi);
      }
      onFeatureEvent?.('search', e.detail?.action || 'search', { query, type, result: poi?.name || null });
    };

    const handleMap = (e: CustomEvent) => {
      const action = e.detail?.action as string;
      if (action === 'show_map') {
        window.dispatchEvent(new CustomEvent('vr-view-transition', { detail: { mode: 'aerial' } }));
      }
      onFeatureEvent?.('map', action || 'show_map');
    };

    const handleNavigate = (e: CustomEvent) => {
      const command = (e.detail?.command || '') as string;
      const poi = findPOIByText(command);
      if (poi) {
        teleportToPOI(poi);
      }
      onFeatureEvent?.('navigation', e.detail?.action || 'navigate', { command, result: poi?.name || null });
    };

    const handleRepair = async (e: CustomEvent) => {
      const action = (e.detail?.action || 'repair') as string;
      const issue = detectIssue('environment_glitch', `Voice repair command: ${action}`, 'medium');
      if (isAuthorized) {
        await autoFixIssue(issue);
      }
      onFeatureEvent?.('repair', action);
    };

    const handleSyncWeather = () => {
      setCurrentWeather('cloudy');
      trackWeatherChange('cloudy', 'real_sync');
      onFeatureEvent?.('weather', 'sync_real_weather', { weather: 'cloudy' });
    };

    const handleSyncTime = () => {
      const hour = new Date().getHours();
      const nextTime = hour < 6 ? 'night' : hour < 9 ? 'dawn' : hour < 18 ? 'day' : hour < 20 ? 'dusk' : 'night';
      setTimeOfDay(nextTime);
      onFeatureEvent?.('time', 'sync_real_time', { time: nextTime });
    };

    const handleTemperature = (e: CustomEvent) => {
      onFeatureEvent?.('temperature', e.detail?.action || 'set_temperature', e.detail || {});
    };

    const handleHighlight = (e: CustomEvent) => {
      onFeatureEvent?.('highlight', e.detail?.type || 'unknown');
    };

    const handleRecreatePlace = (e: CustomEvent) => {
      onFeatureEvent?.('world', 'recreate_place', { command: e.detail?.command || '' });
    };

    const handleToggleSound = () => {
      onFeatureEvent?.('sound', 'toggle');
    };

    window.addEventListener('vr-environment', handleEnvironment as EventListener);
    window.addEventListener('vr-build', handleBuild as EventListener);
    window.addEventListener('vr-vehicle', handleVehicle as EventListener);
    window.addEventListener('vr-door', handleDoor as EventListener);
    window.addEventListener('vr-search', handleSearch as EventListener);
    window.addEventListener('vr-map', handleMap as EventListener);
    window.addEventListener('vr-navigate', handleNavigate as EventListener);
    window.addEventListener('vr-repair', handleRepair as EventListener);
    window.addEventListener('vr-sync-weather', handleSyncWeather as EventListener);
    window.addEventListener('vr-sync-time', handleSyncTime as EventListener);
    window.addEventListener('vr-temperature', handleTemperature as EventListener);
    window.addEventListener('vr-highlight', handleHighlight as EventListener);
    window.addEventListener('vr-recreate-place', handleRecreatePlace as EventListener);
    window.addEventListener('vr-toggle-sound', handleToggleSound as EventListener);

    return () => {
      window.removeEventListener('vr-environment', handleEnvironment as EventListener);
      window.removeEventListener('vr-build', handleBuild as EventListener);
      window.removeEventListener('vr-vehicle', handleVehicle as EventListener);
      window.removeEventListener('vr-door', handleDoor as EventListener);
      window.removeEventListener('vr-search', handleSearch as EventListener);
      window.removeEventListener('vr-map', handleMap as EventListener);
      window.removeEventListener('vr-navigate', handleNavigate as EventListener);
      window.removeEventListener('vr-repair', handleRepair as EventListener);
      window.removeEventListener('vr-sync-weather', handleSyncWeather as EventListener);
      window.removeEventListener('vr-sync-time', handleSyncTime as EventListener);
      window.removeEventListener('vr-temperature', handleTemperature as EventListener);
      window.removeEventListener('vr-highlight', handleHighlight as EventListener);
      window.removeEventListener('vr-recreate-place', handleRecreatePlace as EventListener);
      window.removeEventListener('vr-toggle-sound', handleToggleSound as EventListener);
    };
  }, [trackWeatherChange, trackBuildingCreation, trackVehicleAction, onFeatureEvent, detectIssue, autoFixIssue, isAuthorized]);

  // Time-based lighting - now handled by SunLightCycle in VROMEGAWorld
  // Keep season-specific overrides only
  const isNight = timeOfDay === 'night';

  // Get hardware-optimized settings
  const { settings: hwSettings } = useHardwareOptimization();

  // Keep entry state in sync when parent bypasses animation via fallback unlock
  useEffect(() => {
    if (!enableSatelliteEntry) {
      setHasEnteredWorld(true);
    }
  }, [enableSatelliteEntry]);

  // Failsafe: if satellite entry event is missed, auto-unlock world to avoid deadlock/freeze.
  useEffect(() => {
    if (!enableSatelliteEntry || hasEnteredWorld) return;

    const timer = window.setTimeout(() => {
      setHasEnteredWorld(true);
    }, SATELLITE_ENTRY_FAILSAFE_MS);

    return () => window.clearTimeout(timer);
  }, [enableSatelliteEntry, hasEnteredWorld]);

  // Auto-spawn initial trees when world is entered (120 trees spread across city)
  useEffect(() => {
    if (!hasEnteredWorld || trees.length > 0) return;

    const CITY_ROAD_SPACING = 400;
    const CITY_ROAD_CLEARANCE = 56;
    const pushOff = (value: number, clearance: number = CITY_ROAD_CLEARANCE): number => {
      const nearest = Math.round(value / CITY_ROAD_SPACING) * CITY_ROAD_SPACING;
      const d = value - nearest;
      return Math.abs(d) < clearance ? nearest + (d === 0 ? 1 : Math.sign(d)) * clearance : value;
    };

    const initialTrees = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 650;
      const rawX = Math.cos(angle) * dist;
      const rawZ = Math.sin(angle) * dist;
      return {
        id: crypto.randomUUID(),
        position: [pushOff(rawX), 0, pushOff(rawZ)] as [number, number, number],
        scale: 0.6 + Math.random() * 0.8,
      };
    });
    setTrees(initialTrees);
  }, [hasEnteredWorld]);

  // Stagger terrain sub-components to prevent simultaneous GPU burst
  useEffect(() => {
    if (!showTerrain || !hasEnteredWorld) {
      setMountainsReady(false);
      setSkylineReady(false);
      setFlyoverReady(false);
      return;
    }
    // Mountains first (1s after terrain), then flyover (2.5s), then skyline (4s)
    const t1 = window.setTimeout(() => setMountainsReady(true), 1000);
    const t2 = window.setTimeout(() => setFlyoverReady(true), 2500);
    const t3 = window.setTimeout(() => setSkylineReady(true), 4000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [showTerrain, hasEnteredWorld]);

  useEffect(() => {
    if (!showCity || !hasEnteredWorld) {
      setCityReady(false);
      return;
    }
    // Keep delay short to avoid long "frozen" feeling while entering world.
    const timer = window.setTimeout(() => setCityReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [showCity, hasEnteredWorld]);

  // Stagger heavy systems after interaction phase starts to avoid hard frame stalls
  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld) {
      setHeavySystemsReady(false);
      return;
    }
    // Load interactives quickly; subsystems still mount in sequence below.
    const timer = window.setTimeout(() => setHeavySystemsReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [showInteractives, hasEnteredWorld]);

  // Unlock metro on explicit train/metro intent first; keep a delayed fallback for deadlock safety.
  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld || !heavySystemsReady || !showMetroSystemProp || metroFallbackUnlocked) {
      return;
    }

    const unlockMetro = () => setMetroFallbackUnlocked(true);
    const voiceActions = new Set([
      'navigate_to_metro',
      'navigate_to_metro_entrance',
      'board_train',
      'exit_train',
      'force_train_horn',
      'teleport_to_train_1',
      'metro_status',
      'next_station',
    ]);

    const handleVoiceIntent = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      const action = customEvent.detail?.action;
      if (action && voiceActions.has(action)) {
        unlockMetro();
      }
    };

    const delayedFallback = window.setTimeout(unlockMetro, METRO_FALLBACK_UNLOCK_MS);

    window.addEventListener('vr-board-train', unlockMetro as EventListener);
    window.addEventListener('vr-force-horn', unlockMetro as EventListener);
    window.addEventListener('vr-voice-command', handleVoiceIntent as EventListener);
    window.addEventListener('vr-world-voice-action', handleVoiceIntent as EventListener);

    return () => {
      window.clearTimeout(delayedFallback);
      window.removeEventListener('vr-board-train', unlockMetro as EventListener);
      window.removeEventListener('vr-force-horn', unlockMetro as EventListener);
      window.removeEventListener('vr-voice-command', handleVoiceIntent as EventListener);
      window.removeEventListener('vr-world-voice-action', handleVoiceIntent as EventListener);
    };
  }, [showInteractives, hasEnteredWorld, heavySystemsReady, showMetroSystemProp, metroFallbackUnlocked]);

  // Latch proximity-gated systems once discovered so they don't flicker/unmount while moving.
  useEffect(() => {
    if (!showMetroSystemProp || !showInteractives || !hasEnteredWorld) {
      setMetroLatched(false);
      return;
    }

    if (nearMetroRing || metroFallbackUnlocked) {
      setMetroLatched(true);
    }
  }, [showMetroSystemProp, showInteractives, hasEnteredWorld, nearMetroRing, metroFallbackUnlocked]);

  useEffect(() => {
    if (!showF1SystemProp || !showInteractives || !hasEnteredWorld) {
      setF1Latched(false);
      return;
    }

    if (nearF1Zone) {
      setF1Latched(true);
    }
  }, [showF1SystemProp, showInteractives, hasEnteredWorld, nearF1Zone]);

  // Load heavy subsystems one-by-one with idle-aware scheduling.
  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld || !heavySystemsReady || !showMetroSystem || metroReady) {
      return;
    }

    const unlockMetro = () => setMetroReady(true);
    const timeoutId = window.setTimeout(unlockMetro, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showInteractives, hasEnteredWorld, heavySystemsReady, showMetroSystem, metroReady]);

  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld || !heavySystemsReady || !showF1System || f1Ready) {
      return;
    }

    // F1 waits for metro, but keep startup responsive.
    const timer = window.setTimeout(() => setF1Ready(true), metroReady ? 900 : 1800);
    return () => window.clearTimeout(timer);
  }, [showInteractives, hasEnteredWorld, heavySystemsReady, showF1System, metroReady, f1Ready]);

  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld || !heavySystemsReady || !showNPCSystems || npcReady) {
      return;
    }

    // NPCs should not be delayed for several seconds on first load.
    const timer = window.setTimeout(() => setNpcReady(true), f1Ready ? 1200 : 2600);
    return () => window.clearTimeout(timer);
  }, [showInteractives, hasEnteredWorld, heavySystemsReady, showNPCSystems, f1Ready, npcReady]);

  useEffect(() => {
    if (!showInteractives || !hasEnteredWorld || !heavySystemsReady || !showAnimalSystems || animalReady) {
      return;
    }

    // Animals still unlock last but without long idle dead-time.
    const timer = window.setTimeout(() => setAnimalReady(true), npcReady ? 1600 : 3400);
    return () => window.clearTimeout(timer);
  }, [showInteractives, hasEnteredWorld, heavySystemsReady, showAnimalSystems, npcReady, animalReady]);

  // Handle satellite entry completion
  const handleEntryComplete = useCallback(() => {
    setHasEnteredWorld(true);
    onFeatureEvent?.('world', 'entered', { entryType: 'satellite' });
  }, [onFeatureEvent]);

  return (
    <>
      {/* Satellite Entry Controller - God's View Entry */}
      {enableSatelliteEntry && !hasEnteredWorld && (
        <SatelliteEntryController onEntryComplete={handleEntryComplete} />
      )}
      
      {/* Seasons Environment System - lightweight colors/fog */}
      <SeasonsEnvironment season={currentSeason} />
      
      {/* Lightweight terrain shell during satellite entry (prevents pre-entry freeze) */}
      {showTerrain && !hasEnteredWorld && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} receiveShadow>
          <planeGeometry args={[1200, 1200, 4, 4]} />
          <meshStandardMaterial color={seasonConfig?.groundColor || '#2f3f2d'} roughness={0.95} />
        </mesh>
      )}

      {/* Full terrain stack only after entry completes */}
      {showTerrain && hasEnteredWorld && (
        <ReadyPlayerOneTerrain season={currentSeason} detailLevel={showCity ? 'medium' : 'low'} />
      )}
      
      {/* Phase 2: Yellow Stone National Park - EAST of city within 500m (staggered) */}
      {showTerrain && hasEnteredWorld && mountainsReady && (
        <group position={[450, 0, 0]}>
          <EverestMountainRange season={currentSeason} quality="medium" />
          <MountainRockFormations season={currentSeason} />
        </group>
      )}

      {/* Highway from city to mountains (east) - only after mountains ready */}
      {showTerrain && hasEnteredWorld && mountainsReady && (
        <group>
          {/* Highway road surface - runs east from city center to mountains */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[225, 0.16, 0]}>
            <planeGeometry args={[12, 450]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.85} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          {/* Highway center divider */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[225, 0.17, 0]}>
            <planeGeometry args={[0.2, 450]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
          </mesh>
          {/* Highway edge lines */}
          {[-5.5, 5.5].map((z, i) => (
            <mesh key={`hwy-edge-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[225, 0.17, z]}>
              <planeGeometry args={[0.25, 450]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          ))}
          {/* Gas Station 1 - halfway to mountains */}
          <group position={[200, 0, 18]}>
            <mesh position={[0, 2.5, 0]}>
              <boxGeometry args={[10, 5, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.6} />
            </mesh>
            <mesh position={[0, 5.2, 0]}>
              <boxGeometry args={[12, 0.3, 10]} />
              <meshStandardMaterial color="#1e293b" metalness={0.4} />
            </mesh>
            {/* Fuel pumps */}
            {[-2, 0, 2].map((x, i) => (
              <mesh key={`pump1-${i}`} position={[x, 1.2, -5]}>
                <boxGeometry args={[0.6, 2.4, 0.6]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.15} />
              </mesh>
            ))}
            <Text position={[0, 6, 0]} fontSize={1.2} color="#ffffff" anchorX="center" outlineWidth={0.08} outlineColor="#dc2626">
              ⛽ GAS STATION
            </Text>
          </group>
          {/* Gas Station 2 - near mountain base */}
          <group position={[370, 0, -16]}>
            <mesh position={[0, 2.5, 0]}>
              <boxGeometry args={[10, 5, 8]} />
              <meshStandardMaterial color="#2563eb" roughness={0.6} />
            </mesh>
            <mesh position={[0, 5.2, 0]}>
              <boxGeometry args={[12, 0.3, 10]} />
              <meshStandardMaterial color="#1e293b" metalness={0.4} />
            </mesh>
            {[-2, 0, 2].map((x, i) => (
              <mesh key={`pump2-${i}`} position={[x, 1.2, 5]}>
                <boxGeometry args={[0.6, 2.4, 0.6]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.15} />
              </mesh>
            ))}
            <Text position={[0, 6, 0]} fontSize={1.2} color="#ffffff" anchorX="center" outlineWidth={0.08} outlineColor="#2563eb">
              ⛽ MOUNTAIN GAS
            </Text>
          </group>
        </group>
      )}
      
      {/* Base interactive gate: don't mount interactive subsystems until heavy systems are ready */}
      {(() => {
        const interactiveBaseReady = showInteractives && hasEnteredWorld && heavySystemsReady;

        return (
          <>
            {/* Phase 3: Cycling trails - between city and mountains (east side) */}
            {interactiveBaseReady && (
              <group position={[300, 0, -50]}>
                <CyclingTrailTerrain season={currentSeason} />
              </group>
            )}
            
            {/* Rotation is controlled by VROMEGAWorld after satellite entry to avoid camera-controller conflicts */}
            
            {/* Phase 4+: Weather effects - only at ground level */}
            {interactiveBaseReady && showWeatherSystem && (
              <WeatherParticles weather={currentWeather} />
            )}
            
            {/* Fog for weather + season - lightweight */}
            {(currentWeather === 'fog' || currentWeather === 'storm' || currentSeason === 'winter') && (
              <fog
                attach="fog"
                args={[
                  seasonConfig?.fogColor || '#666666',
                  120,
                  8000,
                ]}
              />
            )}
            
            {/* Phase 4: Humanoid Player Avatar with Third-Person Camera */}
            {interactiveBaseReady && (
              <>
                <PlayerAvatarController displayName={resolvedLocalDisplayName} spawnPosition={[60, 0, 185]} />
                <CityBenches />
              </>
            )}
            
            {/* Phase 3: Seasonal Buildings - shifted slightly to clear player spawn lane */}
            {cityReady && (
              <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
                <SeasonalBuildingsGroup season={currentSeason} count={8} />
              </group>
            )}
            
            {/* Phase 4: Seasonal Vehicles - only at ground level */}
            {interactiveBaseReady && (
              <SeasonalVehiclesGroup season={currentSeason} count={6} />
            )}
            
            {/* EXPANDED 1-MILE CITY with named buildings every 500m */}
            {cityReady && (
              <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
                <ExpandedCityGrid showLabels={interactiveBaseReady && showPOILabels} />
              </group>
            )}
            
            {/* METRO TRAIN SYSTEM - delayed + guarded fallback unlock */}
            {interactiveBaseReady && showMetroSystem && metroReady && (
              <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
                <MetroTrainSystem isNight={isNight} />
              </group>
            )}
            
            {/* METRO FLYOVER TRACK - East-West elevated railway (staggered) */}
            {showTerrain && hasEnteredWorld && flyoverReady && (
              <MetroFlyoverTrack />
            )}
            
            {/* CITY SKYLINE BACKDROP - 360° building ring behind flyover (staggered last) */}
            {showTerrain && hasEnteredWorld && skylineReady && (
              <CitySkylineBackdrop isNight={isNight} />
            )}

            {/* STREET LIGHTS - Road-side lamps with day/night cycle */}
            {showTerrain && hasEnteredWorld && skylineReady && (
              <StreetLightSystem />
            )}

            {/* CITY MARKET DISTRICT - Stalls, shops, housing, construction, buses, banks, medical */}
            {showTerrain && hasEnteredWorld && skylineReady && (
              <CityMarketDistrict />
            )}

            {/* SCENIC HERITAGE TRAIN - ground-level narrow-gauge trains alongside roads */}
            {interactiveBaseReady && (
              <ScenicHeritageTrain />
            )}

            {/* CITY BUS SYSTEM - 5 buses on roads with engine + arrival sounds */}
            {interactiveBaseReady && (
              <CityBusSystem />
            )}

            {/* YELLOWSTONE ROAD SIGNS - highway directional signs (proximity-gated) */}
            {showTerrain && hasEnteredWorld && (
              <YellowstoneSignBoard />
            )}

            {/* METRO DIRECTION SIGNS - roadside signs pointing to stations (proximity-gated) */}
            {interactiveBaseReady && showMetroSystem && metroReady && (
              <MetroDirectionSigns />
            )}

            {/* PLATFORM COMMUTERS - only loads when user enters a station platform */}
            {interactiveBaseReady && showMetroSystem && metroReady && (
              <PlatformCommuters />
            )}
            
            {/* F1 OMEGA CIRCUIT - delayed + proximity gated */}
            {interactiveBaseReady && showF1System && f1Ready && <F1CircuitSystem />}

            {/* Generated buildings - only when city zoom */}
            {cityReady && buildings.map(building => (
              <ProceduralBuilding
                key={building.id}
                position={[
                  building.position[0] + CITY_OFFSET_X,
                  building.position[1],
                  building.position[2] + CITY_OFFSET_Z,
                ]}
                type={building.type}
              />
            ))}
            
            {/* Vehicles - only at ground level */}
            {interactiveBaseReady && vehicles.map(vehicle => (
              <Vehicle
                key={vehicle.id}
                position={vehicle.position}
                type={vehicle.type}
                isActive={vehicle.isActive}
              />
            ))}
            
            {/* Trees - only at ground level */}
            {interactiveBaseReady && trees.map(tree => (
              <Tree
                key={tree.id}
                position={[tree.position[0] + CITY_OFFSET_X, tree.position[1], tree.position[2] + CITY_OFFSET_Z]}
                scale={tree.scale}
              />
            ))}
            
            {/* Roads - only in city zone */}
            {cityReady && roads.map(road => (
              <Road
                key={road.id}
                start={[road.start[0] + CITY_OFFSET_X, road.start[1], road.start[2] + CITY_OFFSET_Z]}
                end={[road.end[0] + CITY_OFFSET_X, road.end[1], road.end[2] + CITY_OFFSET_Z]}
              />
            ))}
            
            {/* NPC Avatar System - only at ground level (HEAVY) */}
            {interactiveBaseReady && showNPCSystems && npcReady && (
              <NPCAvatarSystem 
                count={hwSettings.npcCount} 
                showLabels={false}
                onNPCInteract={(npc) => {
                  window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
                    detail: { type: 'npc', npcName: npc.name, npcId: npc.id, personality: npc.personality }
                  }));
                }}
              />
            )}
            
            {/* Animal Zoo System - only at ground level */}
            {interactiveBaseReady && showAnimalSystems && animalReady && (
              <AnimalZooSystem 
                count={hwSettings.animalCount}
                onAnimalInteract={(animal) => {
                  window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
                    detail: { type: 'animal', animalType: animal.type, animalId: animal.id, distance: 5 }
                  }));
                }}
              />
            )}

            {/* CROWD AVATAR SYSTEM - 500 walking avatars + 80 vehicles on roads */}
            {interactiveBaseReady && (
              <CrowdAvatarSystem />
            )}

            {/* MOTORCYCLE SYSTEM — standalone, separate wiring */}
            {interactiveBaseReady && (
              <MotorcycleController displayName={resolvedLocalDisplayName} />
            )}

            {/* Proximity Voice Narrator - dispatches narration events based on camera position */}
            {interactiveBaseReady && (
              <ProximityVoiceNarrator buildings={buildings} />
            )}
          </>
        );
      })()}
    </>
  );
};

// Tree Component
const Tree: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 3, 8]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 4, 0]}>
        <coneGeometry args={[1.5, 2.5, 8]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.5, 0]}>
        <coneGeometry args={[1.2, 2, 8]} />
        <meshStandardMaterial color="#388E3C" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6.8, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#43A047" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Road Component
const Road: React.FC<{ start: [number, number, number]; end: [number, number, number] }> = ({ start, end }) => {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)
  );
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0]);
  
  return (
    <group position={[midX, 0.15, midZ]} rotation={[0, -angle + Math.PI / 2, 0]}>
      {/* Road surface - raised above ground to prevent z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, length]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.85}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.15, length]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
      </mesh>
      {/* Side lines */}
      {[-2.5, 2.5].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.2, length]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
};

export default VRFeatureIntegration;
