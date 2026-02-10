// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL PHANTOM - WAVE 3: AUTO-GHOST MODE
// Automatically triggers Ghost Mode for:
// - Low-power devices (iPhone 11, M05, older Android)
// - Low battery (<20%)
// - Memory pressure detected
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { usePhantomStore } from '@/stores/usePhantomStore';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { toast } from 'sonner';

interface AutoPhantomConfig {
  // Battery threshold (0-1) below which Ghost Mode activates
  batteryThreshold?: number;
  // Whether to auto-activate for low-power devices
  autoGhostForLowPower?: boolean;
  // Whether to show notifications
  showNotifications?: boolean;
  // Delay before activating (ms) - gives user time to override
  activationDelay?: number;
}

const DEFAULT_CONFIG: AutoPhantomConfig = {
  batteryThreshold: 0.20, // 20%
  autoGhostForLowPower: true,
  showNotifications: true,
  activationDelay: 2000, // 2 second delay
};

export const useAutoPhantom = (config: AutoPhantomConfig = {}) => {
  const hide = usePhantomStore(state => state.hide);
  const isVisible = usePhantomStore(state => state.isVisible);
  const manualOverride = usePhantomStore(state => state.manualOverride);
  
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoActivatedRef = useRef(false);
  const batteryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Merge config
  const activeConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Get device tier context safely
  let tierContext: ReturnType<typeof useDeviceTierContext> | null = null;
  try {
    tierContext = useDeviceTierContext();
  } catch {
    // Context not available yet
  }
  
  const isLowPowerDevice = tierContext?.capabilities?.isLowPowerDevice ?? false;
  const deviceTier = tierContext?.capabilities?.tier ?? 'B';
  
  // Auto-activate Ghost Mode
  const triggerAutoGhost = useCallback((reason: string) => {
    // Don't override if user manually set visible
    if (manualOverride && isVisible) {
      console.log('[AutoPhantom] Skipped - user manually set visible');
      return;
    }
    
    // Don't activate if already in ghost mode
    if (!isVisible) {
      console.log('[AutoPhantom] Already in Ghost Mode');
      return;
    }
    
    // Don't re-trigger if already auto-activated this session
    if (hasAutoActivatedRef.current) {
      return;
    }
    
    hasAutoActivatedRef.current = true;
    
    // Delay activation to allow user override
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
    }
    
    activationTimeoutRef.current = setTimeout(() => {
      hide();
      
      if (activeConfig.showNotifications) {
        toast.info('Ghost Mode Activated', {
          description: reason,
          duration: 4000,
          action: {
            label: 'Wake Up',
            onClick: () => {
              usePhantomStore.getState().show();
              hasAutoActivatedRef.current = false;
            },
          },
        });
      }
      
      console.log(`[AutoPhantom] 👻 Auto-activated: ${reason}`);
    }, activeConfig.activationDelay);
  }, [hide, isVisible, manualOverride, activeConfig]);
  
  // WAVE 3A: Check for low-power device on mount
  useEffect(() => {
    if (!activeConfig.autoGhostForLowPower) return;
    if (!tierContext?.capabilities) return;
    
    // Check if low-power device
    if (isLowPowerDevice || deviceTier === 'C') {
      console.log('[AutoPhantom] Low-power device detected:', tierContext.capabilities.deviceModel);
      triggerAutoGhost('Low-power device detected. Saving battery.');
    }
  }, [isLowPowerDevice, deviceTier, tierContext?.capabilities, activeConfig.autoGhostForLowPower, triggerAutoGhost]);
  
  // WAVE 3B: Battery monitoring
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    
    // Battery API check
    const checkBattery = async () => {
      try {
        // @ts-ignore - Battery API not in all TS types
        const battery = await navigator.getBattery?.();
        if (!battery) return;
        
        const handleBatteryChange = () => {
          const level = battery.level; // 0-1
          const charging = battery.charging;
          
          // Don't trigger if charging
          if (charging) {
            console.log('[AutoPhantom] Battery charging - skipping');
            return;
          }
          
          // Check against threshold
          if (level < activeConfig.batteryThreshold!) {
            console.log(`[AutoPhantom] Battery low: ${(level * 100).toFixed(0)}%`);
            triggerAutoGhost(`Low battery (${(level * 100).toFixed(0)}%). Entering power-saving mode.`);
          }
        };
        
        // Check immediately
        handleBatteryChange();
        
        // Listen for changes
        battery.addEventListener('levelchange', handleBatteryChange);
        battery.addEventListener('chargingchange', handleBatteryChange);
        
        // Also poll every 30 seconds for reliability
        batteryCheckIntervalRef.current = setInterval(handleBatteryChange, 30000);
        
        return () => {
          battery.removeEventListener('levelchange', handleBatteryChange);
          battery.removeEventListener('chargingchange', handleBatteryChange);
          if (batteryCheckIntervalRef.current) {
            clearInterval(batteryCheckIntervalRef.current);
          }
        };
      } catch (err) {
        console.debug('[AutoPhantom] Battery API not available');
      }
    };
    
    checkBattery();
    
    return () => {
      if (batteryCheckIntervalRef.current) {
        clearInterval(batteryCheckIntervalRef.current);
      }
    };
  }, [activeConfig.batteryThreshold, triggerAutoGhost]);
  
  // WAVE 3C: Memory pressure monitoring (Chrome only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMemoryPressure = () => {
      const performance = window.performance as any;
      const memory = performance?.memory;
      
      if (!memory) return;
      
      // If heap usage is over 80% of limit, trigger ghost mode
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (usageRatio > 0.8) {
        console.log(`[AutoPhantom] Memory pressure: ${(usageRatio * 100).toFixed(0)}%`);
        triggerAutoGhost('High memory usage detected. Freeing resources.');
      }
    };
    
    // Check every 60 seconds
    const interval = setInterval(checkMemoryPressure, 60000);
    
    // Initial check after 10 seconds
    const initialCheck = setTimeout(checkMemoryPressure, 10000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialCheck);
    };
  }, [triggerAutoGhost]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
      }
      if (batteryCheckIntervalRef.current) {
        clearInterval(batteryCheckIntervalRef.current);
      }
    };
  }, []);
  
  return {
    isAutoGhostEnabled: activeConfig.autoGhostForLowPower,
    isLowPowerDevice,
    deviceTier,
    hasAutoActivated: hasAutoActivatedRef.current,
    // Allow manual reset
    resetAutoActivation: () => {
      hasAutoActivatedRef.current = false;
    },
  };
};

export default useAutoPhantom;
