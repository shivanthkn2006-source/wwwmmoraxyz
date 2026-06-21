// ═══════════════════════════════════════════════════════════════════════════════
// ANIMAL ZOO SYSTEM - Animals that roam in forests and zoos
// Lions, Tigers, Bears, Deer, Birds with basic AI movement
// NOW WITH: Speaking to Zoe Orb integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { dispatchVRSpeaking, dispatchVRSpeakingEnd } from '@/hooks/useVRSpeakingToOrb';

export interface Animal {
  id: string;
  type: 'lion' | 'tiger' | 'bear' | 'deer' | 'bird' | 'elephant' | 'wolf' | 'rabbit';
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotation: number;
  state: 'idle' | 'walking' | 'running' | 'sleeping';
  speed: number;
}

// Animal colors
const ANIMAL_COLORS: Record<string, { body: string; accent: string }> = {
  lion: { body: '#d4a574', accent: '#8b6914' },
  tiger: { body: '#ff8c00', accent: '#1a1a1a' },
  bear: { body: '#5d3a1a', accent: '#3d2a0a' },
  deer: { body: '#a0522d', accent: '#f5f5dc' },
  bird: { body: '#3b82f6', accent: '#fbbf24' },
  elephant: { body: '#808080', accent: '#a0a0a0' },
  wolf: { body: '#4a4a4a', accent: '#2a2a2a' },
  rabbit: { body: '#f5f5dc', accent: '#ffb6c1' },
};

// Single Animal Component
const AnimalMesh: React.FC<{ animal: Animal; onInteract?: (animal: Animal) => void }> = ({ animal, onInteract }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  const colors = ANIMAL_COLORS[animal.type];
  
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    if (animal.state === 'idle') {
      // Breathing
      groupRef.current.position.y = animal.position[1] + Math.sin(time * 1.5) * 0.01;
    } else {
      groupRef.current.position.y = animal.position[1];
    }
  });

  // Handle speaking to Zoe when interacted with
  const handleSpeakToZoe = useCallback(() => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    
    // Get animal sound name
    const animalSounds: Record<string, string> = {
      lion: 'Lion roars',
      tiger: 'Tiger growls',
      bear: 'Bear grunts',
      deer: 'Deer calls',
      bird: 'Bird chirps',
      elephant: 'Elephant trumpets',
      wolf: 'Wolf howls',
      rabbit: 'Rabbit squeaks',
    };
    
    // Dispatch speaking event to GlobalZoeAssistant
    dispatchVRSpeaking({
      speakerId: animal.id,
      speakerType: 'animal',
      speakerName: `${animal.type.charAt(0).toUpperCase() + animal.type.slice(1)} (${animalSounds[animal.type] || 'makes a sound'})`,
      worldPosition: { x: animal.position[0], y: animal.position[1] + 0.5, z: animal.position[2] },
      isSpeaking: true,
    });
    
    // Simulate sound duration (2-4 seconds)
    const duration = 2000 + Math.random() * 2000;
    setTimeout(() => {
      setIsSpeaking(false);
      dispatchVRSpeakingEnd(animal.id);
    }, duration);
  }, [animal, isSpeaking]);

  // Different render based on animal type
  const renderAnimal = () => {
    switch (animal.type) {
      case 'bird':
        return (
          <group>
            {/* Body */}
            <Sphere args={[0.15, 8, 8]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Sphere>
            {/* Head */}
            <Sphere args={[0.1, 8, 8]} position={[0.12, 0.22, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Sphere>
            {/* Beak */}
            <Box args={[0.08, 0.03, 0.03]} position={[0.22, 0.2, 0]}>
              <meshStandardMaterial color={colors.accent} />
            </Box>
            {/* Wings (static for performance stability) */}
            <Box args={[0.02, 0.1, 0.2]} position={[0, 0.15, -0.12]} rotation={[0, 0, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Box>
            <Box args={[0.02, 0.1, 0.2]} position={[0, 0.15, 0.12]} rotation={[0, 0, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Box>
          </group>
        );
      
      case 'rabbit':
        return (
          <group>
            {/* Body */}
            <Sphere args={[0.2, 8, 8]} position={[0, 0.2, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Sphere>
            {/* Head */}
            <Sphere args={[0.12, 8, 8]} position={[0.18, 0.3, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Sphere>
            {/* Ears */}
            <Cylinder args={[0.02, 0.03, 0.15, 8]} position={[0.2, 0.48, -0.05]} rotation={[0.2, 0, 0]}>
              <meshStandardMaterial color={colors.accent} />
            </Cylinder>
            <Cylinder args={[0.02, 0.03, 0.15, 8]} position={[0.2, 0.48, 0.05]} rotation={[-0.2, 0, 0]}>
              <meshStandardMaterial color={colors.accent} />
            </Cylinder>
            {/* Legs (static for performance stability) */}
            <Cylinder args={[0.03, 0.03, 0.12, 8]} position={[-0.08, 0.06, 0.08]} rotation={[0.3, 0, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Cylinder>
            <Cylinder args={[0.03, 0.03, 0.12, 8]} position={[-0.08, 0.06, -0.08]} rotation={[0.3, 0, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Cylinder>
          </group>
        );
      
      default: // Quadruped base (lion, tiger, bear, deer, elephant, wolf)
        const scale = animal.type === 'elephant' ? 2 : animal.type === 'bear' ? 1.3 : 1;
        return (
          <group scale={[scale, scale, scale]}>
            {/* Body */}
            <Box args={[0.6, 0.3, 0.25]} position={[0, 0.35, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Box>
            {/* Head */}
            <Box args={[0.2, 0.2, 0.2]} position={[0.35, 0.45, 0]}>
              <meshStandardMaterial color={colors.body} />
            </Box>
            {/* Ears */}
            {animal.type !== 'elephant' && (
              <>
                <Box args={[0.05, 0.08, 0.05]} position={[0.35, 0.6, -0.08]}>
                  <meshStandardMaterial color={colors.accent} />
                </Box>
                <Box args={[0.05, 0.08, 0.05]} position={[0.35, 0.6, 0.08]}>
                  <meshStandardMaterial color={colors.accent} />
                </Box>
              </>
            )}
            {/* Elephant trunk */}
            {animal.type === 'elephant' && (
              <Cylinder args={[0.04, 0.06, 0.4, 8]} position={[0.5, 0.25, 0]} rotation={[0, 0, Math.PI / 4]}>
                <meshStandardMaterial color={colors.body} />
              </Cylinder>
            )}
            {/* Legs (static for performance stability) */}
            {[
              [-0.2, 0.12, 0.1], [-0.2, 0.12, -0.1],
              [0.2, 0.12, 0.1], [0.2, 0.12, -0.1]
            ].map((pos, i) => (
              <Cylinder 
                key={i} 
                args={[0.05, 0.05, 0.25, 8]} 
                position={[
                  pos[0], 
                  pos[1], 
                  pos[2]
                ]}
              >
                <meshStandardMaterial color={colors.accent} />
              </Cylinder>
            ))}
            {/* Tail */}
            <Cylinder args={[0.02, 0.01, 0.2, 8]} position={[-0.4, 0.4, 0]} rotation={[0, 0, Math.PI / 3]}>
              <meshStandardMaterial color={colors.body} />
            </Cylinder>
          </group>
        );
    }
  };

  return (
    <group 
      ref={groupRef} 
      position={animal.position} 
      rotation={[0, animal.rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => {
        handleSpeakToZoe();
        onInteract?.(animal);
      }}
    >
      {renderAnimal()}
      
      {/* Speaking glow effect */}
      {isSpeaking && (
        <pointLight
          position={[0, 0.5, 0]}
          color="#00ffff"
          intensity={2}
          distance={4}
        />
      )}
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <Html position={[0, animal.type === 'bird' ? 0.8 : 1.2, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded-full bg-cyan-500/90 text-white text-[8px] animate-pulse whitespace-nowrap">
            🐾 Talking to Zoe...
          </div>
        </Html>
      )}
      
      {/* Animal label */}
      <Html position={[0, animal.type === 'bird' ? 0.5 : 0.8, 0]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
        <div className={`bg-black/50 px-1.5 py-0.5 rounded text-[7px] text-white/70 capitalize whitespace-nowrap ${hovered ? 'ring-1 ring-cyan-400' : ''}`}>
          🐾 {animal.type} {hovered && '(click to talk)'}
        </div>
      </Html>
    </group>
  );
};

// Animal System Hook
export const useAnimalSystem = (initialCount: number = 20) => {
  const [animals, setAnimals] = useState<Animal[]>([]);

  // Initialize animals
  useEffect(() => {
    if (animals.length > 0) return;
    
    const types: Animal['type'][] = ['lion', 'tiger', 'bear', 'deer', 'bird', 'elephant', 'wolf', 'rabbit'];
    
    const newAnimals = Array.from({ length: initialCount }, (_, i): Animal => ({
      id: `animal-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      position: [
        (Math.random() - 0.5) * 60 - 20, // Offset to forest area
        0,
        (Math.random() - 0.5) * 60 - 20
      ],
      targetPosition: [
        (Math.random() - 0.5) * 60 - 20,
        0,
        (Math.random() - 0.5) * 60 - 20
      ],
      rotation: Math.random() * Math.PI * 2,
      state: 'walking',
      speed: 0.3 + Math.random() * 0.5,
    }));
    
    setAnimals(newAnimals);
  }, []);

  // Animal AI movement
  useEffect(() => {
    if (animals.length === 0) return;
    
    const interval = setInterval(() => {
      setAnimals(prev => prev.map(animal => {
        if (animal.state === 'sleeping') return animal;
        
        // Birds fly higher
        const yPos = animal.type === 'bird' ? 3 + Math.random() * 5 : 0;
        
        const dx = animal.targetPosition[0] - animal.position[0];
        const dz = animal.targetPosition[2] - animal.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 2) {
          // Pick new random target
          const newState = Math.random() > 0.8 ? 'running' : Math.random() > 0.9 ? 'idle' : 'walking';
          return {
            ...animal,
            targetPosition: [
              (Math.random() - 0.5) * 60 - 20,
              yPos,
              (Math.random() - 0.5) * 60 - 20
            ],
            state: newState,
          };
        }
        
        const speed = animal.state === 'running' ? animal.speed * 2 : animal.speed;
        const moveX = (dx / distance) * speed * 0.03;
        const moveZ = (dz / distance) * speed * 0.03;
        
        return {
          ...animal,
          position: [
            animal.position[0] + moveX,
            yPos,
            animal.position[2] + moveZ
          ] as [number, number, number],
          rotation: Math.atan2(dx, dz),
        };
      }));
    }, Math.max(120, initialCount * 5));

    return () => clearInterval(interval);
  }, [animals.length, initialCount]);

  return { animals, animalCount: animals.length };
};

// Main Animal System Component
export const AnimalZooSystem: React.FC<{ count?: number; onAnimalInteract?: (animal: Animal) => void }> = ({ count = 20, onAnimalInteract }) => {
  const { animals } = useAnimalSystem(count);

  return (
    <group>
      {animals.map(animal => (
        <AnimalMesh key={animal.id} animal={animal} onInteract={onAnimalInteract} />
      ))}
    </group>
  );
};

export default AnimalZooSystem;
