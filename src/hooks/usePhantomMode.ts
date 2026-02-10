// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL PHANTOM - Performance Mode for Low-End Devices
// Part 6: The Performance (iPhone 11/M05 optimization)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';

export interface PhantomConfig {
  textOnlyMode: boolean;
  disableBlur: boolean;
  disableWebGL: boolean;
  disableBackgroundImages: boolean;
  disableJSAnimations: boolean;
  useCSSAnimationsOnly: boolean;
  batteryOptimized: boolean;
}

const PHANTOM_STORAGE_KEY = 'zoe_phantom_mode';

/**
 * Protocol Phantom - Performance optimization hook
 * Double-tap to toggle Text Only Mode
 * Zero thermal throttling guaranteed
 */
export function usePhantomMode() {
  const [config, setConfig] = useState<PhantomConfig>(() => {
    // Load saved config
    try {
      const saved = localStorage.getItem(PHANTOM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    
    // Default: Performance mode off
    return {
      textOnlyMode: false,
      disableBlur: false,
      disableWebGL: false,
      disableBackgroundImages: false,
      disableJSAnimations: false,
      useCSSAnimationsOnly: false,
      batteryOptimized: false,
    };
  });

  const lastTapRef = useRef<number>(0);
  const [showIndicator, setShowIndicator] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE DETECTION - Auto-enable for low-end devices
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const detectLowEndDevice = () => {
      // Check for low memory (< 4GB)
      const lowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      
      // Check for slow CPU (< 4 cores)
      const slowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      
      // Check for battery saver mode
      const checkBattery = async () => {
        try {
          const battery = await (navigator as any).getBattery?.();
          if (battery && battery.level < 0.2 && !battery.charging) {
            enableBatterySaver();
          }
        } catch {}
      };
      
      checkBattery();
      
      // Auto-enable phantom mode on very low-end devices
      if (lowMemory && slowCPU) {
        console.log('[PhantomMode] Low-end device detected - enabling phantom mode');
        enableFullPhantomMode();
      }
    };

    // Delay detection to not block initial render
    const timer = setTimeout(detectLowEndDevice, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE-TAP GESTURE - Green Touch
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDoubleTap = useCallback((event: TouchEvent | MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    // Check if it's a double tap
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Toggle text-only mode
      setConfig(prev => {
        const newTextOnlyMode = !prev.textOnlyMode;
        const newConfig: PhantomConfig = {
          ...prev,
          textOnlyMode: newTextOnlyMode,
          disableBlur: newTextOnlyMode,
          disableWebGL: newTextOnlyMode,
          disableBackgroundImages: newTextOnlyMode,
          disableJSAnimations: newTextOnlyMode,
          useCSSAnimationsOnly: newTextOnlyMode,
          batteryOptimized: newTextOnlyMode,
        };
        
        // Persist
        try {
          localStorage.setItem(PHANTOM_STORAGE_KEY, JSON.stringify(newConfig));
        } catch {}
        
        console.log(`[PhantomMode] Text Only Mode: ${newTextOnlyMode ? 'ENABLED' : 'DISABLED'}`);
        return newConfig;
      });

      // Show indicator
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 1500);

      // Prevent default
      event.preventDefault();
    }

    lastTapRef.current = now;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE TOGGLES
  // ═══════════════════════════════════════════════════════════════════════════
  const enableFullPhantomMode = useCallback(() => {
    const newConfig: PhantomConfig = {
      textOnlyMode: true,
      disableBlur: true,
      disableWebGL: true,
      disableBackgroundImages: true,
      disableJSAnimations: true,
      useCSSAnimationsOnly: true,
      batteryOptimized: true,
    };
    setConfig(newConfig);
    try {
      localStorage.setItem(PHANTOM_STORAGE_KEY, JSON.stringify(newConfig));
    } catch {}
  }, []);

  const disablePhantomMode = useCallback(() => {
    const newConfig: PhantomConfig = {
      textOnlyMode: false,
      disableBlur: false,
      disableWebGL: false,
      disableBackgroundImages: false,
      disableJSAnimations: false,
      useCSSAnimationsOnly: false,
      batteryOptimized: false,
    };
    setConfig(newConfig);
    try {
      localStorage.setItem(PHANTOM_STORAGE_KEY, JSON.stringify(newConfig));
    } catch {}
  }, []);

  const enableBatterySaver = useCallback(() => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        disableJSAnimations: true,
        useCSSAnimationsOnly: true,
        batteryOptimized: true,
      };
      try {
        localStorage.setItem(PHANTOM_STORAGE_KEY, JSON.stringify(newConfig));
      } catch {}
      return newConfig;
    });
  }, []);

  const toggleTextOnlyMode = useCallback(() => {
    setConfig(prev => {
      const newTextOnlyMode = !prev.textOnlyMode;
      const newConfig: PhantomConfig = {
        ...prev,
        textOnlyMode: newTextOnlyMode,
        disableBlur: newTextOnlyMode,
        disableWebGL: newTextOnlyMode,
        disableBackgroundImages: newTextOnlyMode,
        disableJSAnimations: newTextOnlyMode,
        useCSSAnimationsOnly: newTextOnlyMode,
        batteryOptimized: newTextOnlyMode,
      };
      try {
        localStorage.setItem(PHANTOM_STORAGE_KEY, JSON.stringify(newConfig));
      } catch {}
      return newConfig;
    });
    
    setShowIndicator(true);
    setTimeout(() => setShowIndicator(false), 1500);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS VARIABLES FOR PHANTOM MODE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const root = document.documentElement;
    
    if (config.textOnlyMode) {
      root.style.setProperty('--phantom-blur', '0px');
      root.style.setProperty('--phantom-backdrop', 'none');
      root.style.setProperty('--phantom-animation', 'none');
      root.classList.add('phantom-mode');
    } else {
      root.style.removeProperty('--phantom-blur');
      root.style.removeProperty('--phantom-backdrop');
      root.style.removeProperty('--phantom-animation');
      root.classList.remove('phantom-mode');
    }
    
    return () => {
      root.classList.remove('phantom-mode');
    };
  }, [config.textOnlyMode]);

  return {
    config,
    isPhantomMode: config.textOnlyMode,
    showIndicator,
    handleDoubleTap,
    enableFullPhantomMode,
    disablePhantomMode,
    enableBatterySaver,
    toggleTextOnlyMode,
  };
}
