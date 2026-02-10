// ═══════════════════════════════════════════════════════════════════════════════
// VR HIDDEN OVERLAYS - Collectibles, Easter Eggs, and Secret Items
// Apple Vision Pro-inspired spatial UI elements
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Float, Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';

// Hidden item types
export type HiddenItemType = 
  | 'collectible'
  | 'easter_egg'
  | 'power_up'
  | 'secret_portal'
  | 'memory_shard'
  | 'skill_boost'
  | 'treasure_chest';

interface HiddenItem {
  id: string;
  type: HiddenItemType;
  position: [number, number, number];
  discovered: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  hint?: string;
  reward?: {
    type: string;
    amount: number;
  };
}

// Rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// Hidden Collectible Component
const HiddenCollectible: React.FC<{
  item: HiddenItem;
  playerDistance: number;
  onDiscover: (id: string) => void;
  onCollect: (id: string) => void;
}> = ({ item, playerDistance, onDiscover, onCollect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  
  const revealDistance = item.rarity === 'legendary' ? 100 : 
                         item.rarity === 'epic' ? 60 :
                         item.rarity === 'rare' ? 40 : 20;

  useEffect(() => {
    if (playerDistance < revealDistance && !item.discovered) {
      setIsRevealed(true);
      if (playerDistance < 5) {
        onDiscover(item.id);
      }
    }
  }, [playerDistance, revealDistance, item.discovered, item.id, onDiscover]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Pulse animation based on proximity
    const proximity = Math.max(0, 1 - playerDistance / revealDistance);
    setPulseIntensity(proximity);
    
    // Rotate and float
    meshRef.current.rotation.y += 0.02;
    meshRef.current.position.y = item.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    
    // Scale based on proximity
    const scale = 0.5 + proximity * 0.5;
    meshRef.current.scale.setScalar(scale);
  });

  if (!isRevealed && playerDistance > revealDistance) return null;

  const color = RARITY_COLORS[item.rarity];

  return (
    <Float speed={2} floatIntensity={0.5}>
      <group position={item.position}>
        {/* Main collectible mesh */}
        <mesh 
          ref={meshRef}
          onClick={() => onCollect(item.id)}
        >
          {item.type === 'treasure_chest' ? (
            <boxGeometry args={[0.6, 0.4, 0.4]} />
          ) : item.type === 'memory_shard' ? (
            <octahedronGeometry args={[0.3]} />
          ) : (
            <sphereGeometry args={[0.2, 16, 16]} />
          )}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3 + pulseIntensity * 0.7}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Glow effect */}
        <Sphere args={[0.4, 16, 16]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1 + pulseIntensity * 0.2}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Particles around collectible */}
        {isRevealed && Array.from({ length: 5 }).map((_, i) => (
          <ParticleOrbit key={i} index={i} color={color} radius={0.6} />
        ))}

        {/* Label (Vision Pro style) */}
        {isRevealed && playerDistance < 15 && (
          <Html position={[0, 0.8, 0]} center distanceFactor={8}>
            <div 
              className="px-2 py-1 rounded-lg text-center pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${color}60`,
              }}
            >
              <div className="text-white text-[10px] font-medium capitalize">
                {item.type.replace('_', ' ')}
              </div>
              <div 
                className="text-[8px] capitalize"
                style={{ color }}
              >
                {item.rarity}
              </div>
              {item.hint && playerDistance < 10 && (
                <div className="text-white/60 text-[8px] mt-1">
                  {item.hint}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
};

// Particle orbit effect
const ParticleOrbit: React.FC<{ index: number; color: string; radius: number }> = ({ index, color, radius }) => {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index / 5) * Math.PI * 2;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 2 + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 2) * 0.2;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

// Secret Portal Component
const SecretPortal: React.FC<{
  position: [number, number, number];
  destination: string;
  onEnter: (destination: string) => void;
}> = ({ position, destination, onEnter }) => {
  const portalRef = useRef<THREE.Group>(null);
  const [isActive, setIsActive] = useState(false);

  useFrame((state) => {
    if (!portalRef.current) return;
    portalRef.current.rotation.y += 0.01;
    portalRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
  });

  return (
    <group ref={portalRef} position={position}>
      {/* Portal ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.1, 16, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.5}
          metalness={0.9}
        />
      </mesh>

      {/* Portal center */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          emissive="#4c1d95"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Swirling effect */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={i} 
          rotation={[Math.PI / 2, 0, (i / 8) * Math.PI * 2]}
          position={[0, 0, 0.01]}
        >
          <ringGeometry args={[0.5 + i * 0.15, 0.55 + i * 0.15, 3]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3 - i * 0.03} />
        </mesh>
      ))}

      <Html position={[0, 2.5, 0]} center>
        <button
          onClick={() => onEnter(destination)}
          className="px-4 py-2 bg-cyan-600/80 backdrop-blur-md rounded-lg text-white text-sm font-medium border border-cyan-400/50 hover:bg-cyan-500 transition-colors"
        >
          Enter Portal → {destination}
        </button>
      </Html>
    </group>
  );
};

// Compass Overlay (Vision Pro style)
export const VisionProCompass: React.FC<{
  heading: number;
}> = ({ heading }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-black/40 backdrop-blur-xl rounded-full px-6 py-2 border border-white/10">
        <div className="flex items-center gap-4 text-white/80 text-sm font-mono">
          <span className={heading >= 315 || heading < 45 ? 'text-cyan-400 font-bold' : ''}>N</span>
          <span className={heading >= 45 && heading < 135 ? 'text-cyan-400 font-bold' : ''}>E</span>
          <span className={heading >= 135 && heading < 225 ? 'text-cyan-400 font-bold' : ''}>S</span>
          <span className={heading >= 225 && heading < 315 ? 'text-cyan-400 font-bold' : ''}>W</span>
        </div>
        <div className="text-center text-white text-xs font-mono mt-1">
          {Math.round(heading)}°
        </div>
      </div>
    </div>
  );
};

// Altitude/Zoom HUD (Vision Pro style)
export const AltitudeZoomHUD: React.FC<{
  altitude: number;
  zoom: number;
  viewMode: string;
}> = ({ altitude, zoom, viewMode }) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-4">
        {/* Altitude */}
        <div className="text-center">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Altitude</div>
          <div className="text-white text-xl font-mono font-bold">
            {Math.round(altitude)}
            <span className="text-sm text-white/50">m</span>
          </div>
        </div>

        {/* Zoom */}
        <div className="text-center">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Zoom</div>
          <div className="text-white text-xl font-mono font-bold">
            {zoom.toFixed(1)}
            <span className="text-sm text-white/50">x</span>
          </div>
        </div>

        {/* View Mode */}
        <div className="text-center">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">View</div>
          <div className="text-cyan-400 text-sm font-medium capitalize">
            {viewMode.replace('_', ' ')}
          </div>
        </div>

        {/* Vertical bar indicator */}
        <div className="h-24 w-2 bg-white/10 rounded-full mx-auto relative overflow-hidden">
          <div 
            className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
            style={{ height: `${Math.min(100, altitude / 5)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Controller Help Overlay (Vision Pro style)
export const ControllerHelpOverlay: React.FC<{
  activeController: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ activeController, isVisible, onClose }) => {
  if (!isVisible) return null;

  const controlMappings: Record<string, { label: string; action: string }[]> = {
    keyboard: [
      { label: 'WASD / Arrows', action: 'Move camera' },
      { label: 'Q / E', action: 'Rotate view' },
      { label: 'R / F', action: 'Ascend / Descend' },
      { label: 'Scroll', action: 'Zoom' },
      { label: 'V', action: 'Cycle view mode' },
      { label: 'Space', action: 'Interact' },
    ],
    ps5: [
      { label: 'Left Stick', action: 'Move camera' },
      { label: 'Right Stick', action: 'Rotate view' },
      { label: 'L2 / R2', action: 'Descend / Ascend' },
      { label: 'D-pad Up/Down', action: 'Zoom' },
      { label: 'Options', action: 'Cycle view mode' },
      { label: 'X', action: 'Interact' },
    ],
    quest: [
      { label: 'Left Thumbstick', action: 'Move camera' },
      { label: 'Right Thumbstick', action: 'Rotate view' },
      { label: 'Grip Buttons', action: 'Ascend / Descend' },
      { label: 'Triggers', action: 'Zoom' },
      { label: 'Right Stick Press', action: 'Cycle view mode' },
      { label: 'Right Trigger', action: 'Interact' },
    ],
    vision_pro: [
      { label: 'Gaze + Move', action: 'Navigate' },
      { label: 'Wrist Rotation', action: 'Rotate view' },
      { label: 'Pinch Up/Down', action: 'Ascend / Descend' },
      { label: 'Pinch + Pull', action: 'Zoom' },
      { label: 'Double Tap', action: 'Cycle view mode' },
      { label: 'Pinch', action: 'Interact' },
    ],
  };

  const controls = controlMappings[activeController] || controlMappings.keyboard;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full mx-4 border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-lg font-medium">
            Controls: <span className="text-cyan-400 capitalize">{activeController.replace('_', ' ')}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {controls.map((control, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60 text-sm">{control.action}</span>
              <span className="text-white font-mono text-sm bg-white/10 px-3 py-1 rounded">
                {control.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-white/40 text-xs mt-4 text-center">
          Press H to toggle this help overlay
        </p>
      </div>
    </div>
  );
};

// Main Hidden Items Manager
export const VRHiddenItemsManager: React.FC<{
  items: HiddenItem[];
  playerPosition: THREE.Vector3;
  onItemDiscovered: (id: string) => void;
  onItemCollected: (id: string) => void;
}> = ({ items, playerPosition, onItemDiscovered, onItemCollected }) => {
  return (
    <group>
      {items.map((item) => {
        const distance = new THREE.Vector3(...item.position).distanceTo(playerPosition);
        return (
          <HiddenCollectible
            key={item.id}
            item={item}
            playerDistance={distance}
            onDiscover={onItemDiscovered}
            onCollect={onItemCollected}
          />
        );
      })}
    </group>
  );
};

// Self-contained wrapper with internal state
export const VRHiddenItemsManagerAuto: React.FC<{
  enabled?: boolean;
  onItemDiscovered?: (id: string) => void;
  onItemCollected?: (id: string) => void;
}> = ({ enabled = true, onItemDiscovered, onItemCollected }) => {
  const { camera } = useThree();
  const [items, setItems] = useState<HiddenItem[]>([]);
  
  // Generate initial hidden items
  useEffect(() => {
    if (!enabled) return;
    
    const generateItems = (): HiddenItem[] => {
      const rarities: HiddenItem['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const types: HiddenItemType[] = ['collectible', 'easter_egg', 'power_up', 'secret_portal', 'memory_shard', 'skill_boost', 'treasure_chest'];
      
      return Array.from({ length: 25 }, (_, i) => ({
        id: `hidden_${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        position: [
          (Math.random() - 0.5) * 100,
          Math.random() * 10 + 1,
          (Math.random() - 0.5) * 100
        ] as [number, number, number],
        discovered: false,
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
        hint: 'Look carefully...',
        reward: { type: 'karma', amount: Math.floor(Math.random() * 50) + 10 }
      }));
    };
    
    setItems(generateItems());
  }, [enabled]);

  const handleDiscover = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, discovered: true } : item
    ));
    onItemDiscovered?.(id);
  };

  const handleCollect = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    onItemCollected?.(id);
  };

  if (!enabled || items.length === 0) return null;

  return (
    <group>
      {items.map((item) => {
        const distance = new THREE.Vector3(...item.position).distanceTo(camera.position);
        return (
          <HiddenCollectible
            key={item.id}
            item={item}
            playerDistance={distance}
            onDiscover={handleDiscover}
            onCollect={handleCollect}
          />
        );
      })}
    </group>
  );
};

export default VRHiddenItemsManagerAuto;
