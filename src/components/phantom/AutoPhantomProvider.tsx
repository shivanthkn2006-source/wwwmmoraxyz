// ═══════════════════════════════════════════════════════════════════════════════
// AUTO PHANTOM PROVIDER
// Wraps the app to provide automatic Ghost Mode activation
// for low-power devices, low battery, and memory pressure
// + SSM Phantom Brain initialization for zero-cost local AI
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect } from 'react';
import { useAutoPhantom } from '@/hooks/useAutoPhantom';
import { initializePhantomBrain } from '@/core/ssm/StateSpaceEngine';

interface AutoPhantomProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  enableSSM?: boolean; // Enable State Space Model (Phantom Brain)
}

const AutoPhantomProviderInner: React.FC<AutoPhantomProviderProps> = ({
  children,
  enabled = true,
  enableSSM = true,
}) => {
  // Initialize auto-phantom hook (does all the work)
  useAutoPhantom({
    batteryThreshold: 0.20,
    autoGhostForLowPower: enabled,
    showNotifications: true,
    activationDelay: 3000, // 3 seconds - gives user time to see and override
  });
  
  // Initialize SSM Phantom Brain for zero-cost local AI processing
  useEffect(() => {
    if (!enableSSM) return;
    
    const initSSM = async () => {
      try {
        const success = await initializePhantomBrain({
          batteryOptimized: true,
          selectivityThreshold: 0.3,
        });
        
        if (success) {
          console.log('[AutoPhantom] 🧠 SSM Phantom Brain initialized');
        }
      } catch (error) {
        console.warn('[AutoPhantom] SSM initialization skipped:', error);
      }
    };
    
    // Delay SSM initialization to not block initial render
    const timer = setTimeout(initSSM, 2000);
    return () => clearTimeout(timer);
  }, [enableSSM]);
  
  return <>{children}</>;
};

export const AutoPhantomProvider = memo(AutoPhantomProviderInner);

export default AutoPhantomProvider;
