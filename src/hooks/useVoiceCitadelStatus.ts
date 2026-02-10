// ═══════════════════════════════════════════════════════════════════════════════
// VOICE CITADEL STATUS - Legacy Wrapper (Now uses Orchestrator)
// Provides backward compatibility with the original interface
// ═══════════════════════════════════════════════════════════════════════════════

import { useVoiceCitadelOrchestrator } from './useVoiceCitadelOrchestrator';
import { useAuth } from '@/lib/auth';

export interface SystemStatus {
  isOnline: boolean;
  isZoeAvailable: boolean;
  supabaseConnected: boolean;
  lastChecked: Date;
  latencyMs: number | null;
  recommendedMode: 'online' | 'offline';
  statusMessage: string;
}

export interface VoiceCitadelStatusResult {
  status: SystemStatus;
  isChecking: boolean;
  checkNow: () => Promise<void>;
  forceOffline: boolean;
  setForceOffline: (value: boolean) => void;
}

/**
 * Legacy wrapper around the new Orchestrator for backward compatibility
 * @deprecated Use useVoiceCitadelOrchestrator directly for full functionality
 */
export function useVoiceCitadelStatus(): VoiceCitadelStatusResult {
  const { user } = useAuth();
  const orchestrator = useVoiceCitadelOrchestrator(user?.id);
  
  // Map orchestrator state to legacy format
  const status: SystemStatus = {
    isOnline: orchestrator.state.network.status !== 'disconnected',
    isZoeAvailable: orchestrator.state.zoeAI.available,
    supabaseConnected: orchestrator.state.backend.status === 'connected',
    lastChecked: orchestrator.state.lastHealthCheck,
    latencyMs: orchestrator.state.backend.latencyMs,
    recommendedMode: orchestrator.state.recommendedMode,
    statusMessage: orchestrator.statusMessage,
  };
  
  const setForceOffline = (value: boolean) => {
    orchestrator.setManualMode(value ? 'offline' : 'auto');
  };
  
  return {
    status,
    isChecking: orchestrator.isInitializing,
    checkNow: orchestrator.forceRecheck,
    forceOffline: orchestrator.manualMode === 'offline',
    setForceOffline,
  };
}
