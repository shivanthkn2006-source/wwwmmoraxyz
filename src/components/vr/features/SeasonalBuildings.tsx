// ═══════════════════════════════════════════════════════════════════════════════
// SEASONAL BUILDINGS - Season-Themed Architecture and Structures
// Ice castles, spring cottages, beach houses, fall cabins
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Season } from './SeasonsSystem';

export type SeasonalBuildingType = 
  | 'ice_castle' | 'snow_cabin' | 'igloo' | 'ski_lodge'  // Winter
  | 'cottage' | 'flower_shop' | 'greenhouse' | 'garden_pavilion'  // Spring
  | 'beach_house' | 'tiki_bar' | 'lifeguard_tower' | 'pool_house'  // Summer
  | 'harvest_barn' | 'pumpkin_patch' | 'cider_mill' | 'haunted_house';  // Fall

interface SeasonalBuildingProps {
  type: SeasonalBuildingType;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}

// Ice Castle (Winter)
const IceCastle: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle shimmer effect
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.emissiveIntensity !== undefined) {
            material.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.05;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Main castle body */}
      <Box args={[12, 15, 12]} position={[0, 7.5, 0]}>
        <meshStandardMaterial color="#b0e0e6" transparent opacity={0.85} metalness={0.3} roughness={0.1} />
      </Box>
      
      {/* Corner towers */}
      {[[-5, 0, -5], [5, 0, -5], [-5, 0, 5], [5, 0, 5]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <Cylinder args={[2.5, 3, 20, 8]} position={[0, 10, 0]}>
            <meshStandardMaterial color="#add8e6" transparent opacity={0.8} metalness={0.2} roughness={0.15} />
          </Cylinder>
          {/* Tower roof (ice spike) */}
          <mesh position={[0, 22, 0]}>
            <coneGeometry args={[3, 8, 8]} />
            <meshStandardMaterial color="#e0ffff" transparent opacity={0.9} metalness={0.4} />
          </mesh>
        </group>
      ))}
      
      {/* Central spire */}
      <mesh position={[0, 20, 0]}>
        <coneGeometry args={[4, 15, 8]} />
        <meshStandardMaterial color="#f0ffff" transparent opacity={0.9} metalness={0.5} roughness={0.05} emissive="#87ceeb" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Ice crystals decoration */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[
          Math.cos(i * Math.PI / 4) * 8,
          5 + Math.random() * 5,
          Math.sin(i * Math.PI / 4) * 8
        ]} rotation={[Math.random(), Math.random(), Math.random()]}>
          <octahedronGeometry args={[1 + Math.random()]} />
          <meshStandardMaterial color="#e0ffff" transparent opacity={0.7} metalness={0.6} />
        </mesh>
      ))}
      
      {/* Entrance arch */}
      <Box args={[4, 6, 2]} position={[0, 3, 7]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </Box>
      
      <Html position={[0, 30, 0]} center distanceFactor={30}>
        <div className="bg-blue-900/70 px-3 py-1 rounded text-sm text-white border border-blue-400/50">
          🏰 Ice Castle
        </div>
      </Html>
    </group>
  );
};

// Snow Cabin (Winter)
const SnowCabin: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Cabin body */}
      <Box args={[8, 5, 6]} position={[0, 2.5, 0]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      
      {/* Snow-covered roof */}
      <mesh position={[0, 6, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[6, 4, 4]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      
      {/* Snow on roof */}
      <mesh position={[0, 6.5, 0]}>
        <coneGeometry args={[6.2, 1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Chimney with smoke */}
      <Cylinder args={[0.5, 0.6, 3, 8]} position={[2, 7, 0]}>
        <meshStandardMaterial color="#8b0000" />
      </Cylinder>
      
      {/* Smoke */}
      {[0, 0.5, 1, 1.5].map((y, i) => (
        <Sphere key={i} args={[0.3 + i * 0.1, 8, 8]} position={[2, 8.5 + y, 0]}>
          <meshStandardMaterial color="#dcdcdc" transparent opacity={0.4 - i * 0.1} />
        </Sphere>
      ))}
      
      {/* Windows with warm glow */}
      {[[-2, 2.5, 3.1], [2, 2.5, 3.1]].map((pos, i) => (
        <Box key={i} args={[1.5, 1.5, 0.1]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#ffd700" emissive="#ff8c00" emissiveIntensity={0.5} />
        </Box>
      ))}
      
      {/* Door */}
      <Box args={[1.5, 3, 0.2]} position={[0, 1.5, 3.1]}>
        <meshStandardMaterial color="#654321" />
      </Box>
      
      {/* Snow piles around cabin */}
      {[[-5, 0, 2], [5, 0, -2], [-4, 0, -3], [4, 0, 3]].map((pos, i) => (
        <Sphere key={i} args={[1 + Math.random(), 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#f8f8ff" />
        </Sphere>
      ))}
      
      <Html position={[0, 10, 0]} center distanceFactor={20}>
        <div className="bg-amber-900/70 px-2 py-1 rounded text-xs text-white">
          🏠 Snow Cabin
        </div>
      </Html>
    </group>
  );
};

// Igloo (Winter)
const Igloo: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Main dome */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f8ff" roughness={0.3} />
      </mesh>
      
      {/* Entrance tunnel */}
      <Cylinder args={[1.5, 1.5, 4, 8, 1, false, 0, Math.PI]} position={[0, 0.75, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#e8f4f8" roughness={0.3} />
      </Cylinder>
      
      {/* Ice blocks texture */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const y = 1 + (i % 3);
        return (
          <Box key={i} args={[1, 0.8, 0.1]} position={[
            Math.cos(angle) * 3.9,
            y,
            Math.sin(angle) * 3.9
          ]} rotation={[0, -angle, 0]}>
            <meshStandardMaterial color="#e0ffff" transparent opacity={0.3} />
          </Box>
        );
      })}
      
      <Html position={[0, 5, 0]} center distanceFactor={15}>
        <div className="bg-cyan-800/70 px-2 py-1 rounded text-xs text-white">
          🧊 Igloo
        </div>
      </Html>
    </group>
  );
};

// Beach House (Summer)
const BeachHouse: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Stilts */}
      {[[-3, 0, -2], [3, 0, -2], [-3, 0, 2], [3, 0, 2]].map((pos, i) => (
        <Cylinder key={i} args={[0.3, 0.3, 4, 8]} position={[pos[0], 2, pos[2]]}>
          <meshStandardMaterial color="#d2b48c" />
        </Cylinder>
      ))}
      
      {/* Main house */}
      <Box args={[8, 4, 6]} position={[0, 6, 0]}>
        <meshStandardMaterial color="#f5f5dc" />
      </Box>
      
      {/* Thatched roof */}
      <mesh position={[0, 9.5, 0]}>
        <coneGeometry args={[5.5, 3, 4]} />
        <meshStandardMaterial color="#deb887" roughness={1} />
      </mesh>
      
      {/* Deck */}
      <Box args={[10, 0.2, 8]} position={[0, 4, 0]}>
        <meshStandardMaterial color="#cd853f" />
      </Box>
      
      {/* Deck railing */}
      {[[-4.9, 4.5, 0], [4.9, 4.5, 0]].map((pos, i) => (
        <Box key={i} args={[0.1, 1, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#deb887" />
        </Box>
      ))}
      
      {/* Large windows */}
      <Box args={[5, 2.5, 0.1]} position={[0, 6, 3.1]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.3} />
      </Box>
      
      {/* Palm tree nearby */}
      <group position={[6, 0, 3]}>
        <Cylinder args={[0.3, 0.4, 6, 8]} position={[0, 3, 0]}>
          <meshStandardMaterial color="#8b4513" />
        </Cylinder>
        {[0, 0.8, 1.6, 2.4, 3.2, 4].map((rot, i) => (
          <Box key={i} args={[0.2, 0.1, 3]} position={[0, 6.5, 1.5]} rotation={[0.4, rot, 0]}>
            <meshStandardMaterial color="#228b22" />
          </Box>
        ))}
      </group>
      
      <Html position={[0, 12, 0]} center distanceFactor={20}>
        <div className="bg-cyan-600/70 px-2 py-1 rounded text-xs text-white">
          🏖️ Beach House
        </div>
      </Html>
    </group>
  );
};

// Harvest Barn (Fall)
const HarvestBarn: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Main barn body */}
      <Box args={[15, 10, 12]} position={[0, 5, 0]}>
        <meshStandardMaterial color="#8b0000" />
      </Box>
      
      {/* White trim */}
      <Box args={[15.2, 0.5, 12.2]} position={[0, 10, 0]}>
        <meshStandardMaterial color="#f5f5f5" />
      </Box>
      
      {/* Gambrel roof */}
      <mesh position={[0, 13, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[8, 8, 15, 4, 1, false, Math.PI / 4, Math.PI]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      
      {/* Hay loft door */}
      <Box args={[4, 3, 0.2]} position={[0, 8, 6.1]}>
        <meshStandardMaterial color="#deb887" />
      </Box>
      
      {/* Main door */}
      <Box args={[5, 7, 0.2]} position={[0, 3.5, 6.1]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      
      {/* Hay bales outside */}
      {[[-8, 0, 5], [-8, 1.2, 5], [-8, 0, 7], [8, 0, 4]].map((pos, i) => (
        <Cylinder key={i} args={[0.8, 0.8, 1.5, 16]} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, Math.random()]}>
          <meshStandardMaterial color="#daa520" />
        </Cylinder>
      ))}
      
      {/* Pumpkins */}
      {[[-6, 0.4, 8], [-5, 0.3, 7.5], [-4, 0.35, 8.2]].map((pos, i) => (
        <Sphere key={i} args={[0.4 + Math.random() * 0.2, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#ff6600" />
        </Sphere>
      ))}
      
      {/* Weather vane */}
      <group position={[0, 16, 0]}>
        <Cylinder args={[0.05, 0.05, 2, 8]} position={[0, 1, 0]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Cylinder>
        <Box args={[1, 0.3, 0.05]} position={[0, 2, 0]}>
          <meshStandardMaterial color="#ffd700" />
        </Box>
      </group>
      
      <Html position={[0, 18, 0]} center distanceFactor={25}>
        <div className="bg-red-900/70 px-2 py-1 rounded text-xs text-white">
          🌾 Harvest Barn
        </div>
      </Html>
    </group>
  );
};

// Flower Cottage (Spring)
const FlowerCottage: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const flowerColors = ['#ff69b4', '#ff1493', '#ffb6c1', '#ffd700', '#9370db', '#87ceeb'];
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Cottage body */}
      <Box args={[8, 6, 6]} position={[0, 3, 0]}>
        <meshStandardMaterial color="#fffaf0" />
      </Box>
      
      {/* Thatched roof */}
      <mesh position={[0, 7.5, 0]}>
        <coneGeometry args={[6, 4, 4]} />
        <meshStandardMaterial color="#8b7355" roughness={1} />
      </mesh>
      
      {/* Chimney */}
      <Box args={[1, 3, 1]} position={[2, 8, 0]}>
        <meshStandardMaterial color="#cd853f" />
      </Box>
      
      {/* Round door */}
      <Cylinder args={[1.2, 1.2, 0.2, 16]} position={[0, 1.5, 3.1]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#228b22" />
      </Cylinder>
      
      {/* Windows with flower boxes */}
      {[[-2.5, 3.5, 3.1], [2.5, 3.5, 3.1]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <Box args={[1.5, 1.5, 0.1]}>
            <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
          </Box>
          {/* Flower box */}
          <Box args={[1.8, 0.4, 0.4]} position={[0, -1, 0.2]}>
            <meshStandardMaterial color="#8b4513" />
          </Box>
          {/* Flowers in box */}
          {[-0.5, 0, 0.5].map((x, j) => (
            <Sphere key={j} args={[0.15, 8, 8]} position={[x, -0.7, 0.3]}>
              <meshStandardMaterial color={flowerColors[Math.floor(Math.random() * flowerColors.length)]} />
            </Sphere>
          ))}
        </group>
      ))}
      
      {/* Garden flowers around cottage */}
      {Array.from({ length: 30 }).map((_, i) => {
        const angle = (i / 30) * Math.PI * 2;
        const distance = 5 + Math.random() * 2;
        return (
          <group key={i} position={[Math.cos(angle) * distance, 0, Math.sin(angle) * distance]}>
            {/* Stem */}
            <Cylinder args={[0.03, 0.03, 0.5, 4]} position={[0, 0.25, 0]}>
              <meshStandardMaterial color="#228b22" />
            </Cylinder>
            {/* Flower head */}
            <Sphere args={[0.15, 8, 8]} position={[0, 0.55, 0]}>
              <meshStandardMaterial color={flowerColors[Math.floor(Math.random() * flowerColors.length)]} />
            </Sphere>
          </group>
        );
      })}
      
      <Html position={[0, 11, 0]} center distanceFactor={20}>
        <div className="bg-pink-600/70 px-2 py-1 rounded text-xs text-white">
          🌸 Flower Cottage
        </div>
      </Html>
    </group>
  );
};

// Main Seasonal Building Component
const SeasonalBuilding: React.FC<SeasonalBuildingProps> = ({
  type,
  position,
  rotation = 0,
  scale = 1,
}) => {
  const renderBuilding = () => {
    switch (type) {
      case 'ice_castle':
        return <IceCastle position={position} scale={scale} />;
      case 'snow_cabin':
        return <SnowCabin position={position} scale={scale} />;
      case 'igloo':
        return <Igloo position={position} scale={scale} />;
      case 'beach_house':
        return <BeachHouse position={position} scale={scale} />;
      case 'harvest_barn':
        return <HarvestBarn position={position} scale={scale} />;
      case 'cottage':
      case 'flower_shop':
        return <FlowerCottage position={position} scale={scale} />;
      default:
        return <SnowCabin position={position} scale={scale} />;
    }
  };

  return (
    <group rotation={[0, rotation, 0]}>
      {renderBuilding()}
    </group>
  );
};

// Generate seasonal buildings for a season
export const generateSeasonalBuildings = (season: Season, count: number = 10, areaSize: number = 200): SeasonalBuildingProps[] => {
  const buildingTypes: Record<Season, SeasonalBuildingType[]> = {
    winter: ['ice_castle', 'snow_cabin', 'igloo', 'ski_lodge'],
    spring: ['cottage', 'flower_shop', 'greenhouse', 'garden_pavilion'],
    summer: ['beach_house', 'tiki_bar', 'lifeguard_tower', 'pool_house'],
    fall: ['harvest_barn', 'pumpkin_patch', 'cider_mill', 'haunted_house'],
  };

  const types = buildingTypes[season];
  const buildings: SeasonalBuildingProps[] = [];

  for (let i = 0; i < count; i++) {
    buildings.push({
      type: types[Math.floor(Math.random() * types.length)],
      position: [
        (Math.random() - 0.5) * areaSize,
        0,
        (Math.random() - 0.5) * areaSize,
      ],
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.4,
    });
  }

  // Add one main landmark
  buildings.push({
    type: season === 'winter' ? 'ice_castle' : 
          season === 'spring' ? 'cottage' :
          season === 'summer' ? 'beach_house' : 'harvest_barn',
    position: [0, 0, -50],
    rotation: 0,
    scale: 1.5,
  });

  return buildings;
};

// Seasonal Buildings Group Component
export const SeasonalBuildingsGroup: React.FC<{ season: Season; count?: number }> = ({ 
  season, 
  count = 8 
}) => {
  const buildings = useMemo(() => generateSeasonalBuildings(season, count), [season, count]);

  return (
    <group>
      {buildings.map((building, i) => (
        <SeasonalBuilding key={i} {...building} />
      ))}
    </group>
  );
};

export default SeasonalBuilding;
