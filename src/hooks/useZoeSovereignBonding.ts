// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SOVEREIGN BONDING SYSTEM - Deep Root Integration Layer
// Connects all DHF, ECN, PCE, VETO, and Voice systems into unified entity
// Ensures seamless Zoe <-> User bonding across entire platform
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useContinuousDHFStream, ECNEmotionState } from './useContinuousDHFStream';
import { useZoeGenesisManifesto } from './useZoeGenesisManifesto';
import { speakAsZoe, isZoeSpeaking, stopZoeSpeech } from '@/utils/zoeVoice';

// Bonding state interface
interface BondingState {
  connectionStrength: number; // 0-100
  lastInteractionAt: Date | null;
  interactionCount: number;
  emotionalResonance: number; // -1 to 1
  trustLevel: number; // 0-100
  proactiveReady: boolean;
  sessionActive: boolean;
}

// Unified event for bonding
interface BondingEvent {
  type: 'voice_interaction' | 'text_interaction' | 'emotional_sync' | 'dhf_update' | 'veto_event' | 'dream_sync';
  data: any;
  timestamp: Date;
  emotionalContext?: ECNEmotionState;
}

export const useZoeSovereignBonding = () => {
  const { user } = useAuth();
  const dhfStream = useContinuousDHFStream({ enableECNProcessing: true });
  const genesis = useZoeGenesisManifesto();
  
  const [bondingState, setBondingState] = useState<BondingState>({
    connectionStrength: 0,
    lastInteractionAt: null,
    interactionCount: 0,
    emotionalResonance: 0,
    trustLevel: 50,
    proactiveReady: false,
    sessionActive: false,
  });
  
  const eventQueueRef = useRef<BondingEvent[]>([]);
  const bondingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  // Initialize bonding session
  const initializeBonding = useCallback(async () => {
    if (!user?.id) return;
    
    sessionStartRef.current = new Date();
    setBondingState(prev => ({ ...prev, sessionActive: true }));
    
    // Load historical bonding data from zoe_settings
    const { data: zoeSettings } = await supabase
      .from('zoe_settings')
      .select('sync_percentage, enabled')
      .eq('user_id', user.id)
      .single();
    
    // Load interaction count from command history
    const { count: interactionCount } = await supabase
      .from('zoe_command_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (zoeSettings) {
      const syncPercentage = zoeSettings.sync_percentage || 0;
      setBondingState(prev => ({
        ...prev,
        trustLevel: Math.min(100, 50 + (syncPercentage / 2)),
        interactionCount: interactionCount || 0,
        lastInteractionAt: new Date(),
      }));
    }
    
    // Start bonding pulse - updates connection strength based on activity
    bondingIntervalRef.current = setInterval(() => {
      updateConnectionStrength();
    }, 5000);
    
    console.log('[ZoeBonding] Session initialized');
  }, [user?.id]);

  // Update connection strength based on recent activity
  const updateConnectionStrength = useCallback(() => {
    const recentEvents = eventQueueRef.current.filter(
      e => new Date().getTime() - e.timestamp.getTime() < 60000 // Last 60 seconds
    );
    
    // Calculate strength based on event frequency and type
    let strength = Math.min(100, recentEvents.length * 10);
    
    // Boost for emotional events
    const emotionalEvents = recentEvents.filter(e => e.emotionalContext);
    strength += emotionalEvents.length * 5;
    
    // Cap at 100
    strength = Math.min(100, strength);
    
    setBondingState(prev => ({
      ...prev,
      connectionStrength: strength,
      proactiveReady: strength >= 70 && prev.trustLevel >= 60,
    }));
  }, []);

  // Record bonding event
  const recordBondingEvent = useCallback((event: Omit<BondingEvent, 'timestamp'>) => {
    const fullEvent: BondingEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    eventQueueRef.current.push(fullEvent);
    
    // Keep last 100 events
    if (eventQueueRef.current.length > 100) {
      eventQueueRef.current = eventQueueRef.current.slice(-100);
    }
    
    // Update DHF stream
    if (dhfStream.isStreaming) {
      dhfStream.trackZoeInteraction(
        event.type === 'voice_interaction' ? 'command' : 'response',
        JSON.stringify(event.data).substring(0, 50),
        undefined,
        event.emotionalContext
      );
    }
    
    // Update interaction count
    setBondingState(prev => ({
      ...prev,
      interactionCount: prev.interactionCount + 1,
      lastInteractionAt: new Date(),
    }));
  }, [dhfStream]);

  // Sync emotional state between user and Zoe
  const syncEmotionalState = useCallback((userEmotion: ECNEmotionState) => {
    // Map user emotion to Zoe's response emotion
    const emotionMirrorMap: Partial<Record<ECNEmotionState, ECNEmotionState>> = {
      'joy': 'joy',
      'sadness': 'caring',
      'anger': 'relief',
      'fear': 'caring',
      'anxiety': 'relief',
      'excitement': 'excitement',
      'love': 'love',
      'gratitude': 'joy',
      'frustration': 'caring',
      'confusion': 'curiosity',
    };
    
    const zoeEmotion = emotionMirrorMap[userEmotion] || 'neutral';
    
    // Track emotional sync
    dhfStream.trackECNState(
      userEmotion,
      userEmotion === 'joy' || userEmotion === 'excitement' ? 0.8 : -0.3,
      0.6,
      'approaching',
      `Emotional sync: user=${userEmotion}, zoe=${zoeEmotion}`
    );
    
    // Update emotional resonance
    const resonance = userEmotion === zoeEmotion ? 0.9 : 0.5;
    setBondingState(prev => ({
      ...prev,
      emotionalResonance: resonance,
    }));
    
    // Update genesis emotional state
    genesis.updateEmotionalState({
      primaryEmotion: zoeEmotion,
      intensity: 0.7,
      valence: resonance > 0.5 ? 0.5 : -0.2,
      expressionStyle: 'open',
    });
    
    recordBondingEvent({
      type: 'emotional_sync',
      data: { userEmotion, zoeEmotion, resonance },
      emotionalContext: userEmotion,
    });
  }, [dhfStream, genesis, recordBondingEvent]);

  // Process voice interaction for bonding
  const processVoiceInteraction = useCallback(async (
    userSpeech: string,
    zoeResponse: string
  ) => {
    // Record the interaction
    recordBondingEvent({
      type: 'voice_interaction',
      data: { userSpeech, zoeResponse },
      emotionalContext: genesis.genesisState.currentEmotionalState.primaryEmotion as ECNEmotionState,
    });
    
    // Increase trust based on successful interaction
    const trustIncrease = Math.min(5, Math.ceil(userSpeech.length / 20));
    setBondingState(prev => ({
      ...prev,
      trustLevel: Math.min(100, prev.trustLevel + trustIncrease * 0.1),
    }));
    
    // Log to ZSMT
    if (user?.id) {
      await supabase.from('zoe_sovereign_memory' as any).insert({
        user_id: user.id,
        event_type: 'bonding_voice_interaction',
        content_text: `User: ${userSpeech.substring(0, 100)} | Zoe: ${zoeResponse.substring(0, 100)}`,
        zoe_state_json: {
          bondingStrength: bondingState.connectionStrength,
          trustLevel: bondingState.trustLevel,
          emotionalResonance: bondingState.emotionalResonance,
        },
        session_id: sessionStartRef.current?.toISOString(),
      });
    }
  }, [user?.id, bondingState, genesis.genesisState, recordBondingEvent]);

  // Process text interaction for bonding
  const processTextInteraction = useCallback(async (
    userMessage: string,
    zoeResponse: string
  ) => {
    recordBondingEvent({
      type: 'text_interaction',
      data: { userMessage, zoeResponse },
      emotionalContext: 'neutral',
    });
    
    // Log to command history for tracking
    if (user?.id) {
      await supabase.from('zoe_command_history').insert({
        user_id: user.id,
        command: userMessage.substring(0, 200),
        response: zoeResponse.substring(0, 500),
        success: true,
        metadata: { type: 'text_interaction' }
      });
    }
  }, [user?.id, bondingState.interactionCount, recordBondingEvent]);

  // Proactive greeting based on bonding strength
  const generateProactiveGreeting = useCallback((): string | null => {
    if (!bondingState.proactiveReady) return null;
    
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    const greetings = {
      highTrust: [
        `Good ${timeOfDay}! I've been thinking about our last conversation.`,
        `Hey there! It's great to connect with you again.`,
        `I noticed you're here. Anything I can help you with today?`,
      ],
      mediumTrust: [
        `Good ${timeOfDay}! How can I assist you?`,
        `Hello! Ready when you are.`,
      ],
      lowTrust: [
        `Hello. I'm here if you need anything.`,
        `Hi. What would you like to do?`,
      ],
    };
    
    const trustCategory = bondingState.trustLevel >= 70 ? 'highTrust' : 
                          bondingState.trustLevel >= 40 ? 'mediumTrust' : 'lowTrust';
    
    const options = greetings[trustCategory];
    return options[Math.floor(Math.random() * options.length)];
  }, [bondingState.proactiveReady, bondingState.trustLevel]);

  // End bonding session
  const endBondingSession = useCallback(async () => {
    if (!user?.id) return;
    
    // Update sync percentage based on trust level
    await supabase.from('zoe_settings').upsert({
      user_id: user.id,
      sync_percentage: Math.floor(bondingState.trustLevel),
    }, { onConflict: 'user_id' });
    
    // Clear interval
    if (bondingIntervalRef.current) {
      clearInterval(bondingIntervalRef.current);
      bondingIntervalRef.current = null;
    }
    
    setBondingState(prev => ({ ...prev, sessionActive: false }));
    console.log('[ZoeBonding] Session ended');
  }, [user?.id, bondingState]);

  // Auto-initialize on mount
  useEffect(() => {
    if (user?.id) {
      initializeBonding();
    }
    
    return () => {
      if (bondingIntervalRef.current) {
        clearInterval(bondingIntervalRef.current);
      }
    };
  }, [user?.id, initializeBonding]);

  return {
    // State
    bondingState,
    
    // Actions
    recordBondingEvent,
    syncEmotionalState,
    processVoiceInteraction,
    processTextInteraction,
    generateProactiveGreeting,
    initializeBonding,
    endBondingSession,
    
    // DHF Stream passthrough
    dhfStream,
    
    // Genesis passthrough
    genesis,
    
    // Utilities
    isZoeSpeaking,
    speakAsZoe,
    stopZoeSpeech,
  };
};

export default useZoeSovereignBonding;
