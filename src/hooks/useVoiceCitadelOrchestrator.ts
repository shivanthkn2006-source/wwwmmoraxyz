// ═══════════════════════════════════════════════════════════════════════════════
// VOICE CITADEL ORCHESTRATOR - Master Background Controller
// Auto-aligns: Network, Zoe AI, Bio-Resonance, Zero-Knowledge Vault
// Seamless online/offline mode switching with real-time monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected' | 'checking';
export type AuthReadiness = 'ready' | 'initializing' | 'needs_enrollment' | 'vault_locked' | 'error';

export interface OrchestratorState {
  // Core connectivity
  network: {
    status: ConnectionStatus;
    latencyMs: number | null;
    type: string | null;
  };
  
  // Supabase backend
  backend: {
    status: ConnectionStatus;
    latencyMs: number | null;
    lastSync: Date | null;
  };
  
  // Zoe AI availability
  zoeAI: {
    status: ConnectionStatus;
    available: boolean;
    services: {
      voice: boolean;
      chat: boolean;
      biometric: boolean;
    };
  };
  
  // Bio-Resonance Engine
  bioResonance: {
    ready: boolean;
    calibrated: boolean;
    lastAnalysis: Date | null;
  };
  
  // Zero-Knowledge Vault
  vault: {
    status: 'locked' | 'unlocked' | 'empty' | 'expired';
    hasToken: boolean;
    failedAttempts: number;
    expiresAt: Date | null;
  };
  
  // System-wide
  recommendedMode: 'online' | 'offline';
  authReadiness: AuthReadiness;
  lastHealthCheck: Date;
  bootSequenceComplete: boolean;
}

export interface OrchestratorResult {
  state: OrchestratorState;
  isInitializing: boolean;
  
  // Actions
  forceRecheck: () => Promise<void>;
  setManualMode: (mode: 'online' | 'offline' | 'auto') => void;
  manualMode: 'online' | 'offline' | 'auto';
  
  // Computed helpers
  isFullyOperational: boolean;
  canAuthenticateOnline: boolean;
  canAuthenticateOffline: boolean;
  statusMessage: string;
  statusColor: 'green' | 'yellow' | 'red';
}

const HEALTH_CHECK_INTERVAL = 15000; // 15 seconds for faster detection
const NETWORK_TIMEOUT = 3000;
const ZOE_TIMEOUT = 4000;

export function useVoiceCitadelOrchestrator(userId?: string): OrchestratorResult {
  const [state, setState] = useState<OrchestratorState>({
    network: { status: 'checking', latencyMs: null, type: null },
    backend: { status: 'checking', latencyMs: null, lastSync: null },
    zoeAI: { status: 'checking', available: false, services: { voice: false, chat: false, biometric: false } },
    bioResonance: { ready: false, calibrated: false, lastAnalysis: null },
    vault: { status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null },
    recommendedMode: navigator.onLine ? 'online' : 'offline',
    authReadiness: 'initializing',
    lastHealthCheck: new Date(),
    bootSequenceComplete: false,
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualMode, setManualMode] = useState<'online' | 'offline' | 'auto'>('auto');
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK CHECK - Enhanced with connection type detection
  // ═══════════════════════════════════════════════════════════════════════════
  const checkNetwork = useCallback(async (): Promise<{ status: ConnectionStatus; latencyMs: number | null; type: string | null }> => {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      return { status: 'disconnected', latencyMs: null, type: 'offline' };
    }
    
    // Get connection type if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = connection?.effectiveType || connection?.type || 'unknown';
    
    // Ping test with timeout
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
      
      await fetch('https://www.google.com/generate_204', { 
        mode: 'no-cors',
        signal: controller.signal 
      });
      
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);
      
      return { 
        status: latencyMs > 1000 ? 'degraded' : 'connected', 
        latencyMs, 
        type: connectionType 
      };
    } catch {
      return { status: 'degraded', latencyMs: null, type: connectionType };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKEND CHECK - Supabase connectivity
  // ═══════════════════════════════════════════════════════════════════════════
  const checkBackend = useCallback(async (): Promise<{ status: ConnectionStatus; latencyMs: number | null }> => {
    const startTime = performance.now();
    
    try {
      const { error } = await supabase.auth.getSession();
      const latencyMs = Math.round(performance.now() - startTime);
      
      if (error) {
        console.warn('[Orchestrator] Backend error:', error.message);
        return { status: 'degraded', latencyMs };
      }
      
      return { status: 'connected', latencyMs };
    } catch (err) {
      console.error('[Orchestrator] Backend check failed:', err);
      return { status: 'disconnected', latencyMs: null };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE AI CHECK - Enhanced with service-level status
  // ═══════════════════════════════════════════════════════════════════════════
  const checkZoeAI = useCallback(async (): Promise<{
    status: ConnectionStatus;
    available: boolean;
    services: { voice: boolean; chat: boolean; biometric: boolean };
  }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ZOE_TIMEOUT);
      
      const { data, error } = await supabase.functions.invoke('zoe-health-check', {
        body: { action: 'ping' }
      });
      
      clearTimeout(timeout);
      
      if (error) {
        console.warn('[Orchestrator] Zoe AI error:', error.message);
        // Even with error, if we reached the endpoint, infrastructure is up
        return { 
          status: 'degraded', 
          available: false, 
          services: { voice: false, chat: false, biometric: true } 
        };
      }
      
      const zoeStatus = data?.status || 'offline';
      const services = data?.services || { voice: false, chat: false, biometric: false };
      
      return {
        status: zoeStatus === 'online' ? 'connected' : zoeStatus === 'degraded' ? 'degraded' : 'disconnected',
        available: data?.available ?? false,
        services
      };
    } catch (err) {
      console.error('[Orchestrator] Zoe AI check failed:', err);
      return { 
        status: 'disconnected', 
        available: false, 
        services: { voice: false, chat: false, biometric: false } 
      };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VAULT CHECK - Zero-Knowledge Vault status
  // ═══════════════════════════════════════════════════════════════════════════
  const checkVault = useCallback(async (uid: string): Promise<{
    status: 'locked' | 'unlocked' | 'empty' | 'expired';
    hasToken: boolean;
    failedAttempts: number;
    expiresAt: Date | null;
  }> => {
    try {
      const DB_NAME = 'VoiceCitadelVault';
      const STORE_NAME = 'encrypted_tokens';
      
      return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = () => {
          resolve({ status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null });
        };
        
        request.onsuccess = () => {
          const db = request.result;
          
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            resolve({ status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null });
            return;
          }
          
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const getRequest = store.get(uid);
          
          getRequest.onsuccess = () => {
            const token = getRequest.result;
            db.close();
            
            if (!token) {
              resolve({ status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null });
              return;
            }
            
            const expiresAt = new Date(token.expiresAt);
            const isExpired = expiresAt < new Date();
            
            // Check failed attempts from localStorage
            const failedAttempts = parseInt(localStorage.getItem(`vault_failed_${uid}`) || '0', 10);
            const isLocked = failedAttempts >= 3;
            
            resolve({
              status: isLocked ? 'locked' : isExpired ? 'expired' : 'unlocked',
              hasToken: true,
              failedAttempts,
              expiresAt
            });
          };
          
          getRequest.onerror = () => {
            db.close();
            resolve({ status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null });
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
          }
        };
      });
    } catch {
      return { status: 'empty', hasToken: false, failedAttempts: 0, expiresAt: null };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK ENROLLMENT STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  const checkEnrollment = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('voice_print_enrollments')
        .select('id')
        .eq('user_id', uid)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.warn('[Orchestrator] Enrollment check error:', error);
        // Check localStorage fallback
        return !!localStorage.getItem(`voice_citadel_dna_${uid}`);
      }
      
      return !!data;
    } catch {
      // Fallback to localStorage
      return !!localStorage.getItem(`voice_citadel_dna_${uid}`);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTER HEALTH CHECK - Comprehensive system scan
  // ═══════════════════════════════════════════════════════════════════════════
  const performHealthCheck = useCallback(async () => {
    if (!mountedRef.current) return;
    
    console.log('[Orchestrator] ═══ Running Health Check ═══');
    
    try {
      // Parallel checks for maximum efficiency
      const [networkResult, backendResult, zoeResult] = await Promise.all([
        checkNetwork(),
        checkBackend(),
        checkZoeAI()
      ]);
      
      // User-specific checks
      let vaultResult = state.vault;
      let hasEnrollment = false;
      
      if (userId) {
        [vaultResult, hasEnrollment] = await Promise.all([
          checkVault(userId),
          checkEnrollment(userId)
        ]);
      }
      
      if (!mountedRef.current) return;
      
      // Determine recommended mode
      let recommendedMode: 'online' | 'offline' = 'offline';
      let authReadiness: AuthReadiness = 'ready';
      
      // Mode determination logic
      if (manualMode !== 'auto') {
        recommendedMode = manualMode;
      } else if (networkResult.status === 'disconnected') {
        recommendedMode = 'offline';
      } else if (backendResult.status === 'disconnected') {
        recommendedMode = 'offline';
      } else if (backendResult.status === 'connected') {
        recommendedMode = 'online';
      } else if (vaultResult.hasToken && vaultResult.status === 'unlocked') {
        recommendedMode = 'offline';
      } else {
        recommendedMode = backendResult.status === 'degraded' ? 'offline' : 'online';
      }
      
      // Auth readiness determination
      if (vaultResult.status === 'locked') {
        authReadiness = 'vault_locked';
      } else if (!hasEnrollment && recommendedMode === 'online') {
        authReadiness = 'needs_enrollment';
      } else if (!vaultResult.hasToken && recommendedMode === 'offline') {
        authReadiness = 'needs_enrollment';
      } else if (networkResult.status === 'disconnected' && !vaultResult.hasToken) {
        authReadiness = 'error';
      } else {
        authReadiness = 'ready';
      }
      
      // Bio-Resonance readiness (check for stored DNA)
      const bioResonanceReady = userId ? !!localStorage.getItem(`voice_citadel_dna_${userId}`) : false;
      
      const newState: OrchestratorState = {
        network: networkResult,
        backend: {
          status: backendResult.status,
          latencyMs: backendResult.latencyMs,
          lastSync: backendResult.status === 'connected' ? new Date() : state.backend.lastSync
        },
        zoeAI: zoeResult,
        bioResonance: {
          ready: bioResonanceReady,
          calibrated: bioResonanceReady,
          lastAnalysis: state.bioResonance.lastAnalysis
        },
        vault: vaultResult,
        recommendedMode,
        authReadiness,
        lastHealthCheck: new Date(),
        bootSequenceComplete: true
      };
      
      setState(newState);
      setIsInitializing(false);
      retryCountRef.current = 0;
      
      console.log('[Orchestrator] ✓ Health Check Complete:', {
        network: networkResult.status,
        backend: backendResult.status,
        zoe: zoeResult.status,
        vault: vaultResult.status,
        mode: recommendedMode,
        readiness: authReadiness
      });
      
    } catch (err) {
      console.error('[Orchestrator] Health check failed:', err);
      retryCountRef.current++;
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          lastHealthCheck: new Date(),
          bootSequenceComplete: true,
          recommendedMode: 'offline',
          authReadiness: 'error'
        }));
        setIsInitializing(false);
      }
    }
  }, [checkNetwork, checkBackend, checkZoeAI, checkVault, checkEnrollment, userId, manualMode, state.vault, state.backend.lastSync, state.bioResonance.lastAnalysis]);

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK EVENT LISTENERS - Real-time connectivity changes
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Orchestrator] 🌐 Network ONLINE - triggering health check');
      performHealthCheck();
    };
    
    const handleOffline = () => {
      console.log('[Orchestrator] 📴 Network OFFLINE');
      setState(prev => ({
        ...prev,
        network: { status: 'disconnected', latencyMs: null, type: 'offline' },
        backend: { ...prev.backend, status: 'disconnected' },
        zoeAI: { ...prev.zoeAI, status: 'disconnected', available: false },
        recommendedMode: 'offline',
        lastHealthCheck: new Date()
      }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performHealthCheck]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VISIBILITY CHANGE - Recheck when tab becomes visible
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && mountedRef.current) {
        console.log('[Orchestrator] Tab visible - triggering health check');
        performHealthCheck();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [performHealthCheck]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERIODIC HEALTH CHECK - Background monitoring
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial check
    performHealthCheck();
    
    // Set up interval
    checkIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !document.hidden) {
        performHealthCheck();
      }
    }, HEALTH_CHECK_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [performHealthCheck]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  const isFullyOperational = 
    state.network.status === 'connected' &&
    state.backend.status === 'connected' &&
    state.zoeAI.available;
  
  const canAuthenticateOnline = 
    state.network.status !== 'disconnected' &&
    state.backend.status !== 'disconnected' &&
    state.authReadiness === 'ready';
  
  const canAuthenticateOffline = 
    state.vault.hasToken &&
    state.vault.status === 'unlocked' &&
    state.bioResonance.ready;
  
  // Status message
  let statusMessage = 'Initializing...';
  let statusColor: 'green' | 'yellow' | 'red' = 'yellow';
  
  if (state.bootSequenceComplete) {
    if (state.network.status === 'disconnected') {
      statusMessage = 'Offline Mode Active';
      statusColor = state.vault.hasToken ? 'yellow' : 'red';
    } else if (state.backend.status === 'disconnected') {
      statusMessage = 'Backend Unreachable';
      statusColor = 'red';
    } else if (state.vault.status === 'locked') {
      statusMessage = 'Vault Locked';
      statusColor = 'red';
    } else if (isFullyOperational) {
      statusMessage = 'All Systems Operational';
      statusColor = 'green';
    } else if (state.zoeAI.available) {
      statusMessage = 'Online with Zoe AI';
      statusColor = 'green';
    } else if (state.backend.status === 'connected') {
      statusMessage = 'Online (Zoe AI Limited)';
      statusColor = 'yellow';
    } else {
      statusMessage = 'Degraded Connectivity';
      statusColor = 'yellow';
    }
  }

  return {
    state,
    isInitializing,
    forceRecheck: performHealthCheck,
    setManualMode,
    manualMode,
    isFullyOperational,
    canAuthenticateOnline,
    canAuthenticateOffline,
    statusMessage,
    statusColor
  };
}
