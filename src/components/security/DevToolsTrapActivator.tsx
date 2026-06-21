// ═══════════════════════════════════════════════════════════════════════════════
// DEVTOOLS TRAP ACTIVATOR - Black Box Protocol Layer 2 Activation
// Activates the DevTools trap hook and renders ScorchedEarth screen when breached
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useDevToolsTrap } from '@/hooks/useDevToolsTrap';
import { ScorchedEarthScreen } from './ScorchedEarthScreen';

interface DevToolsTrapActivatorProps {
  enabled?: boolean;
  children: React.ReactNode;
}

export const DevToolsTrapActivator: React.FC<DevToolsTrapActivatorProps> = ({
  enabled = true,
  children
}) => {
  const { isBreached, resetBreach } = useDevToolsTrap({ enabled });

  if (isBreached) {
    return (
      <ScorchedEarthScreen 
        onCountdownEnd={() => {
          // Clear local storage and reload, but preserve unlock flags
          try {
            const unlockFlag = localStorage.getItem('zoe-infinity-unlocked');
            localStorage.clear();
            sessionStorage.clear();
            // Restore unlock so user doesn't have to re-authenticate
            if (unlockFlag) localStorage.setItem('zoe-infinity-unlocked', unlockFlag);
          } catch (e) {
            console.error('[DevToolsTrap] Failed to clear storage:', e);
          }
          
          // Redirect to auth page after countdown
          setTimeout(() => {
            window.location.href = '/auth';
          }, 1000);
        }} 
      />
    );
  }

  return <>{children}</>;
};

export default DevToolsTrapActivator;
