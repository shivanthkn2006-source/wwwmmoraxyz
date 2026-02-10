// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GENESIS - Haptic Feedback System
// Part 7: The Launch (Final Polish)
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';

type HapticIntensity = 'light' | 'medium' | 'heavy';
type HapticPattern = 'tap' | 'typing' | 'success' | 'warning' | 'error' | 'notification';

interface HapticOptions {
  enabled?: boolean;
}

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  tap: [10],
  typing: [5], // Tiny vibration for Zoe typing
  success: [10, 50, 10],
  warning: [20, 30, 20, 30, 20],
  error: [50, 100, 50],
  notification: [15, 30, 15],
};

/**
 * Haptic Feedback Hook
 * Provides native-feeling vibrations for UI interactions
 * Uses Vibration API with graceful fallback
 */
export function useHapticFeedback(options: HapticOptions = {}) {
  const { enabled = true } = options;
  const lastVibrateRef = useRef<number>(0);
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Throttle vibrations to prevent spam (min 30ms between)
  const canVibrate = useCallback(() => {
    if (!isSupported || !enabled) return false;
    const now = Date.now();
    if (now - lastVibrateRef.current < 30) return false;
    lastVibrateRef.current = now;
    return true;
  }, [isSupported, enabled]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE VIBRATION
  // ═══════════════════════════════════════════════════════════════════════════
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!canVibrate()) return false;
    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [canVibrate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESET PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  const tap = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.tap);
  }, [vibrate]);

  const typing = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.typing);
  }, [vibrate]);

  const success = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.success);
  }, [vibrate]);

  const warning = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.warning);
  }, [vibrate]);

  const error = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.error);
  }, [vibrate]);

  const notification = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.notification);
  }, [vibrate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENSITY-BASED VIBRATION
  // ═══════════════════════════════════════════════════════════════════════════
  const impact = useCallback((intensity: HapticIntensity = 'medium') => {
    const patterns: Record<HapticIntensity, number> = {
      light: 5,
      medium: 15,
      heavy: 30,
    };
    vibrate(patterns[intensity]);
  }, [vibrate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE-SPECIFIC HAPTICS
  // ═══════════════════════════════════════════════════════════════════════════
  const zoeTyping = useCallback(() => {
    // Tiny haptic pulse for each Zoe "keystroke"
    vibrate([3]);
  }, [vibrate]);

  const zoeResponse = useCallback(() => {
    // Gentle pulse when Zoe finishes responding
    vibrate([8, 50, 5]);
  }, [vibrate]);

  const zoeAlert = useCallback(() => {
    // Attention-getting pattern for important messages
    vibrate([10, 30, 10, 30, 20]);
  }, [vibrate]);

  const zoeSingularity = useCallback(() => {
    // The Singularity pattern - ascending intensity
    vibrate([5, 30, 10, 30, 15, 30, 25]);
  }, [vibrate]);

  return {
    isSupported,
    vibrate,
    tap,
    typing,
    success,
    warning,
    error,
    notification,
    impact,
    // Zoe-specific
    zoeTyping,
    zoeResponse,
    zoeAlert,
    zoeSingularity,
  };
}
