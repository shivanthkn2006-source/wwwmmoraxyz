// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL 3D BUILDING GENERATION - Dynamic City Construction
// Generates buildings, roads, and infrastructure using procedural mesh generation
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';

export type BuildingType = 
  | 'house' | 'apartment' | 'office' | 'hospital' | 'school' 
  | 'shop' | 'park' | 'factory' | 'restaurant' | 'stadium'
  | 'fire_station' | 'police_station' | 'gym' | 'religious' | 'cultural';

interface Building {
  id: string;
  type: BuildingType;
  position: [number, number, number];
  rotation: number;
  floors: number;
  width: number;
  depth: number;
  color: string;
  accentColor: string;
  hasRoof: boolean;
  roofType: 'flat' | 'gabled' | 'dome';
}

interface ProceduralBuildingsProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
}

// Building type configurations
const BUILDING_CONFIGS: Record<BuildingType, {
  floorRange: [number, number];
  widthRange: [number, number];
  depthRange: [number, number];
  colors: string[];
  accentColors: string[];
  roofTypes: ('flat' | 'gabled' | 'dome')[];
}> = {
  house: { floorRange: [1, 2], widthRange: [4, 8], depthRange: [4, 8], colors: ['#f5f5dc', '#deb887', '#cd853f', '#8b7355'], accentColors: ['#8b4513', '#654321'], roofTypes: ['gabled'] },
  apartment: { floorRange: [4, 12], widthRange: [10, 20], depthRange: [10, 15], colors: ['#808080', '#a9a9a9', '#d3d3d3'], accentColors: ['#4169e1', '#32cd32'], roofTypes: ['flat'] },
  office: { floorRange: [5, 20], widthRange: [15, 30], depthRange: [15, 25], colors: ['#4a5568', '#2d3748', '#1a202c'], accentColors: ['#00bcd4', '#3b82f6'], roofTypes: ['flat'] },
  hospital: { floorRange: [3, 8], widthRange: [20, 40], depthRange: [15, 30], colors: ['#ffffff', '#f0f0f0'], accentColors: ['#ef4444', '#dc2626'], roofTypes: ['flat'] },
  school: { floorRange: [2, 4], widthRange: [25, 50], depthRange: [15, 25], colors: ['#fef3c7', '#fed7aa'], accentColors: ['#f59e0b', '#d97706'], roofTypes: ['flat', 'gabled'] },
  shop: { floorRange: [1, 3], widthRange: [8, 15], depthRange: [8, 12], colors: ['#e5e5e5', '#d4d4d4'], accentColors: ['#8b5cf6', '#ec4899'], roofTypes: ['flat'] },
  park: { floorRange: [0, 0], widthRange: [30, 60], depthRange: [30, 60], colors: ['#22c55e'], accentColors: ['#16a34a'], roofTypes: ['flat'] },
  factory: { floorRange: [2, 5], widthRange: [30, 60], depthRange: [20, 40], colors: ['#6b7280', '#4b5563'], accentColors: ['#f59e0b', '#ef4444'], roofTypes: ['flat', 'gabled'] },
  restaurant: { floorRange: [1, 2], widthRange: [10, 20], depthRange: [10, 15], colors: ['#fef3c7', '#fde68a'], accentColors: ['#ef4444', '#f97316'], roofTypes: ['flat', 'gabled'] },
  stadium: { floorRange: [3, 6], widthRange: [80, 120], depthRange: [60, 100], colors: ['#9ca3af', '#6b7280'], accentColors: ['#3b82f6', '#10b981'], roofTypes: ['dome'] },
  fire_station: { floorRange: [2, 3], widthRange: [15, 25], depthRange: [20, 30], colors: ['#f5f5f5'], accentColors: ['#ef4444', '#dc2626'], roofTypes: ['flat'] },
  police_station: { floorRange: [2, 4], widthRange: [15, 25], depthRange: [15, 25], colors: ['#e5e5e5'], accentColors: ['#1e3a8a', '#1e40af'], roofTypes: ['flat'] },
  gym: { floorRange: [1, 3], widthRange: [20, 35], depthRange: [20, 35], colors: ['#374151', '#1f2937'], accentColors: ['#f59e0b', '#10b981'], roofTypes: ['flat', 'dome'] },
  religious: { floorRange: [2, 4], widthRange: [15, 30], depthRange: [25, 45], colors: ['#faf5eb', '#f5f5dc'], accentColors: ['#d4af37', '#b8860b'], roofTypes: ['dome', 'gabled'] },
  cultural: { floorRange: [2, 5], widthRange: [25, 50], depthRange: [20, 40], colors: ['#f8f8f8', '#eeeeee'], accentColors: ['#8b5cf6', '#d946ef'], roofTypes: ['flat', 'dome'] },
};

// Single Building Component with procedural generation
const ProceduralBuilding: React.FC<{ 
  building: Building; 
  onClick?: () => void;
}> = ({ building, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const floorHeight = 3;
  const totalHeight = building.floors * floorHeight;
  
  // Generate windows procedurally
  const windows = useMemo(() => {
    if (building.type === 'park') return [];
    
    const windowsList: { pos: [number, number, number]; side: 'front' | 'back' | 'left' | 'right' }[] = [];
    const windowSpacing = 2;
    
    for (let floor = 0; floor < building.floors; floor++) {
      const y = floor * floorHeight + floorHeight / 2;
      
      // Front and back windows
      const frontBackCount = Math.floor(building.width / windowSpacing) - 1;
      for (let i = 0; i < frontBackCount; i++) {
        const x = (i - frontBackCount / 2 + 0.5) * windowSpacing;
        windowsList.push({ pos: [x, y, building.depth / 2 + 0.01], side: 'front' });
        windowsList.push({ pos: [x, y, -building.depth / 2 - 0.01], side: 'back' });
      }
      
      // Left and right windows
      const sideCount = Math.floor(building.depth / windowSpacing) - 1;
      for (let i = 0; i < sideCount; i++) {
        const z = (i - sideCount / 2 + 0.5) * windowSpacing;
        windowsList.push({ pos: [building.width / 2 + 0.01, y, z], side: 'right' });
        windowsList.push({ pos: [-building.width / 2 - 0.01, y, z], side: 'left' });
      }
    }
    
    return windowsList;
  }, [building]);

  // Building type icon
  const typeIcons: Record<BuildingType, string> = {
    house: '🏠', apartment: '🏢', office: '🏛️', hospital: '🏥', school: '🏫',
    shop: '🏪', park: '🌳', factory: '🏭', restaurant: '🍽️', stadium: '🏟️',
    fire_station: '🚒', police_station: '🚔', gym: '💪', religious: '🕌', cultural: '🎭'
  };

  if (building.type === 'park') {
    return (
      <group ref={groupRef} position={building.position} rotation={[0, building.rotation, 0]}>
        {/* Park ground */}
        <Box args={[building.width, 0.1, building.depth]} position={[0, 0.05, 0]}>
          <meshStandardMaterial color="#22c55e" />
        </Box>
        {/* Trees */}
        {Array.from({ length: 10 }).map((_, i) => (
          <group key={i} position={[
            (Math.random() - 0.5) * (building.width - 2),
            0,
            (Math.random() - 0.5) * (building.depth - 2)
          ]}>
            <Cylinder args={[0.2, 0.3, 2]} position={[0, 1, 0]}>
              <meshStandardMaterial color="#8b4513" />
            </Cylinder>
            <mesh position={[0, 3, 0]}>
              <coneGeometry args={[1.5, 3, 8]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
          </group>
        ))}
        <Html position={[0, 2, 0]} center distanceFactor={15}>
          <div className="bg-green-800/60 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
            🌳 Park
          </div>
        </Html>
      </group>
    );
  }

  return (
    <group 
      ref={groupRef} 
      position={building.position} 
      rotation={[0, building.rotation, 0]}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main building body */}
      <Box args={[building.width, totalHeight, building.depth]} position={[0, totalHeight / 2, 0]}>
        <meshStandardMaterial 
          color={hovered ? building.accentColor : building.color}
          metalness={0.1}
          roughness={0.7}
        />
      </Box>
      
      {/* Windows */}
      {windows.map((win, i) => (
        <Box key={i} args={[0.8, 1.2, 0.05]} position={win.pos}>
          <meshStandardMaterial 
            color="#87ceeb" 
            emissive="#4a90a4"
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
      ))}
      
      {/* Roof */}
      {building.hasRoof && (
        <>
          {building.roofType === 'gabled' && (
            <mesh position={[0, totalHeight + 1.5, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[Math.max(building.width, building.depth) * 0.7, 3, 4]} />
              <meshStandardMaterial color="#8b4513" />
            </mesh>
          )}
          {building.roofType === 'dome' && (
            <mesh position={[0, totalHeight, 0]}>
              <sphereGeometry args={[Math.min(building.width, building.depth) * 0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.5} />
            </mesh>
          )}
          {building.roofType === 'flat' && (
            <Box args={[building.width + 0.5, 0.3, building.depth + 0.5]} position={[0, totalHeight + 0.15, 0]}>
              <meshStandardMaterial color="#4a5568" />
            </Box>
          )}
        </>
      )}
      
      {/* Building label */}
      <Html position={[0, totalHeight + 2, 0]} center distanceFactor={20}>
        <div className={`
          px-2 py-1 rounded text-xs whitespace-nowrap
          ${hovered ? 'bg-purple-600/80' : 'bg-black/60'}
          text-white border border-white/20
        `}>
          {typeIcons[building.type]} {building.type.replace('_', ' ').toUpperCase()}
        </div>
      </Html>
    </group>
  );
};

// Main Procedural Buildings Component
const ProceduralBuildings: React.FC<ProceduralBuildingsProps> = ({ 
  buildings, 
  onBuildingClick 
}) => {
  return (
    <group>
      {buildings.map((building) => (
        <ProceduralBuilding
          key={building.id}
          building={building}
          onClick={() => onBuildingClick?.(building)}
        />
      ))}
    </group>
  );
};

// Building Generator Utility
export const generateBuilding = (
  type: BuildingType,
  position: [number, number, number]
): Building => {
  const config = BUILDING_CONFIGS[type];
  const floors = Math.floor(Math.random() * (config.floorRange[1] - config.floorRange[0] + 1)) + config.floorRange[0];
  const width = Math.random() * (config.widthRange[1] - config.widthRange[0]) + config.widthRange[0];
  const depth = Math.random() * (config.depthRange[1] - config.depthRange[0]) + config.depthRange[0];
  
  return {
    id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    position,
    rotation: Math.random() * Math.PI * 2,
    floors,
    width,
    depth,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    accentColor: config.accentColors[Math.floor(Math.random() * config.accentColors.length)],
    hasRoof: true,
    roofType: config.roofTypes[Math.floor(Math.random() * config.roofTypes.length)],
  };
};

// Generate a complete city layout
export const generateCity = (centerPosition: [number, number, number] = [0, 0, 0]): Building[] => {
  const buildings: Building[] = [];
  const cityRadius = 100;
  const blockSize = 25;
  
  // Generate city blocks
  for (let x = -cityRadius; x <= cityRadius; x += blockSize) {
    for (let z = -cityRadius; z <= cityRadius; z += blockSize) {
      const distance = Math.sqrt(x * x + z * z);
      
      // Determine building type based on distance from center
      let type: BuildingType;
      if (distance < 30) {
        // Downtown - tall buildings
        type = Math.random() > 0.5 ? 'office' : 'apartment';
      } else if (distance < 60) {
        // Mid-city - mixed use
        const types: BuildingType[] = ['apartment', 'shop', 'restaurant', 'school'];
        type = types[Math.floor(Math.random() * types.length)];
      } else {
        // Suburbs - residential
        const types: BuildingType[] = ['house', 'house', 'house', 'park', 'shop'];
        type = types[Math.floor(Math.random() * types.length)];
      }
      
      // Add some variance to position
      const pos: [number, number, number] = [
        x + centerPosition[0] + (Math.random() - 0.5) * 5,
        centerPosition[1],
        z + centerPosition[2] + (Math.random() - 0.5) * 5
      ];
      
      buildings.push(generateBuilding(type, pos));
    }
  }
  
  // Add special buildings
  buildings.push(generateBuilding('hospital', [50, 0, 0]));
  buildings.push(generateBuilding('stadium', [-60, 0, -60]));
  buildings.push(generateBuilding('fire_station', [30, 0, -40]));
  buildings.push(generateBuilding('police_station', [-30, 0, 40]));
  
  return buildings;
};

// Hook to manage buildings with voice commands
export const useBuildingManager = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);

  const addBuilding = useCallback((type: BuildingType, position?: [number, number, number]) => {
    const pos = position || [
      (Math.random() - 0.5) * 50,
      0,
      (Math.random() - 0.5) * 50
    ];
    const newBuilding = generateBuilding(type, pos);
    setBuildings(prev => [...prev, newBuilding]);
    toast.success(`${type.replace('_', ' ')} built!`, { description: 'New structure added to the world' });
    return newBuilding;
  }, []);

  const buildCity = useCallback(() => {
    const cityBuildings = generateCity();
    setBuildings(prev => [...prev, ...cityBuildings]);
    toast.success('City generated!', { description: `${cityBuildings.length} buildings created` });
  }, []);

  const clearBuildings = useCallback(() => {
    setBuildings([]);
  }, []);

  // Listen for voice commands
  useEffect(() => {
    const handleBuildCommand = (event: CustomEvent) => {
      const { action, type } = event.detail;
      
      if (action === 'build_city' || action === 'build_city_full') {
        buildCity();
      } else if (action === 'build_town') {
        // Smaller version
        const townBuildings = generateCity().slice(0, 30);
        setBuildings(prev => [...prev, ...townBuildings]);
      } else if (action.startsWith('build_')) {
        const buildingType = action.replace('build_', '') as BuildingType;
        if (BUILDING_CONFIGS[buildingType]) {
          addBuilding(buildingType);
        }
      }
    };

    window.addEventListener('vr-build', handleBuildCommand as EventListener);
    return () => window.removeEventListener('vr-build', handleBuildCommand as EventListener);
  }, [addBuilding, buildCity]);

  return { buildings, addBuilding, buildCity, clearBuildings, setBuildings };
};

export default ProceduralBuildings;
