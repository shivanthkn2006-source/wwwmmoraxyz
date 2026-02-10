/**
 * Advanced Gamepad Controller Hook
 * Supports: PS5/PS4, Xbox, Steering Wheels, Racing Pedals, Flight Sticks, HOTAS
 * Project Exodus: VR OMEGA WORLD - Enterprise Layer
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLER TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type ControllerType = 
  | 'ps5' 
  | 'ps4' 
  | 'xbox' 
  | 'xbox_elite' 
  | 'nintendo_pro' 
  | 'steering_wheel' 
  | 'racing_pedals' 
  | 'flight_stick' 
  | 'hotas' 
  | 'generic'
  | 'unknown';

export interface ControllerButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface ControllerAxis {
  x: number;
  y: number;
  deadzone: number;
}

export interface HapticFeedback {
  duration: number;
  strongMagnitude: number;
  weakMagnitude: number;
}

export interface ControllerState {
  connected: boolean;
  type: ControllerType;
  name: string;
  index: number;
  vendorId: string;
  productId: string;
  
  // Standard Buttons (PlayStation Layout)
  cross: ControllerButton;          // A on Xbox, B on Nintendo
  circle: ControllerButton;         // B on Xbox, A on Nintendo
  square: ControllerButton;         // X on Xbox, Y on Nintendo
  triangle: ControllerButton;       // Y on Xbox, X on Nintendo
  
  // Shoulder Buttons
  l1: ControllerButton;
  r1: ControllerButton;
  l2: ControllerButton;             // Left Trigger
  r2: ControllerButton;             // Right Trigger
  l3: ControllerButton;             // Left Stick Click
  r3: ControllerButton;             // Right Stick Click
  
  // Special Buttons
  share: ControllerButton;          // Create on PS5, View on Xbox
  options: ControllerButton;        // Menu on Xbox
  ps: ControllerButton;             // Xbox Button / Home
  touchpad: ControllerButton;       // PS5 Touchpad
  
  // D-Pad
  dpadUp: ControllerButton;
  dpadDown: ControllerButton;
  dpadLeft: ControllerButton;
  dpadRight: ControllerButton;
  
  // Analog Sticks
  leftStick: ControllerAxis;
  rightStick: ControllerAxis;
  
  // Triggers (Analog)
  leftTrigger: number;
  rightTrigger: number;
  
  // Steering Wheel Specific
  steeringAngle?: number;           // -1 to 1 (full left to full right)
  throttle?: number;                // 0 to 1
  brake?: number;                   // 0 to 1
  clutch?: number;                  // 0 to 1
  
  // Flight Stick Specific
  pitch?: number;                   // -1 to 1
  roll?: number;                    // -1 to 1
  yaw?: number;                     // -1 to 1
  throttleAxis?: number;            // 0 to 1
  
  // Gyroscope / Motion (PS5)
  motion?: {
    accelerometer: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
  };
  
  // Battery
  battery?: {
    level: number;
    charging: boolean;
  };
  
  // Haptics
  hapticActuators?: GamepadHapticActuator[];
}

export interface GamepadConfig {
  deadzone: number;
  sensitivity: number;
  invertY: boolean;
  invertX: boolean;
  vibrationEnabled: boolean;
  adaptiveTriggersEnabled: boolean;
  motionControlsEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLER DETECTION & MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const CONTROLLER_PATTERNS: Record<ControllerType, RegExp[]> = {
  ps5: [/dualsense/i, /ps5/i, /054c.*0ce6/i],
  ps4: [/dualshock/i, /ps4/i, /054c.*05c4/i, /054c.*09cc/i],
  xbox: [/xbox/i, /xinput/i, /045e.*02e0/i, /045e.*02fd/i],
  xbox_elite: [/xbox.*elite/i, /045e.*0b00/i],
  nintendo_pro: [/pro controller/i, /057e.*2009/i],
  steering_wheel: [/wheel/i, /g27/i, /g29/i, /g920/i, /t300/i, /fanatec/i, /thrustmaster/i],
  racing_pedals: [/pedal/i, /clubsport/i, /t-lcm/i],
  flight_stick: [/flight/i, /joystick/i, /hotas/i, /x52/i, /x56/i, /warthog/i],
  hotas: [/hotas/i, /throttle/i, /warthog/i],
  generic: [/gamepad/i, /controller/i],
  unknown: [],
};

const detectControllerType = (gamepad: Gamepad): ControllerType => {
  const id = gamepad.id.toLowerCase();
  
  for (const [type, patterns] of Object.entries(CONTROLLER_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(id))) {
      return type as ControllerType;
    }
  }
  
  // Fallback based on button/axis count
  if (gamepad.axes.length >= 6) return 'flight_stick';
  if (gamepad.buttons.length >= 17) return 'xbox';
  
  return 'generic';
};

const createButton = (button?: GamepadButton): ControllerButton => ({
  pressed: button?.pressed ?? false,
  touched: button?.touched ?? false,
  value: button?.value ?? 0,
});

const applyDeadzone = (value: number, deadzone: number): number => {
  if (Math.abs(value) < deadzone) return 0;
  const sign = value > 0 ? 1 : -1;
  return sign * ((Math.abs(value) - deadzone) / (1 - deadzone));
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: GamepadConfig = {
  deadzone: 0.1,
  sensitivity: 1.0,
  invertY: false,
  invertX: false,
  vibrationEnabled: true,
  adaptiveTriggersEnabled: true,
  motionControlsEnabled: true,
};

const createDefaultControllerState = (): ControllerState => ({
  connected: false,
  type: 'unknown',
  name: '',
  index: -1,
  vendorId: '',
  productId: '',
  cross: createButton(),
  circle: createButton(),
  square: createButton(),
  triangle: createButton(),
  l1: createButton(),
  r1: createButton(),
  l2: createButton(),
  r2: createButton(),
  l3: createButton(),
  r3: createButton(),
  share: createButton(),
  options: createButton(),
  ps: createButton(),
  touchpad: createButton(),
  dpadUp: createButton(),
  dpadDown: createButton(),
  dpadLeft: createButton(),
  dpadRight: createButton(),
  leftStick: { x: 0, y: 0, deadzone: 0.1 },
  rightStick: { x: 0, y: 0, deadzone: 0.1 },
  leftTrigger: 0,
  rightTrigger: 0,
});

export const useAdvancedGamepadController = (config: Partial<GamepadConfig> = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [controllers, setControllers] = useState<Map<number, ControllerState>>(new Map());
  const [primaryController, setPrimaryController] = useState<ControllerState | null>(null);
  const animationFrameRef = useRef<number>();
  const lastButtonStates = useRef<Map<number, boolean[]>>(new Map());
  
  // Event callbacks
  const onButtonPress = useRef<(button: string, controller: ControllerState) => void>();
  const onButtonRelease = useRef<(button: string, controller: ControllerState) => void>();
  const onAxisMove = useRef<(axis: string, value: number, controller: ControllerState) => void>();
  
  // Parse controller state from Gamepad API
  const parseGamepadState = useCallback((gamepad: Gamepad): ControllerState => {
    const type = detectControllerType(gamepad);
    const { deadzone, sensitivity, invertX, invertY } = fullConfig;
    
    // Extract vendor/product ID from gamepad.id
    const idMatch = gamepad.id.match(/vendor:\s*(\w+).*product:\s*(\w+)/i) || 
                    gamepad.id.match(/(\w{4})[:-](\w{4})/);
    
    const leftStickX = applyDeadzone(gamepad.axes[0] ?? 0, deadzone) * sensitivity * (invertX ? -1 : 1);
    const leftStickY = applyDeadzone(gamepad.axes[1] ?? 0, deadzone) * sensitivity * (invertY ? -1 : 1);
    const rightStickX = applyDeadzone(gamepad.axes[2] ?? 0, deadzone) * sensitivity * (invertX ? -1 : 1);
    const rightStickY = applyDeadzone(gamepad.axes[3] ?? 0, deadzone) * sensitivity * (invertY ? -1 : 1);
    
    const state: ControllerState = {
      connected: true,
      type,
      name: gamepad.id,
      index: gamepad.index,
      vendorId: idMatch?.[1] ?? '',
      productId: idMatch?.[2] ?? '',
      
      // Standard buttons (Standard Gamepad Mapping)
      cross: createButton(gamepad.buttons[0]),
      circle: createButton(gamepad.buttons[1]),
      square: createButton(gamepad.buttons[2]),
      triangle: createButton(gamepad.buttons[3]),
      
      l1: createButton(gamepad.buttons[4]),
      r1: createButton(gamepad.buttons[5]),
      l2: createButton(gamepad.buttons[6]),
      r2: createButton(gamepad.buttons[7]),
      l3: createButton(gamepad.buttons[10]),
      r3: createButton(gamepad.buttons[11]),
      
      share: createButton(gamepad.buttons[8]),
      options: createButton(gamepad.buttons[9]),
      ps: createButton(gamepad.buttons[16]),
      touchpad: createButton(gamepad.buttons[17]),
      
      dpadUp: createButton(gamepad.buttons[12]),
      dpadDown: createButton(gamepad.buttons[13]),
      dpadLeft: createButton(gamepad.buttons[14]),
      dpadRight: createButton(gamepad.buttons[15]),
      
      leftStick: { x: leftStickX, y: leftStickY, deadzone },
      rightStick: { x: rightStickX, y: rightStickY, deadzone },
      
      leftTrigger: gamepad.buttons[6]?.value ?? 0,
      rightTrigger: gamepad.buttons[7]?.value ?? 0,
      
      hapticActuators: gamepad.hapticActuators as GamepadHapticActuator[],
    };
    
    // Steering wheel specific mappings
    if (type === 'steering_wheel') {
      state.steeringAngle = gamepad.axes[0] ?? 0;
      state.throttle = ((gamepad.axes[2] ?? -1) + 1) / 2; // Convert -1 to 1 → 0 to 1
      state.brake = ((gamepad.axes[5] ?? -1) + 1) / 2;
      if (gamepad.axes.length > 6) {
        state.clutch = ((gamepad.axes[6] ?? -1) + 1) / 2;
      }
    }
    
    // Flight stick / HOTAS specific mappings
    if (type === 'flight_stick' || type === 'hotas') {
      state.pitch = gamepad.axes[1] ?? 0;
      state.roll = gamepad.axes[0] ?? 0;
      state.yaw = gamepad.axes[2] ?? gamepad.axes[5] ?? 0;
      state.throttleAxis = ((gamepad.axes[3] ?? -1) + 1) / 2;
    }
    
    return state;
  }, [fullConfig]);
  
  // Haptic feedback
  const triggerHaptic = useCallback(async (
    controllerIndex: number, 
    feedback: HapticFeedback
  ) => {
    if (!fullConfig.vibrationEnabled) return;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[controllerIndex];
    
    if (!gamepad) return;
    
    // Try vibrationActuator first (Chrome)
    if ('vibrationActuator' in gamepad && gamepad.vibrationActuator) {
      try {
        await (gamepad.vibrationActuator as any).playEffect('dual-rumble', {
          duration: feedback.duration,
          strongMagnitude: feedback.strongMagnitude,
          weakMagnitude: feedback.weakMagnitude,
        });
      } catch (e) {
        console.log('[Gamepad] Vibration not supported');
      }
    }
    
    // Fallback to hapticActuators
    if (gamepad.hapticActuators?.length) {
      try {
        await gamepad.hapticActuators[0].pulse(feedback.strongMagnitude, feedback.duration);
      } catch (e) {
        // Silently fail
      }
    }
  }, [fullConfig.vibrationEnabled]);
  
  // Quick haptic presets
  const hapticPresets = {
    light: () => triggerHaptic(primaryController?.index ?? 0, { duration: 50, strongMagnitude: 0.2, weakMagnitude: 0.1 }),
    medium: () => triggerHaptic(primaryController?.index ?? 0, { duration: 100, strongMagnitude: 0.5, weakMagnitude: 0.3 }),
    heavy: () => triggerHaptic(primaryController?.index ?? 0, { duration: 200, strongMagnitude: 1.0, weakMagnitude: 0.6 }),
    pulse: () => triggerHaptic(primaryController?.index ?? 0, { duration: 30, strongMagnitude: 0.8, weakMagnitude: 0.2 }),
    engineRumble: () => triggerHaptic(primaryController?.index ?? 0, { duration: 500, strongMagnitude: 0.3, weakMagnitude: 0.7 }),
    collision: () => triggerHaptic(primaryController?.index ?? 0, { duration: 150, strongMagnitude: 1.0, weakMagnitude: 1.0 }),
  };
  
  // Polling loop
  useEffect(() => {
    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      const newControllers = new Map<number, ControllerState>();
      let primary: ControllerState | null = null;
      
      for (const gamepad of gamepads) {
        if (!gamepad) continue;
        
        const state = parseGamepadState(gamepad);
        newControllers.set(gamepad.index, state);
        
        // First connected controller is primary
        if (!primary && state.connected) {
          primary = state;
        }
        
        // Check for button events
        const prevButtons = lastButtonStates.current.get(gamepad.index) ?? [];
        const buttonNames = [
          'cross', 'circle', 'square', 'triangle',
          'l1', 'r1', 'l2', 'r2', 'share', 'options',
          'l3', 'r3', 'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight',
          'ps', 'touchpad'
        ];
        
        gamepad.buttons.forEach((button, i) => {
          const wasPressed = prevButtons[i] ?? false;
          const isPressed = button.pressed;
          
          if (isPressed && !wasPressed && onButtonPress.current) {
            onButtonPress.current(buttonNames[i] ?? `button${i}`, state);
          }
          if (!isPressed && wasPressed && onButtonRelease.current) {
            onButtonRelease.current(buttonNames[i] ?? `button${i}`, state);
          }
        });
        
        lastButtonStates.current.set(gamepad.index, gamepad.buttons.map(b => b.pressed));
      }
      
      setControllers(newControllers);
      setPrimaryController(primary);
      
      animationFrameRef.current = requestAnimationFrame(pollGamepads);
    };
    
    // Controller connection events
    const handleConnect = (e: GamepadEvent) => {
      console.log(`[Gamepad] Connected: ${e.gamepad.id}`);
      hapticPresets.light();
    };
    
    const handleDisconnect = (e: GamepadEvent) => {
      console.log(`[Gamepad] Disconnected: ${e.gamepad.id}`);
    };
    
    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    
    animationFrameRef.current = requestAnimationFrame(pollGamepads);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [parseGamepadState]);
  
  // Register event handlers
  const registerButtonPress = useCallback((handler: (button: string, controller: ControllerState) => void) => {
    onButtonPress.current = handler;
  }, []);
  
  const registerButtonRelease = useCallback((handler: (button: string, controller: ControllerState) => void) => {
    onButtonRelease.current = handler;
  }, []);
  
  const registerAxisMove = useCallback((handler: (axis: string, value: number, controller: ControllerState) => void) => {
    onAxisMove.current = handler;
  }, []);
  
  return {
    controllers: Array.from(controllers.values()),
    primaryController,
    triggerHaptic,
    hapticPresets,
    registerButtonPress,
    registerButtonRelease,
    registerAxisMove,
    isConnected: controllers.size > 0,
    controllerCount: controllers.size,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const getControllerIcon = (type: ControllerType): string => {
  const icons: Record<ControllerType, string> = {
    ps5: '🎮',
    ps4: '🎮',
    xbox: '🎮',
    xbox_elite: '🎮',
    nintendo_pro: '🎮',
    steering_wheel: '🚗',
    racing_pedals: '🏎️',
    flight_stick: '✈️',
    hotas: '🛩️',
    generic: '🕹️',
    unknown: '❓',
  };
  return icons[type];
};

export const getControllerDisplayName = (type: ControllerType): string => {
  const names: Record<ControllerType, string> = {
    ps5: 'PlayStation 5 DualSense',
    ps4: 'PlayStation 4 DualShock',
    xbox: 'Xbox Controller',
    xbox_elite: 'Xbox Elite Controller',
    nintendo_pro: 'Nintendo Pro Controller',
    steering_wheel: 'Racing Wheel',
    racing_pedals: 'Racing Pedals',
    flight_stick: 'Flight Stick',
    hotas: 'HOTAS System',
    generic: 'Generic Gamepad',
    unknown: 'Unknown Controller',
  };
  return names[type];
};

export default useAdvancedGamepadController;
