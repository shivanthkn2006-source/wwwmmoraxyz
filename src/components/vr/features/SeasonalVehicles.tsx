// ═══════════════════════════════════════════════════════════════════════════════
// SEASONAL VEHICLES - Season-Themed Transport
// Snowmobiles, sleds, boats, tractors, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Season } from './SeasonsSystem';

export type SeasonalVehicleType = 
  | 'snowmobile' | 'sled' | 'ski_lift' | 'ice_skates'  // Winter
  | 'bicycle' | 'scooter' | 'garden_cart' | 'horse_carriage'  // Spring
  | 'jet_ski' | 'sailboat' | 'beach_buggy' | 'surfboard'  // Summer
  | 'tractor' | 'hayride' | 'pickup_truck' | 'atv';  // Fall

interface SeasonalVehicleProps {
  type: SeasonalVehicleType;
  position: [number, number, number];
  rotation?: number;
  isActive?: boolean;
  color?: string;
}

// Snowmobile (Winter)
const Snowmobile: React.FC<{ position: [number, number, number]; color: string; isActive: boolean }> = ({
  position,
  color,
  isActive,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const trackRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isActive && trackRef.current) {
      trackRef.current.rotation.x += 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <Box args={[1.2, 0.6, 2.5]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={color} metalness={0.4} />
      </Box>
      
      {/* Windshield */}
      <Box args={[1, 0.4, 0.1]} position={[0, 0.9, 0.8]} rotation={[-0.3, 0, 0]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} metalness={0.5} />
      </Box>
      
      {/* Seat */}
      <Box args={[0.6, 0.2, 1]} position={[0, 0.85, -0.3]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>
      
      {/* Handlebars */}
      <Cylinder args={[0.05, 0.05, 0.8, 8]} position={[0, 1, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} />
      </Cylinder>
      
      {/* Skis */}
      {[[-0.5, 0.1, 0.5], [0.5, 0.1, 0.5]].map((pos, i) => (
        <Box key={i} args={[0.15, 0.05, 1.5]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#2c3e50" metalness={0.6} />
        </Box>
      ))}
      
      {/* Track */}
      <mesh ref={trackRef} position={[0, 0.2, -0.5]}>
        <boxGeometry args={[0.8, 0.3, 1.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Headlight */}
      <Sphere args={[0.1, 8, 8]} position={[0, 0.6, 1.25]}>
        <meshStandardMaterial color={isActive ? "#ffff00" : "#666"} emissive={isActive ? "#ffff00" : "#000"} emissiveIntensity={isActive ? 1 : 0} />
      </Sphere>
      
      <Html position={[0, 1.5, 0]} center distanceFactor={12}>
        <div className="bg-blue-800/70 px-2 py-1 rounded text-xs text-white">
          🛷 Snowmobile
        </div>
      </Html>
    </group>
  );
};

// Dog Sled (Winter)
const DogSled: React.FC<{ position: [number, number, number]; isActive: boolean }> = ({ position, isActive }) => {
  const dogsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isActive && dogsRef.current) {
      dogsRef.current.children.forEach((dog, i) => {
        dog.position.y = 0.3 + Math.abs(Math.sin(state.clock.elapsedTime * 8 + i)) * 0.1;
      });
    }
  });

  return (
    <group position={position}>
      {/* Sled */}
      <Box args={[1, 0.2, 2.5]} position={[0, 0.3, 0]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      
      {/* Runners */}
      {[[-0.5, 0.1, 0], [0.5, 0.1, 0]].map((pos, i) => (
        <Box key={i} args={[0.05, 0.1, 3]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#2c3e50" metalness={0.7} />
        </Box>
      ))}
      
      {/* Handlebar */}
      <Box args={[0.8, 0.8, 0.1]} position={[0, 0.7, -1.2]}>
        <meshStandardMaterial color="#654321" />
      </Box>
      
      {/* Dogs (simplified) */}
      <group ref={dogsRef}>
        {[[0, 0.3, 2.5], [-0.4, 0.3, 3.5], [0.4, 0.3, 3.5]].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <Sphere args={[0.2, 8, 8]}>
              <meshStandardMaterial color="#f5f5dc" />
            </Sphere>
            <Sphere args={[0.1, 8, 8]} position={[0, 0.1, 0.2]}>
              <meshStandardMaterial color="#f5f5dc" />
            </Sphere>
          </group>
        ))}
      </group>
      
      {/* Rope connecting dogs */}
      <Cylinder args={[0.02, 0.02, 2, 4]} position={[0, 0.3, 2]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#8b4513" />
      </Cylinder>
      
      <Html position={[0, 1.5, 0]} center distanceFactor={12}>
        <div className="bg-amber-800/70 px-2 py-1 rounded text-xs text-white">
          🐕 Dog Sled
        </div>
      </Html>
    </group>
  );
};

// Jet Ski (Summer)
const JetSki: React.FC<{ position: [number, number, number]; color: string; isActive: boolean }> = ({
  position,
  color,
  isActive,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && isActive) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.4, 2, 8, 16]} />
        <meshStandardMaterial color={color} metalness={0.3} />
      </mesh>
      
      {/* Seat */}
      <Box args={[0.5, 0.2, 1]} position={[0, 0.7, -0.2]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>
      
      {/* Handlebars */}
      <Cylinder args={[0.03, 0.03, 0.6, 8]} position={[0, 0.9, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} />
      </Cylinder>
      
      {/* Water spray effect when active */}
      {isActive && (
        <>
          {Array.from({ length: 10 }).map((_, i) => (
            <Sphere key={i} args={[0.05, 8, 8]} position={[
              (Math.random() - 0.5) * 0.5,
              Math.random() * 0.3,
              -1.2 - Math.random() * 0.5
            ]}>
              <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
            </Sphere>
          ))}
        </>
      )}
      
      <Html position={[0, 1.5, 0]} center distanceFactor={12}>
        <div className="bg-cyan-600/70 px-2 py-1 rounded text-xs text-white">
          🚤 Jet Ski
        </div>
      </Html>
    </group>
  );
};

// Sailboat (Summer)
const Sailboat: React.FC<{ position: [number, number, number]; isActive: boolean }> = ({ position, isActive }) => {
  const sailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sailRef.current) {
      sailRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Hull */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.8, 4, 8, 16]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      
      {/* Deck */}
      <Box args={[1.4, 0.1, 4]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#deb887" />
      </Box>
      
      {/* Mast */}
      <Cylinder args={[0.08, 0.08, 6, 8]} position={[0, 4, 0]}>
        <meshStandardMaterial color="#8b4513" />
      </Cylinder>
      
      {/* Main Sail */}
      <mesh ref={sailRef} position={[0, 4, 0.5]}>
        <planeGeometry args={[2.5, 5]} />
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Boom */}
      <Cylinder args={[0.05, 0.05, 2.5, 8]} position={[0, 2, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#8b4513" />
      </Cylinder>
      
      {/* Flag */}
      <Box args={[0.5, 0.3, 0.02]} position={[0.25, 7, 0]}>
        <meshStandardMaterial color="#ff6347" />
      </Box>
      
      <Html position={[0, 8, 0]} center distanceFactor={15}>
        <div className="bg-blue-600/70 px-2 py-1 rounded text-xs text-white">
          ⛵ Sailboat
        </div>
      </Html>
    </group>
  );
};

// Tractor (Fall)
const Tractor: React.FC<{ position: [number, number, number]; color: string; isActive: boolean }> = ({
  position,
  color,
  isActive,
}) => {
  const wheelsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (isActive && wheelsRef.current) {
      wheelsRef.current.children.forEach((wheel) => {
        wheel.rotation.x += 0.05;
      });
    }
  });

  return (
    <group position={position}>
      {/* Main body */}
      <Box args={[2, 2, 3]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      
      {/* Engine hood */}
      <Box args={[1.8, 1, 1.5]} position={[0, 1.2, 2]}>
        <meshStandardMaterial color={color} />
      </Box>
      
      {/* Exhaust pipe */}
      <Cylinder args={[0.1, 0.1, 1.5, 8]} position={[0.6, 2.5, 1.5]}>
        <meshStandardMaterial color="#333" />
      </Cylinder>
      
      {/* Cabin */}
      <Box args={[1.8, 1.5, 0.1]} position={[0, 2.8, -0.7]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </Box>
      <Box args={[0.1, 1.5, 1.2]} position={[-0.9, 2.8, 0]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </Box>
      <Box args={[0.1, 1.5, 1.2]} position={[0.9, 2.8, 0]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </Box>
      
      {/* Wheels */}
      <group ref={wheelsRef}>
        {/* Large rear wheels */}
        {[[-1.2, 1, -0.5], [1.2, 1, -0.5]].map((pos, i) => (
          <Cylinder key={i} args={[1, 1, 0.5, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Cylinder>
        ))}
        {/* Small front wheels */}
        {[[-1, 0.5, 1.8], [1, 0.5, 1.8]].map((pos, i) => (
          <Cylinder key={i} args={[0.5, 0.5, 0.4, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Cylinder>
        ))}
      </group>
      
      <Html position={[0, 4, 0]} center distanceFactor={15}>
        <div className="bg-green-800/70 px-2 py-1 rounded text-xs text-white">
          🚜 Tractor
        </div>
      </Html>
    </group>
  );
};

// Hayride Wagon (Fall)
const HayrideWagon: React.FC<{ position: [number, number, number]; isActive: boolean }> = ({ position, isActive }) => {
  return (
    <group position={position}>
      {/* Wagon bed */}
      <Box args={[3, 0.2, 5]} position={[0, 0.8, 0]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      
      {/* Wagon sides */}
      {[[-1.4, 1.3, 0], [1.4, 1.3, 0]].map((pos, i) => (
        <Box key={i} args={[0.15, 1, 5]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#8b4513" />
        </Box>
      ))}
      <Box args={[3, 1, 0.15]} position={[0, 1.3, -2.4]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      <Box args={[3, 1, 0.15]} position={[0, 1.3, 2.4]}>
        <meshStandardMaterial color="#8b4513" />
      </Box>
      
      {/* Wheels */}
      {[[-1.5, 0.5, -1.5], [1.5, 0.5, -1.5], [-1.5, 0.5, 1.5], [1.5, 0.5, 1.5]].map((pos, i) => (
        <Cylinder key={i} args={[0.5, 0.5, 0.2, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#654321" />
        </Cylinder>
      ))}
      
      {/* Hay bales */}
      {[[-0.5, 1.2, -1], [0.5, 1.2, -1], [0, 1.2, 0], [-0.5, 1.2, 1], [0.5, 1.2, 1]].map((pos, i) => (
        <Cylinder key={i} args={[0.4, 0.4, 0.8, 8]} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, Math.random()]}>
          <meshStandardMaterial color="#daa520" />
        </Cylinder>
      ))}
      
      {/* Pumpkins on hay */}
      {[[-0.8, 1.6, 0], [0.8, 1.6, -0.5], [0, 1.6, 1.2]].map((pos, i) => (
        <Sphere key={i} args={[0.2, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#ff6600" />
        </Sphere>
      ))}
      
      <Html position={[0, 2.5, 0]} center distanceFactor={15}>
        <div className="bg-orange-800/70 px-2 py-1 rounded text-xs text-white">
          🎃 Hayride
        </div>
      </Html>
    </group>
  );
};

// Main Seasonal Vehicle Component
const SeasonalVehicle: React.FC<SeasonalVehicleProps> = ({
  type,
  position,
  rotation = 0,
  isActive = false,
  color = '#3498db',
}) => {
  const renderVehicle = () => {
    switch (type) {
      case 'snowmobile':
        return <Snowmobile position={position} color={color} isActive={isActive} />;
      case 'sled':
        return <DogSled position={position} isActive={isActive} />;
      case 'jet_ski':
        return <JetSki position={position} color={color} isActive={isActive} />;
      case 'sailboat':
        return <Sailboat position={position} isActive={isActive} />;
      case 'tractor':
        return <Tractor position={position} color="#228b22" isActive={isActive} />;
      case 'hayride':
        return <HayrideWagon position={position} isActive={isActive} />;
      default:
        return <Snowmobile position={position} color={color} isActive={isActive} />;
    }
  };

  return (
    <group rotation={[0, rotation, 0]}>
      {renderVehicle()}
    </group>
  );
};

// Generate seasonal vehicles
export const generateSeasonalVehicles = (season: Season, count: number = 5): SeasonalVehicleProps[] => {
  const vehicleTypes: Record<Season, SeasonalVehicleType[]> = {
    winter: ['snowmobile', 'sled', 'ski_lift', 'ice_skates'],
    spring: ['bicycle', 'scooter', 'garden_cart', 'horse_carriage'],
    summer: ['jet_ski', 'sailboat', 'beach_buggy', 'surfboard'],
    fall: ['tractor', 'hayride', 'pickup_truck', 'atv'],
  };

  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
  const types = vehicleTypes[season];

  return Array.from({ length: count }, (_, i) => ({
    type: types[Math.floor(Math.random() * types.length)],
    position: [
      (Math.random() - 0.5) * 100,
      0,
      (Math.random() - 0.5) * 100,
    ] as [number, number, number],
    rotation: Math.random() * Math.PI * 2,
    isActive: false,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
};

// Seasonal Vehicles Group
export const SeasonalVehiclesGroup: React.FC<{ season: Season; count?: number }> = ({ 
  season, 
  count = 5 
}) => {
  const vehicles = useMemo(() => generateSeasonalVehicles(season, count), [season, count]);

  return (
    <group>
      {vehicles.map((vehicle, i) => (
        <SeasonalVehicle key={i} {...vehicle} />
      ))}
    </group>
  );
};

export default SeasonalVehicle;
