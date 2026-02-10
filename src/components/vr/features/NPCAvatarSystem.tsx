// ═══════════════════════════════════════════════════════════════════════════════
// NPC AVATAR SYSTEM - Ready Player One Style Avatars
// 50 NPCs with walking, running, car interaction, building entry
// NOW WITH: Speaking to Zoe Orb integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { dispatchVRSpeaking, dispatchVRSpeakingEnd } from '@/hooks/useVRSpeakingToOrb';

// NPC Avatar Types
export interface NPCAvatar {
  id: string;
  name: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotation: number;
  state: 'idle' | 'walking' | 'running' | 'driving' | 'entering_building';
  vehicleId: string | null;
  customization: NPCCustomization;
  speed: number;
  personality: 'friendly' | 'busy' | 'explorer' | 'racer';
}

interface NPCCustomization {
  skinTone: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  hasGlasses: boolean;
  hasHat: boolean;
}

// Random name generator
const FIRST_NAMES = ['Wade', 'Art3mis', 'Aech', 'Shoto', 'Daito', 'Nolan', 'IOI', 'Parzival', 'Neo', 'Trinity', 'Morpheus', 'Cypher', 'Tank', 'Dozer', 'Switch', 'Apoc', 'Mouse', 'Oracle', 'Seraph', 'Niobe'];
const SUFFIXES = ['_2120', '_X', '_Prime', '_Zero', '_One', '_Max', '_Ultra', '_Omega', '_Delta', '_Sigma'];

// Color palettes
const SKIN_TONES = ['#ffe0bd', '#ffcd94', '#e0ac69', '#c68642', '#8d5524', '#6b4423'];
const HAIR_COLORS = ['#090806', '#4a3728', '#b7a69e', '#da680f', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e'];
const SHIRT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
const PANTS_COLORS = ['#1f2937', '#374151', '#4b5563', '#1e3a5f', '#312e81', '#4c1d95'];

// Generate random NPC
const generateRandomNPC = (index: number): NPCAvatar => {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  
  return {
    id: `npc-${index}-${crypto.randomUUID().slice(0, 8)}`,
    name: `${firstName}${suffix}`,
    position: [
      (Math.random() - 0.5) * 80,
      0,
      (Math.random() - 0.5) * 80
    ],
    targetPosition: [
      (Math.random() - 0.5) * 80,
      0,
      (Math.random() - 0.5) * 80
    ],
    rotation: Math.random() * Math.PI * 2,
    state: 'walking',
    vehicleId: null,
    speed: 0.5 + Math.random() * 1.5,
    personality: ['friendly', 'busy', 'explorer', 'racer'][Math.floor(Math.random() * 4)] as NPCAvatar['personality'],
    customization: {
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      shirtColor: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
      pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
      hasGlasses: Math.random() > 0.7,
      hasHat: Math.random() > 0.8,
    }
  };
};

// Single NPC Avatar Component
const NPCAvatarMesh: React.FC<{ 
  npc: NPCAvatar; 
  onInteract?: (npc: NPCAvatar) => void;
  showLabels?: boolean;
}> = ({ npc, onInteract, showLabels = true }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [animPhase, setAnimPhase] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  useFrame((state, delta) => {
    if (!groupRef.current || npc.state === 'driving') return;
    
    const time = state.clock.elapsedTime;
    
    // Movement animation
    if (npc.state === 'walking' || npc.state === 'running') {
      const animSpeed = npc.state === 'running' ? 10 : 5;
      setAnimPhase(Math.sin(time * animSpeed) * 0.3);
    } else {
      // Idle breathing
      groupRef.current.position.y = npc.position[1] + Math.sin(time * 2) * 0.02;
    }
  });

  // Handle speaking to Zoe when interacted with
  const handleSpeakToZoe = useCallback(() => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    
    // Dispatch speaking event to GlobalZoeAssistant
    dispatchVRSpeaking({
      speakerId: npc.id,
      speakerType: 'npc',
      speakerName: npc.name,
      worldPosition: { x: npc.position[0], y: npc.position[1] + 1.8, z: npc.position[2] },
      isSpeaking: true,
    });
    
    // Simulate conversation duration (3-6 seconds)
    const duration = 3000 + Math.random() * 3000;
    setTimeout(() => {
      setIsSpeaking(false);
      dispatchVRSpeakingEnd(npc.id);
    }, duration);
  }, [npc, isSpeaking]);

  // Don't render if driving
  if (npc.state === 'driving') return null;

  const { customization } = npc;

  return (
    <group 
      ref={groupRef} 
      position={npc.position} 
      rotation={[0, npc.rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => {
        handleSpeakToZoe();
        onInteract?.(npc);
      }}
    >
      {/* Head */}
      <Sphere args={[0.2, 12, 12]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color={customization.skinTone} />
      </Sphere>
      
      {/* Hair */}
      <Sphere args={[0.22, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.6, 0]}>
        <meshStandardMaterial color={customization.hairColor} />
      </Sphere>
      
      {/* Hat if enabled */}
      {customization.hasHat && (
        <group position={[0, 1.75, 0]}>
          <Cylinder args={[0.25, 0.28, 0.12, 12]}>
            <meshStandardMaterial color="#1f2937" />
          </Cylinder>
          <Cylinder args={[0.35, 0.35, 0.03, 12]} position={[0, -0.06, 0]}>
            <meshStandardMaterial color="#1f2937" />
          </Cylinder>
        </group>
      )}
      
      {/* Glasses if enabled */}
      {customization.hasGlasses && (
        <group position={[0, 1.52, 0.17]}>
          <Box args={[0.1, 0.06, 0.02]} position={[-0.08, 0, 0]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[0.1, 0.06, 0.02]} position={[0.08, 0, 0]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </group>
      )}
      
      {/* Torso */}
      <Box args={[0.6, 0.8, 0.35]} position={[0, 1, 0]}>
        <meshStandardMaterial color={customization.shirtColor} />
      </Box>
      
      {/* Arms with animation */}
      {[[-0.4, 1, 0], [0.4, 1, 0]].map((pos, i) => (
        <Cylinder 
          key={i} 
          args={[0.08, 0.08, 0.5, 8]} 
          position={[pos[0], pos[1], pos[2]]}
          rotation={[animPhase * (i === 0 ? 1 : -1), 0, i === 0 ? 0.15 : -0.15]}
        >
          <meshStandardMaterial color={customization.skinTone} />
        </Cylinder>
      ))}
      
      {/* Legs with walking animation */}
      {[[-0.15, 0.35, 0], [0.15, 0.35, 0]].map((pos, i) => (
        <Cylinder 
          key={i} 
          args={[0.1, 0.1, 0.7, 8]} 
          position={[pos[0], pos[1], pos[2]]}
          rotation={[animPhase * (i === 0 ? 1 : -1), 0, 0]}
        >
          <meshStandardMaterial color={customization.pantsColor} />
        </Cylinder>
      ))}
      
      {/* Shoes */}
      {[[-0.15, 0, 0.04], [0.15, 0, 0.04]].map((pos, i) => (
        <Box key={i} args={[0.12, 0.08, 0.2]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>
      ))}
      
      {/* State indicator glow */}
      <pointLight
        position={[0, 1.8, 0]}
        color={
          isSpeaking ? '#00ffff' : // Cyan when speaking to Zoe
          npc.personality === 'friendly' ? '#22c55e' :
          npc.personality === 'busy' ? '#f97316' :
          npc.personality === 'racer' ? '#ef4444' : '#3b82f6'
        }
        intensity={isSpeaking ? 2 : hovered ? 1 : 0.3}
        distance={isSpeaking ? 5 : 3}
      />
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <Html position={[0, 2.3, 0]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded-full bg-cyan-500/90 text-white text-[8px] animate-pulse whitespace-nowrap">
            💬 Speaking to Zoe...
          </div>
        </Html>
      )}
      
      {/* Name tag */}
      {showLabels && (
        <Html position={[0, 2, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className={`
            px-2 py-1 rounded text-[9px] whitespace-nowrap transition-all
            ${hovered ? 'bg-purple-600/90 border border-purple-400/50 scale-110' : 'bg-black/60 border border-white/10'}
            text-white
          `}>
            {npc.name}
            {hovered && (
              <div className="text-[7px] text-white/60 mt-0.5">
                {npc.state} | {npc.personality}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// NPC System Hook
export const useNPCSystem = (count: number = 50) => {
  const [npcs, setNpcs] = useState<NPCAvatar[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize NPCs
  useEffect(() => {
    if (isInitialized) return;
    
    const newNpcs = Array.from({ length: count }, (_, i) => generateRandomNPC(i));
    setNpcs(newNpcs);
    setIsInitialized(true);
  }, [count, isInitialized]);

  // Update NPC positions - AI pathfinding
  useEffect(() => {
    if (npcs.length === 0) return;
    
    const interval = setInterval(() => {
      setNpcs(prev => prev.map(npc => {
        if (npc.state === 'driving' || npc.state === 'entering_building') return npc;
        
        // Calculate direction to target
        const dx = npc.targetPosition[0] - npc.position[0];
        const dz = npc.targetPosition[2] - npc.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // If close to target, pick new target
        if (distance < 1) {
          return {
            ...npc,
            targetPosition: [
              (Math.random() - 0.5) * 80,
              0,
              (Math.random() - 0.5) * 80
            ],
            state: Math.random() > 0.7 ? 'running' : 'walking',
          };
        }
        
        // Move toward target
        const speed = npc.state === 'running' ? npc.speed * 2 : npc.speed;
        const moveX = (dx / distance) * speed * 0.05;
        const moveZ = (dz / distance) * speed * 0.05;
        
        return {
          ...npc,
          position: [
            npc.position[0] + moveX,
            0,
            npc.position[2] + moveZ
          ] as [number, number, number],
          rotation: Math.atan2(dx, dz),
        };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [npcs.length]);

  // Enter vehicle
  const enterVehicle = useCallback((npcId: string, vehicleId: string) => {
    setNpcs(prev => prev.map(npc => 
      npc.id === npcId 
        ? { ...npc, state: 'driving', vehicleId } 
        : npc
    ));
  }, []);

  // Exit vehicle
  const exitVehicle = useCallback((npcId: string) => {
    setNpcs(prev => prev.map(npc => 
      npc.id === npcId 
        ? { ...npc, state: 'idle', vehicleId: null } 
        : npc
    ));
  }, []);

  // Spawn more NPCs
  const spawnNPCs = useCallback((additionalCount: number) => {
    const newNpcs = Array.from({ length: additionalCount }, (_, i) => 
      generateRandomNPC(npcs.length + i)
    );
    setNpcs(prev => [...prev, ...newNpcs]);
  }, [npcs.length]);

  return {
    npcs,
    enterVehicle,
    exitVehicle,
    spawnNPCs,
    npcCount: npcs.length,
  };
};

// Main NPC System Component
export const NPCAvatarSystem: React.FC<{
  count?: number;
  showLabels?: boolean;
  onNPCInteract?: (npc: NPCAvatar) => void;
}> = ({ count = 50, showLabels = true, onNPCInteract }) => {
  const { npcs } = useNPCSystem(count);

  return (
    <group>
      {npcs.map(npc => (
        <NPCAvatarMesh 
          key={npc.id} 
          npc={npc} 
          showLabels={showLabels}
          onInteract={onNPCInteract}
        />
      ))}
    </group>
  );
};

export default NPCAvatarSystem;
