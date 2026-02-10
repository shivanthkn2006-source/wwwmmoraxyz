/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE ZOE PASSPORT HOOK - React Integration for DID Protocol
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { 
  PassportManager, 
  type ZoePassport, 
  type TrustExchange,
  type ReputationRecord 
} from '@/core/agentic/ZoePassportProtocol';

export interface UseZoePassportReturn {
  // State
  passport: ZoePassport | null;
  isInitialized: boolean;
  trustScore: number;
  
  // Trust Exchange
  initiateExchange: (targetDid: string, purpose: string) => Promise<TrustExchange | null>;
  respondToExchange: (exchange: TrustExchange, accept: boolean) => Promise<TrustExchange | null>;
  isTrusted: (did: string) => boolean;
  getTrustLevel: (did: string) => number;
  
  // Reputation
  recordInteraction: (targetDid: string, positive: boolean) => void;
  reportSpam: (targetDid: string) => void;
  getReputation: (did: string) => ReputationRecord | null;
  
  // Blocking
  blockDid: (did: string, reason: string) => void;
  unblockDid: (did: string) => void;
  
  // Verification
  addVerification: (type: 'device' | 'biometric' | 'email' | 'phone' | 'social', proofData: string) => Promise<boolean>;
  
  // Lists
  trustedDids: string[];
  blockedDids: string[];
}

export function useZoePassport(): UseZoePassportReturn {
  const { user } = useAuth();
  const [passport, setPassport] = useState<ZoePassport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [trustedDids, setTrustedDids] = useState<string[]>([]);
  const [blockedDids, setBlockedDids] = useState<string[]>([]);

  // Initialize passport when user is authenticated
  useEffect(() => {
    if (user?.id && !isInitialized) {
      PassportManager.initialize(user.id).then(p => {
        setPassport(p);
        setTrustedDids(PassportManager.getTrustedDids());
        setBlockedDids(PassportManager.getBlockedDids());
        setIsInitialized(true);
      });
    }
  }, [user?.id, isInitialized]);

  // Listen for passport events
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      const { type } = event.detail;
      
      if (type.startsWith('passport_')) {
        // Refresh passport data
        setPassport(PassportManager.getPassport());
        setTrustedDids(PassportManager.getTrustedDids());
        setBlockedDids(PassportManager.getBlockedDids());
      }
    };

    window.addEventListener('zoe-core-event', handleEvent as EventListener);
    return () => window.removeEventListener('zoe-core-event', handleEvent as EventListener);
  }, []);

  const initiateExchange = useCallback(async (targetDid: string, purpose: string) => {
    return PassportManager.initiateExchange(targetDid, purpose);
  }, []);

  const respondToExchange = useCallback(async (exchange: TrustExchange, accept: boolean) => {
    return PassportManager.respondToExchange(exchange, accept);
  }, []);

  const isTrusted = useCallback((did: string) => {
    return PassportManager.isTrusted(did);
  }, []);

  const getTrustLevel = useCallback((did: string) => {
    return PassportManager.getTrustLevel(did);
  }, []);

  const recordInteraction = useCallback((targetDid: string, positive: boolean) => {
    PassportManager.recordInteraction(targetDid, positive);
  }, []);

  const reportSpam = useCallback((targetDid: string) => {
    PassportManager.reportSpam(targetDid);
  }, []);

  const getReputation = useCallback((did: string) => {
    return PassportManager.getReputation(did);
  }, []);

  const blockDid = useCallback((did: string, reason: string) => {
    PassportManager.blockDid(did, reason);
  }, []);

  const unblockDid = useCallback((did: string) => {
    PassportManager.unblockDid(did);
  }, []);

  const addVerification = useCallback(async (
    type: 'device' | 'biometric' | 'email' | 'phone' | 'social',
    proofData: string
  ) => {
    return PassportManager.addVerification(type, proofData);
  }, []);

  return {
    passport,
    isInitialized,
    trustScore: PassportManager.getTrustScore(),
    initiateExchange,
    respondToExchange,
    isTrusted,
    getTrustLevel,
    recordInteraction,
    reportSpam,
    getReputation,
    blockDid,
    unblockDid,
    addVerification,
    trustedDids,
    blockedDids,
  };
}

export default useZoePassport;
