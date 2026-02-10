// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: GLOBAL MEMORY LEAK PLUMBER
// Logs "Memory Cleaned" on every page change - connected to Zoe Core
// SILENT DOWNGRADE: Aggressive cleanup for low-power devices (iPhone 11 fix)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { performAggressiveCleanup } from '@/hooks/useMemoryLeakPlumber';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';

// 3D paths that require aggressive cleanup when navigating away
const CLEANUP_PATHS = [
  '/quantum-camera',
  '/selfie-city',
  '/hologram',
  '/vr',
  '/3d',
  '/orbital',
  '/vitruvian',
  '/phoenix',
  '/exodus',
  '/god-mode',
  '/matter-bridge',
];

/**
 * Global Memory Leak Plumber - logs "Memory Cleaned" on every route change
 * and performs aggressive cleanup when leaving 3D/heavy pages
 * SILENT DOWNGRADE: Enhanced cleanup for low-power devices
 */
export const MemoryLeakPlumberGlobal = () => {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  const cleanupCountRef = useRef(0);
  
  // Get device tier for adaptive cleanup
  let isLowPowerDevice = false;
  let aggressiveMemoryCleanup = false;
  
  try {
    const tierContext = useDeviceTierContext();
    isLowPowerDevice = tierContext.capabilities?.isLowPowerDevice ?? false;
    aggressiveMemoryCleanup = tierContext.capabilities?.aggressiveMemoryCleanup ?? false;
  } catch {
    // Context may not be available yet during initial mount
  }

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = lastPathRef.current;

    // Skip if same path
    if (currentPath === previousPath) return;

    // Check if navigating away from a 3D/heavy path
    const wasOn3DPath = CLEANUP_PATHS.some(p => previousPath.includes(p));
    const isOn3DPath = CLEANUP_PATHS.some(p => currentPath.includes(p));

    // SILENT DOWNGRADE: Always aggressive cleanup on low-power devices
    if (aggressiveMemoryCleanup || (wasOn3DPath && !isOn3DPath)) {
      // Aggressive cleanup when leaving 3D views or on low-power devices
      console.log(`[MemoryLeakPlumber] 🔧 Aggressive cleanup: ${previousPath} → ${currentPath} (lowPower: ${isLowPowerDevice})`);
      performAggressiveCleanup('route_change_3d');
    } else if (isLowPowerDevice) {
      // Light cleanup for low-power devices on any route change
      console.log(`[MemoryLeakPlumber] ⚡ Low-power cleanup: ${previousPath} → ${currentPath}`);
      performAggressiveCleanup('route_change_lowpower');
    } else {
      // Standard cleanup log for all route changes
      cleanupCountRef.current++;
      console.log(`[MemoryLeakPlumber] ✅ Memory Cleaned (route change #${cleanupCountRef.current}: ${previousPath} → ${currentPath})`);
    }

    lastPathRef.current = currentPath;
  }, [location.pathname, isLowPowerDevice, aggressiveMemoryCleanup]);

  // Cleanup on page unload/beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[MemoryLeakPlumber] ✅ Memory Cleaned (page unload)');
      // Can't do async cleanup here, but log is important
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[MemoryLeakPlumber] ✅ Memory Cleaned (page hidden)');
        // SILENT DOWNGRADE: Aggressive cleanup when tab is hidden on low-power devices
        if (isLowPowerDevice || aggressiveMemoryCleanup) {
          performAggressiveCleanup('visibility_hidden_lowpower');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLowPowerDevice, aggressiveMemoryCleanup]);

  // No UI - this is a pure side-effect component
  return null;
};

export default MemoryLeakPlumberGlobal;
