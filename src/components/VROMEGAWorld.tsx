// ═══════════════════════════════════════════════════════════════════════════════
// VR OMEGA WORLD - The 3D Subconscious Memory Palace
// WebXR-Ready Spatial Environment with Memory Engrams + Voice Commands
// INTEGRATED: DHF Adaptive Learning, Auto-Fix, Weather, Buildings, Vehicles
// UPGRADED: Ready Player One Cinematic Pipeline + CyberCity + Gaussian Splatting
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  Float, 
  Sphere, 
  Box, 
  Text, 
  Stars,
  MeshDistortMaterial,
  GradientTexture,
  useKeyboardControls,
  KeyboardControls,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { 
  HelpCircle, 
  X, 
  Keyboard, 
  Mouse, 
  Smartphone, 
  Move, 
  RotateCcw, 
  ZoomIn,
  Hand,
  Eye,
  Target,
  GripVertical,
  Shield,
  Wrench,
  Settings,
  Cpu
} from 'lucide-react';
import { VRVoiceCommandsPanel } from './VRVoiceCommandsPanel';
import VRControlsPanel from './vr/VRControlsPanel';
import { useVRVoiceCommands } from '@/hooks/useVRVoiceCommands';
import { useZoeVoiceCore } from '@/hooks/useZoeVoiceCore';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { useVRDHFLearning } from '@/hooks/useVRDHFLearning';
import { useVRAutoFix } from '@/hooks/useVRAutoFix';
import VRFeatureIntegration from './vr/VRFeatureIntegration';
import ProceduralBuildings, { generateCity } from './vr/features/ProceduralBuildings';
// Ready Player One Cinematic Features
import CinematicPostProcessing from './vr/features/CinematicPostProcessing';
import ProceduralCyberCity from './vr/features/ProceduralCyberCity';
import GaussianSplatViewer from './vr/features/GaussianSplatViewer';
import { useGraphicsOptimizer, type GPUTier } from '@/hooks/useGraphicsOptimizer';
// Touch / Futuristic Controls
import { VirtualJoystick, RotationButtons } from './vr/features/VRControlSystem';
// Enterprise Multiplayer Layer
import { useMultiplayerPresence } from '@/hooks/useMultiplayerPresence';
import { MultiplayerAvatars } from './vr/features/GlassPyramidAvatar';
import EnterpriseControlDeck from './vr/features/EnterpriseControlDeck';
import WorldBroadcastNotification from './vr/features/WorldBroadcastNotification';
// Universal VR Controller System (PS5/Quest/Vision Pro)
import { useVRUniversalController, UniversalCameraController } from '@/hooks/useVRUniversalController';
import VRHiddenItemsManagerAuto from './vr/features/VRHiddenOverlays';
// Safari/iOS Zoom Fix + Cross-Browser Compatibility
import { useVRSafariFix, getVRConfigForBrowser } from '@/hooks/useVRSafariFix';
// Zoe VR World Voice Commands
import { useZoeVRWorldCommands } from '@/hooks/useZoeVRWorldCommands';

// Types
interface MemoryEngram {
  id: string;
  content: string;
  emotion: string;
  intensity: number;
  position: [number, number, number];
  createdAt: Date;
}

interface ECNDataPoint {
  timestamp: Date;
  stressLevel: number;
  emotion: string;
}

interface VROMEGAWorldProps {
  integrityLevel: number;
  onIntegrityRestore: () => void;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLS CONFIGURATION - Full Documentation
// ═══════════════════════════════════════════════════════════════════════════════
/*
 * KEYBOARD CONTROLS:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Key         │ Function           │ Description                             │
 * ├─────────────┼────────────────────┼─────────────────────────────────────────┤
 * │ W / ↑       │ Move Forward       │ Walk forward in the direction you face  │
 * │ S / ↓       │ Move Backward      │ Walk backward                           │
 * │ A / ←       │ Move Left          │ Strafe left                             │
 * │ D / →       │ Move Right         │ Strafe right                            │
 * │ E           │ Interact           │ Interact with nearby memory engrams     │
 * │ H           │ Help Toggle        │ Show/hide controls tutorial             │
 * │ Scroll      │ Zoom In/Out        │ Adjust camera distance                  │
 * └─────────────┴────────────────────┴─────────────────────────────────────────┘
 *
 * MOUSE CONTROLS:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Action      │ Function           │ Description                             │
 * ├─────────────┼────────────────────┼─────────────────────────────────────────┤
 * │ Left Drag   │ Rotate Camera      │ Look around the environment             │
 * │ Right Drag  │ Pan Camera         │ Shift view position (disabled)          │
 * │ Scroll      │ Zoom               │ Zoom in/out of the scene                │
 * │ Click       │ Select Object      │ Click on memory orbs to view details    │
 * │ Hover       │ Highlight          │ Hover over objects to see labels        │
 * └─────────────┴────────────────────┴─────────────────────────────────────────┘
 *
 * TOUCH CONTROLS (Mobile/Tablet):
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Gesture     │ Function           │ Description                             │
 * ├─────────────┼────────────────────┼─────────────────────────────────────────┤
 * │ 1 Finger    │ Rotate Camera      │ Swipe to look around                    │
 * │ 2 Fingers   │ Zoom               │ Pinch to zoom in/out                    │
 * │ Tap         │ Select Object      │ Tap on memory orbs to view details      │
 * │ Long Press  │ Bio-Sync           │ Hold Bio-Sync button for 10 seconds     │
 * │ Double Tap  │ Reset View         │ Reset camera to default position        │
 * └─────────────┴────────────────────┴─────────────────────────────────────────┘
 *
 * OBJECT IDENTIFICATION:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Object Type       │ Visual Indicator    │ Description                      │
 * ├───────────────────┼─────────────────────┼──────────────────────────────────┤
 * │ Memory Engram     │ Golden/Colored Orb  │ High-emotion ZSMT logs           │
 * │ Holo-Wall         │ Purple Panel        │ ECN stress timeline display      │
 * │ Consciousness     │ Central Pillar      │ Glowing purple column with rings │
 * │ Floor Grid        │ Neural Pattern      │ Navigation reference             │
 * │ Bio-Sync Button   │ Cyan Circle         │ Emergency consciousness restore  │
 * └───────────────────┴─────────────────────┴──────────────────────────────────┘
 */

// Keyboard controls mapping
const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'help', keys: ['KeyH'] },
];

// Touch sensitivity configuration - Now uses browser-specific config
const getDefaultTouchConfig = () => {
  const browserConfig = getVRConfigForBrowser();
  return {
    rotateSpeed: browserConfig.rotateSpeed,
    zoomSpeed: browserConfig.zoomSpeed,
    panSpeed: 0.3,
    dampingFactor: browserConfig.dampingFactor,
    minDistance: browserConfig.minDistance,
    maxDistance: browserConfig.maxDistance,
  };
};

const TOUCH_CONFIG = getDefaultTouchConfig();

// ═══════════════════════════════════════════════════════════════════════════════
// Memory Engram Component - Golden Orbs representing high-emotion ZSMT logs
// ═══════════════════════════════════════════════════════════════════════════════
const MemoryEngram: React.FC<{ 
  engram: MemoryEngram; 
  onSelect: (engram: MemoryEngram) => void;
}> = ({ engram, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Pulse animation based on intensity
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2 + engram.intensity) * 0.1;
      meshRef.current.scale.setScalar(1 + pulse * engram.intensity);
    }
  });
  
  const color = useMemo(() => {
    // Color based on emotion
    switch (engram.emotion.toLowerCase()) {
      case 'joy': return '#FFD700';
      case 'sadness': return '#4169E1';
      case 'anger': return '#DC143C';
      case 'fear': return '#8B4513';
      case 'contemplative': return '#9370DB';
      default: return '#FFA500';
    }
  }, [engram.emotion]);

  // Get emotion label for object tag
  const emotionLabel = useMemo(() => {
    const labels: Record<string, string> = {
      'joy': '✨ Joy Memory',
      'sadness': '💧 Sadness Memory',
      'anger': '🔥 Anger Memory',
      'fear': '👁 Fear Memory',
      'contemplative': '💭 Contemplative',
      'neutral': '⭕ Neutral Memory'
    };
    return labels[engram.emotion.toLowerCase()] || '💫 Memory Fragment';
  }, [engram.emotion]);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={engram.position}>
        <Sphere
          ref={meshRef}
          args={[0.3 + engram.intensity * 0.2, 32, 32]}
          onClick={() => onSelect(engram)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.4}
            distort={0.3}
            speed={2}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
        
        {/* Glow effect */}
        <Sphere args={[0.5 + engram.intensity * 0.3, 16, 16]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.3 : 0.1}
            side={THREE.BackSide}
          />
        </Sphere>
        
        {/* Object Tag - Always visible mini label */}
        <Html
          position={[0, -0.6, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] text-white/70 whitespace-nowrap border border-white/10">
            {emotionLabel}
          </div>
        </Html>
        
        {/* Expanded label on hover */}
        {hovered && (
          <Html
            position={[0, 0.8, 0]}
            center
            distanceFactor={6}
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg max-w-[200px] border border-purple-500/30">
              <div className="text-purple-300 text-[10px] font-bold mb-1">{emotionLabel}</div>
              <div className="text-white/90 text-xs leading-tight">
                {engram.content.slice(0, 50)}...
              </div>
              <div className="text-white/40 text-[8px] mt-1">
                Intensity: {(engram.intensity * 100).toFixed(0)}%
              </div>
              <div className="text-cyan-400/60 text-[8px] mt-0.5">
                Click to view details
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Holo-Wall - DHF Visualization showing ECN stress timeline
// Billboard constraint: Always stays 1.5m away from camera in VR mode
// ═══════════════════════════════════════════════════════════════════════════════
const HOLO_WALL_MIN_DISTANCE = 1.5; // Minimum distance from camera in meters

const HoloWall: React.FC<{ 
  ecnData: ECNDataPoint[];
  coherenceScore: number;
}> = ({ ecnData, coherenceScore }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  useFrame((state) => {
    if (groupRef.current) {
      // Billboard rotation (gentle sway)
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // VR Collision Fix: Keep HoloWall at minimum 1.5m from camera
      const cameraPos = camera.position.clone();
      const wallPos = groupRef.current.position.clone();
      const distance = cameraPos.distanceTo(wallPos);
      
      if (distance < HOLO_WALL_MIN_DISTANCE) {
        // Push wall away from camera to maintain minimum distance
        const direction = wallPos.sub(cameraPos).normalize();
        const newPosition = cameraPos.clone().add(direction.multiplyScalar(HOLO_WALL_MIN_DISTANCE));
        groupRef.current.position.lerp(newPosition, 0.1); // Smooth transition
      }
    }
  });

  // Create stress timeline bars
  const bars = useMemo(() => {
    return ecnData.slice(-20).map((point, i) => ({
      height: point.stressLevel / 100 * 2,
      position: [i * 0.3 - 3, point.stressLevel / 100, 0] as [number, number, number],
      color: point.stressLevel > 70 ? '#ef4444' : point.stressLevel > 40 ? '#eab308' : '#22c55e'
    }));
  }, [ecnData]);

  return (
    <group ref={groupRef} position={[0, 2, -5]}>
      {/* Object Tag for Holo-Wall */}
      <Html position={[0, 2.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="bg-indigo-900/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-indigo-200 whitespace-nowrap border border-indigo-500/30">
          📊 DHF Holo-Wall
        </div>
      </Html>
      
      {/* Main holographic panel */}
      <Box args={[8, 4, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#1e1b4b"
          transparent
          opacity={0.6}
          emissive="#4c1d95"
          emissiveIntensity={0.2}
        />
      </Box>
      
      {/* ECN Stress Timeline */}
      <Text position={[-3, 1.5, 0.1]} fontSize={0.2} color="#a855f7">
        ECN STRESS TIMELINE
      </Text>
      
      {bars.map((bar, i) => (
        <Box 
          key={i} 
          args={[0.2, bar.height, 0.1]} 
          position={[bar.position[0], bar.height / 2 - 0.5, 0.1]}
        >
          <meshStandardMaterial
            color={bar.color}
            emissive={bar.color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </Box>
      ))}
      
      {/* Digital Clone Coherence Score */}
      <group position={[2.5, 0, 0.1]}>
        <Text position={[0, 1, 0]} fontSize={0.15} color="#06b6d4">
          DIGITAL CLONE
        </Text>
        <Text position={[0, 0.6, 0]} fontSize={0.12} color="#94a3b8">
          Coherence Score
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.4} color={coherenceScore > 0.7 ? '#22c55e' : '#eab308'}>
          {(coherenceScore * 100).toFixed(1)}%
        </Text>
        
        {/* Coherence ring */}
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32, 1, 0, Math.PI * 2 * coherenceScore]} />
          <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Player Controller - WASD Movement with Mouse Look
// ═══════════════════════════════════════════════════════════════════════════════
const PlayerController: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  
  const [, getKeys] = useKeyboardControls();
  
  useFrame((state, delta) => {
    if (disabled) return;
    
    const { forward, backward, left, right } = getKeys();
    const speed = 5;
    
    // Get movement direction
    direction.current.set(0, 0, 0);
    
    if (forward) direction.current.z -= 1;
    if (backward) direction.current.z += 1;
    if (left) direction.current.x -= 1;
    if (right) direction.current.x += 1;
    
    direction.current.normalize();
    
    // Apply camera rotation to movement
    const euler = new THREE.Euler(0, camera.rotation.y, 0);
    direction.current.applyEuler(euler);
    
    // Update position
    velocity.current.lerp(direction.current.multiplyScalar(speed), delta * 5);
    camera.position.add(velocity.current.clone().multiplyScalar(delta));
    
    // Keep camera at eye level
    camera.position.y = 1.6;
  });
  
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 360° Rotation Controller - Futuristic VR Camera Controls
// ═══════════════════════════════════════════════════════════════════════════════
const RotationController: React.FC = () => {
  const { camera } = useThree();
  const targetRotation = useRef(0);
  const isAnimating = useRef(false);
  
  useEffect(() => {
    const handleRotate360 = (event: CustomEvent) => {
      const { direction, degrees } = event.detail;
      const radians = (degrees * Math.PI) / 180;
      
      switch (direction) {
        case 'left':
          targetRotation.current = camera.rotation.y + radians;
          break;
        case 'right':
          targetRotation.current = camera.rotation.y - radians;
          break;
        case 'around':
          targetRotation.current = camera.rotation.y + Math.PI;
          break;
        case 'full':
          targetRotation.current = camera.rotation.y + Math.PI * 2;
          break;
      }
      isAnimating.current = true;
    };

    window.addEventListener('vr-rotate-360', handleRotate360 as EventListener);
    return () => window.removeEventListener('vr-rotate-360', handleRotate360 as EventListener);
  }, [camera]);

  useFrame((state, delta) => {
    if (isAnimating.current) {
      const diff = targetRotation.current - camera.rotation.y;
      if (Math.abs(diff) < 0.01) {
        camera.rotation.y = targetRotation.current;
        isAnimating.current = false;
      } else {
        camera.rotation.y += diff * delta * 3;
      }
    }
  });

  return null;
};

const MemoryPalace: React.FC<{
  engrams: MemoryEngram[];
  ecnData: ECNDataPoint[];
  coherenceScore: number;
  integrityLevel: number;
  onEngramSelect: (engram: MemoryEngram) => void;
  disabled: boolean;
  buildings: any[];
  onBuildingClick?: (building: any) => void;
  hasSatelliteEntryCompleted: boolean;
  onSatelliteEntryComplete: () => void;
}> = ({ engrams, ecnData, coherenceScore, integrityLevel, onEngramSelect, disabled, buildings, onBuildingClick, hasSatelliteEntryCompleted, onSatelliteEntryComplete }) => {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#a855f7" />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ec4899" />
      <directionalLight position={[50, 50, 25]} intensity={0.4} color="#ffffff" castShadow />
      
      {/* Stars background */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1}
      />
      
      {/* Extended Floor - Neural network pattern for city */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300, 64, 64]} />
        <meshStandardMaterial
          color="#0a0a1a"
          emissive="#1e1b4b"
          emissiveIntensity={0.1}
          wireframe={false}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Grid overlay - extended for city */}
      <gridHelper args={[300, 150, '#4c1d95', '#1e1b4b']} position={[0, 0.01, 0]} />
      
      {/* Memory Engrams */}
      {engrams.map((engram) => (
        <MemoryEngram 
          key={engram.id} 
          engram={engram} 
          onSelect={onEngramSelect}
        />
      ))}
      
      {/* Holo-Wall */}
      <HoloWall ecnData={ecnData} coherenceScore={coherenceScore} />
      
      {/* PROCEDURAL CITY - Buildings */}
      <ProceduralBuildings 
        buildings={buildings} 
        onBuildingClick={onBuildingClick}
      />
      
      {/* VR Feature Integration - Weather, Vehicles, Dynamic Elements */}
      <VRFeatureIntegration 
        enableSatelliteEntry={!hasSatelliteEntryCompleted}
        onFeatureEvent={(feature, action) => {
          if (feature === 'world' && action === 'entered') {
            onSatelliteEntryComplete();
          }
        }}
      />
      
      {/* Central pillar of consciousness */}
      <group position={[0, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.5, 8, 32]} />
          <meshStandardMaterial
            color="#7c3aed"
            emissive="#7c3aed"
            emissiveIntensity={0.3 + (1 - integrityLevel / 100) * 0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
        
        {/* Object Tag for Consciousness Pillar */}
        <Html position={[0, 4.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="bg-purple-900/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-purple-200 whitespace-nowrap border border-purple-500/30">
            🔮 Consciousness Core
          </div>
        </Html>
        
        {/* Energy rings */}
        {[1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0, i * 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8 + i * 0.1, 0.02, 16, 100]} />
            <meshBasicMaterial 
              color={integrityLevel > 50 ? '#a855f7' : '#ef4444'} 
              transparent 
              opacity={0.5} 
            />
          </mesh>
        ))}
      </group>
      
      {/* Player controller */}
      <PlayerController disabled={disabled || !hasSatelliteEntryCompleted} />
      
      {/* 360° Rotation Controller for voice commands */}
      <RotationController />
      
      {/* Universal Camera Controller - PS5/Quest/Vision Pro Support */}
      <UniversalCameraController 
        enabled={hasSatelliteEntryCompleted && !disabled}
        defaultView="satellite"
        onViewChange={(mode) => console.log(`[VR OMEGA] View mode: ${mode}`)}
      />
      
      {/* Hidden Items / Collectibles / Easter Eggs */}
      <VRHiddenItemsManagerAuto 
        enabled={hasSatelliteEntryCompleted}
        onItemDiscovered={(id) => console.log(`[VR OMEGA] Discovered: ${id}`)}
        onItemCollected={(id) => console.log(`[VR OMEGA] Collected: ${id}`)}
      />
      
      {/* Orbit controls for mouse/touch look - Enhanced touch sensitivity */}
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={Math.PI * 0.1}
        enabled={!disabled && hasSatelliteEntryCompleted}
        rotateSpeed={TOUCH_CONFIG.rotateSpeed}
        zoomSpeed={TOUCH_CONFIG.zoomSpeed}
        dampingFactor={TOUCH_CONFIG.dampingFactor}
        minDistance={TOUCH_CONFIG.minDistance}
        maxDistance={TOUCH_CONFIG.maxDistance}
        enableDamping={true}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE
        }}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main VR OMEGA World Component
// ═══════════════════════════════════════════════════════════════════════════════
const VROMEGAWorld: React.FC<VROMEGAWorldProps> = ({ 
  integrityLevel, 
  onIntegrityRestore,
  isActive 
}) => {
  const { user } = useAuth();
  const [engrams, setEngrams] = useState<MemoryEngram[]>([]);
  const [ecnData, setEcnData] = useState<ECNDataPoint[]>([]);
  const [coherenceScore, setCoherenceScore] = useState(0.85);
  const [selectedEngram, setSelectedEngram] = useState<MemoryEngram | null>(null);
  const [isDissonanceActive, setIsDissonanceActive] = useState(false);
  const [bioSyncProgress, setBioSyncProgress] = useState(0);
  const [isBioSyncing, setIsBioSyncing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const bioSyncRef = useRef<NodeJS.Timeout | null>(null);
  
  // Panel visibility states for voice control
  const [showVoicePanel, setShowVoicePanel] = useState(true);
  const [showControlsPanel, setShowControlsPanel] = useState(true);
  const [showWallet, setShowWallet] = useState(false);
  const [showCyberCity, setShowCyberCity] = useState(true);
  const [showGaussianSplat, setShowGaussianSplat] = useState(false);
  
  // Satellite Entry state - controls camera entry animation
  const [hasSatelliteEntryCompleted, setHasSatelliteEntryCompleted] = useState(false);
  
  // Universal VR Controller State
  const vrController = useVRUniversalController();
  const [cameraHeading, setCameraHeading] = useState(0);
  const [cameraAltitude, setCameraAltitude] = useState(100);
  
  // Ready Player One Graphics Optimizer - now includes WebGL capability detection
  const { graphicsConfig, currentTier, isMobile, fps, setTier, webglCapabilities } = useGraphicsOptimizer();
  
  // Pre-check WebGL support and show graceful fallback if not available
  const [webglError, setWebglError] = useState<string | null>(null);
  
  useEffect(() => {
    if (webglCapabilities && !webglCapabilities.canRender3D) {
      setWebglError(webglCapabilities.error || 'WebGL not supported on this device');
    } else {
      setWebglError(null);
    }
  }, [webglCapabilities]);

  // Enterprise Multiplayer Layer
  const {
    players: multiplayerPlayers,
    playerCount,
    isConnected: isMultiplayerConnected,
    updateMyPosition,
    updateMyRotation,
    setIsSpeaking,
    broadcastWorldEvent,
    myUserId,
  } = useMultiplayerPresence({ enabled: isActive });

  // Admin check (simple role detection - extend with proper RLS in production)
  const isAdmin = user?.email?.includes('admin') || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDING STATE - Managed at component level for proper React Three Fiber integration
  // ═══════════════════════════════════════════════════════════════════════════
  const [buildings, setBuildings] = useState<ReturnType<typeof generateCity>>([]);
  const [cityInitialized, setCityInitialized] = useState(false);

  // Building creation function
  const addBuilding = useCallback((type: string, position?: [number, number, number]) => {
    const pos = position || [
      (Math.random() - 0.5) * 80,
      0,
      (Math.random() - 0.5) * 80
    ];
    const config = {
      house: { floorRange: [1, 2], widthRange: [4, 8], depthRange: [4, 8], colors: ['#f5f5dc', '#deb887'], accentColors: ['#8b4513'], roofTypes: ['gabled'] },
      apartment: { floorRange: [4, 12], widthRange: [10, 20], depthRange: [10, 15], colors: ['#808080', '#a9a9a9'], accentColors: ['#4169e1'], roofTypes: ['flat'] },
      office: { floorRange: [5, 20], widthRange: [15, 30], depthRange: [15, 25], colors: ['#4a5568', '#2d3748'], accentColors: ['#00bcd4'], roofTypes: ['flat'] },
      hospital: { floorRange: [3, 8], widthRange: [20, 40], depthRange: [15, 30], colors: ['#ffffff'], accentColors: ['#ef4444'], roofTypes: ['flat'] },
      school: { floorRange: [2, 4], widthRange: [25, 50], depthRange: [15, 25], colors: ['#fef3c7'], accentColors: ['#f59e0b'], roofTypes: ['flat'] },
      shop: { floorRange: [1, 3], widthRange: [8, 15], depthRange: [8, 12], colors: ['#e5e5e5'], accentColors: ['#8b5cf6'], roofTypes: ['flat'] },
      park: { floorRange: [0, 0], widthRange: [30, 60], depthRange: [30, 60], colors: ['#22c55e'], accentColors: ['#16a34a'], roofTypes: ['flat'] },
      factory: { floorRange: [2, 5], widthRange: [30, 60], depthRange: [20, 40], colors: ['#6b7280'], accentColors: ['#f59e0b'], roofTypes: ['flat'] },
      restaurant: { floorRange: [1, 2], widthRange: [10, 20], depthRange: [10, 15], colors: ['#fef3c7'], accentColors: ['#ef4444'], roofTypes: ['flat'] },
      stadium: { floorRange: [3, 6], widthRange: [80, 120], depthRange: [60, 100], colors: ['#9ca3af'], accentColors: ['#3b82f6'], roofTypes: ['dome'] },
      fire_station: { floorRange: [2, 3], widthRange: [15, 25], depthRange: [20, 30], colors: ['#f5f5f5'], accentColors: ['#ef4444'], roofTypes: ['flat'] },
      police_station: { floorRange: [2, 4], widthRange: [15, 25], depthRange: [15, 25], colors: ['#e5e5e5'], accentColors: ['#1e3a8a'], roofTypes: ['flat'] },
      gym: { floorRange: [1, 3], widthRange: [20, 35], depthRange: [20, 35], colors: ['#374151'], accentColors: ['#f59e0b'], roofTypes: ['flat'] },
      religious: { floorRange: [2, 4], widthRange: [15, 30], depthRange: [25, 45], colors: ['#faf5eb'], accentColors: ['#d4af37'], roofTypes: ['dome'] },
      cultural: { floorRange: [2, 5], widthRange: [25, 50], depthRange: [20, 40], colors: ['#f8f8f8'], accentColors: ['#8b5cf6'], roofTypes: ['dome'] },
    };
    const cfg = config[type as keyof typeof config] || config.house;
    const floors = Math.floor(Math.random() * (cfg.floorRange[1] - cfg.floorRange[0] + 1)) + cfg.floorRange[0];
    const width = Math.random() * (cfg.widthRange[1] - cfg.widthRange[0]) + cfg.widthRange[0];
    const depth = Math.random() * (cfg.depthRange[1] - cfg.depthRange[0]) + cfg.depthRange[0];
    
    const newBuilding = {
      id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      position: pos as [number, number, number],
      rotation: Math.random() * Math.PI * 2,
      floors,
      width,
      depth,
      color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
      accentColor: cfg.accentColors[Math.floor(Math.random() * cfg.accentColors.length)],
      hasRoof: true,
      roofType: cfg.roofTypes[0] as 'flat' | 'gabled' | 'dome',
    };
    
    setBuildings(prev => [...prev, newBuilding]);
    toast.success(`${type.replace('_', ' ')} built!`, { description: 'New structure added to the world' });
    return newBuilding;
  }, []);

  // Auto-generate initial city when VR mode activates
  useEffect(() => {
    if (isActive && !cityInitialized) {
      // Generate a starter city with 50 buildings (more visible)
      const starterCity = generateCity([0, 0, -20]).slice(0, 50);
      setBuildings(starterCity);
      setCityInitialized(true);
      console.log(`[VR OMEGA] Auto-generated city with ${starterCity.length} buildings`);
      toast.success('Welcome to VR World', { 
        description: `City generated with ${starterCity.length} buildings. Say "build house" or "build city" for more!`,
        duration: 5000 
      });
    }
  }, [isActive, cityInitialized]);

  // Listen for building voice commands at component level
  useEffect(() => {
    if (!isActive) return;
    
    const handleBuildCommand = (event: CustomEvent) => {
      const { action, type } = event.detail;
      console.log(`[VR OMEGA] Build command received: action=${action}, type=${type}`);
      
      if (action === 'build_city' || action === 'build_city_full') {
        const newCity = generateCity([0, 0, 0]);
        setBuildings(prev => [...prev, ...newCity]);
        toast.success('City generated!', { description: `${newCity.length} buildings created` });
      } else if (action === 'build_town') {
        const townBuildings = generateCity().slice(0, 30);
        setBuildings(prev => [...prev, ...townBuildings]);
        toast.success('Town generated!', { description: `${townBuildings.length} buildings created` });
      } else if (action.startsWith('build_')) {
        const buildingType = type || action.replace('build_', '');
        addBuilding(buildingType);
      }
    };

    window.addEventListener('vr-build', handleBuildCommand as EventListener);
    return () => window.removeEventListener('vr-build', handleBuildCommand as EventListener);
  }, [isActive, addBuilding]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DHF ADAPTIVE LEARNING & AUTO-FIX INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  const { 
    startVRSession, 
    endVRSession, 
    trackMemoryViewed, 
    trackBioSync,
    sessionStats,
    isTracking 
  } = useVRDHFLearning();
  
  const { 
    isAuthorized: autoFixAuthorized,
    requestAuthorization: requestAutoFixAuth,
    runDiagnostics,
    autoFixEnabled,
    issueQueue 
  } = useVRAutoFix();

  // Integrate Zoe Voice Core for Ready Player One style commands
  const { systemStatus, lastCommand, isListening } = useZoeVoiceCore();

  // Start/End VR session for DHF tracking
  useEffect(() => {
    if (isActive && user) {
      startVRSession();
      // Run initial diagnostics and request auto-fix authorization
      runDiagnostics().then(() => {
        if (!autoFixAuthorized) {
          setTimeout(() => requestAutoFixAuth(), 3000);
        }
      });
    }
    return () => {
      if (isActive) endVRSession();
    };
  }, [isActive, user]);

  // Listen for core voice commands - SPAWN roads, cars, forests, buildings
  useEffect(() => {
    const handleCoreCommand = (event: CustomEvent) => {
      const { action, voiceResponse } = event.detail;
      console.log(`[VR OMEGA] Core command received: ${action}`);
      
      // Handle specific actions
      switch (action) {
        case 'SYSTEM_DIAGNOSTIC':
          toast.success('Omega Diagnostics', {
            description: `Integrity: ${integrityLevel}% | Coherence: ${(coherenceScore * 100).toFixed(1)}%`
          });
          break;
        case 'TELEPORT_HOME':
          window.dispatchEvent(new CustomEvent('vr-reset-position'));
          break;
        // CREATION COMMANDS - Roads, Cars, Forests
        case 'SPAWN_NATURE_FOREST':
          window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'forest', count: 20 } }));
          toast.success('Forest Spawned', { description: voiceResponse });
          break;
        case 'SPAWN_VEHICLE_CAR':
          window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'car' } }));
          toast.success('Car Spawned', { description: voiceResponse });
          break;
        case 'SPAWN_ROAD':
          window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'road' } }));
          toast.success('Road Created', { description: voiceResponse });
          break;
        case 'SPAWN_CITY_CYBERPUNK':
        case 'SPAWN_CITY_FUTURISTIC':
          window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'city', style: action.includes('CYBERPUNK') ? 'cyberpunk' : 'futuristic' } }));
          setShowCyberCity(true);
          toast.success('City Generated', { description: voiceResponse });
          break;
        case 'SPAWN_BUILDING':
          window.dispatchEvent(new CustomEvent('vr-build', { detail: { type: 'commercial', action: 'build_commercial' } }));
          toast.success('Building Constructed', { description: voiceResponse });
          break;
        // VEHICLE CONTROL
        case 'START_ALL_CARS':
          window.dispatchEvent(new CustomEvent('vr-vehicle', { detail: { action: 'start_all_cars' } }));
          toast.success('All Cars Started', { description: voiceResponse });
          break;
        case 'STOP_ALL_CARS':
          window.dispatchEvent(new CustomEvent('vr-vehicle', { detail: { action: 'stop_all_cars' } }));
          toast.success('All Cars Stopped', { description: voiceResponse });
          break;
        // MOVEMENT COMMANDS
        case 'MOVEMENT_RUN':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'forward', speed: 2 } }));
          break;
        case 'MOVEMENT_FLY':
          window.dispatchEvent(new CustomEvent('vr-camera', { detail: { action: 'fly_up' } }));
          toast.info('Flight Mode', { description: voiceResponse });
          break;
        case 'MOVEMENT_GLIDE':
          window.dispatchEvent(new CustomEvent('vr-camera', { detail: { action: 'glide_down' } }));
          break;
        // CAMERA 360° ROTATION
        case 'ROTATE_LEFT':
        case 'TURN_LEFT':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'left', degrees: 45 } }));
          break;
        case 'ROTATE_RIGHT':
        case 'TURN_RIGHT':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'right', degrees: 45 } }));
          break;
        case 'ROTATE_180':
        case 'TURN_AROUND':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'around', degrees: 180 } }));
          break;
        case 'ROTATE_360':
        case 'FULL_SPIN':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'full', degrees: 360 } }));
          break;
        // ENVIRONMENT
        case 'SET_TIME_NIGHT':
          window.dispatchEvent(new CustomEvent('vr-environment', { detail: { action: 'set_night' } }));
          toast.info('Environment Changed', { description: voiceResponse });
          break;
        case 'SET_TIME_DAY':
          window.dispatchEvent(new CustomEvent('vr-environment', { detail: { action: 'set_day' } }));
          toast.info('Environment Changed', { description: voiceResponse });
          break;
        case 'SET_ATMOSPHERE_RAIN':
          window.dispatchEvent(new CustomEvent('vr-environment', { detail: { action: 'set_rain' } }));
          toast.info('Environment Changed', { description: voiceResponse });
          break;
        case 'SET_ATMOSPHERE_CLEAR':
          window.dispatchEvent(new CustomEvent('vr-environment', { detail: { action: 'set_sunny' } }));
          toast.info('Environment Changed', { description: voiceResponse });
          break;
        default:
          // Log all actions for DHF learning
          break;
      }
    };

    window.addEventListener('zoe-vr-core-command', handleCoreCommand as EventListener);
    return () => window.removeEventListener('zoe-vr-core-command', handleCoreCommand as EventListener);
  }, [integrityLevel, coherenceScore]);

  // Listen for VR voice commands dispatched by useAdvancedVoiceCommands and useVRVoiceCommands
  useEffect(() => {
    if (!isActive) return;

    const handleVRVoiceCommand = (event: CustomEvent) => {
      const { action, command, category } = event.detail;
      console.log(`[VR OMEGA] Voice command received: ${action} (category: ${category})`);
      
      // Handle VR-specific voice commands
      switch (action) {
        // Movement commands
        case 'walk_forward':
        case 'run_forward':
        case 'sprint':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'forward', speed: action === 'sprint' ? 2 : 1 } }));
          break;
        case 'walk_backward':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'backward', speed: 1 } }));
          break;
        case 'walk_left':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'left', speed: 1 } }));
          break;
        case 'walk_right':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'right', speed: 1 } }));
          break;
        case 'stop':
          window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'stop' } }));
          break;
        case 'jump':
        case 'jump_high':
        case 'double_jump':
          toast.info('Jump!', { description: 'VR jumping activated' });
          break;
        
        // Flying commands
        case 'fly':
        case 'fly_up':
        case 'fly_down':
        case 'hover':
        case 'glide':
        case 'land':
          toast.info('Flight Mode', { description: `${action.replace('_', ' ')} activated` });
          break;
        
        // Camera/View commands
        case 'look_up':
        case 'look_down':
        case 'look_left':
        case 'look_right':
        case 'look_around':
          window.dispatchEvent(new CustomEvent('vr-camera', { detail: { action } }));
          break;
        case 'zoom_in':
        case 'zoom_out':
          window.dispatchEvent(new CustomEvent('vr-zoom', { detail: { action } }));
          break;
        case 'reset_view':
          window.dispatchEvent(new CustomEvent('vr-reset-position'));
          toast.success('View Reset', { description: 'Camera returned to origin' });
          break;
        case 'first_person':
        case 'third_person':
          toast.info('Camera Mode', { description: `Switched to ${action.replace('_', ' ')}` });
          break;
        
        // Environment/Weather/Season commands
        case 'set_day':
        case 'set_night':
        case 'set_dawn':
        case 'set_dusk':
        case 'set_sunny':
        case 'set_rain':
        case 'set_cloudy':
        case 'set_snow':
        case 'set_storm':
        case 'set_fog':
          window.dispatchEvent(new CustomEvent('vr-environment', { detail: { action } }));
          toast.info('Environment', { description: `Setting ${action.replace('set_', '').replace('_', ' ')}` });
          break;
        
        // Season commands
        case 'set_season_winter':
        case 'set_season_spring':
        case 'set_season_summer':
        case 'set_season_autumn':
          window.dispatchEvent(new CustomEvent('vr-season', { detail: { action, season: action.replace('set_season_', '') } }));
          toast.success('Season Changed', { description: `${action.replace('set_season_', '').charAt(0).toUpperCase() + action.replace('set_season_', '').slice(1)} season activated`, duration: 3000 });
          break;
        
        // Real-world sync
        case 'sync_real_weather':
          window.dispatchEvent(new CustomEvent('vr-sync-weather'));
          toast.info('Syncing Weather', { description: 'Fetching real-world weather from your location' });
          break;
        case 'sync_real_time':
          window.dispatchEvent(new CustomEvent('vr-sync-time'));
          toast.info('Syncing Time', { description: 'Matching VR time with real world' });
          break;
        case 'set_temperature':
        case 'set_temp_preset':
          window.dispatchEvent(new CustomEvent('vr-temperature', { detail: { action } }));
          toast.info('Temperature', { description: 'Adjusting world temperature' });
          break;
        
        case 'toggle_sound':
          window.dispatchEvent(new CustomEvent('vr-toggle-sound'));
          break;
        
        // Vehicle interaction
        case 'enter_vehicle':
        case 'exit_vehicle':
        case 'start_engine':
        case 'stop_engine':
        case 'autopilot':
        case 'manual_drive':
          window.dispatchEvent(new CustomEvent('vr-vehicle', { detail: { action } }));
          toast.info('Vehicle', { description: action.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) });
          break;
        
        case 'navigate_route':
        case 'drive_to':
          window.dispatchEvent(new CustomEvent('vr-navigate', { detail: { action, command } }));
          toast.info('Navigation', { description: 'Calculating route and creating roads if needed' });
          break;
        
        // Door interactions
        case 'open_car_door':
        case 'close_car_door':
        case 'open_building_door':
        case 'enter_building':
        case 'open_door':
        case 'close_door':
          window.dispatchEvent(new CustomEvent('vr-door', { detail: { action } }));
          toast.info('Door', { description: action.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) });
          break;
        
        // Additional building types
        case 'build_fire_station':
        case 'build_police_station':
        case 'build_religious':
        case 'build_gym':
        case 'build_restaurant':
        case 'build_cultural':
        case 'build_stadium':
          window.dispatchEvent(new CustomEvent('vr-build', { detail: { action, type: action.replace('build_', '') } }));
          toast.success('Building', { description: `Constructing ${action.replace('build_', '').replace('_', ' ')}` });
          break;
        
        // Geolocation & Map
        case 'show_location':
        case 'use_geolocation':
        case 'show_map':
          window.dispatchEvent(new CustomEvent('vr-map', { detail: { action } }));
          toast.info('Map', { description: action === 'show_map' ? 'Opening world map' : 'Using geolocation services' });
          break;
        case 'teleport_real_place':
        case 'recreate_place':
          window.dispatchEvent(new CustomEvent('vr-recreate-place', { detail: { action, command } }));
          toast.info('Recreation', { description: 'Generating virtual replica of real-world location' });
          break;
        
        // Interaction commands
        case 'interact':
        case 'pickup':
        case 'drop':
        case 'sit':
        case 'stand':
        case 'crouch':
        case 'lie_down':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action } }));
          break;
        
        // Special OMEGA commands
        case 'bio_sync':
        case 'restore_integrity':
          if (isDissonanceActive) {
            handleBioSyncStart();
          } else {
            onIntegrityRestore();
          }
          break;
        case 'show_memories':
          toast.info('Memories', { description: `${engrams.length} memory engrams loaded` });
          break;
        case 'show_holowall':
          toast.info('Holo-Wall', { description: 'ECN timeline displayed' });
          break;
        
        // Control commands
        case 'show_help':
        case 'show_controls':
        case 'show_tutorial':
        case 'what_can_do':
          setShowTutorial(true);
          break;
        case 'show_commands':
          setShowVoicePanel(true);
          break;
        case 'activate_voice':
          toast.success('Voice Controls Active', { description: 'Say "Zoe" followed by a command' });
          break;
        
        // ═══════════════════════════════════════════════════════════════════
        // PANEL CONTROL COMMANDS
        // ═══════════════════════════════════════════════════════════════════
        case 'open_voice_panel':
          setShowVoicePanel(true);
          toast.success('Voice Panel', { description: 'Voice commands panel opened' });
          break;
        case 'close_voice_panel':
          setShowVoicePanel(false);
          toast.info('Voice Panel', { description: 'Voice commands panel closed' });
          break;
        case 'toggle_voice_panel':
          setShowVoicePanel(prev => !prev);
          break;
        
        case 'open_controls_panel':
          setShowControlsPanel(true);
          setShowTutorial(true);
          toast.success('Controls Panel', { description: 'VR controls panel opened' });
          break;
        case 'close_controls_panel':
          setShowControlsPanel(false);
          setShowTutorial(false);
          toast.info('Controls Panel', { description: 'VR controls panel closed' });
          break;
        case 'toggle_controls_panel':
          setShowControlsPanel(prev => !prev);
          setShowTutorial(prev => !prev);
          break;
        
        case 'open_wallet':
          setShowWallet(true);
          window.dispatchEvent(new CustomEvent('open-karma-forge'));
          toast.success('Wallet', { description: 'Karma Forge opened' });
          break;
        case 'close_wallet':
          setShowWallet(false);
          window.dispatchEvent(new CustomEvent('close-karma-forge'));
          toast.info('Wallet', { description: 'Wallet closed' });
          break;
        case 'toggle_wallet':
          setShowWallet(prev => !prev);
          window.dispatchEvent(new CustomEvent('toggle-karma-forge'));
          break;
        
        case 'close_memory_panel':
          setSelectedEngram(null);
          toast.info('Memory Panel', { description: 'Memory details closed' });
          break;
        
        case 'close_all_panels':
          setShowVoicePanel(false);
          setShowControlsPanel(false);
          setShowTutorial(false);
          setShowWallet(false);
          setSelectedEngram(null);
          window.dispatchEvent(new CustomEvent('close-karma-forge'));
          toast.info('Panels', { description: 'All panels closed' });
          break;
        
        case 'minimize_all_panels':
          // Same as close all for now
          setShowVoicePanel(false);
          setShowControlsPanel(false);
          setShowTutorial(false);
          toast.info('Panels', { description: 'All panels minimized' });
          break;
        
        case 'reset_panel_positions':
          // Trigger a re-render by toggling states
          setShowVoicePanel(false);
          setShowControlsPanel(false);
          setTimeout(() => {
            setShowVoicePanel(true);
            setShowControlsPanel(true);
          }, 100);
          toast.success('Panels', { description: 'Panel positions reset to default' });
          break;
        
        default:
          console.log(`[VR OMEGA] Unhandled voice command: ${action}`);
      }
    };

    window.addEventListener('vr-voice-command', handleVRVoiceCommand as EventListener);
    return () => window.removeEventListener('vr-voice-command', handleVRVoiceCommand as EventListener);
  }, [isActive, isDissonanceActive, engrams.length, onIntegrityRestore]);

  // Check if first-time user and show tutorial
  useEffect(() => {
    const tutorialSeen = localStorage.getItem('vr_omega_tutorial_seen');
    if (!tutorialSeen && isActive) {
      setShowTutorial(true);
      setHasSeenTutorial(false);
    } else {
      setHasSeenTutorial(true);
    }
  }, [isActive]);

  // Handle tutorial dismissal
  const handleDismissTutorial = useCallback(() => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    localStorage.setItem('vr_omega_tutorial_seen', 'true');
  }, []);

  // Handle keyboard H key for help toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && isActive) {
        setShowTutorial(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Load memory engrams from ZSMT
  useEffect(() => {
    if (!user || !isActive) return;
    
    const loadEngrams = async () => {
      try {
        const { data, error } = await supabase
          .from('zoe_sovereign_memory')
          .select('*')
          .eq('user_id', user.id)
          .in('event_type', ['chat_message', 'ecn_state', 'meta_monologue', 'omega_entry'])
          .order('created_at', { ascending: false })
          .limit(15);
        
        if (error) throw error;
        
        const loadedEngrams: MemoryEngram[] = (data || []).map((item, index) => {
          const zoeState = item.zoe_state_json as Record<string, any> | null;
          const ecnData = zoeState?.ecn as Record<string, any> | null;
          
          return {
            id: item.id,
            content: item.content_text || 'Memory fragment',
            emotion: ecnData?.primary_emotion || 'contemplative',
            intensity: Math.random() * 0.5 + 0.5,
            position: [
              (Math.random() - 0.5) * 10,
              Math.random() * 3 + 1,
              (Math.random() - 0.5) * 10
            ] as [number, number, number],
            createdAt: new Date(item.created_at)
          };
        });
        
        setEngrams(loadedEngrams);
      } catch (error) {
        console.error('[VR OMEGA] Failed to load engrams:', error);
      }
    };
    
    loadEngrams();
  }, [user, isActive]);

  // Load ECN data for Holo-Wall
  useEffect(() => {
    if (!user || !isActive) return;
    
    const loadECNData = async () => {
      try {
        const { data, error } = await supabase
          .from('ecn_history')
          .select('*')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        const loadedData: ECNDataPoint[] = (data || []).map((item) => ({
          timestamp: new Date(item.recorded_at),
          stressLevel: item.stress_level * 100,
          emotion: item.primary_emotion
        }));
        
        setEcnData(loadedData.reverse());
        
        // Calculate coherence from latest data
        if (loadedData.length > 0) {
          const avgEngagement = loadedData.reduce((sum, d) => sum + (data?.find(x => x.recorded_at === d.timestamp.toISOString())?.engagement_score || 0.5), 0) / loadedData.length;
          setCoherenceScore(avgEngagement);
        }
      } catch (error) {
        console.error('[VR OMEGA] Failed to load ECN data:', error);
        // Generate placeholder data
        setEcnData(Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000),
          stressLevel: Math.random() * 60 + 20,
          emotion: 'neutral'
        })));
      }
    };
    
    loadECNData();
  }, [user, isActive]);

  // Monitor integrity for dissonance trigger
  useEffect(() => {
    if (integrityLevel <= 0) {
      setIsDissonanceActive(true);
    }
  }, [integrityLevel]);

  // Bio-Sync handler (10-second long press)
  const handleBioSyncStart = useCallback(() => {
    if (!isDissonanceActive) return;
    
    setIsBioSyncing(true);
    setBioSyncProgress(0);
    
    let progress = 0;
    bioSyncRef.current = setInterval(() => {
      progress += 1;
      setBioSyncProgress(progress);
      
      if (progress >= 100) {
        if (bioSyncRef.current) clearInterval(bioSyncRef.current);
        setIsBioSyncing(false);
        setIsDissonanceActive(false);
        onIntegrityRestore();
      }
    }, 100); // 10 seconds total (100 steps * 100ms)
  }, [isDissonanceActive, onIntegrityRestore]);

  const handleBioSyncEnd = useCallback(() => {
    if (bioSyncRef.current) {
      clearInterval(bioSyncRef.current);
      bioSyncRef.current = null;
    }
    setIsBioSyncing(false);
    setBioSyncProgress(0);
  }, []);

  const handleEngramSelect = useCallback((engram: MemoryEngram) => {
    setSelectedEngram(engram);
  }, []);

  if (!isActive) return null;

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="relative w-full h-full min-h-[280px] xxs:min-h-[320px] xs:min-h-[360px] sm:min-h-[420px] md:min-h-[500px] lg:min-h-[600px] xl:min-h-[700px] 4k:min-h-[900px] landscape:min-h-[240px] landscape:xs:min-h-[280px] landscape:sm:min-h-[320px] landscape:md:min-h-[400px]">
        {/* 3D Canvas with RPO Cinematic Pipeline */}
        <Canvas
          camera={{ position: [0, 1.6, 5], fov: 75 }}
          className="w-full h-full"
          gl={{ 
            antialias: graphicsConfig?.enableAntialias ?? true, 
            powerPreference: graphicsConfig?.tier === 'low' ? 'low-power' : 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false, // Important for Safari compatibility
            preserveDrawingBuffer: false,
          }}
          dpr={[1, Math.min(graphicsConfig?.pixelRatio ?? 1, 2)]}
          shadows={graphicsConfig?.enableShadows ?? false}
          fallback={<div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">Loading 3D...</div>}
          onCreated={({ gl }) => {
            // Configure renderer after creation for Safari compatibility
            try {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.2;
              gl.outputColorSpace = THREE.SRGBColorSpace;
            } catch (e) {
              console.warn('[VR OMEGA] Renderer configuration failed:', e);
            }
          }}
        >
          <color attach="background" args={['#030014']} />
          
          {/* Ready Player One Cinematic Post-Processing */}
          <CinematicPostProcessing config={graphicsConfig} enabled={!isMobile || currentTier !== 'low'} />
          
          {/* Procedural Cyber City - The Stacks (RPO Style) */}
          {showCyberCity && (
            <ProceduralCyberCity config={graphicsConfig} seed={42} cityRadius={150} />
          )}
          
          {/* Gaussian Splat Viewer - 2120 Feature */}
          {showGaussianSplat && (
            <GaussianSplatViewer position={[0, 5, -20]} scale={2} />
          )}
          
          <MemoryPalace
            engrams={engrams}
            ecnData={ecnData}
            coherenceScore={coherenceScore}
            integrityLevel={integrityLevel}
            onEngramSelect={handleEngramSelect}
            disabled={isDissonanceActive}
            buildings={buildings}
            onBuildingClick={(building) => {
              toast.info(`${building.type.replace('_', ' ')}`, { 
                description: `Floors: ${building.floors} | Size: ${Math.round(building.width)}x${Math.round(building.depth)}` 
              });
            }}
            hasSatelliteEntryCompleted={hasSatelliteEntryCompleted}
            onSatelliteEntryComplete={() => setHasSatelliteEntryCompleted(true)}
          />
          
          {/* Enterprise Multiplayer Avatars - Glass Pyramids */}
          <MultiplayerAvatars 
            players={multiplayerPlayers} 
            localUserId={myUserId} 
          />
          </Canvas>

          {/* Touch + Browser quick controls (only shown on touch devices) */}
          {typeof window !== 'undefined' && 'ontouchstart' in window && (
            <>
              <VirtualJoystick
                position="left"
                onMove={(x, y) => {
                  const dead = 0.2;
                  if (Math.abs(x) < dead && Math.abs(y) < dead) {
                    window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'stop' } }));
                    return;
                  }

                  // Forward/back
                  if (y < -dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'forward', speed: 1 } }));
                  if (y > dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'backward', speed: 1 } }));
                  if (x < -dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'left', speed: 1 } }));
                  if (x > dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'right', speed: 1 } }));
                }}
              />

              <RotationButtons />

              <div className="absolute bottom-24 right-6 z-50 flex flex-col gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'car' } }))}
                  className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] px-3 py-2"
                >
                  + Car
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'road' } }))}
                  className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] px-3 py-2"
                >
                  + Road
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'forest', count: 20 } }))}
                  className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] px-3 py-2"
                >
                  + Forest
                </button>
              </div>
            </>
          )}
          
          {/* Graphics Tier & RPO Features Indicator */}
          <div className="absolute bottom-2 right-2 z-50 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1.5 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-[9px] mb-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300 uppercase font-mono">{currentTier}</span>
            <span className="text-white/40">{fps} FPS</span>
            {vrController.connectedControllers.length > 2 && (
              <span className="text-green-400 text-[8px]">🎮 {vrController.activeController}</span>
            )}
          </div>
          {/* RPO Feature Toggles */}
          <div className="flex items-center gap-1.5 text-[8px]">
            <button 
              onClick={() => setShowCyberCity(prev => !prev)}
              className={cn(
                "px-1.5 py-0.5 rounded transition-colors",
                showCyberCity ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"
              )}
            >
              City
            </button>
            <button 
              onClick={() => setShowGaussianSplat(prev => !prev)}
              className={cn(
                "px-1.5 py-0.5 rounded transition-colors",
                showGaussianSplat ? "bg-cyan-600 text-white" : "bg-gray-700 text-gray-400"
              )}
            >
              Splat
            </button>
            <button 
              onClick={() => vrController.cycleViewMode()}
              className="px-1.5 py-0.5 rounded bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
            >
              {vrController.viewMode}
            </button>
          </div>
        </div>

        {/* Vision Pro-Style HUD Overlays */}
        {hasSatelliteEntryCompleted && (
          <>
            {/* Compass */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-black/40 backdrop-blur-xl rounded-full px-6 py-2 border border-white/10">
                <div className="flex items-center gap-4 text-white/80 text-sm font-mono">
                  <span className={cameraHeading >= 315 || cameraHeading < 45 ? 'text-cyan-400 font-bold' : ''}>N</span>
                  <span className={cameraHeading >= 45 && cameraHeading < 135 ? 'text-cyan-400 font-bold' : ''}>E</span>
                  <span className={cameraHeading >= 135 && cameraHeading < 225 ? 'text-cyan-400 font-bold' : ''}>S</span>
                  <span className={cameraHeading >= 225 && cameraHeading < 315 ? 'text-cyan-400 font-bold' : ''}>W</span>
                </div>
                <div className="text-center text-white text-xs font-mono mt-1">
                  {Math.round(cameraHeading)}°
                </div>
              </div>
            </div>
            
            {/* Altitude/Zoom HUD */}
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-4">
                <div className="text-center">
                  <div className="text-white/50 text-[10px] uppercase tracking-wider">Altitude</div>
                  <div className="text-white text-xl font-mono font-bold">
                    {Math.round(cameraAltitude)}
                    <span className="text-sm text-white/50">m</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-[10px] uppercase tracking-wider">Zoom</div>
                  <div className="text-white text-xl font-mono font-bold">
                    {vrController.zoom.toFixed(1)}
                    <span className="text-sm text-white/50">x</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-[10px] uppercase tracking-wider">View</div>
                  <div className="text-cyan-400 text-sm font-medium capitalize">
                    {vrController.viewMode.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Integrity indicator - FIRST (highest z-index) */}
        
        {/* VR Voice Commands Panel - Glassmorphic Dropdown - positioned below integrity */}
        {showVoicePanel && (
          <VRVoiceCommandsPanel 
            isVisible={showVoicePanel} 
            position="top-left"
            onClose={() => setShowVoicePanel(false)}
          />
        )}

        {/* Compact Draggable VR Controls Panel - bottom left */}
        {showControlsPanel && (
          <VRControlsPanel 
            hasSeenTutorial={hasSeenTutorial}
            onClose={() => {
              setShowTutorial(false);
              setHasSeenTutorial(true);
              setShowControlsPanel(false);
            }}
          />
        )}
        <div className="absolute top-1 right-1 xxs:top-1.5 xxs:right-1.5 xs:top-2 xs:right-2 sm:top-2 sm:right-2 z-[70] bg-black/70 backdrop-blur-md rounded-lg p-1 xxs:p-1.5 xs:p-2 sm:p-2 border border-white/10">
          <div className="text-[6px] xxs:text-[7px] xs:text-[8px] sm:text-[9px] text-white/50 leading-none">INTEGRITY</div>
          <div className={cn(
            "text-xs xxs:text-sm xs:text-base sm:text-lg font-mono font-bold leading-none",
            integrityLevel > 50 ? "text-emerald-400" : integrityLevel > 25 ? "text-yellow-400" : "text-red-400"
          )}>
            {integrityLevel.toFixed(0)}%
          </div>
        </div>

        {/* Selected engram detail - DRAGGABLE */}
        <AnimatePresence>
          {selectedEngram && (
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.1}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-xl rounded-lg p-2 xs:p-2.5 sm:p-3 w-[200px] xs:w-[240px] sm:w-[280px] border border-purple-500/30 cursor-grab active:cursor-grabbing shadow-xl"
            >
              {/* Drag handle */}
              <div className="flex items-center justify-between mb-1.5" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-white/40" />
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedEngram.emotion === 'joy' ? '#FFD700' : '#9370DB' }}
                  />
                  <span className="text-purple-300 text-[9px] xs:text-[10px] uppercase font-semibold">{selectedEngram.emotion}</span>
                </div>
                <button
                  onClick={() => setSelectedEngram(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-white/90 text-[9px] xs:text-[10px] sm:text-xs leading-relaxed line-clamp-3">{selectedEngram.content}</p>
              <div className="text-white/40 text-[7px] xs:text-[8px] mt-1.5 font-mono">
                {selectedEngram.createdAt.toLocaleString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dissonance overlay - ultra compact landscape-aware */}
        <AnimatePresence>
          {isDissonanceActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-1 xxs:p-2"
            >
              <div
                className="text-center max-w-[200px] xxs:max-w-[240px] xs:max-w-xs sm:max-w-sm 4k:max-w-lg landscape:max-w-[320px] landscape:flex landscape:items-center landscape:gap-2 landscape:xs:gap-3 animate-gpu-icon-scale"
              >
                <div className="landscape:text-left landscape:flex-1">
                  <div className="text-red-400 text-sm xxs:text-base xs:text-lg sm:text-xl 4k:text-2xl font-bold mb-0.5 xxs:mb-1 font-mono landscape:text-sm landscape:xs:text-base landscape:mb-0">
                    ⚠ DISSONANCE ⚠
                  </div>
                  <div className="text-white/60 text-[8px] xxs:text-[9px] xs:text-[10px] sm:text-xs 4k:text-sm mb-2 xxs:mb-3 landscape:text-[8px] landscape:xs:text-[9px] landscape:mb-0">
                    Hold Bio-Sync to restore</div>
                </div>
                
                {/* Bio-Sync button - ultra compact responsive */}
                <div className="landscape:flex-shrink-0">
                  <motion.button
                    onMouseDown={handleBioSyncStart}
                    onMouseUp={handleBioSyncEnd}
                    onMouseLeave={handleBioSyncEnd}
                    onTouchStart={handleBioSyncStart}
                    onTouchEnd={handleBioSyncEnd}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-14 h-14 xxs:w-16 xxs:h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 4k:w-32 4k:h-32 rounded-full border-2 border-cyan-500/50 bg-black/50 flex items-center justify-center mx-auto landscape:w-12 landscape:h-12 landscape:xs:w-14 landscape:xs:h-14 landscape:sm:w-16 landscape:sm:h-16"
                  >
                    {/* Progress ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="4" />
                      <circle
                        cx="50" cy="50" r="46" fill="none" stroke="#06b6d4" strokeWidth="4"
                        strokeDasharray={289}
                        strokeDashoffset={289 - (289 * bioSyncProgress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="text-center z-10">
                      <div className="text-cyan-400 text-[10px] xxs:text-xs xs:text-sm sm:text-base 4k:text-lg font-bold landscape:text-[9px] landscape:xs:text-[10px] landscape:sm:text-xs">
                        {isBioSyncing ? `${bioSyncProgress}%` : 'HOLD'}
                      </div>
                      <div className="text-white/60 text-[6px] xxs:text-[7px] xs:text-[8px] sm:text-[9px] 4k:text-[10px] landscape:text-[6px] landscape:xs:text-[7px]">
                        {isBioSyncing ? 'Sync...' : 'Bio-Sync'}
                      </div>
                    </div>
                  </motion.button>
                  
                  <div className="text-white/40 text-[6px] xxs:text-[7px] xs:text-[8px] sm:text-[9px] 4k:text-xs mt-0.5 xxs:mt-1 landscape:mt-0.5 landscape:text-[6px]">
                    Hold 10s
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enterprise Control Deck - Admin Only */}
        <EnterpriseControlDeck
          isAdmin={isAdmin}
          players={multiplayerPlayers}
          playerCount={playerCount}
          onBroadcast={(message) => {
            broadcastWorldEvent('broadcast', { message });
          }}
          onWorldReset={() => {
            setBuildings([]);
            broadcastWorldEvent('world_reset', {});
          }}
          onSummonAll={(position) => {
            broadcastWorldEvent('summon', { position });
          }}
          isConnected={isMultiplayerConnected}
        />

        {/* World Broadcast Notifications */}
        <WorldBroadcastNotification />

        {/* Multiplayer Connection Indicator */}
        {isActive && (
          <div className="absolute bottom-2 left-2 z-50 flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isMultiplayerConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
            )} />
            <span className="text-[8px] text-white/60 font-mono">
              {isMultiplayerConnected ? `${playerCount} online` : 'Connecting...'}
            </span>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
};

export default VROMEGAWorld;
