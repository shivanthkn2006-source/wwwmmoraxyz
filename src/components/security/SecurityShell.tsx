// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY SHELL - Black Box Protocol Complete Integration
// Combines all security layers into a single wrapper component
// Integrates with Zoe DHF Core via centralized security config
// Includes Fortress Protocol: Watermark, ScreenBlackout, CameraSentinel
// NOW WITH: God Mode Sovereign (Constitutional Kernel, Zero-Click Defense, EMP)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useCallback } from 'react';
import { VoidShellProtection } from './VoidShellProtection';
import { ShadowBanProvider } from './ShadowBanProvider';
import { DevToolsTrapActivator } from './DevToolsTrapActivator';
import { SovereignCodeVault } from './SovereignCodeVault';
import { FortressWatermark } from './FortressWatermark';
import { ScreenBlackout } from './ScreenBlackout';
import { CameraSecuritySentinel } from './CameraSecuritySentinel';
import { GodModeSovereignProvider } from './GodModeSovereignProvider';
import { EMPLockdownOverlay } from './EMPLockdownOverlay';
import { useAuth } from '@/lib/auth';
import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';
import { 
  logSecurityEvent,
  SECURITY_EVENTS,
  SECURITY_CATEGORIES 
} from './securityConfig';

interface SecurityShellProps {
  children: React.ReactNode;
  enabled?: boolean;
  devToolsTrapEnabled?: boolean;
  voidShellEnabled?: boolean;
  fortressEnabled?: boolean;
  cameraEnabled?: boolean;
  requireCamera?: boolean;
  godModeSovereignEnabled?: boolean; // NEW: Enable Earth's Core security
}

export const SecurityShell: React.FC<SecurityShellProps> = ({
  children,
  enabled = true,
  devToolsTrapEnabled = true,
  voidShellEnabled = true,
  fortressEnabled = true,
  cameraEnabled = false, // Disabled by default - enable for high-security areas
  requireCamera = false,
  godModeSovereignEnabled = true, // NEW: Enable Earth's Core by default
}) => {
  const { user } = useAuth();
  
  // Activate session heartbeat for online tracking
  useSessionHeartbeat({ enabled: enabled && !!user });

  // Log security shell activation to DHF
  const logSecurityActivation = useCallback(async () => {
    if (!user || !enabled) return;

    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.SECURITY_SHELL_ACTIVATED,
      SECURITY_CATEGORIES.INITIALIZATION,
      'Black Box Protocol + Fortress Protocol activated',
      {
        void_shell_enabled: voidShellEnabled,
        devtools_trap_enabled: devToolsTrapEnabled,
        fortress_enabled: fortressEnabled,
        camera_enabled: cameraEnabled,
        god_mode_sovereign_enabled: godModeSovereignEnabled,
        platform: navigator.platform
      }
    );
    
    console.log('[SecurityShell] 🛡️ Black Box + Fortress + God Mode Sovereign ACTIVE');
  }, [user, enabled, voidShellEnabled, devToolsTrapEnabled, fortressEnabled, cameraEnabled, godModeSovereignEnabled]);

  useEffect(() => {
    if (enabled) {
      logSecurityActivation();
    }
  }, [enabled, logSecurityActivation]);

  // Handle camera security violation
  const handleCameraViolation = useCallback((type: string) => {
    console.error('[SecurityShell] Camera violation detected:', type);
    // Could trigger additional actions here like logout
  }, []);

  // If security is disabled, just render children
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <GodModeSovereignProvider enabled={godModeSovereignEnabled}>
      <ShadowBanProvider>
        <DevToolsTrapActivator enabled={devToolsTrapEnabled}>
          <VoidShellProtection enabled={voidShellEnabled}>
            <ScreenBlackout enabled={fortressEnabled}>
              {children}
              
              {/* EMP Lockdown Overlay - shows when EMP Protocol is active */}
              <EMPLockdownOverlay enabled={godModeSovereignEnabled} />
              
              {/* Fortress Watermark - visible forensic tracing */}
              {fortressEnabled && <FortressWatermark enabled={fortressEnabled} />}
              
              {/* Camera Security Sentinel - "Sauron's Eye" */}
              {cameraEnabled && (
                <CameraSecuritySentinel 
                  enabled={cameraEnabled}
                  requireCamera={requireCamera}
                  onViolation={handleCameraViolation}
                />
              )}
              
              {/* Sovereign Code Vault - activated via Konami Code */}
              <SovereignCodeVault />
            </ScreenBlackout>
          </VoidShellProtection>
        </DevToolsTrapActivator>
      </ShadowBanProvider>
    </GodModeSovereignProvider>
  );
};

export default SecurityShell;
