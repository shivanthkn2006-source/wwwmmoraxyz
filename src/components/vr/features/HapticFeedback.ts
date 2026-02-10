// ═══════════════════════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK SYSTEM - Vibration API for Mobile/Gamepad
// Provides tactile feedback for VR interactions
// ═══════════════════════════════════════════════════════════════════════════════

// Haptic pattern types
export type HapticPattern = 
  | 'light'      // Quick subtle vibration
  | 'medium'     // Standard feedback
  | 'heavy'      // Strong feedback
  | 'success'    // Positive confirmation
  | 'error'      // Error/warning
  | 'selection'  // UI selection
  | 'impact'     // Physical impact
  | 'notification'; // Attention getter

// Vibration patterns in milliseconds [vibrate, pause, vibrate, ...]
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
  selection: 15,
  impact: [10, 20, 40],
  notification: [30, 100, 30, 100, 30],
};

// Check if vibration API is supported
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

// Check if Gamepad API with haptics is supported
export const isGamepadHapticSupported = (): boolean => {
  return 'getGamepads' in navigator;
};

// Trigger haptic feedback
export const triggerHaptic = (pattern: HapticPattern): boolean => {
  if (!isHapticSupported()) {
    console.log('[Haptic] Vibration API not supported');
    return false;
  }

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
    console.log(`[Haptic] Triggered: ${pattern}`);
    return true;
  } catch (error) {
    console.error('[Haptic] Failed to trigger:', error);
    return false;
  }
};

// Stop any ongoing vibration
export const stopHaptic = (): void => {
  if (isHapticSupported()) {
    navigator.vibrate(0);
  }
};

// Custom vibration pattern
export const triggerCustomHaptic = (pattern: number | number[]): boolean => {
  if (!isHapticSupported()) return false;

  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
};

// Gamepad haptic feedback (for VR controllers)
export const triggerGamepadHaptic = (
  gamepadIndex: number = 0,
  intensity: number = 0.5,
  duration: number = 100
): boolean => {
  if (!isGamepadHapticSupported()) return false;

  try {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[gamepadIndex];
    
    if (gamepad && 'vibrationActuator' in gamepad) {
      const actuator = (gamepad as any).vibrationActuator;
      if (actuator && actuator.playEffect) {
        actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: intensity * 0.5,
          strongMagnitude: intensity,
        });
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

// Haptic feedback hook for React components
export const useHapticFeedback = () => {
  const vibrate = (pattern: HapticPattern) => triggerHaptic(pattern);
  const vibrateCustom = (pattern: number | number[]) => triggerCustomHaptic(pattern);
  const vibrateGamepad = (intensity?: number, duration?: number) => 
    triggerGamepadHaptic(0, intensity, duration);
  const stop = () => stopHaptic();
  
  return {
    isSupported: isHapticSupported(),
    isGamepadSupported: isGamepadHapticSupported(),
    vibrate,
    vibrateCustom,
    vibrateGamepad,
    stop,
    patterns: Object.keys(HAPTIC_PATTERNS) as HapticPattern[],
  };
};

// Event-based haptic triggers for VR
export const setupHapticEventListeners = () => {
  // Movement haptics
  window.addEventListener('vr-move', () => triggerHaptic('light'));
  
  // Interaction haptics
  window.addEventListener('vr-interact', () => triggerHaptic('selection'));
  
  // Building haptics
  window.addEventListener('vr-build', () => triggerHaptic('success'));
  
  // Vehicle haptics
  window.addEventListener('vr-vehicle', (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.action === 'accelerate') {
      triggerHaptic('medium');
    } else if (detail?.action === 'brake') {
      triggerHaptic('impact');
    }
  });
  
  // Door haptics
  window.addEventListener('vr-door', () => triggerHaptic('selection'));
  
  // Environment change haptics
  window.addEventListener('vr-environment', () => triggerHaptic('notification'));
  
  console.log('[Haptic] Event listeners registered');
};

// Cleanup haptic listeners
export const cleanupHapticEventListeners = () => {
  window.removeEventListener('vr-move', () => {});
  window.removeEventListener('vr-interact', () => {});
  window.removeEventListener('vr-build', () => {});
  window.removeEventListener('vr-vehicle', () => {});
  window.removeEventListener('vr-door', () => {});
  window.removeEventListener('vr-environment', () => {});
};

export default {
  isSupported: isHapticSupported,
  trigger: triggerHaptic,
  stop: stopHaptic,
  custom: triggerCustomHaptic,
  gamepad: triggerGamepadHaptic,
  patterns: HAPTIC_PATTERNS,
};
