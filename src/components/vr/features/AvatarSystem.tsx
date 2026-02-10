// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR CUSTOMIZATION SYSTEM - Player Avatar with Customization Options
// Basic avatar system with body, clothing, and accessory customization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';

export interface AvatarCustomization {
  skinTone: string;
  hairColor: string;
  hairStyle: 'short' | 'medium' | 'long' | 'bald';
  eyeColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  accessory: 'none' | 'glasses' | 'hat' | 'headphones';
  bodyType: 'slim' | 'average' | 'athletic';
}

interface AvatarProps {
  position: [number, number, number];
  rotation?: number;
  customization: AvatarCustomization;
  isPlayer?: boolean;
  animation?: 'idle' | 'walking' | 'running' | 'sitting';
  name?: string;
}

// Default avatar customization
export const DEFAULT_AVATAR: AvatarCustomization = {
  skinTone: '#e0ac69',
  hairColor: '#4a3728',
  hairStyle: 'medium',
  eyeColor: '#3b5998',
  shirtColor: '#3b82f6',
  pantsColor: '#1f2937',
  shoeColor: '#1a1a1a',
  accessory: 'none',
  bodyType: 'average',
};

// Skin tone presets
export const SKIN_TONES = [
  '#ffe0bd', '#ffcd94', '#eac086', '#e0ac69',
  '#c68642', '#8d5524', '#6b4423', '#4a3728'
];

// Hair color presets
export const HAIR_COLORS = [
  '#090806', '#2c222b', '#71635a', '#b7a69e',
  '#d6c4c2', '#cabfb1', '#da680f', '#91553d'
];

// Avatar Component
const Avatar: React.FC<AvatarProps> = ({
  position,
  rotation = 0,
  customization,
  isPlayer = false,
  animation = 'idle',
  name
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Body proportions based on body type
  const bodyScale = {
    slim: { torso: [0.7, 1, 0.4], arms: 0.12, legs: 0.14 },
    average: { torso: [0.8, 1, 0.5], arms: 0.14, legs: 0.16 },
    athletic: { torso: [0.9, 1.1, 0.5], arms: 0.16, legs: 0.18 },
  }[customization.bodyType];
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    switch (animation) {
      case 'walking':
        setAnimationPhase(Math.sin(time * 5) * 0.3);
        break;
      case 'running':
        setAnimationPhase(Math.sin(time * 10) * 0.5);
        break;
      case 'idle':
        // Subtle breathing animation
        groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.02;
        break;
    }
  });

  // Hair component based on style
  const renderHair = () => {
    switch (customization.hairStyle) {
      case 'short':
        return (
          <Sphere args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.85, 0]}>
            <meshStandardMaterial color={customization.hairColor} />
          </Sphere>
        );
      case 'medium':
        return (
          <group position={[0, 1.75, 0]}>
            <Sphere args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]}>
              <meshStandardMaterial color={customization.hairColor} />
            </Sphere>
            <Box args={[0.5, 0.3, 0.1]} position={[0, -0.1, -0.2]}>
              <meshStandardMaterial color={customization.hairColor} />
            </Box>
          </group>
        );
      case 'long':
        return (
          <group position={[0, 1.75, 0]}>
            <Sphere args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]}>
              <meshStandardMaterial color={customization.hairColor} />
            </Sphere>
            <Box args={[0.5, 0.6, 0.1]} position={[0, -0.3, -0.2]}>
              <meshStandardMaterial color={customization.hairColor} />
            </Box>
          </group>
        );
      case 'bald':
      default:
        return null;
    }
  };

  // Accessory component
  const renderAccessory = () => {
    switch (customization.accessory) {
      case 'glasses':
        return (
          <group position={[0, 1.68, 0.22]}>
            {/* Frames */}
            <Box args={[0.12, 0.08, 0.02]} position={[-0.1, 0, 0]}>
              <meshStandardMaterial color="#1a1a1a" />
            </Box>
            <Box args={[0.12, 0.08, 0.02]} position={[0.1, 0, 0]}>
              <meshStandardMaterial color="#1a1a1a" />
            </Box>
            {/* Bridge */}
            <Box args={[0.08, 0.02, 0.02]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#1a1a1a" />
            </Box>
          </group>
        );
      case 'hat':
        return (
          <group position={[0, 1.9, 0]}>
            <Cylinder args={[0.3, 0.35, 0.15, 16]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#1f2937" />
            </Cylinder>
            <Cylinder args={[0.45, 0.45, 0.03, 16]} position={[0, -0.08, 0]}>
              <meshStandardMaterial color="#1f2937" />
            </Cylinder>
          </group>
        );
      case 'headphones':
        return (
          <group position={[0, 1.75, 0]}>
            {/* Headband */}
            <mesh>
              <torusGeometry args={[0.25, 0.02, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* Ear cups */}
            {[[-0.25, -0.05, 0], [0.25, -0.05, 0]].map((pos, i) => (
              <Cylinder key={i} args={[0.08, 0.08, 0.05, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
                <meshStandardMaterial color="#374151" />
              </Cylinder>
            ))}
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 1.65, 0]}>
        <meshStandardMaterial color={customization.skinTone} />
      </Sphere>
      
      {/* Eyes */}
      {[[-0.08, 1.68, 0.2], [0.08, 1.68, 0.2]].map((pos, i) => (
        <Sphere key={i} args={[0.04, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={customization.eyeColor} />
        </Sphere>
      ))}
      
      {/* Hair */}
      {renderHair()}
      
      {/* Accessory */}
      {renderAccessory()}
      
      {/* Torso (Shirt) */}
      <Box args={bodyScale.torso as [number, number, number]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color={customization.shirtColor} />
      </Box>
      
      {/* Arms */}
      {[[-0.5, 1.1, 0], [0.5, 1.1, 0]].map((pos, i) => (
        <Cylinder 
          key={i} 
          args={[bodyScale.arms, bodyScale.arms, 0.6, 8]} 
          position={pos as [number, number, number]}
          rotation={[0, 0, i === 0 ? 0.2 : -0.2]}
        >
          <meshStandardMaterial color={customization.skinTone} />
        </Cylinder>
      ))}
      
      {/* Hands */}
      {[[-0.55, 0.75, 0], [0.55, 0.75, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.08, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={customization.skinTone} />
        </Sphere>
      ))}
      
      {/* Legs (Pants) */}
      {[[-0.2, 0.4, 0], [0.2, 0.4, 0]].map((pos, i) => (
        <Cylinder 
          key={i} 
          args={[bodyScale.legs, bodyScale.legs, 0.8, 8]} 
          position={[
            pos[0],
            pos[1],
            pos[2]
          ] as [number, number, number]}
          rotation={[animation !== 'idle' ? animationPhase * (i === 0 ? 1 : -1) : 0, 0, 0]}
        >
          <meshStandardMaterial color={customization.pantsColor} />
        </Cylinder>
      ))}
      
      {/* Shoes */}
      {[[-0.2, 0, 0.05], [0.2, 0, 0.05]].map((pos, i) => (
        <Box key={i} args={[0.15, 0.1, 0.25]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={customization.shoeColor} />
        </Box>
      ))}
      
      {/* Player indicator / Name tag */}
      {(isPlayer || name) && (
        <Html position={[0, 2.2, 0]} center distanceFactor={15}>
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap
            ${isPlayer ? 'bg-purple-600/80 border border-purple-400/50' : 'bg-black/60'}
            text-white
          `}>
            {isPlayer ? '👤 YOU' : name}
          </div>
        </Html>
      )}
    </group>
  );
};

// Avatar Customization Hook
export const useAvatarCustomization = () => {
  const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_AVATAR);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const updateCustomization = useCallback(<K extends keyof AvatarCustomization>(
    key: K,
    value: AvatarCustomization[K]
  ) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  }, []);

  const randomizeAvatar = useCallback(() => {
    const hairStyles: AvatarCustomization['hairStyle'][] = ['short', 'medium', 'long', 'bald'];
    const accessories: AvatarCustomization['accessory'][] = ['none', 'glasses', 'hat', 'headphones'];
    const bodyTypes: AvatarCustomization['bodyType'][] = ['slim', 'average', 'athletic'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    setCustomization({
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      eyeColor: colors[Math.floor(Math.random() * colors.length)],
      shirtColor: colors[Math.floor(Math.random() * colors.length)],
      pantsColor: colors[Math.floor(Math.random() * colors.length)],
      shoeColor: '#1a1a1a',
      accessory: accessories[Math.floor(Math.random() * accessories.length)],
      bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
    });
    
    toast.success('Avatar randomized!');
  }, []);

  const resetAvatar = useCallback(() => {
    setCustomization(DEFAULT_AVATAR);
    toast.info('Avatar reset to default');
  }, []);

  return {
    customization,
    setCustomization,
    updateCustomization,
    randomizeAvatar,
    resetAvatar,
    isCustomizing,
    setIsCustomizing
  };
};

// Avatar Customization Panel (2D UI)
export const AvatarCustomizationPanel: React.FC<{
  customization: AvatarCustomization;
  onUpdate: <K extends keyof AvatarCustomization>(key: K, value: AvatarCustomization[K]) => void;
  onRandomize: () => void;
  onClose: () => void;
}> = ({ customization, onUpdate, onRandomize, onClose }) => {
  return (
    <div className="fixed right-4 top-20 w-72 bg-black/90 border border-purple-500/30 rounded-lg p-4 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">Avatar Customization</h3>
        <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
      </div>
      
      {/* Skin Tone */}
      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-2">Skin Tone</label>
        <div className="flex gap-1 flex-wrap">
          {SKIN_TONES.map(tone => (
            <button
              key={tone}
              onClick={() => onUpdate('skinTone', tone)}
              className={`w-6 h-6 rounded-full border-2 ${customization.skinTone === tone ? 'border-purple-500' : 'border-transparent'}`}
              style={{ backgroundColor: tone }}
            />
          ))}
        </div>
      </div>
      
      {/* Hair Color */}
      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-2">Hair Color</label>
        <div className="flex gap-1 flex-wrap">
          {HAIR_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onUpdate('hairColor', color)}
              className={`w-6 h-6 rounded-full border-2 ${customization.hairColor === color ? 'border-purple-500' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      
      {/* Hair Style */}
      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-2">Hair Style</label>
        <div className="flex gap-2">
          {(['short', 'medium', 'long', 'bald'] as const).map(style => (
            <button
              key={style}
              onClick={() => onUpdate('hairStyle', style)}
              className={`px-2 py-1 text-xs rounded ${customization.hairStyle === style ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      
      {/* Accessory */}
      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-2">Accessory</label>
        <div className="flex gap-2 flex-wrap">
          {(['none', 'glasses', 'hat', 'headphones'] as const).map(acc => (
            <button
              key={acc}
              onClick={() => onUpdate('accessory', acc)}
              className={`px-2 py-1 text-xs rounded ${customization.accessory === acc ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {acc}
            </button>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onRandomize}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded text-sm"
        >
          🎲 Randomize
        </button>
      </div>
    </div>
  );
};

export default Avatar;
