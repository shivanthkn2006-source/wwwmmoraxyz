/**
 * USE PERSONAL ZOE HOOK
 * React integration for the Personal Sub-Zoe Agent (Phase 2)
 * 
 * Provides hyper-personalized AI companion that:
 * - Knows the user's Soul Codex (fears, dreams, decisions)
 * - Filters Parent Zoe complexity into actionable advice
 * - Has near-zero latency responses
 * - Tone: Intimate, Encouraging, Sharp (like Samantha from Her)
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  personalZoeRegistry,
  type SoulCodex,
  type PersonalZoeResponse,
  type ActionItem,
} from '@/core/zoe';

export interface UsePersonalZoeReturn {
  // State
  isReady: boolean;
  isProcessing: boolean;
  soulCodex: SoulCodex | null;
  lastResponse: PersonalZoeResponse | null;
  
  // Core Actions
  initialize: () => Promise<boolean>;
  sendMessage: (message: string) => Promise<PersonalZoeResponse | null>;
  
  // Soul Codex Management
  updateSoulCodex: (updates: Partial<SoulCodex>) => Promise<void>;
  getSoulCodex: () => SoulCodex | null;
  
  // History & Stats
  responseHistory: PersonalZoeResponse[];
  stats: {
    totalInteractions: number;
    averageResponseTime: number;
    escalationRate: number;
    relationshipLevel: string;
  };
}

export function usePersonalZoe(): UsePersonalZoeReturn {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soulCodex, setSoulCodex] = useState<SoulCodex | null>(null);
  const [lastResponse, setLastResponse] = useState<PersonalZoeResponse | null>(null);
  const [responseHistory, setResponseHistory] = useState<PersonalZoeResponse[]>([]);
  const [stats, setStats] = useState({
    totalInteractions: 0,
    averageResponseTime: 0,
    escalationRate: 0,
    relationshipLevel: 'new',
  });

  // Initialize Personal Zoe for current user
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      console.log('[usePersonalZoe] No user, skipping initialization');
      return false;
    }

    try {
      console.log(`[usePersonalZoe] Initializing Personal Zoe for user ${user.id}`);
      
      const personalZoe = await personalZoeRegistry.getOrCreate(user.id);
      const codex = personalZoe.getSoulCodex();
      
      setSoulCodex(codex);
      setIsReady(true);
      
      // Update stats
      const newStats = personalZoe.getStats();
      setStats(newStats);
      
      console.log(`[usePersonalZoe] Initialized - Relationship Level: ${codex.relationshipLevel}`);
      
      return true;
    } catch (error) {
      console.error('[usePersonalZoe] Initialization error:', error);
      return false;
    }
  }, [user?.id]);

  // Send a message to Personal Zoe
  const sendMessage = useCallback(async (message: string): Promise<PersonalZoeResponse | null> => {
    if (!user?.id) {
      console.error('[usePersonalZoe] No user, cannot send message');
      return null;
    }

    setIsProcessing(true);

    try {
      const personalZoe = await personalZoeRegistry.getOrCreate(user.id);
      const response = await personalZoe.processMessage(message);
      
      setLastResponse(response);
      setResponseHistory(prev => [...prev, response]);
      
      // Update Soul Codex after interaction
      const updatedCodex = personalZoe.getSoulCodex();
      setSoulCodex(updatedCodex);
      
      // Update stats
      const newStats = personalZoe.getStats();
      setStats(newStats);
      
      return response;
    } catch (error) {
      console.error('[usePersonalZoe] Message processing error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id]);

  // Update Soul Codex manually
  const updateSoulCodex = useCallback(async (updates: Partial<SoulCodex>) => {
    if (!user?.id) return;

    try {
      const personalZoe = await personalZoeRegistry.getOrCreate(user.id);
      personalZoe.updateSoulCodexData(updates);
      setSoulCodex(personalZoe.getSoulCodex());
    } catch (error) {
      console.error('[usePersonalZoe] Soul Codex update error:', error);
    }
  }, [user?.id]);

  // Get current Soul Codex
  const getSoulCodex = useCallback((): SoulCodex | null => {
    return soulCodex;
  }, [soulCodex]);

  // Auto-initialize when user is available
  useEffect(() => {
    if (user?.id && !isReady) {
      initialize();
    }
  }, [user?.id, isReady, initialize]);

  // Clean up when user logs out
  useEffect(() => {
    return () => {
      if (user?.id) {
        // Don't clear - keep the instance for session continuity
        // personalZoeRegistry.clear(user.id);
      }
    };
  }, [user?.id]);

  return {
    // State
    isReady,
    isProcessing,
    soulCodex,
    lastResponse,
    
    // Core Actions
    initialize,
    sendMessage,
    
    // Soul Codex Management
    updateSoulCodex,
    getSoulCodex,
    
    // History & Stats
    responseHistory,
    stats,
  };
}

export default usePersonalZoe;
