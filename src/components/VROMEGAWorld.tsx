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
import { useVRProgressiveLoader } from '@/hooks/useVRProgressiveLoader';
import { AltitudeTracker } from './vr/AltitudeTracker';
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
import { useZoeVoiceCore } from '@/hooks/useZoeVoiceCore';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { generateVRWorldAuditPDF } from '@/utils/vrWorldAuditPdf';
import { useVRDHFLearning } from '@/hooks/useVRDHFLearning';
import { useVRAutoFix } from '@/hooks/useVRAutoFix';
import VRFeatureIntegration from './vr/VRFeatureIntegration';
import ProceduralBuildings, { generateCity } from './vr/features/ProceduralBuildings';
import SunLightCycle from './vr/features/SunLightCycle';
import NightSkySystem from './vr/features/NightSkySystem';
import VRDebugPanel from './vr/features/VRDebugPanel';
// Ready Player One Cinematic Features
import CinematicPostProcessing from './vr/features/CinematicPostProcessing';
import ProceduralCyberCity from './vr/features/ProceduralCyberCity';
import GaussianSplatViewer from './vr/features/GaussianSplatViewer';
import { useGraphicsOptimizer, type GPUTier } from '@/hooks/useGraphicsOptimizer';
// Touch / Futuristic Controls
import { VirtualJoystick, RotationButtons, LookButtons } from './vr/features/VRControlSystem';
// Enterprise Multiplayer Layer
import { useMultiplayerPresence } from '@/hooks/useMultiplayerPresence';
import { MultiplayerAvatars } from './vr/features/GlassPyramidAvatar';
import EnterpriseControlDeck from './vr/features/EnterpriseControlDeck';
import WorldBroadcastNotification from './vr/features/WorldBroadcastNotification';
// Universal VR Controller System (PS5/Quest/Vision Pro)
import { useVRUniversalController } from '@/hooks/useVRUniversalController';
import VRHiddenItemsManagerAuto from './vr/features/VRHiddenOverlays';
// Safari/iOS Zoom Fix + Cross-Browser Compatibility
import { useVRSafariFix, getVRConfigForBrowser } from '@/hooks/useVRSafariFix';
// Zoe VR World Voice Commands
import { useZoeVRWorldCommands, VR_WORLD_COMMANDS } from '@/hooks/useZoeVRWorldCommands';
import { VR_COMMANDS } from '@/hooks/useVRVoiceCommands';
import { VR_ACTION_ALIASES, VR_HANDLED_ACTIONS } from '@/constants/vrVoiceActionCoverage';
// VR Voice Guide - Deepgram aura-2-janus-en narration system
import { useVRVoiceGuide } from '@/hooks/useVRVoiceGuide';
// VR 5X Zoom Lens
import VRZoomLens from './vr/features/VRZoomLens';
// Crowd System - 450 avatars + road vehicles
import CrowdAvatarSystem from './vr/features/CrowdAvatarSystem';
// Look Joystick + Collapsible touch bar
import VRLookJoystick, { VRTouchControlBar } from './vr/features/VRLookJoystick';
import { BikeOnScreenControls } from './vr/features/MotorcycleSystem';
import { VRManualDownloadButton } from './vr/VRManualDownloadButton';
import { useSkyPhase } from '@/hooks/useSkyPhase';

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
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'help', keys: ['KeyH'] },
  { name: 'zoom5x', keys: ['KeyZ'] },
];

const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;
const METRO_ENTRANCE_POSITION: [number, number, number] = [-800 + CITY_OFFSET_X, 0, -788 + CITY_OFFSET_Z];
const METRO_PLATFORM_POSITION: [number, number, number] = [-800 + CITY_OFFSET_X, 8, -800 + CITY_OFFSET_Z];

// POI positions for "take me to" navigation (matches ExpandedCityGrid templates)
const POI_POSITIONS: Record<string, { position: [number, number, number]; name: string }> = {
  navigate_to_kfc: { position: [-800 + Math.sin(0) * 30, 1.6, -800 + Math.cos(0) * 30], name: 'KFC' },
  navigate_to_mcdonalds: { position: [-300 + Math.sin(1) * 30, 1.6, -800 + Math.cos(1) * 30], name: "McDonald's" },
  navigate_to_starbucks: { position: [200 + Math.sin(2) * 30, 1.6, -800 + Math.cos(2) * 30], name: 'Starbucks' },
  navigate_to_cafe: { position: [700 + Math.sin(3) * 30, 1.6, -800 + Math.cos(3) * 30], name: 'City Café' },
  navigate_to_hospital: { position: [-800 + Math.sin(4) * 30, 1.6, -300 + Math.cos(4) * 30], name: 'General Hospital' },
  navigate_to_hotel: { position: [-300 + Math.sin(5) * 30, 1.6, -300 + Math.cos(5) * 30], name: 'Grand Hyatt Hotel' },
  navigate_to_school: { position: [700 + Math.sin(7) * 30, 1.6, -300 + Math.cos(7) * 30], name: 'Central School' },
  navigate_to_church: { position: [-800 + Math.sin(8) * 30, 1.6, 200 + Math.cos(8) * 30], name: 'St. Mary Church' },
  navigate_to_temple: { position: [-300 + Math.sin(9) * 30, 1.6, 200 + Math.cos(9) * 30], name: 'Shiva Temple' },
  navigate_to_tower: { position: [200 + Math.sin(10) * 30, 1.6, 200 + Math.cos(10) * 30], name: 'Omega Tower' },
  navigate_to_park: { position: [-800 + Math.sin(12) * 30, 1.6, 700 + Math.cos(12) * 30], name: 'Central Park' },
  navigate_to_fire_station: { position: [-300 + Math.sin(13) * 30, 1.6, 700 + Math.cos(13) * 30], name: 'Fire Station #1' },
  navigate_to_police: { position: [200 + Math.sin(14) * 30, 1.6, 700 + Math.cos(14) * 30], name: 'Police HQ' },
  navigate_to_stadium: { position: [700 + Math.sin(15) * 30, 1.6, 700 + Math.cos(15) * 30], name: 'City Stadium' },
  navigate_to_metro: { position: METRO_ENTRANCE_POSITION, name: 'Metro Central Station' },
  navigate_to_fashion: { position: [-620, 1.6, -120], name: 'Fashion Boutique' },
  navigate_to_pet_shop: { position: [-120, 1.6, -120], name: 'Pet Shop' },
  navigate_to_laundry: { position: [380, 1.6, -120], name: 'Laundry Store' },
  navigate_to_vegetable_market: { position: [-620, 1.6, 380], name: 'Vegetable Market' },
  navigate_to_fruit_market: { position: [-120, 1.6, 380], name: 'Fruit Market' },
};

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

const VR_CONTROL_CATALOG = {
  desktop: [
    'W / A / S / D or Arrow Keys: Walk',
    'Mouse drag: Look around',
    'Mouse wheel: Zoom in/out',
    'H key: Toggle controls help',
  ],
  tablet: [
    'Left joystick: Move',
    'Right rotation buttons: Turn',
    'Pinch/drag: Camera look and zoom',
    'Quick Nav dock: Satellite / Aerial / Ground',
  ],
  mobile: [
    'Left joystick: Move',
    'Right rotation buttons: Turn left/right',
    'Use Quick Nav for instant location jumps',
    'Tap Talk to Zoe to start voice guide',
  ],
};

const VR_VOICE_CATALOG = [
  'Zoe satellite view',
  'Zoe aerial view',
  'Zoe mountain view',
  'Zoe mountain summit view',
  'Zoe go to city center',
  'Zoe guide me',
  'Zoe walk forward',
  'Zoe turn left / turn right',
  'Talk to avatar',
  'Zoe 5X zoom / normal zoom',
  'Zoe take me to KFC / hospital / metro / Starbucks',
  'Zoe take me to church / temple / stadium / park',
];

type VRPromptCoverageItem = {
  action: string;
  normalizedAction: string;
  sources: string[];
  handled: boolean;
};

const buildVRPromptCoverage = (): VRPromptCoverageItem[] => {
  const index = new Map<string, VRPromptCoverageItem>();

  const register = (action: string, source: string) => {
    const normalizedAction = VR_ACTION_ALIASES[action] || action;
    const key = `${action}::${normalizedAction}`;
    const existing = index.get(key);

    if (existing) {
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      return;
    }

    index.set(key, {
      action,
      normalizedAction,
      sources: [source],
      handled: VR_HANDLED_ACTIONS.has(normalizedAction),
    });
  };

  VR_COMMANDS.forEach((cmd) => register(cmd.action, 'useVRVoiceCommands'));
  VR_WORLD_COMMANDS.forEach((cmd) => register(cmd.action, 'useZoeVRWorldCommands'));

  return [...index.values()].sort((a, b) => a.normalizedAction.localeCompare(b.normalizedAction));
};
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
const PlayerController: React.FC<{ disabled: boolean; blockHighAltitudeTransitions?: boolean }> = ({ disabled, blockHighAltitudeTransitions = false }) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const eventDirection = useRef<string | null>(null);
  const eventSpeed = useRef(1);
  const eventExpiresAt = useRef(0);
  const eventHold = useRef(false);
  const isGroundLocked = useRef(false);
  const verticalVelocity = useRef(0);
  const isDraggingLook = useRef(false);
  const touchLookRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const keyboardForwardStartedAt = useRef<number | null>(null);
  const eventForwardStartedAt = useRef<number | null>(null);
  const keyStateRef = useRef({ forward: false, backward: false, left: false, right: false, run: false, jump: false });

  const [, getKeys] = useKeyboardControls();

  useEffect(() => {
    camera.rotation.order = 'YXZ';

    const clampOrientation = () => {
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.45, 1.45);
      camera.rotation.z = 0;
    };

    const moveToGroundSpawn = () => {
      camera.position.set(0, 4.2, 0);
      camera.lookAt(450, 1.6, 0); // Face east toward mountains
      clampOrientation();
      isGroundLocked.current = true;
      velocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
      eventDirection.current = null;
      eventSpeed.current = 1;
      eventHold.current = false;
      eventExpiresAt.current = 0;
      eventForwardStartedAt.current = null;
    };

    const resetInputState = () => {
      keyStateRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        run: false,
        jump: false,
      };
      eventDirection.current = null;
      eventSpeed.current = 1;
      eventHold.current = false;
      eventExpiresAt.current = 0;
      keyboardForwardStartedAt.current = null;
      eventForwardStartedAt.current = null;
      isDraggingLook.current = false;
      touchLookRef.current.active = false;
    };

    const handleMove = (e: CustomEvent) => {
      const { direction: dir, speed = 1, hold = false } = e.detail || {};

      if (dir === 'stop') {
        eventDirection.current = null;
        eventSpeed.current = 1;
        eventHold.current = false;
        eventExpiresAt.current = 0;
        eventForwardStartedAt.current = null;
        return;
      }

      eventDirection.current = dir;
      eventSpeed.current = speed;
      eventHold.current = Boolean(hold);
      eventExpiresAt.current = eventHold.current ? Number.POSITIVE_INFINITY : Date.now() + 220;

      if (dir === 'forward' && eventForwardStartedAt.current === null) {
        eventForwardStartedAt.current = Date.now();
      }
      if (dir !== 'forward') {
        eventForwardStartedAt.current = null;
      }
    };

    const handleReset = () => {
      camera.position.set(0, 5, 0);
      camera.lookAt(450, 5, 0); // Face east toward mountains
      clampOrientation();
      velocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
      eventDirection.current = null;
      eventHold.current = false;
      eventForwardStartedAt.current = null;
      isGroundLocked.current = true;
    };

    const handleTeleport = (e: CustomEvent) => {
      const { position, lookAt, lockGround = false, destination, x, y, z } = e.detail || {};

      if (Array.isArray(position) && position.length === 3) {
        camera.position.set(position[0], position[1], position[2]);
      } else if (destination === 'f1_circuit') {
        camera.position.set(1100, 1.6, -500);
      } else if (typeof x === 'number' || typeof y === 'number' || typeof z === 'number') {
        camera.position.set(
          typeof x === 'number' ? x : camera.position.x,
          typeof y === 'number' ? y : 1.6,
          typeof z === 'number' ? z : camera.position.z,
        );
      }

      if (Array.isArray(lookAt) && lookAt.length === 3) {
        camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      } else if (destination === 'f1_circuit') {
        camera.lookAt(1100, 1.6, -560);
      }

      clampOrientation();
      // Lock ground at walking height OR platform height (TRACK_HEIGHT range)
      const atPlatformHeight = camera.position.y >= 7 && camera.position.y <= 12;
      isGroundLocked.current = !!lockGround || camera.position.y <= 2.2 || atPlatformHeight;
      velocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
      eventDirection.current = null;
      eventHold.current = false;
      eventExpiresAt.current = 0;
      eventForwardStartedAt.current = null;
    };

    const handleRotate360 = (event: CustomEvent) => {
      const { direction: rotateDirection, degrees = 45 } = event.detail || {};
      const radians = (degrees * Math.PI) / 180;

      switch (rotateDirection) {
        case 'left':
          camera.rotation.y += radians;
          break;
        case 'right':
          camera.rotation.y -= radians;
          break;
        case 'around':
          camera.rotation.y += Math.PI;
          break;
        case 'full':
          camera.rotation.y += Math.PI * 2;
          break;
        default:
          break;
      }

      clampOrientation();
    };

    const handleCamera = (e: CustomEvent) => {
      const { action } = e.detail || {};
      if (action === 'fly_up') {
        if (blockHighAltitudeTransitions) return;
        camera.position.y = Math.min(camera.position.y + 10, 500);
        isGroundLocked.current = false;
      } else if (action === 'glide_down') {
        camera.position.y = Math.max(camera.position.y - 10, 1.6);
        if (camera.position.y <= 2) isGroundLocked.current = true;
      } else if (action === 'look_up') {
        camera.rotation.x = Math.max(camera.rotation.x - 0.22, -1.45);
      } else if (action === 'look_down') {
        camera.rotation.x = Math.min(camera.rotation.x + 0.22, 1.45);
      } else if (action === 'look_left') {
        camera.rotation.y += 0.35;
      } else if (action === 'look_right') {
        camera.rotation.y -= 0.35;
      } else if (action === 'look_around') {
        camera.rotation.y += Math.PI;
      } else if (action === 'zoom_in') {
        camera.position.z -= 5;
      } else if (action === 'zoom_out') {
        camera.position.z += 5;
      }
      clampOrientation();
    };

    const handleInteract = (e: CustomEvent) => {
      const { action } = e.detail || {};
      if (action === 'sit') {
        camera.position.y = 1.05;
        isGroundLocked.current = true;
      } else if (action === 'stand') {
        camera.position.y = 1.6;
        isGroundLocked.current = true;
      } else if (action === 'crouch') {
        camera.position.y = 1.25;
        isGroundLocked.current = true;
      } else if (action === 'lie_down') {
        camera.position.y = 0.95;
        camera.rotation.x = 0;
      } else if (action === 'enter_f1_car') {
        camera.position.set(1100, 1.45, -492);
        camera.lookAt(1100, 1.45, -525);
        isGroundLocked.current = true;
      } else if (action === 'exit_f1_car') {
        camera.position.y = 1.6;
        isGroundLocked.current = true;
      }
      clampOrientation();
    };

    const handleViewTransition = (e: CustomEvent) => {
      const { mode } = e.detail || {};

      if (blockHighAltitudeTransitions && (mode === 'satellite' || mode === 'aerial')) {
        camera.position.set(0, 4.2, 0);
        camera.lookAt(450, 1.6, 0);
        isGroundLocked.current = true;
        clampOrientation();
        return;
      }

      switch (mode) {
        case 'satellite':
          camera.position.set(980, 620, -980);
          camera.lookAt(420, 80, -420);
          isGroundLocked.current = false;
          break;
        case 'aerial':
          camera.position.set(320, 150, -280);
          camera.lookAt(40, 20, -220);
          isGroundLocked.current = false;
          break;
        case 'first_person':
          camera.position.set(0, 1.6, 0);
          camera.lookAt(450, 1.6, 0); // Face east toward mountains
          isGroundLocked.current = true;
          break;
        case 'ground':
        default:
          camera.position.set(0, 4.2, 0);
          camera.lookAt(450, 1.6, 0); // Face east toward mountains
          isGroundLocked.current = true;
          break;
      }

      clampOrientation();
      velocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
      eventDirection.current = null;
      eventHold.current = false;
      eventExpiresAt.current = 0;
      eventForwardStartedAt.current = null;
    };

    const isInteractiveTarget = (target: EventTarget | null) => {
      return target instanceof Element && !!target.closest('button, a, input, textarea, select, [role="dialog"], [data-orb-conversation-panel], [data-exclude-phantom-tap]');
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || isInteractiveTarget(event.target)) return;
      isDraggingLook.current = true;
    };

    const handleMouseUp = () => {
      isDraggingLook.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingLook.current || disabled) return;

      camera.rotation.y -= event.movementX * 0.0024;
      camera.rotation.x -= event.movementY * 0.0018;
      clampOrientation();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
        touchLookRef.current.active = false;
        return;
      }

      touchLookRef.current.active = true;
      touchLookRef.current.x = event.touches[0].clientX;
      touchLookRef.current.y = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchLookRef.current.active || event.touches.length !== 1 || disabled) return;

      const touch = event.touches[0];
      const dx = touch.clientX - touchLookRef.current.x;
      const dy = touch.clientY - touchLookRef.current.y;

      camera.rotation.y -= dx * 0.004;
      camera.rotation.x -= dy * 0.003;
      clampOrientation();

      touchLookRef.current.x = touch.clientX;
      touchLookRef.current.y = touch.clientY;
      event.preventDefault();
    };

    const handleTouchEnd = () => {
      touchLookRef.current.active = false;
    };

    const handleCameraLook = (e: CustomEvent) => {
      if (disabled) return;
      const { dx, dy } = e.detail || {};
      if (typeof dx === 'number') camera.rotation.y -= dx;
      if (typeof dy === 'number') camera.rotation.x -= dy;
      clampOrientation();
    };

    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('input, textarea, [contenteditable="true"]');

    const setKeyState = (code: string, isPressed: boolean) => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          keyStateRef.current.forward = isPressed;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keyStateRef.current.backward = isPressed;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keyStateRef.current.left = isPressed;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keyStateRef.current.right = isPressed;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keyStateRef.current.run = isPressed;
          break;
        case 'Space':
          keyStateRef.current.jump = isPressed;
          break;
      }
    };

    const MOVEMENT_KEYS = new Set([
      'KeyW',
      'ArrowUp',
      'KeyS',
      'ArrowDown',
      'KeyA',
      'ArrowLeft',
      'KeyD',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
      'Space',
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      setKeyState(event.code, true);
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeyState(event.code, false);
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
      }
    };

    const handleWindowBlur = () => {
      resetInputState();
      velocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWindowBlur();
      }
    };

    window.addEventListener('vr-move', handleMove as EventListener);
    window.addEventListener('vr-reset-position', handleReset as EventListener);
    window.addEventListener('vr-camera', handleCamera as EventListener);
    window.addEventListener('vr-view-transition', handleViewTransition as EventListener);
    window.addEventListener('vr-teleport', handleTeleport as EventListener);
    window.addEventListener('vr-rotate-360', handleRotate360 as EventListener);
    window.addEventListener('vr-camera-look', handleCameraLook as EventListener);
    window.addEventListener('vr-interact', handleInteract as EventListener);

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    // Root-cause guard: force deterministic ground spawn and re-assert after mount spikes.
    moveToGroundSpawn();

    const spawnStabilizers = [900, 2200].map((delay) =>
      window.setTimeout(() => {
        if (camera.position.y > 30 || Math.abs(camera.position.x) > 1400 || Math.abs(camera.position.z) > 1400) {
          moveToGroundSpawn();
        }
      }, delay),
    );

    return () => {
      spawnStabilizers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('vr-move', handleMove as EventListener);
      window.removeEventListener('vr-reset-position', handleReset as EventListener);
      window.removeEventListener('vr-camera', handleCamera as EventListener);
      window.removeEventListener('vr-view-transition', handleViewTransition as EventListener);
      window.removeEventListener('vr-teleport', handleTeleport as EventListener);
      window.removeEventListener('vr-rotate-360', handleRotate360 as EventListener);
      window.removeEventListener('vr-camera-look', handleCameraLook as EventListener);
      window.removeEventListener('vr-interact', handleInteract as EventListener);

      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, disabled, blockHighAltitudeTransitions]);

  useFrame((_, delta) => {
    if (disabled) return;

    const keys = getKeys();
    const forward = Boolean(keys.forward || keyStateRef.current.forward);
    const backward = Boolean(keys.backward || keyStateRef.current.backward);
    const left = Boolean(keys.left || keyStateRef.current.left);
    const right = Boolean(keys.right || keyStateRef.current.right);
    const run = Boolean(keys.run || keyStateRef.current.run);
    const jump = Boolean(keys.jump || keyStateRef.current.jump);

    const dt = Math.min(delta, 0.05);
    const now = Date.now();
    if (forward && !backward) {
      if (keyboardForwardStartedAt.current === null) keyboardForwardStartedAt.current = now;
    } else {
      keyboardForwardStartedAt.current = null;
    }

    if (eventDirection.current === 'forward') {
      if (eventForwardStartedAt.current === null) eventForwardStartedAt.current = now;
    } else {
      eventForwardStartedAt.current = null;
    }

    const keyboardAutoRun = Boolean(keyboardForwardStartedAt.current && now - keyboardForwardStartedAt.current > 450);
    const touchAutoRun = Boolean(eventHold.current && eventForwardStartedAt.current && now - eventForwardStartedAt.current > 450);
    const baseSpeed = run || keyboardAutoRun || touchAutoRun ? 9 : 5;
    const speed = baseSpeed * eventSpeed.current;

    direction.current.set(0, 0, 0);

    if (forward) direction.current.z -= 1;
    if (backward) direction.current.z += 1;
    if (left) direction.current.x -= 1;
    if (right) direction.current.x += 1;

    const hasActiveEventDirection = eventDirection.current && (eventHold.current || now <= eventExpiresAt.current);

    if (hasActiveEventDirection) {
      switch (eventDirection.current) {
        case 'forward':
          direction.current.z -= 1;
          break;
        case 'backward':
          direction.current.z += 1;
          break;
        case 'left':
          direction.current.x -= 1;
          break;
        case 'right':
          direction.current.x += 1;
          break;
        case 'stop':
          direction.current.set(0, 0, 0);
          eventDirection.current = null;
          eventHold.current = false;
          break;
      }
    } else if (eventDirection.current) {
      eventDirection.current = null;
      eventSpeed.current = 1;
      eventHold.current = false;
      eventExpiresAt.current = 0;
      eventForwardStartedAt.current = null;
    }

    direction.current.normalize();

    const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
    direction.current.applyEuler(euler);

    velocity.current.lerp(direction.current.multiplyScalar(speed), dt * 7);
    camera.position.add(velocity.current.clone().multiplyScalar(dt));

    if (isGroundLocked.current) {
      if (jump && camera.position.y <= 1.62) {
        verticalVelocity.current = 5.8;
      }

      verticalVelocity.current -= 12 * dt;
      camera.position.y += verticalVelocity.current * dt;

      if (camera.position.y <= 1.6) {
        camera.position.y = 1.6;
        verticalVelocity.current = 0;
      }
    }

    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.45, 1.45);
    camera.rotation.z = 0;
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

type CameraTelemetry = {
  heading: number;
  altitude: number;
  position: { x: number; y: number; z: number };
};

const CameraTelemetryTracker: React.FC<{ onTelemetry: (telemetry: CameraTelemetry) => void }> = ({ onTelemetry }) => {
  const { camera } = useThree();
  const frameRef = useRef(0);

  useFrame(() => {
    frameRef.current += 1;
    if (frameRef.current % 8 !== 0) return;

    const heading = ((THREE.MathUtils.radToDeg(camera.rotation.y) % 360) + 360) % 360;
    onTelemetry({
      heading,
      altitude: camera.position.y,
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
    });
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
  controlsUnlocked: boolean;
  blockHighAltitudeTransitions?: boolean;
  onSatelliteEntryComplete: () => void;
  showTerrain?: boolean;
  showCity?: boolean;
  showInteractives?: boolean;
}> = ({ engrams, ecnData, coherenceScore, integrityLevel, onEngramSelect, disabled, buildings, onBuildingClick, hasSatelliteEntryCompleted, controlsUnlocked, blockHighAltitudeTransitions = false, onSatelliteEntryComplete, showTerrain = true, showCity = true, showInteractives = true }) => {
  const [externalCameraLocked, setExternalCameraLocked] = useState(false);

  useEffect(() => {
    const onExternalCameraLock = (event: Event) => {
      setExternalCameraLocked(Boolean((event as CustomEvent).detail?.locked));
    };

    window.addEventListener('vr-external-camera-lock', onExternalCameraLock as EventListener);
    return () => {
      window.removeEventListener('vr-external-camera-lock', onExternalCameraLock as EventListener);
    };
  }, []);

  const useLegacyController = controlsUnlocked && !showInteractives && !externalCameraLocked;

  return (
    <>
      {/* Basic lighting - always present */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#a855f7" />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ec4899" />
      <directionalLight position={[50, 50, 25]} intensity={0.4} color="#ffffff" castShadow />
      
      {/* NOTE: ExpandedCityGrid provides the main ground planes (lush green terrain).
         The old MemoryPalace 300x300 floor + gridHelper have been removed to prevent
         z-fighting and duplicate ground rendering that was tanking FPS. */}
      
      {/* Memory Engrams - only when provided (gated by parent) */}
      {engrams.map((engram) => (
        <MemoryEngram 
          key={engram.id} 
          engram={engram} 
          onSelect={onEngramSelect}
        />
      ))}
      
      {/* Holo-Wall - only when ECN data provided */}
      {ecnData.length > 0 && (
        <HoloWall ecnData={ecnData} coherenceScore={coherenceScore} />
      )}
      
      {/* NOTE: ProceduralBuildings removed here - ExpandedCityGrid already renders
         all 32+ city buildings. Rendering both caused triple-city GPU overload (4 FPS). */}
      
      {/* VR Feature Integration - PROGRESSIVE: passes zone-aware visibility */}
      <VRFeatureIntegration 
        enableSatelliteEntry={false}
        showTerrain={showTerrain}
        showCity={showCity}
        showInteractives={showInteractives}
        showMetroSystem={showInteractives}
        showF1System={showInteractives}
        showNPCSystems={false}
        showAnimalSystems={false}
        showPOILabels={showInteractives}
        onFeatureEvent={(feature, action) => {
          if (feature === 'world' && action === 'entered') {
            onSatelliteEntryComplete();
          }
        }}
      />
      
      {/* Central pillar of consciousness - lightweight, always visible */}
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
      
      {/* Player controller unlocks via entry complete OR watchdog fallback to prevent gate deadlocks */}
      {useLegacyController && (
        <PlayerController disabled={disabled} blockHighAltitudeTransitions={blockHighAltitudeTransitions} />
      )}

      {/* Dedicated rotate handler for button/voice 360 commands */}
      {useLegacyController && <RotationController />}

      {/* UniversalCameraController removed here to prevent camera-controller conflicts with PlayerController */}
      
      {/* Hidden Items - only when interactives are loaded */}
      {showInteractives && controlsUnlocked && (
        <VRHiddenItemsManagerAuto 
          enabled={true}
          onItemDiscovered={(id) => console.log(`[VR OMEGA] Discovered: ${id}`)}
          onItemCollected={(id) => console.log(`[VR OMEGA] Collected: ${id}`)}
        />
      )}
      
      {/* OrbitControls removed: it was competing with PlayerController camera updates and freezing movement/voice-driven view changes after entry. */}
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
  const [showVRCatalog, setShowVRCatalog] = useState(false);
  const [showCyberCity, setShowCyberCity] = useState(false);
  const [showGaussianSplat, setShowGaussianSplat] = useState(false);
  const [is5xZoom, setIs5xZoom] = useState(false);
  
  // Satellite Entry state - controls camera entry animation
  const [hasSatelliteEntryCompleted, setHasSatelliteEntryCompleted] = useState(true);
  const [isNightMode, setIsNightMode] = useState(() => {
    const h = new Date().getHours();
    return h < 5 || h > 19;
  });
  const [isBootStabilizing, setIsBootStabilizing] = useState(true);
  const [interactiveSystemsLatched, setInteractiveSystemsLatched] = useState(false);

  // Keep entry completed state stable so world starts immediately in ground view.
  useEffect(() => {
    if (!isActive) {
      setHasSatelliteEntryCompleted(true);
      setIsBootStabilizing(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    setIsBootStabilizing(true);
    // Keep this short so world interaction does not appear frozen after load.
    const timer = window.setTimeout(() => setIsBootStabilizing(false), 4500);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  // Ensure camera reliably exits satellite mode even under low-FPS conditions
  useEffect(() => {
    if (!isActive || !hasSatelliteEntryCompleted) return;

    const timers = [0, 220, 900].map((delay) =>
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('vr-view-transition', { detail: { mode: 'ground' } }));
      }, delay)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isActive, hasSatelliteEntryCompleted]);
  
  // PROGRESSIVE LOADER - Prevents crash by staging content loading
  const vrLoader = useVRProgressiveLoader(isActive);

// Live clock mini-component (self-updating, avoids re-rendering parent)
const VRLiveClock: React.FC = () => {
  const [time, setTime] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-white text-[11px] font-mono font-bold tabular-nums">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </span>
  );
};

  // Universal VR Controller State
  const vrController = useVRUniversalController();
  const [cameraHeading, setCameraHeading] = useState(0);
  const [cameraAltitude, setCameraAltitude] = useState(100);
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 250, z: 0 });
  const telemetryRef = useRef<CameraTelemetry | null>(null);

  const handleCameraTelemetry = useCallback((telemetry: CameraTelemetry) => {
    const previous = telemetryRef.current;

    const headingDeltaThreshold = hasSatelliteEntryCompleted ? 2 : 8;
    const altitudeDeltaThreshold = hasSatelliteEntryCompleted ? 2.5 : 14;
    const horizontalDeltaThreshold = hasSatelliteEntryCompleted ? 40 : 120;
    const verticalDeltaThreshold = hasSatelliteEntryCompleted ? 8 : 24;

    if (!previous || Math.abs(previous.heading - telemetry.heading) >= headingDeltaThreshold) {
      setCameraHeading(telemetry.heading);
    }

    if (!previous || Math.abs(previous.altitude - telemetry.altitude) >= altitudeDeltaThreshold) {
      setCameraAltitude(telemetry.altitude);
    }

    const moved2D = previous
      ? Math.hypot(
          telemetry.position.x - previous.position.x,
          telemetry.position.z - previous.position.z,
        )
      : Number.POSITIVE_INFINITY;

    if (
      !previous ||
      moved2D >= horizontalDeltaThreshold ||
      Math.abs(telemetry.position.y - previous.position.y) >= verticalDeltaThreshold
    ) {
      setCameraPosition(telemetry.position);
    }

    telemetryRef.current = telemetry;
  }, [hasSatelliteEntryCompleted]);
  
  // Ready Player One Graphics Optimizer - now includes WebGL capability detection
  const { graphicsConfig, currentTier, isMobile, fps, setTier, webglCapabilities } = useGraphicsOptimizer();
  // Sky phase sync — dispatches sky-phase-change + vr-sun-hour-change events globally
  useSkyPhase();
  const promptCoverage = useMemo(() => buildVRPromptCoverage(), []);
  const pendingPromptCoverage = useMemo(
    () => promptCoverage.filter((item) => !item.handled),
    [promptCoverage]
  );

  const cityCoreDistance = useMemo(
    () => Math.hypot(cameraPosition.x, cameraPosition.z),
    [cameraPosition.x, cameraPosition.z],
  );
  // Keep city systems active across the full 1-mile footprint (corner distance ≈ 1131)
  const inCityActivationZone = cityCoreDistance <= 1300;
  // Keep crowd active across metro ring too (user-visible roads at the city edge)
  const inCrowdActivationZone = cityCoreDistance <= 1200;
  const isPerformanceCritical = fps > 0 && fps < 22;
  const maxDpr = isPerformanceCritical
    ? 1
    : isMobile
      ? 1.1
      : currentTier === 'ultra'
        ? 1.35
        : 1.15;

  // Latch interactives once ready so transient FPS drops don't unmount/remount the world.
  useEffect(() => {
    if (!isActive) {
      setInteractiveSystemsLatched(false);
      return;
    }

    if (
      vrLoader.showInteractives &&
      hasSatelliteEntryCompleted &&
      inCityActivationZone &&
      !isBootStabilizing
    ) {
      setInteractiveSystemsLatched(true);
    }
  }, [isActive, vrLoader.showInteractives, hasSatelliteEntryCompleted, inCityActivationZone, isBootStabilizing]);

  // Controls can unlock from normal entry completion or watchdog fallback.
  const controlsUnlocked = hasSatelliteEntryCompleted || (isActive && vrLoader.phase >= 2);

  // Do not mount city/interactives until satellite entry fully completes.
  const showCitySystems = vrLoader.showCity && hasSatelliteEntryCompleted && inCityActivationZone;
  const showInteractiveSystems =
    interactiveSystemsLatched &&
    inCityActivationZone &&
    !isBootStabilizing;
  // Keep crowd visible even under FPS pressure; performance tuning is handled inside the crowd system.
  const showCrowdSystems =
    showInteractiveSystems &&
    inCrowdActivationZone &&
    vrLoader.phase >= 4;
  const showCinematicEffects =
    vrLoader.showEffects &&
    hasSatelliteEntryCompleted &&
    inCityActivationZone &&
    !isPerformanceCritical &&
    !isBootStabilizing &&
    fps >= 28;
  
  // Pre-check WebGL support and show graceful fallback if not available
  const [webglError, setWebglError] = useState<string | null>(null);
  
  useEffect(() => {
    if (webglCapabilities && !webglCapabilities.canRender3D) {
      setWebglError(webglCapabilities.error || 'WebGL not supported on this device');
    } else {
      setWebglError(null);
    }
  }, [webglCapabilities]);

  // Enterprise Multiplayer Layer - only enable after phase 4 (interactives)
  const {
    players: multiplayerPlayers,
    playerCount,
    isConnected: isMultiplayerConnected,
    updateMyPosition,
    updateMyRotation,
    setDisplayName,
    setIsSpeaking,
    broadcastWorldEvent,
    myUserId,
  } = useMultiplayerPresence({ enabled: isActive && showInteractiveSystems });

  // Wire multiplayer position broadcasting from player controller events
  useEffect(() => {
    if (!isActive || !showInteractiveSystems) return;
    const onPlayerPos = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const position = Array.isArray(d.position) && d.position.length === 3
        ? d.position
        : [d.x ?? 0, d.y ?? 1.6, d.z ?? 0];

      updateMyPosition({ x: position[0], y: position[1], z: position[2] });
      updateMyRotation({ x: 0, y: typeof d.rotation === 'number' ? d.rotation : 0, z: 0 });
    };
    window.addEventListener('vr-player-position', onPlayerPos);
    return () => window.removeEventListener('vr-player-position', onPlayerPos);
  }, [isActive, showInteractiveSystems, updateMyPosition, updateMyRotation]);

  useEffect(() => {
    if (!isActive || !showInteractiveSystems) return;

    const source =
      (user?.user_metadata?.username as string | undefined) ||
      (user?.user_metadata?.full_name as string | undefined) ||
      user?.email?.split('@')[0] ||
      user?.id?.slice(0, 6) ||
      'player';

    const normalized = source.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'player';
    setDisplayName(`@${normalized}`);
  }, [isActive, setDisplayName, showInteractiveSystems, user]);

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

  // Auto-generate initial city only after entry unlock + phase 3 (prevents pre-entry load spikes)
  // NOTE: ExpandedCityGrid already renders 65+ buildings, so we skip generateCity() to avoid
  // triple-rendering (ExpandedCityGrid + ProceduralBuildings + ProceduralCyberCity).
  useEffect(() => {
    if (isActive && hasSatelliteEntryCompleted && !cityInitialized && vrLoader.phase >= 3) {
      setCityInitialized(true);
      console.log('[VR OMEGA] City initialized (ExpandedCityGrid provides all buildings)');
    }
  }, [isActive, hasSatelliteEntryCompleted, cityInitialized, vrLoader.phase]);

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
  const { isListening, startListening, stopListening } = useZoeVoiceCore();

  // VR Voice Guide - Deepgram aura-2-janus-en contextual narration
  const voiceGuide = useVRVoiceGuide({ isActive, hasSatelliteEntryCompleted });

  // Listen for proximity-based narration events from ProximityVoiceNarrator
  useEffect(() => {
    if (!isActive || !hasSatelliteEntryCompleted) return;

    const handleNarrate = (e: CustomEvent) => {
      const { type, ...data } = e.detail;
      switch (type) {
        case 'animal':
          voiceGuide.narrateAnimal(data.animalType, data.animalId, data.distance || 10);
          break;
        case 'building':
          voiceGuide.narrateBuilding(data.buildingType, data.buildingId);
          break;
        case 'npc':
          voiceGuide.narrateNPC(data.npcName, data.npcId, data.personality || 'friendly');
          break;
        case 'distance':
          voiceGuide.narrateDistance(data.landmarkName, data.distance);
          break;
        case 'zone':
          voiceGuide.announce(data.text);
          break;
        case 'metro_announcement':
          voiceGuide.announce(data.message || `Now arriving at ${data.stationName} station.`);
          break;
        case 'conversation':
          voiceGuide.narrateConversation(data.speakerName, data.topic || 'greeting');
          break;
      }
    };

    window.addEventListener('vr-voice-narrate', handleNarrate as EventListener);
    return () => window.removeEventListener('vr-voice-narrate', handleNarrate as EventListener);
  }, [isActive, hasSatelliteEntryCompleted, voiceGuide]);

  // Activate extended Zoe VR world command parser (dispatches vr-world-voice-action)
  useZoeVRWorldCommands();

  const setCameraPreset = useCallback((mode: 'satellite' | 'aerial' | 'ground' | 'first_person') => {
    window.dispatchEvent(new CustomEvent('vr-view-transition', { detail: { mode } }));
  }, []);

  const jumpToCityCore = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: {
        position: [0, 80, -120],
        lookAt: [0, 0, -220],
        lockGround: false,
      }
    }));
    toast.info('City Core', { description: 'Jumped to city zone. Use W/A/S/D to move.' });
  }, []);

  const jumpToMountainRange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: {
        position: [2460, 160, -1940],
        lookAt: [2500, 120, -2220],
        lockGround: false,
      }
    }));
    toast.info('Mountain Range', { description: 'Mountain corridor loaded. Use Summit View for panoramic city framing.' });
  }, []);

  const jumpToMountainSummit = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: {
        position: [2520, 320, -2240],
        lookAt: [240, 60, -260],
        lockGround: false,
      }
    }));
    toast.info('Summit View', { description: 'Panorama loaded: summit perspective over the full world.' });
  }, []);

  const toggleVoiceGuide = useCallback(() => {
    if (isListening) {
      stopListening();
      toast.info('Zoe Voice', { description: 'Voice guide paused' });
      return;
    }

    startListening();
    speakAsZoe('Voice guide online. Say: Zoe satellite view, Zoe mountain view, or Zoe guide me.');
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    setIsSpeaking(isListening);
  }, [isListening, setIsSpeaking]);

  const downloadVRCatalogPDF = useCallback(() => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 48;

    doc.setFontSize(16);
    doc.text('VR World Controls & Voice Catalog', 40, y);
    y += 24;

    doc.setFontSize(11);
    doc.text('Desktop / PC / Laptop', 40, y);
    y += 16;
    VR_CONTROL_CATALOG.desktop.forEach((item) => {
      doc.text(`• ${item}`, 48, y);
      y += 14;
    });

    y += 10;
    doc.text('Tablet / iPad', 40, y);
    y += 16;
    VR_CONTROL_CATALOG.tablet.forEach((item) => {
      doc.text(`• ${item}`, 48, y);
      y += 14;
    });

    y += 10;
    doc.text('Mobile', 40, y);
    y += 16;
    VR_CONTROL_CATALOG.mobile.forEach((item) => {
      doc.text(`• ${item}`, 48, y);
      y += 14;
    });

    y += 12;
    doc.text('Voice Commands (examples)', 40, y);
    y += 16;
    VR_VOICE_CATALOG.forEach((item) => {
      doc.text(`• ${item}`, 48, y);
      y += 14;
    });

    doc.save('vr-world-controls-catalog.pdf');
    toast.success('Catalog downloaded', { description: 'VR controls + voice commands PDF saved.' });
  }, []);

  useEffect(() => {
    if (!isActive || !hasSatelliteEntryCompleted) return;
    const key = 'vr_omega_guided_nav_seen';
    if (localStorage.getItem(key)) return;

    localStorage.setItem(key, 'true');
    toast.info('VR Navigation Tip', {
      description: 'Use Quick Nav: Satellite / Aerial / Mountains. Press H for controls.',
      duration: 5000,
    });
    speakAsZoe('Welcome to VR world. Use quick navigation to switch views or jump to mountains.');
  }, [isActive, hasSatelliteEntryCompleted]);

  // Start/End VR session for DHF tracking - defer until phase 2
  useEffect(() => {
    if (isActive && user && vrLoader.phase >= 2) {
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
  }, [isActive, user, vrLoader.phase]);

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
      const { action: rawAction, command, category } = event.detail;
      // Use centralized alias map + local overrides
      const actionAliases: Record<string, string> = {
        ...VR_ACTION_ALIASES,
        // Cross-hook normalization (useZoeVRWorldCommands ↔ useVRVoiceCommands)
        open_vr_world: 'open_vr',
        exit_vr_world: 'exit_vr',
      };

      const action = actionAliases[rawAction] || rawAction;
      console.log(`[VR OMEGA] Voice command received: ${action} (category: ${category})`);

      const pulseBikeControl = (control: 'throttle' | 'brake' | 'left' | 'right', holdMs = 900) => {
        window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: control, value: true, source: 'voice' } }));
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: control, value: false, source: 'voice' } }));
        }, holdMs);
      };
      
      // Handle VR-specific voice commands
      switch (action) {
        // Session + voice lifecycle commands
        case 'open_vr':
          toast.info('VR OMEGA', { description: 'You are already inside VR OMEGA world.' });
          break;
        case 'exit_vr':
          window.dispatchEvent(new CustomEvent('navigate-from-omega'));
          toast.info('VR OMEGA', { description: 'Exit request sent.' });
          break;
        case 'activate_voice':
          toggleVoiceGuide();
          break;
        case 'deactivate_voice':
          if (isListening) {
            stopListening();
          }
          break;

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
        case 'turn_left_45':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'left', degrees: 45 } }));
          break;
        case 'turn_right_45':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'right', degrees: 45 } }));
          break;
        case 'turn_around_180':
          window.dispatchEvent(new CustomEvent('vr-rotate-360', { detail: { direction: 'around', degrees: 180 } }));
          break;

        // Vehicle movement modes
        case 'drive':
        case 'drive_slow':
        case 'drive_medium':
        case 'drive_fast':
        case 'accelerate':
        case 'brake':
        case 'park':
          window.dispatchEvent(new CustomEvent('vr-vehicle', { detail: { action } }));
          toast.info('Vehicle Mode', { description: action.replace('_', ' ') });
          break;
        case 'mount_bike':
          window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: 'mount', force: false, source: 'voice' } }));
          toast.success('Bike', { description: 'Bike mounted.' });
          break;
        case 'dismount_bike':
          window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: 'dismount', value: true, source: 'voice' } }));
          toast.info('Bike', { description: 'Bike dismounted.' });
          break;
        case 'bike_throttle':
          pulseBikeControl('throttle', 1100);
          break;
        case 'bike_brake':
        case 'bike_stop':
          pulseBikeControl('brake', 700);
          break;
        case 'bike_turn_left':
          pulseBikeControl('left', 650);
          break;
        case 'bike_turn_right':
          pulseBikeControl('right', 650);
          break;
        case 'bike_volume_up':
          window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: 'volume_up', source: 'voice' } }));
          toast.info('Bike', { description: 'Increasing bike volume.' });
          break;
        case 'bike_volume_down':
          window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action: 'volume_down', source: 'voice' } }));
          toast.info('Bike', { description: 'Lowering bike volume.' });
          break;
        case 'spawn_car':
          window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'car' } }));
          toast.success('Vehicle', { description: 'Car spawned in current zone.' });
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
          window.dispatchEvent(new CustomEvent('vr-camera', { detail: { action } }));
          break;
        case 'zoom_5x':
          setIs5xZoom(true);
          window.dispatchEvent(new CustomEvent('vr-zoom-lens', { detail: { zoom: 5 } }));
          speakAsZoe('Five X zoom lens activated. Press Z or say normal zoom to disable.');
          toast.info('5X Zoom', { description: 'Telescope lens active' });
          break;
        case 'zoom_1x':
          setIs5xZoom(false);
          window.dispatchEvent(new CustomEvent('vr-zoom-lens', { detail: { zoom: 1 } }));
          speakAsZoe('Normal view restored.');
          toast.info('Normal Zoom', { description: 'Zoom reset to 1X' });
          break;
        case 'reset_view':
          window.dispatchEvent(new CustomEvent('vr-reset-position'));
          toast.success('View Reset', { description: 'Camera returned to origin' });
          break;
        case 'first_person':
        case 'first_person_view':
          window.dispatchEvent(new CustomEvent('vr-view-transition', {
            detail: { mode: 'first_person', duration: 1200, config: { height: 1.6, distance: 0, pitch: 0 } }
          }));
          toast.info('Camera Mode', { description: 'Switched to first person' });
          break;
        case 'third_person':
        case 'third_person_view':
          window.dispatchEvent(new CustomEvent('vr-view-transition', {
            detail: { mode: 'ground', duration: 1200, config: { height: 5, distance: 30, pitch: -Math.PI / 8 } }
          }));
          toast.info('Camera Mode', { description: 'Switched to third person' });
          break;
        case 'satellite_view':
          window.dispatchEvent(new CustomEvent('vr-view-transition', {
            detail: { mode: 'satellite', duration: 1200, config: { height: 500, distance: 500, pitch: -Math.PI / 3 } }
          }));
          toast.info('Camera Mode', { description: 'Switched to satellite view' });
          break;
        case 'aerial_view':
          window.dispatchEvent(new CustomEvent('vr-view-transition', {
            detail: { mode: 'aerial', duration: 1200, config: { height: 100, distance: 150, pitch: -Math.PI / 4 } }
          }));
          toast.info('Camera Mode', { description: 'Switched to aerial view' });
          break;
        case 'mountain_view':
        case 'mountain_top_view':
          setCameraPreset('aerial');
          setTimeout(() => jumpToMountainRange(), 200);
          speakAsZoe('Routing you to the mountain range. Use the Summit View button for full city panorama.');
          break;
        case 'mountain_summit_view':
          jumpToMountainSummit();
          speakAsZoe('You are now at summit altitude. You can see the city from left to right.');
          break;
        case 'city_center_view':
          setCameraPreset('aerial');
          setTimeout(() => jumpToCityCore(), 200);
          speakAsZoe('Taking you to city core.');
          break;
        case 'guide_vr_world':
          setCameraPreset('satellite');
          speakAsZoe('Quick guide: use W A S D to walk, drag to look, and use Quick Nav for Satellite, Mountains, and Summit. Say Zoe mountain summit view anytime.');
          toast.info('Zoe Guide', { description: 'Satellite overview activated with controls guidance.' });
          break;
        
        // ═══════════════════════════════════════════════════════════════════
        // "TAKE ME TO" POI NAVIGATION - teleport + announce
        // ═══════════════════════════════════════════════════════════════════
        case 'navigate_to_kfc':
        case 'navigate_to_mcdonalds':
        case 'navigate_to_starbucks':
        case 'navigate_to_cafe':
        case 'navigate_to_hospital':
        case 'navigate_to_hotel':
        case 'navigate_to_school':
        case 'navigate_to_church':
        case 'navigate_to_temple':
        case 'navigate_to_metro':
        case 'navigate_to_park':
        case 'navigate_to_stadium':
        case 'navigate_to_fire_station':
        case 'navigate_to_police':
        case 'navigate_to_tower':
        case 'navigate_to_fashion':
        case 'navigate_to_pet_shop':
        case 'navigate_to_laundry':
        case 'navigate_to_vegetable_market':
        case 'navigate_to_fruit_market': {
          const poi = POI_POSITIONS[action];
          if (poi) {
            window.dispatchEvent(new CustomEvent('vr-teleport', {
              detail: {
                position: poi.position,
                lookAt: [poi.position[0], poi.position[1] + 4, poi.position[2] - 20],
                lockGround: true,
              }
            }));
            const isMetro = action === 'navigate_to_metro';
            speakAsZoe(isMetro 
              ? `You have arrived at ${poi.name}. Stairs, escalator, and elevator are ahead. Say board train to get on.`
              : `You have arrived at ${poi.name}. Look around to explore.`);
            toast.success(poi.name, { description: `Arrived at ${poi.name}` });
          }
          break;
        }
        
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
        case 'toggle_cyber_city':
          setShowCyberCity(prev => !prev);
          toast.info('City View', { description: 'Cyber city layer toggled.' });
          break;

        // Fix & repair commands
        case 'fix_camera':
        case 'fix_car':
        case 'fix_house':
        case 'fix_object':
        case 'repair':
        case 'restore':
          void runDiagnostics();
          window.dispatchEvent(new CustomEvent('vr-repair', { detail: { action, command } }));
          toast.info('Repair', { description: `Running repair pipeline for ${action.replace('_', ' ')}` });
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
        
        // Building commands (generic dispatcher)
        case 'build_house':
        case 'build_building':
        case 'build_road':
        case 'build_bridge':
        case 'build_hospital':
        case 'build_school':
        case 'build_shop':
        case 'build_park':
        case 'build_industrial':
        case 'build_city':
        case 'build_city_full':
        case 'build_town':
        case 'build_fire_station':
        case 'build_police_station':
        case 'build_religious':
        case 'build_gym':
        case 'build_restaurant':
        case 'build_cultural':
        case 'build_stadium': {
          const buildTypeOverrides: Record<string, string> = {
            build_building: 'office',
            build_shop: 'shop',
            build_industrial: 'factory',
            build_bridge: 'road',
          };
          const type = buildTypeOverrides[action] || action.replace('build_', '');
          window.dispatchEvent(new CustomEvent('vr-build', { detail: { action, type } }));
          toast.success('Building', {
            description: action.startsWith('build_city')
              ? 'Generating city layout.'
              : `Constructing ${type.replace('_', ' ')}`
          });
          break;
        }

        case 'plant_tree':
        case 'create_forest':
          window.dispatchEvent(new CustomEvent('vr-spawn', {
            detail: { type: 'forest', count: action === 'create_forest' ? 20 : 4 }
          }));
          toast.success('Nature', { description: action === 'create_forest' ? 'Forest generated.' : 'Trees planted.' });
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

        // Search & discovery commands
        case 'search':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, query: command } }));
          toast.info('Search', { description: 'Searching the VR world...' });
          break;
        case 'find_users':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, type: 'users' } }));
          toast.info('Find Users', { description: 'Locating nearby users' });
          break;
        case 'find_malls':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, type: 'malls' } }));
          toast.info('Find Malls', { description: 'Searching for malls' });
          break;
        case 'find_brands':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, type: 'brands' } }));
          toast.info('Find Brands', { description: 'Searching for brand stores' });
          break;
        case 'find_products':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, type: 'products' } }));
          toast.info('Find Products', { description: 'Searching for products' });
          break;
        case 'find_store':
          window.dispatchEvent(new CustomEvent('vr-search', { detail: { action, type: 'store', query: command } }));
          toast.info('Find Store', { description: 'Searching for specific store' });
          break;
        case 'show_avatars':
          window.dispatchEvent(new CustomEvent('vr-highlight', { detail: { type: 'avatars' } }));
          toast.info('Avatars', { description: 'Highlighting all avatars in the world' });
          break;
        case 'show_buildings':
          window.dispatchEvent(new CustomEvent('vr-highlight', { detail: { type: 'buildings' } }));
          toast.info('Buildings', { description: 'Highlighting all buildings' });
          break;

        // Fly/teleport to dynamic location
        case 'fly_to_location':
        case 'teleport_to': {
          const destination = command?.replace(/^(?:zoe\s+)?(?:fly|go|navigate|teleport|warp)\s+(?:to\s+)?/i, '').trim();
          window.dispatchEvent(new CustomEvent('vr-teleport', {
            detail: { destination, action, command }
          }));
          speakAsZoe(`Navigating to ${destination || 'destination'}.`);
          toast.info('Navigation', { description: `Flying to ${destination || 'destination'}` });
          break;
        }
        
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
        case 'interact_avatar':
          toast.info('Avatar Interaction', { description: 'Move close to a hologram avatar and say: "wave" or "talk to avatar".' });
          speakAsZoe('To interact with avatars, move closer and use voice commands like wave or talk to avatar.');
          break;
        case 'wave':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'wave' } }));
          speakAsZoe('Waving hello to nearby avatars.');
          break;
        case 'dance':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'dance' } }));
          speakAsZoe('Time to dance!');
          toast.info('Dance', { description: 'Dance animation activated' });
          break;

        // ── F1 CIRCUIT COMMANDS ──
        case 'navigate_to_f1':
          window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { destination: 'f1_circuit', action, x: 1100, z: -500 } }));
          speakAsZoe('Taking you to the F1 Omega Circuit. Enjoy the race!');
          toast.info('F1 Circuit', { description: 'Navigating to F1 Omega Circuit' });
          break;
        case 'enter_f1_car':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'enter_f1_car' } }));
          speakAsZoe('Getting into the F1 car. Buckle up!');
          toast.info('F1 Car', { description: 'Entering F1 racing car' });
          break;
        case 'exit_f1_car':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'exit_f1_car' } }));
          speakAsZoe('Exiting the F1 car.');
          toast.info('F1 Car', { description: 'Exiting F1 racing car' });
          break;
        case 'start_f1_race':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'start_f1_race' } }));
          speakAsZoe('Lights out and away we go! The race has begun!');
          toast.info('Race Started!', { description: 'F1 race is underway' });
          break;
        case 'f1_pit_stop':
          window.dispatchEvent(new CustomEvent('vr-interact', { detail: { action: 'f1_pit_stop' } }));
          speakAsZoe('Pit stop initiated. Tire change and fuel top-up in progress.');
          toast.info('Pit Stop', { description: 'Pit crew servicing your car' });
          break;
        case 'f1_standings':
          speakAsZoe('Current standings: Car 1 Team Alpha in first, Car 2 Team Zenith in second, Car 5 Team Nova in third.');
          toast.info('Race Standings', { description: 'P1: Alpha, P2: Zenith, P3: Nova' });
          break;
        case 'f1_lap_time':
          speakAsZoe('Your last lap time was 1 minute 23 point 456 seconds.');
          toast.info('Lap Time', { description: '1:23.456' });
          break;
        case 'f1_car_status':
          speakAsZoe('Car status: Tire wear at 42 percent. Engine temperature nominal. Fuel level at 67 percent.');
          toast.info('Car Status', { description: 'Tires: 42%, Fuel: 67%' });
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
        case 'select_engram':
          if (engrams.length > 0) {
            setSelectedEngram(engrams[0]);
            toast.success('Memory Engram', { description: 'Focused first available memory engram.' });
          } else {
            toast.info('Memory Engram', { description: 'No memory engrams available yet.' });
          }
          break;
        case 'show_holowall':
          toast.info('Holo-Wall', { description: 'ECN timeline displayed' });
          break;
        case 'reset_world':
          setBuildings([]);
          setCityInitialized(false);
          setSelectedEngram(null);
          setShowCyberCity(true);
          setShowGaussianSplat(false);
          window.dispatchEvent(new CustomEvent('vr-reset-position'));
          setCameraPreset('ground');
          toast.success('World Reset', { description: 'World state reset complete.' });
          break;
        case 'show_zoe_orb':
          window.dispatchEvent(new CustomEvent('zoe-show-orb'));
          toast.info('Zoe Orb', { description: 'Zoe orb visibility refreshed.' });
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
        case 'fullscreen_toggle':
          if (!document.fullscreenElement) {
            void document.documentElement.requestFullscreen?.();
          } else {
            void document.exitFullscreen?.();
          }
          break;
        case 'show_bicameral':
        case 'show_timeline':
          toast.info('HUD', { description: 'HUD component command received.' });
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
        
        // ═══ METRO / TRAIN COMMANDS ═══
        // NOTE: navigate_to_metro is ALSO handled by POI_POSITIONS above (line ~1813)
        // which takes priority. The POI position points to the station entrance at ground level.
        case 'navigate_to_metro_entrance':
          window.dispatchEvent(new CustomEvent('vr-teleport', {
            detail: {
              position: METRO_ENTRANCE_POSITION,
              cinematic: true,
              lockGround: true,
            }
          }));
          speakAsZoe('Taking you to the metro station entrance. You can see stairs, escalator, and elevator ahead.');
          toast.success('Metro', { description: 'Navigating to metro entrance' });
          break;
        case 'board_train':
          window.dispatchEvent(new CustomEvent('vr-board-train', { detail: { trainIndex: 0 } }));
          speakAsZoe('Boarding the nearest metro train. Please stand clear of the doors.');
          toast.success('Metro', { description: 'Boarding nearest train' });
          break;
        case 'exit_train':
          window.dispatchEvent(new CustomEvent('vr-teleport', {
            detail: {
              position: METRO_PLATFORM_POSITION,
              lockGround: true,
            }
          }));
          speakAsZoe('Exiting the train onto the platform.');
          toast.success('Metro', { description: 'Exiting train at this station' });
          break;
        case 'next_station':
          toast.info('Metro', { description: 'Next station information announced' });
          window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
            detail: { type: 'metro_info', message: 'The next station is Park Avenue. Estimated arrival in 45 seconds.' }
          }));
          break;
        case 'metro_status':
          toast.info('Metro', { description: 'All 5 trains running on schedule across 14 stations' });
          break;
        case 'toggle_day_night':
          window.dispatchEvent(new CustomEvent('vr-toggle-day-night'));
          toast.success('Environment', { description: 'Day/Night cycle toggled' });
          break;
        case 'force_train_horn':
          window.dispatchEvent(new CustomEvent('vr-force-horn'));
          toast.success('Audio', { description: 'Metro horn sounded (5 seconds)' });
          break;
        case 'teleport_to_train_1':
          window.dispatchEvent(new CustomEvent('vr-board-train', { detail: { trainIndex: 0 } }));
          toast.success('Metro', { description: 'Teleported into Train #1' });
          break;
        case 'download_vr_audit': {
          generateVRWorldAuditPDF();
          toast.success('VR Audit', { description: 'Generating and downloading VR World audit PDF...' });
          break;
        }

        default:
          console.log(`[VR OMEGA] Unhandled voice command: ${action}`);
      }
    };

    const handleVRWorldVoiceAction = (event: CustomEvent) => {
      handleVRVoiceCommand(
        new CustomEvent('vr-voice-command', {
          detail: {
            ...event.detail,
            action: event.detail?.action,
          }
        }) as CustomEvent
      );
    };

    window.addEventListener('vr-voice-command', handleVRVoiceCommand as EventListener);
    window.addEventListener('vr-world-voice-action', handleVRWorldVoiceAction as EventListener);
    return () => {
      window.removeEventListener('vr-voice-command', handleVRVoiceCommand as EventListener);
      window.removeEventListener('vr-world-voice-action', handleVRWorldVoiceAction as EventListener);
    };
  }, [isActive, isDissonanceActive, integrityLevel, coherenceScore, engrams, onIntegrityRestore, runDiagnostics, isListening, stopListening, toggleVoiceGuide]);

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

  // Handle keyboard H key for help toggle + Z key for 5X zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && isActive) {
        setShowTutorial(prev => !prev);
      }
      if (e.code === 'KeyZ' && isActive) {
        setIs5xZoom(prev => {
          const newVal = !prev;
          window.dispatchEvent(new CustomEvent('vr-zoom-lens', { detail: { zoom: newVal ? 5 : 1 } }));
          speakAsZoe(newVal ? 'Five X zoom lens activated.' : 'Normal view restored.');
          return newVal;
        });
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
          camera={{ position: [0, 4.2, 0], fov: 75, near: 0.1, far: 12000, rotation: [0, Math.PI / 2, 0] }}
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
          dpr={[1, Math.min(graphicsConfig?.pixelRatio ?? 1, maxDpr)]}
          shadows="soft"
          fallback={<div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">Loading 3D...</div>}
          onCreated={({ gl }) => {
            // Configure renderer after creation for Safari compatibility
            try {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.2;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            } catch (e) {
              console.warn('[VR OMEGA] Renderer configuration failed:', e);
            }
          }}
        >
          {/* Background controlled by NightSkySystem + SeasonsSystem — no static override */}
          
          {/* Altitude Tracker - reports camera Y for progressive visibility */}
          <AltitudeTracker onAltitudeChange={vrLoader.updateAltitude} />
          <CameraTelemetryTracker onTelemetry={handleCameraTelemetry} />
          
          {/* SunLightCycle - realistic sun rotation based on real-world local time + geolocation weather */}
          <SunLightCycle
            shadowMapSize={graphicsConfig?.shadowMapSize ?? 2048}
            onNightChange={(night) => setIsNightMode(night)}
            onHourChange={(hour) => {
              window.dispatchEvent(new CustomEvent('vr-sun-hour-change', { detail: { hour } }));
            }}
          />

          {/* NIGHT SKY — moon, stars, shooting stars, dark background at night */}
          <NightSkySystem />

          {/* Phase 1: Basic skybox — NightSkySystem handles night stars, this is daytime only */}
          {vrLoader.showSkybox && !isNightMode && (
            <Stars radius={100} depth={50} count={500} factor={2} saturation={0} fade speed={1} />
          )}
          
          {/* Phase 5: Ready Player One Cinematic Post-Processing (heavy) */}
          {showCinematicEffects && (
            <CinematicPostProcessing config={graphicsConfig} enabled={!isMobile || currentTier !== 'low'} />
          )}
          
          {/* Phase 3: Procedural Cyber City - only when zoomed to city level */}
          {showCitySystems && showCyberCity && !isPerformanceCritical && currentTier !== 'low' && (
            <ProceduralCyberCity config={graphicsConfig} seed={42} cityRadius={150} />
          )}
          
          {/* Phase 5: Gaussian Splat Viewer - heavy, only at ground level */}
          {showCinematicEffects && showGaussianSplat && (
            <GaussianSplatViewer position={[0, 5, -20]} scale={2} />
          )}
          
          {/* MemoryPalace passes loader state for internal progressive rendering */}
          <MemoryPalace
            engrams={showCinematicEffects ? engrams : []}
            ecnData={showCinematicEffects ? ecnData : []}
            coherenceScore={coherenceScore}
            integrityLevel={integrityLevel}
            onEngramSelect={handleEngramSelect}
            disabled={isDissonanceActive}
            buildings={showCitySystems ? buildings : []}
            onBuildingClick={(building) => {
              toast.info(`${building.type.replace('_', ' ')}`, { 
                description: `Floors: ${building.floors} | Size: ${Math.round(building.width)}x${Math.round(building.depth)}` 
              });
            }}
            hasSatelliteEntryCompleted={hasSatelliteEntryCompleted}
            controlsUnlocked={controlsUnlocked}
            onSatelliteEntryComplete={() => setHasSatelliteEntryCompleted(true)}
            blockHighAltitudeTransitions={isBootStabilizing}
            showTerrain={vrLoader.showTerrain}
            showCity={showCitySystems}
            showInteractives={showInteractiveSystems}
          />
          
          {/* Phase 4: Enterprise Multiplayer Avatars - only at ground level */}
          {showInteractiveSystems && (
            <>
              <MultiplayerAvatars 
                players={multiplayerPlayers} 
                localUserId={myUserId} 
              />
              
              {/* Crowd Avatar System - automatically disabled under critical FPS */}
              {showCrowdSystems && <CrowdAvatarSystem />}
            </>
          )}
          
          {/* 5X Zoom Lens - always active inside Canvas */}
          <VRZoomLens />
          </Canvas>

          {/* VR Loading Progress Overlay */}
          {!vrLoader.isFullyLoaded && isActive && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-primary/30">
                <div className="text-primary text-xs font-mono mb-1">
                  LOADING VR WORLD... {Math.round(vrLoader.loadProgress)}%
                </div>
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${vrLoader.loadProgress}%` }}
                  />
                </div>
                <div className="text-muted-foreground text-[9px] mt-1">
                  Phase {vrLoader.phase}/5 • {vrLoader.altitudeLevel} view
                </div>
              </div>
            </div>
          )}

          {/* Control readiness status */}
          {isActive && !controlsUnlocked && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur-md rounded-full px-3 py-1 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono">
              Initializing controls...
            </div>
          )}

          {/* On-screen controls (touch + mouse) */}
          {isActive && controlsUnlocked && (
            <>
              <VirtualJoystick
                position="left"
                onMove={(x, y) => {
                  const dead = 0.2;
                  if (Math.abs(x) < dead && Math.abs(y) < dead) {
                    window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'stop' } }));
                    return;
                  }
                  if (y < -dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'forward', speed: 1, hold: true, source: 'touch' } }));
                  if (y > dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'backward', speed: 1, hold: true, source: 'touch' } }));
                  if (x < -dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'left', speed: 1, hold: true, source: 'touch' } }));
                  if (x > dead) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'right', speed: 1, hold: true, source: 'touch' } }));
                }}
              />

              <VRLookJoystick
                onLook={(dx, dy) => {
                  if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
                    window.dispatchEvent(new CustomEvent('vr-camera-look', { detail: { dx: dx * 0.03, dy: dy * 0.02 } }));
                  }
                }}
              />

              <RotationButtons />
              <LookButtons />

              <VRTouchControlBar
                is5xZoom={is5xZoom}
                onToggleZoom={() => {
                  const newZoom = !is5xZoom;
                  setIs5xZoom(newZoom);
                  window.dispatchEvent(new CustomEvent('vr-zoom-lens', { detail: { zoom: newZoom ? 5 : 1 } }));
                  speakAsZoe(newZoom ? 'Five X zoom lens activated.' : 'Normal view restored.');
                }}
                onSpawnCar={() => window.dispatchEvent(new CustomEvent('vr-spawn', { detail: { type: 'car' } }))}
              />
              <BikeOnScreenControls />
            </>
          )}

          {/* Desktop 5X Zoom Button (non-touch devices) */}
          {typeof window !== 'undefined' && !('ontouchstart' in window) && controlsUnlocked && (
            <button
              onClick={() => {
                const newZoom = !is5xZoom;
                setIs5xZoom(newZoom);
                window.dispatchEvent(new CustomEvent('vr-zoom-lens', { detail: { zoom: newZoom ? 5 : 1 } }));
                speakAsZoe(newZoom ? 'Five X zoom lens activated.' : 'Normal view restored.');
              }}
              className={cn(
                "absolute bottom-14 right-4 z-50 rounded-lg backdrop-blur-md border px-3 py-2 text-xs font-mono transition-colors",
                is5xZoom ? "bg-cyan-600/70 border-cyan-400/50 text-white" : "bg-black/60 border-white/20 text-white/80 hover:text-white"
              )}
            >
              {is5xZoom ? '1X Normal' : '5X Zoom'} 🔭 (Z)
            </button>
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
            {/* Compact Compass + Real-Time Clock */}
            <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
                {/* Clock */}
                <VRLiveClock />
                <span className="w-px h-3 bg-white/20" />
                {/* Compass */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/60">
                  <span className={cameraHeading >= 315 || cameraHeading < 45 ? 'text-cyan-400 font-bold' : ''}>N</span>
                  <span className={cameraHeading >= 45 && cameraHeading < 135 ? 'text-cyan-400 font-bold' : ''}>E</span>
                  <span className={cameraHeading >= 135 && cameraHeading < 225 ? 'text-cyan-400 font-bold' : ''}>S</span>
                  <span className={cameraHeading >= 225 && cameraHeading < 315 ? 'text-cyan-400 font-bold' : ''}>W</span>
                </div>
                <span className="text-white/40 text-[9px] font-mono">{Math.round(cameraHeading)}°</span>
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
                    {vrLoader.altitudeLevel}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Navigation Dock - discoverability for satellite/aerial/mountains */}
        {hasSatelliteEntryCompleted && (
          <div className="fixed right-4 top-28 z-50 bg-black/65 backdrop-blur-md rounded-xl border border-white/15 p-2 space-y-1.5 max-w-[180px]">
            <div className="text-[9px] uppercase tracking-wide text-cyan-300/80">Quick Nav</div>
            <button onClick={() => setCameraPreset('satellite')} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Satellite View</button>
            <button onClick={() => setCameraPreset('aerial')} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Aerial View</button>
            <button onClick={() => setCameraPreset('ground')} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Ground View</button>
            <button onClick={jumpToMountainRange} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Go to Mountains</button>
            <button onClick={jumpToMountainSummit} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Summit View</button>
            <button onClick={jumpToCityCore} className="block w-full text-left text-[10px] text-white/90 hover:text-cyan-300">Go to City Core</button>
            <button onClick={toggleVoiceGuide} className="block w-full text-left text-[10px] text-cyan-300 hover:text-cyan-200">
              {isListening ? 'Pause Zoe Voice' : 'Talk to Zoe'}
            </button>
            <button onClick={() => setShowVRCatalog(prev => !prev)} className="block w-full text-left text-[10px] text-foreground hover:text-primary">
              {showVRCatalog ? 'Hide VR Catalog' : 'Open VR Catalog'}
            </button>
            <div className="pt-1 border-t border-white/10"><VRManualDownloadButton variant="ghost" size="sm" className="w-full text-[10px] h-auto py-1 px-0 justify-start" /></div>
            <div className="pt-1 text-[9px] text-white/60 leading-snug border-t border-white/10">Say: Zoe satellite view, Zoe F1 circuit, Zoe mountain view.</div>
          </div>
        )}
        {showVRCatalog && hasSatelliteEntryCompleted && (
          <div className="fixed left-4 top-28 z-50 max-w-[320px] w-[min(92vw,320px)] rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <h3 className="text-xs font-semibold text-foreground">VR World Catalog</h3>
              <button
                onClick={() => setShowVRCatalog(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-3 space-y-3 text-[11px]">
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Desktop / PC / Laptop</h4>
                <ul className="space-y-1 text-foreground/90">
                  {VR_CONTROL_CATALOG.desktop.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Tablet / iPad</h4>
                <ul className="space-y-1 text-foreground/90">
                  {VR_CONTROL_CATALOG.tablet.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Mobile</h4>
                <ul className="space-y-1 text-foreground/90">
                  {VR_CONTROL_CATALOG.mobile.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Voice Commands</h4>
                <ul className="space-y-1 text-foreground/90">
                  {VR_VOICE_CATALOG.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="border-t border-border p-2">
              <button
                onClick={downloadVRCatalogPDF}
                className="w-full rounded-md bg-primary text-primary-foreground text-xs py-2 hover:opacity-90"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}

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

        {/* VR Debug Panel (Ctrl+Shift+D) */}
        <VRDebugPanel />

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
