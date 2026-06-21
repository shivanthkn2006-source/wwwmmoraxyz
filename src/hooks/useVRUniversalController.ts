// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL VR CONTROLLER - Full Hardware Support
// PS4/PS5, Quest/Meta, Apple Vision Pro, Xbox, Generic Gamepads
// Satellite Bird's-Eye View with Airplane-Style Controls
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Controller types
export type ControllerType = 
  | 'keyboard'
  | 'mouse'
  | 'touch'
  | 'ps4'
  | 'ps5'
  | 'xbox'
  | 'quest'
  | 'quest_pro'
  | 'meta_quest_3'
  | 'vision_pro'
  | 'vive'
  | 'pico'
  | 'generic_gamepad';

// View modes
export type ViewMode = 'satellite' | 'aerial' | 'ground' | 'first_person';

// Camera state
export interface CameraState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  zoom: number;
  viewMode: ViewMode;
  isTransitioning: boolean;
}

// Controller mapping for different devices
interface ControllerMapping {
  moveForward: number | string;
  moveBackward: number | string;
  moveLeft: number | string;
  moveRight: number | string;
  ascend: number | string;
  descend: number | string;
  rotateLeft: number | string;
  rotateRight: number | string;
  zoomIn: number | string;
  zoomOut: number | string;
  toggleView: number | string;
  interact: number | string;
  menu: number | string;
}

// Gamepad button/axis mappings for different controllers
const CONTROLLER_MAPPINGS: Record<string, ControllerMapping> = {
  ps4: {
    moveForward: 'axis-1-negative', // Left stick up
    moveBackward: 'axis-1-positive', // Left stick down
    moveLeft: 'axis-0-negative', // Left stick left
    moveRight: 'axis-0-positive', // Left stick right
    ascend: 7, // R2
    descend: 6, // L2
    rotateLeft: 'axis-2-negative', // Right stick left
    rotateRight: 'axis-2-positive', // Right stick right
    zoomIn: 12, // D-pad up
    zoomOut: 13, // D-pad down
    toggleView: 10, // Options
    interact: 0, // X
    menu: 9, // Share
  },
  ps5: {
    moveForward: 'axis-1-negative',
    moveBackward: 'axis-1-positive',
    moveLeft: 'axis-0-negative',
    moveRight: 'axis-0-positive',
    ascend: 7, // R2
    descend: 6, // L2
    rotateLeft: 'axis-2-negative',
    rotateRight: 'axis-2-positive',
    zoomIn: 12,
    zoomOut: 13,
    toggleView: 9, // Create
    interact: 0, // X
    menu: 8, // Options
  },
  xbox: {
    moveForward: 'axis-1-negative',
    moveBackward: 'axis-1-positive',
    moveLeft: 'axis-0-negative',
    moveRight: 'axis-0-positive',
    ascend: 7, // RT
    descend: 6, // LT
    rotateLeft: 'axis-2-negative',
    rotateRight: 'axis-2-positive',
    zoomIn: 12,
    zoomOut: 13,
    toggleView: 8, // View
    interact: 0, // A
    menu: 9, // Menu
  },
  quest: {
    moveForward: 'axis-1-negative',
    moveBackward: 'axis-1-positive',
    moveLeft: 'axis-0-negative',
    moveRight: 'axis-0-positive',
    ascend: 'grip-right',
    descend: 'grip-left',
    rotateLeft: 'axis-2-negative',
    rotateRight: 'axis-2-positive',
    zoomIn: 'trigger-right',
    zoomOut: 'trigger-left',
    toggleView: 'thumbstick-press-right',
    interact: 'trigger-right',
    menu: 'menu-left',
  },
  vision_pro: {
    // Apple Vision Pro uses gaze + pinch primarily
    moveForward: 'gaze-forward',
    moveBackward: 'gaze-backward',
    moveLeft: 'gaze-left',
    moveRight: 'gaze-right',
    ascend: 'pinch-up',
    descend: 'pinch-down',
    rotateLeft: 'wrist-left',
    rotateRight: 'wrist-right',
    zoomIn: 'pinch-zoom-in',
    zoomOut: 'pinch-zoom-out',
    toggleView: 'double-tap',
    interact: 'pinch',
    menu: 'crown-press',
  },
};

// Zoom configuration
const ZOOM_CONFIG = {
  min: 0.05,
  max: 5,
  default: 1,
  step: 0.1,
  smoothness: 0.1,
};

// View mode configurations
const VIEW_MODE_CONFIG: Record<ViewMode, { height: number; distance: number; pitch: number }> = {
  satellite: { height: 500, distance: 500, pitch: -Math.PI / 3 },
  aerial: { height: 100, distance: 150, pitch: -Math.PI / 4 },
  ground: { height: 5, distance: 30, pitch: -Math.PI / 8 },
  first_person: { height: 1.6, distance: 0, pitch: 0 },
};

// Detect connected controller type
const detectControllerType = (gamepad: Gamepad): ControllerType => {
  const id = gamepad.id.toLowerCase();
  
  if (id.includes('dualsense') || id.includes('054c:0ce6')) return 'ps5';
  if (id.includes('dualshock') || id.includes('054c:09cc') || id.includes('054c:05c4')) return 'ps4';
  if (id.includes('xbox') || id.includes('045e')) return 'xbox';
  if (id.includes('oculus') || id.includes('quest')) {
    if (id.includes('quest 3') || id.includes('quest3')) return 'meta_quest_3';
    if (id.includes('pro')) return 'quest_pro';
    return 'quest';
  }
  if (id.includes('vive')) return 'vive';
  if (id.includes('pico')) return 'pico';
  
  return 'generic_gamepad';
};

// Main hook for universal VR controller
export const useVRUniversalController = () => {
  const [connectedControllers, setConnectedControllers] = useState<ControllerType[]>(['keyboard', 'mouse']);
  const [activeController, setActiveController] = useState<ControllerType>('keyboard');
  const [viewMode, setViewMode] = useState<ViewMode>('satellite');
  const [zoom, setZoom] = useState(ZOOM_CONFIG.default);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const gamepadsRef = useRef<Map<number, Gamepad>>(new Map());
  const lastInputRef = useRef<number>(0);

  // Gamepad connection handlers
  useEffect(() => {
    const handleConnect = (e: GamepadEvent) => {
      const type = detectControllerType(e.gamepad);
      gamepadsRef.current.set(e.gamepad.index, e.gamepad);
      setConnectedControllers(prev => [...new Set([...prev, type])]);
      setActiveController(type);
      console.log(`[VR Controller] Connected: ${type} (${e.gamepad.id})`);
    };

    const handleDisconnect = (e: GamepadEvent) => {
      gamepadsRef.current.delete(e.gamepad.index);
      const type = detectControllerType(e.gamepad);
      setConnectedControllers(prev => prev.filter(c => c !== type));
      if (activeController === type) {
        setActiveController('keyboard');
      }
      console.log(`[VR Controller] Disconnected: ${type}`);
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (gp) {
        const type = detectControllerType(gp);
        gamepadsRef.current.set(gp.index, gp);
        setConnectedControllers(prev => [...new Set([...prev, type])]);
      }
    }

    // Touch detection
    if ('ontouchstart' in window) {
      setConnectedControllers(prev => [...new Set([...prev, 'touch' as ControllerType])]);
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [activeController]);

  // Poll gamepad state
  const pollGamepads = useCallback(() => {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (gp) {
        gamepadsRef.current.set(gp.index, gp);
      }
    }
    return gamepadsRef.current;
  }, []);

  // Get current input state from all sources
  const getInputState = useCallback(() => {
    const state = {
      move: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0 },
      zoom: 0,
      buttons: {
        interact: false,
        menu: false,
        toggleView: false,
      },
    };

    const gamepads = pollGamepads();
    
    for (const [, gp] of gamepads) {
      if (!gp) continue;
      
      const deadzone = 0.15;
      
      // Left stick - movement
      if (Math.abs(gp.axes[0]) > deadzone) state.move.x = gp.axes[0];
      if (Math.abs(gp.axes[1]) > deadzone) state.move.z = -gp.axes[1];
      
      // Right stick - rotation
      if (gp.axes.length >= 4) {
        if (Math.abs(gp.axes[2]) > deadzone) state.rotate.y = gp.axes[2];
        if (Math.abs(gp.axes[3]) > deadzone) state.rotate.x = gp.axes[3];
      }
      
      // Triggers - ascend/descend
      if (gp.buttons[7]?.value > 0.1) state.move.y = gp.buttons[7].value; // R2/RT
      if (gp.buttons[6]?.value > 0.1) state.move.y = -gp.buttons[6].value; // L2/LT
      
      // D-pad - zoom
      if (gp.buttons[12]?.pressed) state.zoom = 1; // Up
      if (gp.buttons[13]?.pressed) state.zoom = -1; // Down
      
      // Action buttons
      if (gp.buttons[0]?.pressed) state.buttons.interact = true;
      if (gp.buttons[9]?.pressed) state.buttons.menu = true;
      if (gp.buttons[10]?.pressed) state.buttons.toggleView = true;
    }

    return state;
  }, [pollGamepads]);

  // Transition between view modes
  const transitionToView = useCallback((mode: ViewMode, duration = 2000) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setViewMode(mode);
    
    window.dispatchEvent(new CustomEvent('vr-view-transition', {
      detail: { mode, duration, config: VIEW_MODE_CONFIG[mode] }
    }));
    
    setTimeout(() => setIsTransitioning(false), duration);
  }, [isTransitioning]);

  // Cycle through view modes
  const cycleViewMode = useCallback(() => {
    const modes: ViewMode[] = ['satellite', 'aerial', 'ground', 'first_person'];
    const currentIndex = modes.indexOf(viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    transitionToView(nextMode);
  }, [viewMode, transitionToView]);

  // Zoom controls
  const adjustZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, prev + delta * ZOOM_CONFIG.step)));
  }, []);

  // Airplane-style descent
  const descend = useCallback((speed = 1) => {
    window.dispatchEvent(new CustomEvent('vr-altitude-change', {
      detail: { direction: 'down', speed, style: 'airplane' }
    }));
  }, []);

  // Airplane-style ascent
  const ascend = useCallback((speed = 1) => {
    window.dispatchEvent(new CustomEvent('vr-altitude-change', {
      detail: { direction: 'up', speed, style: 'airplane' }
    }));
  }, []);

  return {
    connectedControllers,
    activeController,
    viewMode,
    zoom,
    isTransitioning,
    getInputState,
    transitionToView,
    cycleViewMode,
    adjustZoom,
    descend,
    ascend,
    setViewMode,
    ZOOM_CONFIG,
    VIEW_MODE_CONFIG,
  };
};

// Camera controller component for R3F
export const UniversalCameraController: React.FC<{
  enabled?: boolean;
  defaultView?: ViewMode;
  onViewChange?: (mode: ViewMode) => void;
}> = ({ enabled = true, defaultView = 'satellite', onViewChange }) => {
  const { camera } = useThree();
  const controllerState = useVRUniversalController();
  
  const targetPosition = useRef(new THREE.Vector3(0, 500, 500));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentZoom = useRef(1);
  const orbitAngle = useRef(0);
  const pitchAngle = useRef(-Math.PI / 3);
  
  // Initialize camera position
  useEffect(() => {
    if (enabled && defaultView === 'satellite') {
      camera.position.set(0, 500, 500);
      camera.lookAt(0, 0, 0);
    }
  }, [enabled, defaultView, camera]);

  // Handle view transitions
  useEffect(() => {
    const handleTransition = (e: CustomEvent) => {
      const { config, duration } = e.detail;
      
      // Calculate new target position based on view config
      const distance = config.distance * currentZoom.current;
      targetPosition.current.set(
        Math.sin(orbitAngle.current) * distance,
        config.height,
        Math.cos(orbitAngle.current) * distance
      );
      pitchAngle.current = config.pitch;
      
      onViewChange?.(e.detail.mode);
    };

    window.addEventListener('vr-view-transition', handleTransition as EventListener);
    return () => window.removeEventListener('vr-view-transition', handleTransition as EventListener);
  }, [onViewChange]);

  // Handle altitude changes (airplane style)
  useEffect(() => {
    const handleAltitude = (e: CustomEvent) => {
      const { direction, speed, style } = e.detail;
      const delta = direction === 'up' ? speed * 5 : -speed * 5;
      
      if (style === 'airplane') {
        // Airplane-style: tilt camera during ascent/descent
        const tiltAmount = direction === 'up' ? -0.1 : 0.1;
        pitchAngle.current = Math.max(-Math.PI / 2, Math.min(0, pitchAngle.current + tiltAmount));
      }
      
      targetPosition.current.y = Math.max(5, Math.min(1000, targetPosition.current.y + delta));
    };

    window.addEventListener('vr-altitude-change', handleAltitude as EventListener);
    return () => window.removeEventListener('vr-altitude-change', handleAltitude as EventListener);
  }, []);

  useFrame((_, delta) => {
    if (!enabled) return;

    const input = controllerState.getInputState();
    const speed = 50 * delta;
    const rotSpeed = 1.5 * delta;

    // Handle rotation (360° orbit)
    if (Math.abs(input.rotate.y) > 0.01) {
      orbitAngle.current += input.rotate.y * rotSpeed;
    }

    // Handle pitch adjustment
    if (Math.abs(input.rotate.x) > 0.01) {
      pitchAngle.current = Math.max(-Math.PI / 2, Math.min(-0.1, pitchAngle.current + input.rotate.x * rotSpeed * 0.5));
    }

    // Handle zoom
    if (Math.abs(input.zoom) > 0.01) {
      currentZoom.current = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, currentZoom.current + input.zoom * delta * 0.5));
    }

    // Handle movement in bird's-eye view
    const viewConfig = VIEW_MODE_CONFIG[controllerState.viewMode];
    const baseDistance = viewConfig.distance || 100;
    const distance = baseDistance / currentZoom.current;

    // Update target position based on orbit angle and zoom
    const height = targetPosition.current.y;
    targetPosition.current.x = Math.sin(orbitAngle.current) * distance;
    targetPosition.current.z = Math.cos(orbitAngle.current) * distance;
    targetPosition.current.y = height;

    // Handle altitude changes (ascend/descend)
    if (Math.abs(input.move.y) > 0.01) {
      targetPosition.current.y = Math.max(5, Math.min(1000, targetPosition.current.y + input.move.y * speed * 2));
    }

    // Handle forward/backward movement (move look-at point)
    if (Math.abs(input.move.z) > 0.01) {
      targetLookAt.current.z += input.move.z * speed * 0.5;
    }
    if (Math.abs(input.move.x) > 0.01) {
      targetLookAt.current.x += input.move.x * speed * 0.5;
    }

    // Smooth camera interpolation
    camera.position.lerp(targetPosition.current, 0.05);
    
    // Calculate look-at with pitch
    const lookAtOffset = new THREE.Vector3(0, Math.sin(pitchAngle.current) * 50, Math.cos(pitchAngle.current) * 50);
    const finalLookAt = targetLookAt.current.clone().add(lookAtOffset);
    camera.lookAt(finalLookAt);

    // Handle button presses
    if (input.buttons.toggleView) {
      controllerState.cycleViewMode();
    }
  });

  return null;
};

export default useVRUniversalController;
