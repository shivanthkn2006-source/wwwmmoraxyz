// ═══════════════════════════════════════════════════════════════════════════════
// SEASONAL AVATAR SYSTEM - Geography-Based Clothing and Accessories
// Avatars with season-appropriate clothing, accessories, and gear
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Season, SEASON_CONFIGS } from './SeasonsSystem';

export interface SeasonalClothing {
  // Winter gear
  winterCoat: boolean;
  scarf: boolean;
  winterHat: boolean;
  gloves: boolean;
  snowBoots: boolean;
  // Spring gear
  raincoat: boolean;
  umbrella: boolean;
  lightJacket: boolean;
  rainBoots: boolean;
  // Summer gear
  sunglasses: boolean;
  sunHat: boolean;
  shorts: boolean;
  sandals: boolean;
  tankTop: boolean;
  // Fall gear
  sweater: boolean;
  fallScarf: boolean;
  beanie: boolean;
  boots: boolean;
}

export interface SeasonalAvatarProps {
  position: [number, number, number];
  rotation?: number;
  season: Season;
  isPlayer?: boolean;
  name?: string;
  skinTone?: string;
  primaryColor?: string;
  animation?: 'idle' | 'walking' | 'shivering' | 'sweating';
}

// Seasonal clothing colors
const SEASONAL_COLORS = {
  winter: {
    coat: ['#1e3a5f', '#2c3e50', '#34495e', '#6c3461'],
    scarf: ['#e74c3c', '#f39c12', '#27ae60', '#9b59b6'],
    hat: ['#34495e', '#2c3e50', '#8e44ad'],
  },
  spring: {
    jacket: ['#3498db', '#2ecc71', '#f1c40f', '#e91e63'],
    raincoat: ['#ffeb3b', '#4caf50', '#2196f3'],
  },
  summer: {
    shirt: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff8a5b', '#00d4aa'],
    shorts: ['#2c3e50', '#34495e', '#7f8c8d', '#3498db'],
  },
  fall: {
    sweater: ['#d35400', '#c0392b', '#8e44ad', '#27ae60', '#f39c12'],
    scarf: ['#c0392b', '#d35400', '#8b4513'],
  },
};

// Winter Avatar Component
const WinterAvatar: React.FC<SeasonalAvatarProps> = ({
  position,
  rotation = 0,
  isPlayer,
  name,
  skinTone = '#e0ac69',
  primaryColor,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [shivering, setShivering] = useState(false);
  
  const coatColor = primaryColor || SEASONAL_COLORS.winter.coat[Math.floor(Math.random() * SEASONAL_COLORS.winter.coat.length)];
  const scarfColor = SEASONAL_COLORS.winter.scarf[Math.floor(Math.random() * SEASONAL_COLORS.winter.scarf.length)];
  const hatColor = SEASONAL_COLORS.winter.hat[Math.floor(Math.random() * SEASONAL_COLORS.winter.hat.length)];

  useFrame((state) => {
    if (groupRef.current && shivering) {
      groupRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 20) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 1.65, 0]}>
        <meshStandardMaterial color={skinTone} />
      </Sphere>
      
      {/* Winter Hat (Ushanka style) */}
      <group position={[0, 1.85, 0]}>
        <Cylinder args={[0.28, 0.32, 0.2, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color={hatColor} />
        </Cylinder>
        {/* Fur trim */}
        <Cylinder args={[0.35, 0.35, 0.1, 16]} position={[0, -0.1, 0]}>
          <meshStandardMaterial color="#f5f5dc" roughness={1} />
        </Cylinder>
        {/* Ear flaps */}
        <Box args={[0.1, 0.2, 0.15]} position={[-0.3, -0.15, 0]}>
          <meshStandardMaterial color="#f5f5dc" roughness={1} />
        </Box>
        <Box args={[0.1, 0.2, 0.15]} position={[0.3, -0.15, 0]}>
          <meshStandardMaterial color="#f5f5dc" roughness={1} />
        </Box>
      </group>
      
      {/* Eyes */}
      {[[-0.08, 1.68, 0.2], [0.08, 1.68, 0.2]].map((pos, i) => (
        <Sphere key={i} args={[0.04, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#3b5998" />
        </Sphere>
      ))}
      
      {/* Rosy cheeks (cold) */}
      {[[-0.15, 1.6, 0.15], [0.15, 1.6, 0.15]].map((pos, i) => (
        <Sphere key={i} args={[0.05, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#ffb6c1" transparent opacity={0.6} />
        </Sphere>
      ))}
      
      {/* Scarf */}
      <group position={[0, 1.4, 0]}>
        <Cylinder args={[0.35, 0.35, 0.15, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color={scarfColor} />
        </Cylinder>
        <Box args={[0.15, 0.4, 0.08]} position={[0.15, -0.25, 0.25]} rotation={[0.3, 0, 0.2]}>
          <meshStandardMaterial color={scarfColor} />
        </Box>
      </group>
      
      {/* Heavy Winter Coat */}
      <Box args={[1, 1.2, 0.6]} position={[0, 0.9, 0]}>
        <meshStandardMaterial color={coatColor} />
      </Box>
      
      {/* Coat fur collar */}
      <Cylinder args={[0.4, 0.5, 0.15, 16]} position={[0, 1.3, 0]}>
        <meshStandardMaterial color="#f5f5dc" roughness={1} />
      </Cylinder>
      
      {/* Puffy sleeves */}
      {[[-0.6, 0.9, 0], [0.6, 0.9, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.2, 0.2, 0.7, 8]} position={pos as [number, number, number]} rotation={[0, 0, i === 0 ? 0.3 : -0.3]}>
          <meshStandardMaterial color={coatColor} />
        </Cylinder>
      ))}
      
      {/* Gloves */}
      {[[-0.65, 0.5, 0], [0.65, 0.5, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.12, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#2c3e50" />
        </Sphere>
      ))}
      
      {/* Legs with snow pants */}
      {[[-0.25, 0.3, 0], [0.25, 0.3, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.18, 0.18, 0.9, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#2c3e50" />
        </Cylinder>
      ))}
      
      {/* Snow Boots */}
      {[[-0.25, -0.1, 0.05], [0.25, -0.1, 0.05]].map((pos, i) => (
        <Box key={i} args={[0.2, 0.25, 0.35]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#5d4037" />
        </Box>
      ))}
      
      {/* Steam breath effect */}
      <Sphere args={[0.05, 8, 8]} position={[0, 1.55, 0.3]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
      </Sphere>
      
      {/* Name tag */}
      {(isPlayer || name) && (
        <Html position={[0, 2.3, 0]} center distanceFactor={15}>
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap
            ${isPlayer ? 'bg-blue-600/80 border border-blue-400/50' : 'bg-black/60'}
            text-white
          `}>
            ❄️ {isPlayer ? 'YOU' : name}
          </div>
        </Html>
      )}
    </group>
  );
};

// Spring Avatar Component
const SpringAvatar: React.FC<SeasonalAvatarProps> = ({
  position,
  rotation = 0,
  isPlayer,
  name,
  skinTone = '#e0ac69',
  primaryColor,
}) => {
  const raincoatColor = primaryColor || SEASONAL_COLORS.spring.raincoat[Math.floor(Math.random() * SEASONAL_COLORS.spring.raincoat.length)];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 1.65, 0]}>
        <meshStandardMaterial color={skinTone} />
      </Sphere>
      
      {/* Hair */}
      <Sphere args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} position={[0, 1.75, 0]}>
        <meshStandardMaterial color="#4a3728" />
      </Sphere>
      
      {/* Eyes */}
      {[[-0.08, 1.68, 0.2], [0.08, 1.68, 0.2]].map((pos, i) => (
        <Sphere key={i} args={[0.04, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#3b5998" />
        </Sphere>
      ))}
      
      {/* Light Raincoat */}
      <Box args={[0.9, 1, 0.5]} position={[0, 1, 0]}>
        <meshStandardMaterial color={raincoatColor} metalness={0.3} roughness={0.5} />
      </Box>
      
      {/* Rain hood (down) */}
      <Box args={[0.4, 0.15, 0.3]} position={[0, 1.35, -0.2]}>
        <meshStandardMaterial color={raincoatColor} />
      </Box>
      
      {/* Arms with raincoat sleeves */}
      {[[-0.55, 1, 0], [0.55, 1, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.14, 0.14, 0.6, 8]} position={pos as [number, number, number]} rotation={[0, 0, i === 0 ? 0.2 : -0.2]}>
          <meshStandardMaterial color={raincoatColor} metalness={0.3} />
        </Cylinder>
      ))}
      
      {/* Hands */}
      {[[-0.6, 0.65, 0], [0.6, 0.65, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.08, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={skinTone} />
        </Sphere>
      ))}
      
      {/* Jeans */}
      {[[-0.2, 0.4, 0], [0.2, 0.4, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.15, 0.15, 0.8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#1e3a5f" />
        </Cylinder>
      ))}
      
      {/* Rain boots */}
      {[[-0.2, -0.05, 0.05], [0.2, -0.05, 0.05]].map((pos, i) => (
        <Box key={i} args={[0.16, 0.2, 0.28]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#2e7d32" metalness={0.2} />
        </Box>
      ))}
      
      {/* Umbrella */}
      <group position={[0.7, 1.5, 0]} rotation={[0.2, 0, -0.5]}>
        <Cylinder args={[0.02, 0.02, 1.2, 8]} position={[0, -0.3, 0]}>
          <meshStandardMaterial color="#5d4037" />
        </Cylinder>
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.6, 0.3, 8]} />
          <meshStandardMaterial color="#e91e63" side={THREE.DoubleSide} />
        </mesh>
      </group>
      
      {/* Name tag */}
      {(isPlayer || name) && (
        <Html position={[0, 2.3, 0]} center distanceFactor={15}>
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap
            ${isPlayer ? 'bg-green-600/80 border border-green-400/50' : 'bg-black/60'}
            text-white
          `}>
            🌸 {isPlayer ? 'YOU' : name}
          </div>
        </Html>
      )}
    </group>
  );
};

// Summer Avatar Component
const SummerAvatar: React.FC<SeasonalAvatarProps> = ({
  position,
  rotation = 0,
  isPlayer,
  name,
  skinTone = '#c68642',
  primaryColor,
}) => {
  const shirtColor = primaryColor || SEASONAL_COLORS.summer.shirt[Math.floor(Math.random() * SEASONAL_COLORS.summer.shirt.length)];
  const shortsColor = SEASONAL_COLORS.summer.shorts[Math.floor(Math.random() * SEASONAL_COLORS.summer.shorts.length)];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 1.65, 0]}>
        <meshStandardMaterial color={skinTone} />
      </Sphere>
      
      {/* Hair */}
      <Sphere args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} position={[0, 1.75, 0]}>
        <meshStandardMaterial color="#4a3728" />
      </Sphere>
      
      {/* Sunglasses */}
      <group position={[0, 1.68, 0.22]}>
        <Box args={[0.14, 0.08, 0.02]} position={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
        </Box>
        <Box args={[0.14, 0.08, 0.02]} position={[0.1, 0, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
        </Box>
        <Box args={[0.08, 0.02, 0.02]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>
      </group>
      
      {/* Sun Hat */}
      <group position={[0, 1.9, 0]}>
        <Cylinder args={[0.2, 0.25, 0.15, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#f5deb3" />
        </Cylinder>
        <Cylinder args={[0.45, 0.45, 0.03, 16]} position={[0, -0.08, 0]}>
          <meshStandardMaterial color="#f5deb3" />
        </Cylinder>
        {/* Hat band */}
        <Cylinder args={[0.26, 0.26, 0.05, 16]} position={[0, -0.02, 0]}>
          <meshStandardMaterial color="#8b4513" />
        </Cylinder>
      </group>
      
      {/* Tank Top */}
      <Box args={[0.7, 0.7, 0.4]} position={[0, 1.15, 0]}>
        <meshStandardMaterial color={shirtColor} />
      </Box>
      
      {/* Bare Arms (tanned) */}
      {[[-0.45, 1.1, 0], [0.45, 1.1, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.1, 0.1, 0.5, 8]} position={pos as [number, number, number]} rotation={[0, 0, i === 0 ? 0.2 : -0.2]}>
          <meshStandardMaterial color={skinTone} />
        </Cylinder>
      ))}
      
      {/* Hands */}
      {[[-0.5, 0.8, 0], [0.5, 0.8, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.08, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={skinTone} />
        </Sphere>
      ))}
      
      {/* Shorts */}
      <Box args={[0.6, 0.35, 0.4]} position={[0, 0.65, 0]}>
        <meshStandardMaterial color={shortsColor} />
      </Box>
      
      {/* Bare Legs */}
      {[[-0.2, 0.3, 0], [0.2, 0.3, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.12, 0.12, 0.5, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={skinTone} />
        </Cylinder>
      ))}
      
      {/* Sandals */}
      {[[-0.2, 0, 0.02], [0.2, 0, 0.02]].map((pos, i) => (
        <Box key={i} args={[0.12, 0.05, 0.22]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#8b4513" />
        </Box>
      ))}
      
      {/* Sweat drops (hot weather) */}
      <Sphere args={[0.02, 8, 8]} position={[0.18, 1.72, 0.18]}>
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.7} />
      </Sphere>
      
      {/* Name tag */}
      {(isPlayer || name) && (
        <Html position={[0, 2.4, 0]} center distanceFactor={15}>
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap
            ${isPlayer ? 'bg-yellow-600/80 border border-yellow-400/50' : 'bg-black/60'}
            text-white
          `}>
            ☀️ {isPlayer ? 'YOU' : name}
          </div>
        </Html>
      )}
    </group>
  );
};

// Fall Avatar Component
const FallAvatar: React.FC<SeasonalAvatarProps> = ({
  position,
  rotation = 0,
  isPlayer,
  name,
  skinTone = '#e0ac69',
  primaryColor,
}) => {
  const sweaterColor = primaryColor || SEASONAL_COLORS.fall.sweater[Math.floor(Math.random() * SEASONAL_COLORS.fall.sweater.length)];
  const scarfColor = SEASONAL_COLORS.fall.scarf[Math.floor(Math.random() * SEASONAL_COLORS.fall.scarf.length)];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 1.65, 0]}>
        <meshStandardMaterial color={skinTone} />
      </Sphere>
      
      {/* Hair */}
      <Sphere args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} position={[0, 1.75, 0]}>
        <meshStandardMaterial color="#4a3728" />
      </Sphere>
      
      {/* Beanie */}
      <group position={[0, 1.85, 0]}>
        <Sphere args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#c0392b" />
        </Sphere>
        <Cylinder args={[0.29, 0.29, 0.1, 16]} position={[0, -0.08, 0]}>
          <meshStandardMaterial color="#922b21" />
        </Cylinder>
      </group>
      
      {/* Eyes */}
      {[[-0.08, 1.68, 0.2], [0.08, 1.68, 0.2]].map((pos, i) => (
        <Sphere key={i} args={[0.04, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#3b5998" />
        </Sphere>
      ))}
      
      {/* Light Scarf */}
      <group position={[0, 1.38, 0]}>
        <Cylinder args={[0.32, 0.32, 0.12, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color={scarfColor} />
        </Cylinder>
        <Box args={[0.12, 0.3, 0.06]} position={[0.1, -0.2, 0.2]} rotation={[0.2, 0, 0.1]}>
          <meshStandardMaterial color={scarfColor} />
        </Box>
      </group>
      
      {/* Cozy Sweater */}
      <Box args={[0.85, 0.9, 0.5]} position={[0, 0.95, 0]}>
        <meshStandardMaterial color={sweaterColor} roughness={0.9} />
      </Box>
      
      {/* Sweater texture (cable knit effect) */}
      <group position={[0, 0.95, 0.26]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} args={[0.08, 0.8, 0.02]} position={[(i - 2) * 0.15, 0, 0]}>
            <meshStandardMaterial color={sweaterColor} />
          </Box>
        ))}
      </group>
      
      {/* Arms */}
      {[[-0.55, 0.95, 0], [0.55, 0.95, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.16, 0.14, 0.6, 8]} position={pos as [number, number, number]} rotation={[0, 0, i === 0 ? 0.2 : -0.2]}>
          <meshStandardMaterial color={sweaterColor} roughness={0.9} />
        </Cylinder>
      ))}
      
      {/* Hands */}
      {[[-0.6, 0.6, 0], [0.6, 0.6, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.08, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={skinTone} />
        </Sphere>
      ))}
      
      {/* Jeans */}
      {[[-0.2, 0.35, 0], [0.2, 0.35, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.15, 0.15, 0.7, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#1e3a5f" />
        </Cylinder>
      ))}
      
      {/* Ankle Boots */}
      {[[-0.2, -0.05, 0.03], [0.2, -0.05, 0.03]].map((pos, i) => (
        <Box key={i} args={[0.16, 0.18, 0.26]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#5d4037" />
        </Box>
      ))}
      
      {/* Hot drink in hand */}
      <group position={[0.55, 0.7, 0.15]} rotation={[0.3, 0, -0.2]}>
        <Cylinder args={[0.05, 0.04, 0.12, 8]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#f5f5dc" />
        </Cylinder>
        {/* Steam */}
        <Sphere args={[0.02, 8, 8]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
        </Sphere>
      </group>
      
      {/* Name tag */}
      {(isPlayer || name) && (
        <Html position={[0, 2.3, 0]} center distanceFactor={15}>
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap
            ${isPlayer ? 'bg-orange-600/80 border border-orange-400/50' : 'bg-black/60'}
            text-white
          `}>
            🍂 {isPlayer ? 'YOU' : name}
          </div>
        </Html>
      )}
    </group>
  );
};

// Main Seasonal Avatar Component
export const SeasonalAvatar: React.FC<SeasonalAvatarProps> = (props) => {
  switch (props.season) {
    case 'winter':
      return <WinterAvatar {...props} />;
    case 'spring':
      return <SpringAvatar {...props} />;
    case 'summer':
      return <SummerAvatar {...props} />;
    case 'fall':
      return <FallAvatar {...props} />;
    default:
      return <FallAvatar {...props} />;
  }
};

// Hook for managing seasonal avatars
export const useSeasonalAvatar = (initialSeason: Season = 'summer') => {
  const [season, setSeason] = useState<Season>(initialSeason);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState(0);

  const updateSeason = useCallback((newSeason: Season) => {
    setSeason(newSeason);
    toast.success(`Avatar updated for ${newSeason}`, {
      description: 'Clothing and accessories changed',
    });
  }, []);

  return {
    season,
    setSeason: updateSeason,
    position,
    setPosition,
    rotation,
    setRotation,
  };
};

export default SeasonalAvatar;
