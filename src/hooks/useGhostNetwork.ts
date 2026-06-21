/**
 * useGhostNetwork - Hook for Phantom Router integration
 * 
 * Provides obfuscated API routing through the Ghost Mesh
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPhantomKey, getSecurityStatus } from '@/utils/chameleonCode';
import { isVaultUnlocked, getVaultStatus } from '@/utils/invisibleVault';

interface GhostNetworkState {
  isConnected: boolean;
  phantomKey: string;
  routeMap: Record<string, string>;
  decoyCount: number;
  securityLevel: string;
  expiresIn: number;
}

interface GhostNetworkHook extends GhostNetworkState {
  connect: () => Promise<void>;
  invokePhantom: (routeToken: string, payload?: any) => Promise<any>;
  getStatus: () => GhostNetworkState;
  refreshRoutes: () => Promise<void>;
}

export function useGhostNetwork(): GhostNetworkHook {
  const [state, setState] = useState<GhostNetworkState>({
    isConnected: false,
    phantomKey: '',
    routeMap: {},
    decoyCount: 0,
    securityLevel: 'INITIALIZING',
    expiresIn: 0
  });

  // Connect to Ghost Mesh
  const connect = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('phantom-router', {
        body: { action: 'connect' }
      });

      if (error) {
        console.error('[Ghost Network] Connection failed:', error);
        setState(prev => ({ ...prev, securityLevel: 'DISCONNECTED' }));
        return;
      }

      setState({
        isConnected: true,
        phantomKey: data.phantomKey || getPhantomKey(),
        routeMap: data.routeMap || {},
        decoyCount: data.decoyCount || data.activeDecoys || 0,
        securityLevel: data.securityLevel || 'GHOST_MESH_ACTIVE',
        expiresIn: data.expiresIn || 3600
      });

      console.log('[Ghost Network] Connected to Ghost Mesh');
    } catch (err) {
      console.error('[Ghost Network] Error:', err);
      // Fallback to client-side phantom key
      setState(prev => ({
        ...prev,
        isConnected: true,
        phantomKey: getPhantomKey(),
        securityLevel: 'LOCAL_PHANTOM'
      }));
    }
  }, []);

  // Invoke through phantom router
  const invokePhantom = useCallback(async (routeToken: string, payload?: any) => {
    if (!state.isConnected) {
      await connect();
    }

    const phantomKey = state.phantomKey || getPhantomKey();
    
    // Check if route exists in map
    const realEndpoint = state.routeMap[routeToken];
    
    if (realEndpoint) {
      // Route through real endpoint
      const { data, error } = await supabase.functions.invoke(realEndpoint, {
        body: payload,
        headers: {
          'x-phantom-key': phantomKey,
          'x-route-token': routeToken
        }
      });

      if (error) throw error;
      return data;
    }

    // Fallback: try direct invoke with phantom headers
    const { data, error } = await supabase.functions.invoke(routeToken, {
      body: payload,
      headers: {
        'x-phantom-key': phantomKey
      }
    });

    if (error) throw error;
    return data;
  }, [state.isConnected, state.phantomKey, state.routeMap, connect]);

  // Refresh routes (hourly)
  const refreshRoutes = useCallback(async () => {
    await connect();
  }, [connect]);

  // Get current status
  const getStatus = useCallback((): GhostNetworkState => {
    return { ...state };
  }, [state]);

  // IMPORTANT: Do not auto-connect on mount.
  // Connecting hits backend routes and can burn credits; we only connect lazily when needed.
  useEffect(() => {
    // Refresh routes every hour only after we have a connection.
    if (!state.isConnected) return;

    const interval = setInterval(refreshRoutes, 3600000);
    return () => clearInterval(interval);
  }, [state.isConnected, refreshRoutes]);

  // Update expiry countdown
  useEffect(() => {
    if (state.expiresIn <= 0) return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        expiresIn: Math.max(0, prev.expiresIn - 1)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.expiresIn]);

  return {
    ...state,
    connect,
    invokePhantom,
    getStatus,
    refreshRoutes
  };
}

/**
 * Combined security status hook
 */
export function useSecurityStatus() {
  const ghostNetwork = useGhostNetwork();
  const [combinedStatus, setCombinedStatus] = useState({
    ghostNetwork: ghostNetwork.getStatus(),
    chameleon: getSecurityStatus(),
    vault: getVaultStatus()
  });

  useEffect(() => {
    const updateStatus = () => {
      setCombinedStatus({
        ghostNetwork: ghostNetwork.getStatus(),
        chameleon: getSecurityStatus(),
        vault: getVaultStatus()
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [ghostNetwork]);

  return combinedStatus;
}
