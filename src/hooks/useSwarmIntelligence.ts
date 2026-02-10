/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE SWARM INTELLIGENCE HOOK - React Integration for P2P Compute
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { useZoePassport } from './useZoePassport';
import { 
  SwarmIntelligence, 
  type HiveNode, 
  type HiveMetrics,
  type ComputeRequest,
  type ComputeResult,
  type TaskType
} from '@/core/agentic/SwarmIntelligence';

export interface UseSwarmIntelligenceReturn {
  // State
  isInitialized: boolean;
  myNode: HiveNode | null;
  credits: number;
  hiveMetrics: HiveMetrics | null;
  isSharing: boolean;
  
  // Actions
  enableSharing: () => void;
  disableSharing: () => void;
  requestCompute: (request: ComputeRequest) => Promise<ComputeResult>;
  
  // Info
  peers: HiveNode[];
  hiveSize: number;
  canProcess: (taskType: TaskType) => boolean;
}

export function useSwarmIntelligence(): UseSwarmIntelligenceReturn {
  const { passport, isInitialized: passportReady } = useZoePassport();
  const [isInitialized, setIsInitialized] = useState(false);
  const [myNode, setMyNode] = useState<HiveNode | null>(null);
  const [credits, setCredits] = useState(100);
  const [hiveMetrics, setHiveMetrics] = useState<HiveMetrics | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [peers, setPeers] = useState<HiveNode[]>([]);

  // Initialize swarm when passport is ready
  useEffect(() => {
    if (passportReady && passport?.did && !isInitialized) {
      SwarmIntelligence.initialize(passport.did).then(() => {
        setMyNode(SwarmIntelligence.getMyNode());
        setCredits(SwarmIntelligence.getCredits());
        setHiveMetrics(SwarmIntelligence.getHiveMetrics());
        setPeers(SwarmIntelligence.getPeers());
        setIsSharing(SwarmIntelligence.isComputeSharingEnabled());
        setIsInitialized(true);
      });
    }
  }, [passportReady, passport?.did, isInitialized]);

  // Listen for swarm events
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      const { type, payload } = event.detail;
      
      if (type.startsWith('swarm_')) {
        // Refresh state
        setMyNode(SwarmIntelligence.getMyNode());
        setCredits(SwarmIntelligence.getCredits());
        setHiveMetrics(SwarmIntelligence.getHiveMetrics());
        setPeers(SwarmIntelligence.getPeers());
        setIsSharing(SwarmIntelligence.isComputeSharingEnabled());
      }
    };

    window.addEventListener('zoe-core-event', handleEvent as EventListener);
    return () => window.removeEventListener('zoe-core-event', handleEvent as EventListener);
  }, []);

  const enableSharing = useCallback(() => {
    SwarmIntelligence.enableComputeSharing();
    setIsSharing(true);
  }, []);

  const disableSharing = useCallback(() => {
    SwarmIntelligence.disableComputeSharing();
    setIsSharing(false);
  }, []);

  const requestCompute = useCallback(async (request: ComputeRequest) => {
    return SwarmIntelligence.requestCompute(request);
  }, []);

  const canProcess = useCallback((taskType: TaskType) => {
    return myNode?.capabilities.canProcess.includes(taskType) || false;
  }, [myNode]);

  return {
    isInitialized,
    myNode,
    credits,
    hiveMetrics,
    isSharing,
    enableSharing,
    disableSharing,
    requestCompute,
    peers,
    hiveSize: SwarmIntelligence.getLocalHiveSize(),
    canProcess,
  };
}

export default useSwarmIntelligence;
