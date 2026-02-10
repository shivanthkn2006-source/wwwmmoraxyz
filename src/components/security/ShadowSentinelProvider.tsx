/**
 * SHADOW SENTINEL PROVIDER
 * Project Exodus 2120 - AI Immune System Integration
 * 
 * Wraps the app with the Shadow Sentinel security layer
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useShadowSentinel, SentinelAlert, ProtocolViolation } from '@/hooks/useShadowSentinel';
import { useZeroPointOffline, VRWorldState, SyncDelta } from '@/hooks/useZeroPointOffline';

interface SentinelContextType {
  // Shadow Sentinel
  isActive: boolean;
  mode: 'normal' | 'elevated' | 'stealth' | 'lockdown';
  alertCount: number;
  blockedActions: number;
  sessionIntegrity: number;
  alerts: SentinelAlert[];
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Actions
  validateInput: (input: string, context?: { source: 'chat' | 'voice' | 'form' | 'api' }) => { valid: boolean; sanitized: string; blocked?: boolean };
  killSwitch: (operation: string, context?: Record<string, any>) => { allowed: boolean; reason?: string };
  activateStealthMode: (reason: string, metadata?: Record<string, any>) => Promise<void>;
  autoPatch: (vulnerability: { type: string; location: string; severity: string }) => Promise<{ patched: boolean; version: string }>;
  
  // Zero-Point Offline
  isOffline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  ghostEngineActive: boolean;
  cacheSize: number;
  
  // Offline Actions
  cacheAppState: (data: Record<string, any>) => Promise<void>;
  cacheVRWorld: (worldState: VRWorldState) => Promise<void>;
  ghostProcess: (input: string) => Promise<string>;
  recordDelta: (operation: 'create' | 'update' | 'delete', table: string, data: any) => Promise<void>;
  satelliteSync: () => Promise<{ synced: number; failed: number; compressed: boolean }>;
}

const SentinelContext = createContext<SentinelContextType | null>(null);

export const useSentinel = (): SentinelContextType => {
  const context = useContext(SentinelContext);
  if (!context) {
    // Return safe defaults
    return {
      isActive: false,
      mode: 'normal',
      alertCount: 0,
      blockedActions: 0,
      sessionIntegrity: 100,
      alerts: [],
      threatLevel: 'low',
      validateInput: (input) => ({ valid: true, sanitized: input }),
      killSwitch: () => ({ allowed: true }),
      activateStealthMode: async () => {},
      autoPatch: async () => ({ patched: false, version: '0.0.0' }),
      isOffline: false,
      isSyncing: false,
      pendingChanges: 0,
      ghostEngineActive: false,
      cacheSize: 0,
      cacheAppState: async () => {},
      cacheVRWorld: async () => {},
      ghostProcess: async () => 'Not available',
      recordDelta: async () => {},
      satelliteSync: async () => ({ synced: 0, failed: 0, compressed: false })
    };
  }
  return context;
};

interface SentinelProviderProps {
  children: React.ReactNode;
}

export const ShadowSentinelProvider: React.FC<SentinelProviderProps> = ({ children }) => {
  const sentinel = useShadowSentinel();
  const zeroPoint = useZeroPointOffline();

  // Listen for chat inputs and validate
  useEffect(() => {
    const handleChatInput = (e: CustomEvent<{ input: string; callback: (result: any) => void }>) => {
      const result = sentinel.validateInput(e.detail.input, { source: 'chat' });
      e.detail.callback(result);
    };

    const handleVoiceInput = (e: CustomEvent<{ input: string; callback: (result: any) => void }>) => {
      const result = sentinel.validateInput(e.detail.input, { source: 'voice' });
      e.detail.callback(result);
    };

    window.addEventListener('sentinel-validate-chat', handleChatInput as EventListener);
    window.addEventListener('sentinel-validate-voice', handleVoiceInput as EventListener);

    return () => {
      window.removeEventListener('sentinel-validate-chat', handleChatInput as EventListener);
      window.removeEventListener('sentinel-validate-voice', handleVoiceInput as EventListener);
    };
  }, [sentinel]);

  // Listen for VR world changes to cache
  useEffect(() => {
    const handleVRChange = (e: CustomEvent<VRWorldState>) => {
      zeroPoint.cacheVRWorld(e.detail);
    };

    window.addEventListener('vr-world-update', handleVRChange as EventListener);
    return () => window.removeEventListener('vr-world-update', handleVRChange as EventListener);
  }, [zeroPoint]);

  // Integrate with Zoe Core
  useEffect(() => {
    const handleCoreRequest = (e: CustomEvent<{ 
      action: string; 
      data: any;
      callback?: (result: any) => void;
    }>) => {
      const { action, data, callback } = e.detail;
      
      // Validate action through kill switch
      const killResult = sentinel.killSwitch(action, data);
      
      if (!killResult.allowed) {
        callback?.({ blocked: true, reason: killResult.reason });
        return;
      }

      // Record delta for offline sync
      if (['create', 'update', 'delete'].includes(action)) {
        zeroPoint.recordDelta(action as 'create' | 'update' | 'delete', data.table || 'unknown', data);
      }

      callback?.({ allowed: true });
    };

    window.addEventListener('zoe-core-action', handleCoreRequest as EventListener);
    return () => window.removeEventListener('zoe-core-action', handleCoreRequest as EventListener);
  }, [sentinel, zeroPoint]);

  const contextValue: SentinelContextType = {
    // Sentinel
    isActive: sentinel.isActive,
    mode: sentinel.mode,
    alertCount: sentinel.alertCount,
    blockedActions: sentinel.blockedActions,
    sessionIntegrity: sentinel.sessionIntegrity,
    alerts: sentinel.alerts,
    threatLevel: sentinel.threatLevel as 'low' | 'medium' | 'high' | 'critical',
    validateInput: sentinel.validateInput,
    killSwitch: sentinel.killSwitch,
    activateStealthMode: sentinel.activateStealthMode,
    autoPatch: sentinel.autoPatch,
    
    // Zero-Point
    isOffline: zeroPoint.isOffline,
    isSyncing: zeroPoint.isSyncing,
    pendingChanges: zeroPoint.pendingChanges,
    ghostEngineActive: zeroPoint.ghostEngineActive,
    cacheSize: zeroPoint.cacheSize,
    cacheAppState: zeroPoint.cacheAppState,
    cacheVRWorld: zeroPoint.cacheVRWorld,
    ghostProcess: zeroPoint.ghostProcess,
    recordDelta: zeroPoint.recordDelta,
    satelliteSync: zeroPoint.satelliteSync
  };

  // Hide overlays on auth pages
  const isAuthPage = typeof window !== 'undefined' && (
    window.location.pathname.includes('/auth') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/signup'
  );

  return (
    <SentinelContext.Provider value={contextValue}>
      {children}
      
      {/* Security indicators only show for critical states, not routine - NO floating popups */}
      {!isAuthPage && sentinel.mode === 'lockdown' && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-red-500 animate-pulse" />
      )}
    </SentinelContext.Provider>
  );
};

export default ShadowSentinelProvider;
