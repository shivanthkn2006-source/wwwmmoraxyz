// ═══════════════════════════════════════════════════════════════════════════════
// USE ICEBERG PROTOCOL - React hook for Protocol Iceberg integration
// Provides easy access to Tier 6 feature visibility and shadow mode controls
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { isRootAdmin } from '@/components/security/securityConfig';
import {
  checkTier6Access,
  isShadowModeActive,
  activateShadowMode,
  deactivateShadowMode,
  getAccessLog,
  getIcebergStatus,
  isTier6Feature,
  isShadowRoute,
  TIER_6_FEATURES,
  type Tier6Feature,
} from '@/core/security/ProtocolIceberg';

interface IcebergState {
  isAdmin: boolean;
  username: string | null;
  shadowModeActive: boolean;
  loading: boolean;
}

export const useIcebergProtocol = () => {
  const { user } = useAuth();
  const [state, setState] = useState<IcebergState>({
    isAdmin: false,
    username: null,
    shadowModeActive: isShadowModeActive(),
    loading: true,
  });

  // Fetch username and check admin status
  useEffect(() => {
    const initialize = async () => {
      if (!user?.id) {
        setState(prev => ({ ...prev, loading: false, isAdmin: false }));
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      const username = data?.username || null;
      const isAdmin = isRootAdmin(username);

      setState({
        isAdmin,
        username,
        shadowModeActive: isShadowModeActive(),
        loading: false,
      });
    };

    initialize();
  }, [user?.id]);

  // Check if current user can access a Tier 6 feature
  const canAccessFeature = useCallback((feature: Tier6Feature): boolean => {
    return checkTier6Access(state.username, feature, true) !== null;
  }, [state.username]);

  // Toggle shadow mode (admin only)
  const toggleShadowMode = useCallback(() => {
    if (!state.isAdmin) {
      console.warn('[ICEBERG] Non-admin attempted to toggle shadow mode');
      return false;
    }

    if (state.shadowModeActive) {
      const success = deactivateShadowMode(state.username);
      if (success) {
        setState(prev => ({ ...prev, shadowModeActive: false }));
      }
      return success;
    } else {
      activateShadowMode();
      setState(prev => ({ ...prev, shadowModeActive: true }));
      return true;
    }
  }, [state.isAdmin, state.username, state.shadowModeActive]);

  // Get access logs (admin only)
  const getSecurityLogs = useCallback(() => {
    return getAccessLog(state.username);
  }, [state.username]);

  // Check if a route should be hidden
  const shouldHideRoute = useCallback((path: string): boolean => {
    if (state.isAdmin && !state.shadowModeActive) {
      return false;
    }
    return isShadowRoute(path);
  }, [state.isAdmin, state.shadowModeActive]);

  return {
    // State
    ...state,
    
    // Feature access
    canAccessFeature,
    shouldHideRoute,
    isTier6Feature,
    
    // Shadow mode controls (admin only)
    toggleShadowMode,
    
    // Security
    getSecurityLogs,
    getStatus: getIcebergStatus,
    
    // Constants
    tier6Features: TIER_6_FEATURES,
  };
};

export default useIcebergProtocol;
