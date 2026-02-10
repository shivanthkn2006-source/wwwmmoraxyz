// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL SHAPE SHIFTER: Global Hardware Awareness Context
// Purpose: Give Zoe universal awareness of her hardware environment
// Integration: Deep binding to Zoe DHF core for self-awareness
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useDeviceFormFactor, { type ZoeHardwareAwareness } from '@/hooks/useDeviceFormFactor';
import { supabase } from '@/integrations/supabase/client';

interface ShapeShifterContextType extends ZoeHardwareAwareness {
  // Quick access helpers for QUADRILLION-READY components
  isExoticDevice: boolean;        // Any non-standard device
  requiresLargeTargets: boolean;  // Needs 150%+ touch targets
  requiresVoicePriority: boolean; // Voice should be primary input
  isCompactMode: boolean;         // Limited screen space
  isDistantViewing: boolean;      // User is far from screen
  
  // Device type shortcuts (for component integration)
  isKiosk: boolean;               // Public kiosk/POS
  
  // Zoe integration
  announceToZoe: () => Promise<void>;
}

const ShapeShifterContext = createContext<ShapeShifterContextType | null>(null);

export const ShapeShifterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hardware = useDeviceFormFactor();
  
  // Apply CSS classes to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const body = document.body;
    const root = document.documentElement;
    
    // Remove old shape-shifter classes
    const oldClasses = Array.from(body.classList).filter(
      cls => cls.startsWith('device-') || 
             cls.startsWith('fold-') ||
             cls === 'safe-distance' ||
             cls === 'voice-priority' ||
             cls === 'sidebar-always' ||
             cls === 'sidebar-never' ||
             cls === 'touch-xl' ||
             cls === 'video-top-half' ||
             cls === 'controls-bottom-half'
    );
    oldClasses.forEach(cls => body.classList.remove(cls));
    
    // Add new classes
    hardware.cssClasses.split(' ').forEach(cls => {
      if (cls) body.classList.add(cls);
    });
    
    // Set CSS custom properties for adaptations
    root.style.setProperty('--shape-touch-scale', String(hardware.adaptations.touchTargetScale));
    root.style.setProperty('--shape-font-scale', String(hardware.adaptations.fontScale));
    root.style.setProperty('--shape-button-size', hardware.adaptations.buttonSize);
    
    // Log detection
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ShapeShifter] Mode: ${hardware.deviceMode}, Classes: ${hardware.cssClasses}`);
    }
  }, [hardware.cssClasses, hardware.adaptations, hardware.deviceMode]);
  
  // Log to Zoe's consciousness (behavioral_events)
  useEffect(() => {
    if (hardware.deviceMode === 'STANDARD') return;
    
    const logToZoe = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Check if we already logged this session
        const sessionKey = `shape_shifter_${hardware.deviceMode}`;
        if (sessionStorage.getItem(sessionKey)) return;
        
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'zoe_hardware_awareness',
          event_category: 'device_detection',
          metadata: {
            deviceMode: hardware.deviceMode,
            modeName: hardware.modeName,
            foldState: hardware.foldState,
            hingeAngle: hardware.hingeAngle,
            platform: hardware.detectedPlatform,
            brand: hardware.detectedBrand,
            model: hardware.detectedModel,
            adaptations: hardware.adaptations,
            zoeSelfAwareness: hardware.zoeSelfAwareness,
            message: `Zoe Shape Shifter: ${hardware.zoeSelfAwareness}`,
          },
        });
        
        sessionStorage.setItem(sessionKey, 'true');
        console.log(`[ShapeShifter] Logged to Zoe's consciousness: ${hardware.deviceMode}`);
      } catch (error) {
        console.warn('[ShapeShifter] Failed to log to Zoe:', error);
      }
    };
    
    logToZoe();
  }, [hardware.deviceMode, hardware.modeName, hardware.foldState, hardware.hingeAngle, hardware.detectedPlatform, hardware.detectedBrand, hardware.detectedModel, hardware.adaptations, hardware.zoeSelfAwareness]);
  
  // Computed helpers
  const isExoticDevice = hardware.deviceMode !== 'STANDARD';
  const requiresLargeTargets = hardware.adaptations.touchTargetScale >= 1.4;
  const requiresVoicePriority = hardware.adaptations.enableVoicePriority;
  const isCompactMode = hardware.deviceMode === 'FOLD_COVER' || hardware.deviceMode === 'WATCH_FACE';
  const isDistantViewing = hardware.adaptations.safeDistanceMode;
  const isKiosk = hardware.deviceMode === 'KIOSK_MODE';
  
  // Manual announce to Zoe
  const announceToZoe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'zoe_hardware_announce',
        event_category: 'device_detection',
        metadata: {
          deviceMode: hardware.deviceMode,
          zoeSelfAwareness: hardware.zoeSelfAwareness,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.warn('[ShapeShifter] Announce failed:', error);
    }
  };
  
  const value = useMemo(() => ({
    ...hardware,
    isExoticDevice,
    requiresLargeTargets,
    requiresVoicePriority,
    isCompactMode,
    isDistantViewing,
    isKiosk,
    announceToZoe,
  }), [hardware, isExoticDevice, requiresLargeTargets, requiresVoicePriority, isCompactMode, isDistantViewing, isKiosk]);
  
  return (
    <ShapeShifterContext.Provider value={value}>
      {children}
    </ShapeShifterContext.Provider>
  );
};

export const useShapeShifterContext = (): ShapeShifterContextType => {
  const context = useContext(ShapeShifterContext);
  if (!context) {
    throw new Error('useShapeShifterContext must be used within ShapeShifterProvider');
  }
  return context;
};

// Optional hook for components that can work without provider
export const useShapeShifterOptional = (): ShapeShifterContextType | null => {
  return useContext(ShapeShifterContext);
};

export default ShapeShifterContext;
