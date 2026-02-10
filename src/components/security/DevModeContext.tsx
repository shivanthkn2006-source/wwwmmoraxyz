// ═══════════════════════════════════════════════════════════════════════════════
// DEV MODE CONTEXT - Sovereign Developer Mode for Root Admins
// Allows admins to bypass security for development while keeping it active for others
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { checkRootAdminStatus, logSecurityEvent, SECURITY_CATEGORIES } from './securityConfig';

interface DevModeState {
  isDevMode: boolean;
  isAdmin: boolean;
  adminUsername: string | null;
  securityEnabled: boolean;
  simulateUserView: boolean;
}

interface DevModeContextType extends DevModeState {
  toggleDevMode: () => void;
  toggleSecurity: () => void;
  toggleSimulateUser: () => void;
  clearCache: () => void;
}

const DevModeContext = createContext<DevModeContextType | null>(null);

export const useDevMode = () => {
  const ctx = useContext(DevModeContext);
  if (!ctx) {
    return {
      isDevMode: false,
      isAdmin: false,
      adminUsername: null,
      securityEnabled: true,
      simulateUserView: false,
      toggleDevMode: () => {},
      toggleSecurity: () => {},
      toggleSimulateUser: () => {},
      clearCache: () => {},
    };
  }
  return ctx;
};

const STORAGE_KEY = 'zoe_dev_mode_state';

export const DevModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<DevModeState>({
    isDevMode: false,
    isAdmin: false,
    adminUsername: null,
    securityEnabled: true,
    simulateUserView: false,
  });

  // Check admin status on mount/user change
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setState(prev => ({ ...prev, isAdmin: false, adminUsername: null, isDevMode: false }));
        return;
      }

      const { isAdmin, username } = await checkRootAdminStatus(user.id);
      
      // Load saved state for admins
      let savedDevMode = false;
      let savedSecurityEnabled = true;
      if (isAdmin) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            savedDevMode = parsed.isDevMode ?? false;
            savedSecurityEnabled = parsed.securityEnabled ?? true;
          }
        } catch {}
      }

      setState(prev => ({
        ...prev,
        isAdmin,
        adminUsername: username,
        isDevMode: isAdmin ? savedDevMode : false,
        securityEnabled: isAdmin ? savedSecurityEnabled : true,
      }));

      if (isAdmin) {
        console.log('[DevMode] 👑 Admin detected:', username);
      }
    };

    checkAdmin();
  }, [user]);

  // Save state changes to localStorage
  useEffect(() => {
    if (state.isAdmin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isDevMode: state.isDevMode,
        securityEnabled: state.securityEnabled,
      }));
    }
  }, [state.isAdmin, state.isDevMode, state.securityEnabled]);

  const toggleDevMode = useCallback(() => {
    if (!state.isAdmin) return;
    setState(prev => {
      const newDevMode = !prev.isDevMode;
      console.log('[DevMode]', newDevMode ? '🔓 ENABLED' : '🔒 DISABLED');
      if (user) {
        logSecurityEvent(user.id, 'dev_mode_toggle', SECURITY_CATEGORIES.ACCESS, 
          `Dev mode ${newDevMode ? 'enabled' : 'disabled'} by ${state.adminUsername}`);
      }
      return { ...prev, isDevMode: newDevMode };
    });
  }, [state.isAdmin, state.adminUsername, user]);

  const toggleSecurity = useCallback(() => {
    if (!state.isAdmin) return;
    setState(prev => {
      const newSecurityEnabled = !prev.securityEnabled;
      console.log('[DevMode] Security:', newSecurityEnabled ? 'ON' : 'OFF');
      if (user) {
        logSecurityEvent(user.id, 'security_toggle', SECURITY_CATEGORIES.ACCESS,
          `Security ${newSecurityEnabled ? 'enabled' : 'disabled'} by ${state.adminUsername}`);
      }
      return { ...prev, securityEnabled: newSecurityEnabled };
    });
  }, [state.isAdmin, state.adminUsername, user]);

  const toggleSimulateUser = useCallback(() => {
    if (!state.isAdmin) return;
    setState(prev => ({ ...prev, simulateUserView: !prev.simulateUserView }));
  }, [state.isAdmin]);

  const clearCache = useCallback(() => {
    // Preserve critical unlock flags before clearing
    const unlockFlag = localStorage.getItem('zoe-infinity-unlocked');
    const unlockFlagSession = sessionStorage.getItem('zoe-infinity-unlocked');
    
    sessionStorage.clear();
    localStorage.removeItem(STORAGE_KEY);
    
    // Restore unlock flags
    if (unlockFlag) localStorage.setItem('zoe-infinity-unlocked', unlockFlag);
    if (unlockFlagSession) sessionStorage.setItem('zoe-infinity-unlocked', unlockFlagSession);
    
    window.location.reload();
  }, []);

  return (
    <DevModeContext.Provider value={{
      ...state,
      toggleDevMode,
      toggleSecurity,
      toggleSimulateUser,
      clearCache,
    }}>
      {children}
    </DevModeContext.Provider>
  );
};

export default DevModeProvider;
