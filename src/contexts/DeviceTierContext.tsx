// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE TIER CONTEXT - Global Adaptive Performance State
// Provides tier capabilities to entire app without recalculation
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useDeviceTier, { type DeviceTier, type TierCapabilities } from '@/hooks/useDeviceTier';
import { supabase } from '@/integrations/supabase/client';

interface DeviceTierContextType {
  tier: DeviceTier;
  capabilities: TierCapabilities | null;
  tierClasses: string;
  isDetecting: boolean;
  setTierOverride: (tier: DeviceTier) => void;
  
  // Quick access
  isLiteMode: boolean;
  isCompact: boolean;
  enableBlur: boolean;
  enableParticles: boolean;
  particleCount: number;
  enable3DAnimations: boolean;
  enableGlassmorphism: boolean;
  maxFPS: number;
  
  // SILENT DOWNGRADE: Quick access helpers
  isLowPowerDevice: boolean;
  useMapbox2D: boolean;
  disablePostProcessing: boolean;
  aggressiveMemoryCleanup: boolean;
}

const DeviceTierContext = createContext<DeviceTierContextType | null>(null);

export const DeviceTierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceTier = useDeviceTier();
  
  // Apply tier classes to document root
  useEffect(() => {
    if (deviceTier.tierClasses) {
      // Remove old tier classes
      document.documentElement.classList.remove(
        'tier-c', 'tier-b', 'tier-a', 'tier-s',
        'lite-mode', 'compact-mode', 'no-blur', 'no-glass',
        'reduced-motion', 'is-mobile', 'is-ios', 'is-safari'
      );
      
      // Add new tier classes
      deviceTier.tierClasses.split(' ').forEach(cls => {
        if (cls) document.documentElement.classList.add(cls);
      });
    }
  }, [deviceTier.tierClasses]);
  
  // Log to Universal Truth Ledger when tier is detected
  useEffect(() => {
    if (!deviceTier.isDetecting && deviceTier.capabilities) {
      const logTierDetection = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          // Check if we already logged this session
          const sessionKey = `tier_logged_${deviceTier.tier}`;
          if (sessionStorage.getItem(sessionKey)) return;
          
          // Log to behavioral_events as a system event
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'system_tier_detected',
            event_category: 'performance',
            metadata: {
              tier: deviceTier.tier,
              tierName: deviceTier.capabilities?.tierName,
              gpuScore: deviceTier.capabilities?.gpuScore,
              deviceModel: deviceTier.capabilities?.deviceModel,
              screenWidth: deviceTier.capabilities?.screenWidth,
              screenHeight: deviceTier.capabilities?.screenHeight,
              pixelRatio: deviceTier.capabilities?.pixelRatio,
              isHighRefreshRate: deviceTier.capabilities?.isHighRefreshRate,
              liteMode: deviceTier.isLiteMode,
              message: `System Optimized for Tier ${deviceTier.tier} (${deviceTier.capabilities?.tierName}). Adaptive Protocol Active.`,
            },
          });
          
          sessionStorage.setItem(sessionKey, 'true');
          console.log(`[DeviceTier] Logged to Universal Truth Ledger: Tier ${deviceTier.tier}`);
        } catch (error) {
          console.warn('[DeviceTier] Failed to log tier detection:', error);
        }
      };
      
      logTierDetection();
    }
  }, [deviceTier.isDetecting, deviceTier.tier, deviceTier.capabilities]);
  
  const value = useMemo(() => deviceTier, [deviceTier]);
  
  return (
    <DeviceTierContext.Provider value={value}>
      {children}
    </DeviceTierContext.Provider>
  );
};

export const useDeviceTierContext = (): DeviceTierContextType => {
  const context = useContext(DeviceTierContext);
  if (!context) {
    throw new Error('useDeviceTierContext must be used within DeviceTierProvider');
  }
  return context;
};

export default DeviceTierContext;
