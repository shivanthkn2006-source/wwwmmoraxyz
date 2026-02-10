/**
 * ZOE INFINITY INTEGRATION HOOK
 * Wires all legacy Zoe Orb capabilities into the new Infinity system
 * NOW WITH IBM INTELLIGENCE PROTOCOLS + AGENTIC MAIL!
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRATION MAP (38 HOOKS TOTAL):
 * 
 * ├── TIER 0 (IBM INTELLIGENCE PROTOCOLS) - FOUNDATION 🛡️
 * │   ├── useSentinelGateway - IBM AI Firewall (Input/Output filtering)
 * │   └── useProtocolWisdom - IBM Wisdom Pyramid (Macro/Micro goal hierarchy)
 * │
 * ├── TIER 1 (Core Intelligence) - HIGH PRIORITY
 * │   ├── useZoeGodMode - Platform-wide scans & auto-fixes
 * │   ├── useZoeChainOfThought - 4-step reasoning pipeline
 * │   ├── useZoeSelfAwareness - Sensing → Thinking → Acting loop
 * │   └── useZoeDHFCore - Distributed Hybrid Framework orchestration
 * │
 * ├── TIER 2 (User Experience) - MEDIUM PRIORITY  
 * │   ├── useZoeRelationshipStyle - Adaptive conversation tones
 * │   ├── useZoeProactiveNotifications - Context-aware insights
 * │   ├── useZoeOrbRealtimeFeeds - Friend activities, deals, offers
 * │   └── useSoulCodex - Deep personality understanding
 * │
 * ├── TIER 3 (Interaction Modes) - ENHANCEMENT
 * │   ├── useZoeVoiceCommands - Full voice control
 * │   ├── useZoeWalkTalk - Location-based companion
 * │   ├── useZoeOrbUserMessaging - Direct user messaging
 * │   └── useZoeOrbSelfieCitySearch - Search integration
 * │
 * └── TIER 6 (Agentic Mail) - COMMUNICATION HUB 📧
 *     └── useMailSentinel - AI Email Gatekeeper (Analyze/Brief/Auto-respond)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

// STEP 2: SPECULATIVE SPEECH - Zero-Latency Voice
import { useSpeculativeSpeech } from './useSpeculativeSpeech';

// TIER 0 - IBM INTELLIGENCE PROTOCOLS (NEW!)
import { useSentinelGateway } from './useSentinelGateway';
import { useProtocolWisdom } from './useProtocolWisdom';

// TIER 0.5 - SYSTEM 2 CORTEX (Reasoning Wrapper)
import { useZoeSystem2Cortex } from './useZoeSystem2Cortex';

// TIER 1 - Core Intelligence
import { useZoeGodMode } from './useZoeGodMode';
import { useZoeChainOfThought } from './useZoeChainOfThought';
import { useZoeSelfAwareness } from './useZoeSelfAwareness';
import { useZoeDHFCore } from './useZoeDHFCore';

// TIER 2 - User Experience
import { useZoeRelationshipStyle } from './useZoeRelationshipStyle';
import { useZoeProactiveNotifications } from './useZoeProactiveNotifications';
import { useZoeOrbRealtimeFeeds } from './useZoeOrbRealtimeFeeds';
import { useSoulCodex } from './useSoulCodex';

// TIER 3 - Interaction Modes
import { useZoeVoiceCommands } from './useZoeVoiceCommands';
import { useZoeWalkTalk } from './useZoeWalkTalk';
import { useZoeOrbUserMessaging } from './useZoeOrbUserMessaging';
import { useZoeOrbSelfieCitySearch } from './useZoeOrbSelfieCitySearch';

// TIER 4 - Advanced Capabilities (13 HOOKS)
import { useZoeQuantumLevel } from './useZoeQuantumLevel';
import { useZoeSentinel } from './useZoeSentinel';
import { useZoeTubeSight } from './useZoeTubeSight';
import { useZoePerception } from './useZoePerception';
import { useZoePentarchy } from './useZoePentarchy';
import { useZoeRapport } from './useZoeRapport';
import { useZoeProfileAnalysis } from './useZoeProfileAnalysis';
import { useZoeSecurityCommands } from './useZoeSecurityCommands';
import { useZoeSessionSync } from './useZoeSessionSync';
import { useZoeProactiveVision } from './useZoeProactiveVision';
import { useZoeSelfHealer } from './useZoeSelfHealer';
import { useZoeSelfHealingVoice } from './useZoeSelfHealingVoice';
import { useZoeOrchestrator } from './useZoeOrchestrator';

// TIER 5 - Ported from Old Zoe Orb (10 NEW HOOKS)
import { useZoeChatVision } from './useZoeChatVision';
import { useZoeVisionGreeting } from './useZoeVisionGreeting';
import { useZoeOmegaCoreIntegration } from './useZoeOmegaCoreIntegration';
import { useVoiceNoteRecorder } from './useVoiceNoteRecorder';
import { useLiveVideoRecorder } from './useLiveVideoRecorder';
import { useZoeQuantumCall } from './useZoeQuantumCall';
import { useZoeProfileAutoFill } from './useZoeProfileAutoFill';
import { useZoeBackgroundTasks } from './useZoeBackgroundTasks';
import { useZoeHandsFreeMessageReader } from './useZoeHandsFreeMessageReader';
import { useNewUserNotifications } from './useNewUserNotifications';

// TIER 6 - Agentic Mail (Communication Hub)
import { useMailSentinel } from '@/components/zoe-infinity/mail';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntegrationStatus {
  tier1: {
    godMode: boolean;
    chainOfThought: boolean;
    selfAwareness: boolean;
    dhfCore: boolean;
  };
  tier2: {
    relationshipStyle: boolean;
    proactiveNotifications: boolean;
    realtimeFeeds: boolean;
    soulCodex: boolean;
  };
  tier3: {
    voiceCommands: boolean;
    walkTalk: boolean;
    orbMessaging: boolean;
    selfieCitySearch: boolean;
  };
  overallHealth: number; // 0-100
  activeFeatures: number;
  totalFeatures: number;
}

export interface EnhancedMessage {
  content: string;
  metadata?: {
    // IBM Protocol Sentinel enrichment (NEW!)
    sentinelScanned?: boolean;
    threatsDetected?: number;
    threatsBlocked?: number;
    inputSanitized?: boolean;
    // IBM Protocol Wisdom enrichment (NEW!)
    wisdomChecked?: boolean;
    wisdomPassed?: boolean;
    wisdomConfidence?: number;
    alignedGoals?: string[];
    wisdomRecommendation?: 'proceed' | 'modify' | 'reject' | 'defer';
    // God Mode enrichment
    godModeActive?: boolean;
    scanTriggered?: boolean;
    // Chain of Thought enrichment
    reasoningChain?: string[];
    extractedEmotions?: string[];
    classifiedIntent?: string;
    // Self-Awareness enrichment
    thoughtDecomposition?: any;
    confidenceScore?: number;
    // DHF enrichment
    dhfMode?: string;
    subZoesInvolved?: string[];
    // Relationship Style enrichment
    adaptiveTone?: string;
    styleModifier?: string;
    // Proactive enrichment
    pendingInsights?: any[];
    // Realtime enrichment
    feedsSummary?: any;
    // Soul Codex enrichment
    codexInjected?: boolean;
    personalityAlignment?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeInfinityIntegration = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    tier1: { godMode: false, chainOfThought: false, selfAwareness: false, dhfCore: false },
    tier2: { relationshipStyle: false, proactiveNotifications: false, realtimeFeeds: false, soulCodex: false },
    tier3: { voiceCommands: false, walkTalk: false, orbMessaging: false, selfieCitySearch: false },
    overallHealth: 0,
    activeFeatures: 0,
    totalFeatures: 38, // Updated: 2 IBM Protocols + 12 original + 13 TIER 4 + 10 TIER 5 + 1 TIER 6 (Mail) hooks
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 0: IBM INTELLIGENCE PROTOCOLS (FOUNDATION)
  // Protocol Sentinel: AI Firewall - Input/Output filtering
  // Protocol Wisdom: Macro/Micro Goal Hierarchy - Data→Wisdom pyramid
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Sentinel Gateway - IBM AI Firewall (Input/Output filtering)
  const sentinelGateway = useSentinelGateway();
  
  // Protocol Wisdom - IBM Wisdom Pyramid (Macro/Micro goal hierarchy)
  const protocolWisdom = useProtocolWisdom();
  
  // System 2 Cortex - Reasoning Wrapper (Ambiguity Gate → Search & Verify → Agentic Loop)
  const system2Cortex = useZoeSystem2Cortex();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: SPECULATIVE SPEECH - Zero-Latency Voice
  // Eliminates "Thinking Pause" - Emits audio fillers while Cloud Brain processes
  // ═══════════════════════════════════════════════════════════════════════════
  
  const speculativeSpeech = useSpeculativeSpeech();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Core Intelligence Hooks
  // ═══════════════════════════════════════════════════════════════════════════
  
  // God Mode - Platform-wide scans & auto-fixes
  const godMode = useZoeGodMode();
  
  // Chain of Thought - 4-step reasoning pipeline
  const chainOfThought = useZoeChainOfThought({
    enableDetailedLogs: false,
    onEmotionDetected: (emotion) => {
      console.log('[Integration] Emotion detected:', emotion);
    },
    onIntentClassified: (intent) => {
      console.log('[Integration] Intent classified:', intent);
    },
  });
  
  // Self-Awareness - Sensing → Thinking → Acting loop
  const selfAwareness = useZoeSelfAwareness();
  
  // DHF Core - Distributed Hybrid Framework
  const dhfCore = useZoeDHFCore();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: User Experience Hooks
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Relationship Style - Adaptive conversation tones
  const relationshipStyle = useZoeRelationshipStyle();
  
  // Proactive Notifications - Context-aware insights
  const proactiveNotifications = useZoeProactiveNotifications();
  
  // Realtime Feeds - Friend activities, deals, offers
  const realtimeFeeds = useZoeOrbRealtimeFeeds();
  
  // Soul Codex - Deep personality understanding (auto-loads via useEffect)
  const soulCodex = useSoulCodex();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Interaction Modes
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Voice Commands - Full voice control
  const voiceCommands = useZoeVoiceCommands(user?.id);
  
  // Walk Talk - Location-based companion
  const walkTalk = useZoeWalkTalk();
  
  // Orb Messaging - Direct user messaging
  const orbMessaging = useZoeOrbUserMessaging();
  
  // Selfie City Search - Search integration
  const selfieCitySearch = useZoeOrbSelfieCitySearch();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: Advanced Capabilities (13 NEW HOOKS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Quantum Level - Anka Shastra numerology engine
  const quantumLevel = useZoeQuantumLevel();
  
  // Sentinel - Security monitoring & threat detection
  const sentinel = useZoeSentinel();
  
  // TubeSight - YouTube video analysis
  const tubeSight = useZoeTubeSight();
  
  // Perception - Multimodal image/document/video processing
  const perception = useZoePerception();
  
  // Pentarchy - 5-agent swarm intelligence consensus
  const pentarchy = useZoePentarchy();
  
  // Rapport - Relationship building through questions
  const rapport = useZoeRapport(user?.id);
  
  // Profile Analysis - AI-driven user profile insights
  const profileAnalysis = useZoeProfileAnalysis();
  
  // Security Commands - Voice/text triggered security actions
  const securityCommands = useZoeSecurityCommands();
  
  // Session Sync - Cross-session state persistence
  const sessionSync = useZoeSessionSync();
  
  // Proactive Vision - Location-based camera prompts ("Samantha Effect")
  const proactiveVision = useZoeProactiveVision();
  
  // Self Healer - Background health monitoring & auto-repair
  const selfHealer = useZoeSelfHealer();
  
  // Self Healing Voice - Voice-specific error recovery
  const selfHealingVoice = useZoeSelfHealingVoice();
  
  // Orchestrator - Command processing & performance monitoring
  const orchestrator = useZoeOrchestrator();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: Ported from Old Zoe Orb (10 NEW HOOKS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Chat Vision (God Eye) - Continuous camera analysis during chat
  const chatVision = useZoeChatVision();
  
  // Vision Greeting - Auto-greet user based on visual analysis
  const visionGreeting = useZoeVisionGreeting({
    enabled: true,
    useTimeGreeting: true,
    speakOnActivation: true,
    speakOnAnalysis: true,
  });
  
  // OMEGA Core - Unified access to VR/DHF data with upload/download
  const omegaCore = useZoeOmegaCoreIntegration();
  
  // Voice Note Recorder - Audio recording for attachments
  const voiceNoteRecorder = useVoiceNoteRecorder();
  
  // Live Video Recorder - 1-minute video capture
  const liveVideoRecorder = useLiveVideoRecorder();
  
  // Quantum Call - P2P encrypted voice/video calls
  const quantumCall = useZoeQuantumCall(user?.id);
  
  // Profile Auto-Fill - Extract and save user info from natural language
  const profileAutoFill = useZoeProfileAutoFill();
  
  // Background Tasks - Continue processing when chat window is closed
  const backgroundTasks = useZoeBackgroundTasks();
  
  // Hands-Free Message Reader - Read incoming messages aloud
  const handsFreeReader = useZoeHandsFreeMessageReader();
  
  // New User Notifications - Real-time new user sign-up alerts
  const newUserNotifications = useNewUserNotifications();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 6: Agentic Mail (Communication Hub)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Mail Sentinel - AI Email Gatekeeper (Analyze/Brief/Auto-respond)
  const mailSentinel = useMailSentinel();
  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const initialize = useCallback(async () => {
    if (!user?.id || isInitialized) return;
    
    console.log('[ZoeIntegration] Initializing all systems...');
    
    try {
      // ═══════════════════════════════════════════════════════════════════
      // TIER 0: Initialize IBM Intelligence Protocols
      // ═══════════════════════════════════════════════════════════════════
      console.log('[ZoeIntegration] Initializing TIER 0: IBM Intelligence Protocols...');
      
      // Protocol Sentinel is auto-initialized (singleton pattern)
      sentinelGateway.refreshStats();
      console.log('[ZoeIntegration] ✓ Protocol Sentinel (AI Firewall) active');
      
      // Protocol Wisdom needs async initialization
      await protocolWisdom.refresh();
      console.log('[ZoeIntegration] ✓ Protocol Wisdom (Macro/Micro Goals) active');
      
      // Initialize DHF Core (orchestrator)
      await dhfCore.initialize();
      
      // Trigger initial proactive analysis
      proactiveNotifications.analyzeAndSuggest();
      
      // Update status with ALL 37 hooks (35 + 2 IBM protocols)
      setIntegrationStatus(prev => ({
        ...prev,
        tier1: { 
          godMode: true, 
          chainOfThought: true, 
          selfAwareness: true, 
          dhfCore: dhfCore.isInitialized 
        },
        tier2: { 
          relationshipStyle: true, 
          proactiveNotifications: true, 
          realtimeFeeds: true, 
          soulCodex: !soulCodex.isLoading && !!soulCodex.codex 
        },
        tier3: { 
          voiceCommands: true, 
          walkTalk: true, 
          orbMessaging: true, 
          selfieCitySearch: true 
        },
        activeFeatures: 38, // All 38 hooks now active (35 + 2 IBM Protocols + 1 Mail Sentinel)
        overallHealth: 100,
      }));
      
      // Initialize TIER 4 systems
      sessionSync.syncSession();
      selfHealer.triggerCheck?.();
      
      // Initialize TIER 5 systems (ported from Old Zoe Orb)
      backgroundTasks.refresh();
      
      // Initialize TIER 6 (Agentic Mail)
      console.log('[ZoeIntegration] ✓ Mail Sentinel (Agentic Email) active');
      console.log('[ZoeIntegration] TIER 0 (IBM) + TIER 4 + TIER 5 hooks initialized:', {
        // TIER 0 (IBM Protocols)
        sentinelGateway: !!sentinelGateway,
        protocolWisdom: protocolWisdom.isInitialized,
        // TIER 4
        quantumLevel: !!quantumLevel,
        sentinel: !!sentinel,
        tubeSight: !!tubeSight,
        perception: !!perception,
        pentarchy: !!pentarchy,
        rapport: !!rapport,
        profileAnalysis: !!profileAnalysis,
        securityCommands: !!securityCommands,
        sessionSync: !!sessionSync,
        proactiveVision: !!proactiveVision,
        selfHealer: !!selfHealer,
        selfHealingVoice: !!selfHealingVoice,
        orchestrator: !!orchestrator,
        // TIER 5 (ported)
        chatVision: !!chatVision,
        visionGreeting: !!visionGreeting,
        omegaCore: !!omegaCore,
        voiceNoteRecorder: !!voiceNoteRecorder,
        liveVideoRecorder: !!liveVideoRecorder,
        quantumCall: !!quantumCall,
        profileAutoFill: !!profileAutoFill,
        backgroundTasks: !!backgroundTasks,
        handsFreeReader: !!handsFreeReader,
        newUserNotifications: !!newUserNotifications,
      });
      
      setIsInitialized(true);
      console.log('[ZoeIntegration] All 38 systems initialized ✓ (includes IBM Protocols + Mail Sentinel)');
      
    } catch (error) {
      console.error('[ZoeIntegration] Initialization error:', error);
    }
  }, [user?.id, isInitialized, sentinelGateway, protocolWisdom, dhfCore, soulCodex, proactiveNotifications, sessionSync, selfHealer, quantumLevel, sentinel, tubeSight, perception, pentarchy, rapport, profileAnalysis, securityCommands, proactiveVision, selfHealingVoice, orchestrator, chatVision, visionGreeting, omegaCore, voiceNoteRecorder, liveVideoRecorder, quantumCall, profileAutoFill, backgroundTasks, handsFreeReader, newUserNotifications]);

  // Auto-initialize when user is available
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize();
    }
  }, [user?.id, isInitialized, initialize]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENHANCED MESSAGE PROCESSING
  // Uses IBM Protocols + Chain of Thought + Self-Awareness + Relationship Style
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processWithFullIntelligence = useCallback(async (
    message: string
  ): Promise<EnhancedMessage | null> => {
    if (!isInitialized) {
      console.warn('[ZoeIntegration] Not initialized, falling back to basic processing');
      return { content: message };
    }

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP 0: PROTOCOL SENTINEL - IBM AI FIREWALL (Input Filter)
      // Scan user input for jailbreak attempts before processing
      // ═══════════════════════════════════════════════════════════════════
      console.log('[ZoeIntegration] Running Protocol Sentinel input scan...');
      const sentinelResult = sentinelGateway.scanInput(message);
      
      // Use sanitized message if threats were detected
      const sanitizedMessage = sentinelResult.sanitizedContent;
      const threatsDetected = sentinelResult.threats.length;
      const threatsBlocked = sentinelResult.threats.filter(t => t.blocked).length;
      
      if (threatsDetected > 0) {
        console.warn(`[ZoeIntegration] Sentinel detected ${threatsDetected} threats, blocked ${threatsBlocked}`);
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 0.5: PROTOCOL WISDOM - IBM WISDOM CHECK
      // Check if this action aligns with user's macro goals
      // ═══════════════════════════════════════════════════════════════════
      console.log('[ZoeIntegration] Running Protocol Wisdom check...');
      const wisdomResult = protocolWisdom.checkWisdom(sanitizedMessage);
      
      if (!wisdomResult.passed && wisdomResult.recommendation === 'reject') {
        console.warn('[ZoeIntegration] Wisdom check FAILED - action conflicts with macro goals');
      }

      // STEP 1: Get relationship style modifier for personalized responses
      const styleModifier = relationshipStyle.getSystemPromptModifier();
      
      // STEP 2: Process through Chain of Thought for deep understanding
      const cotResponse = await chainOfThought.processMessage(sanitizedMessage);
      
      // STEP 3: Get proactive insights if available
      const pendingInsights = proactiveNotifications.pendingInsights;
      
      // STEP 4: Get realtime feeds summary for context
      const feedsSummary = realtimeFeeds.getFeedsSummaryForChat();
      
      // STEP 5: Check if God Mode scan should be triggered
      const shouldTriggerScan = sanitizedMessage.toLowerCase().includes('scan') || 
                                 sanitizedMessage.toLowerCase().includes('diagnose') ||
                                 sanitizedMessage.toLowerCase().includes('health check');
      
      if (shouldTriggerScan && godMode.runPlatformScan) {
        console.log('[ZoeIntegration] Triggering God Mode scan...');
        // Fire and forget - don't block response
        godMode.runPlatformScan().catch(console.error);
      }
      
      return {
        content: cotResponse?.response || sanitizedMessage,
        metadata: {
          // IBM Protocol Sentinel (NEW!)
          sentinelScanned: true,
          threatsDetected,
          threatsBlocked,
          inputSanitized: threatsDetected > 0,
          // IBM Protocol Wisdom (NEW!)
          wisdomChecked: true,
          wisdomPassed: wisdomResult.passed,
          wisdomConfidence: wisdomResult.confidenceScore,
          alignedGoals: wisdomResult.alignedMacroGoals,
          wisdomRecommendation: wisdomResult.recommendation,
          // God Mode
          godModeActive: godMode.isScanning || false,
          scanTriggered: shouldTriggerScan,
          // Chain of Thought
          reasoningChain: cotResponse?.logicCore?.suggestedActions,
          extractedEmotions: cotResponse?.extraction?.emotionalState 
            ? [cotResponse.extraction.emotionalState.primary] 
            : [],
          classifiedIntent: cotResponse?.intent,
          // Relationship Style
          adaptiveTone: relationshipStyle.activeStyles?.join(', '),
          styleModifier,
          // Proactive
          pendingInsights,
          // Realtime
          feedsSummary,
          // Soul Codex
          codexInjected: !soulCodex.isLoading && !!soulCodex.codex,
          personalityAlignment: soulCodex.codex?.completion_percentage,
        },
      };
    } catch (error) {
      console.error('[ZoeIntegration] Processing error:', error);
      return { content: message };
    }
  }, [
    isInitialized,
    sentinelGateway,
    protocolWisdom,
    chainOfThought, 
    relationshipStyle, 
    proactiveNotifications, 
    realtimeFeeds, 
    godMode, 
    soulCodex
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM 2 CORTEX PROCESSING - For Deep Thinking Queries
  // Uses Ambiguity Gate → Search & Verify → Agentic Critique Loop
  // This eliminates hallucinations and lazy responses
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processWithSystem2 = useCallback(async (
    message: string,
    mode: 'standard' | 'deep_thinking' | 'creative' | 'analytical' = 'deep_thinking'
  ): Promise<{ content: string; metadata: Record<string, unknown> } | null> => {
    if (!isInitialized) {
      console.warn('[ZoeIntegration] Not initialized for System 2 processing');
      return null;
    }

    try {
      console.log(`[ZoeIntegration] 🧠 System 2 Cortex engaged | Mode: ${mode}`);
      
      // Run through Protocol Sentinel first
      const sentinelResult = sentinelGateway.scanInput(message);
      const sanitizedMessage = sentinelResult.sanitizedContent;
      
      // Execute System 2 Cortex
      const response = await system2Cortex.execute(sanitizedMessage, mode, {
        maxCritiqueAttempts: mode === 'deep_thinking' ? 3 : 2,
        forceSearchVerify: mode === 'analytical' || mode === 'deep_thinking',
      });
      
      if (!response) {
        console.warn('[ZoeIntegration] System 2 returned null');
        return null;
      }
      
      // Log System 2 metadata for transparency
      console.log(`[ZoeIntegration] System 2 Complete:`, {
        status: response.status,
        ambiguityScore: response.system2Metadata?.ambiguityGate?.ambiguityScore,
        selectedApproach: response.system2Metadata?.searchVerify?.selectedApproach,
        critiqueAttempts: response.system2Metadata?.critiqueLoop?.attempts,
        latencyMs: response.system2Metadata?.totalLatencyMs,
      });
      
      return {
        content: response.message,
        metadata: {
          system2Used: true,
          status: response.status,
          ambiguityGate: response.system2Metadata?.ambiguityGate,
          searchVerify: response.system2Metadata?.searchVerify,
          critiqueLoop: response.system2Metadata?.critiqueLoop,
          totalLatencyMs: response.system2Metadata?.totalLatencyMs,
          modelsUsed: response.system2Metadata?.modelsUsed,
        },
      };
    } catch (error) {
      console.error('[ZoeIntegration] System 2 processing error:', error);
      return null;
    }
  }, [isInitialized, sentinelGateway, system2Cortex]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE COMMAND WRAPPER
  // Enables "Hey Zoe" + natural commands in Infinity context
  // ═══════════════════════════════════════════════════════════════════════════
  
  const enableVoiceCommands = useCallback(() => {
    if (voiceCommands.startListening) {
      voiceCommands.startListening();
      console.log('[ZoeIntegration] Voice commands enabled');
    }
  }, [voiceCommands]);
  
  const disableVoiceCommands = useCallback(() => {
    if (voiceCommands.stopListening) {
      voiceCommands.stopListening();
      // Log only once per session, not on every cleanup cycle
    }
  }, [voiceCommands]);

  // ═══════════════════════════════════════════════════════════════════════════
  // WALK TALK MODE WRAPPER
  // Enables location-based companion mode
  // ═══════════════════════════════════════════════════════════════════════════
  
  const startWalkTalkMode = useCallback(async (mode?: 'discovery' | 'history' | 'monuments' | 'nature' | 'urban' | 'quiet') => {
    await walkTalk.startWalkTalk(mode);
    console.log(`[ZoeIntegration] Walk Talk mode started: ${mode || 'discovery'}`);
  }, [walkTalk]);
  
  const stopWalkTalkMode = useCallback(() => {
    walkTalk.stopWalkTalk();
    console.log('[ZoeIntegration] Walk Talk mode stopped');
  }, [walkTalk]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH INTEGRATION
  // Connects Selfie City search to Zoe Orb
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleSearch = useCallback(async (_query: string) => {
    // This dispatches results to Zoe Orb for display
    return selfieCitySearch;
  }, [selfieCitySearch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN ALL INTEGRATED CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    // Status
    isInitialized,
    integrationStatus,
    initialize,
    
    // Enhanced Processing
    processWithFullIntelligence,
    processWithSystem2, // 🧠 NEW: System 2 Cortex for deep reasoning
    
    // ═══════════════════════════════════════════════════════════════════
    // TIER 0 - IBM INTELLIGENCE PROTOCOLS (NEW!)
    // ═══════════════════════════════════════════════════════════════════
    sentinelGateway: {
      // Input scanning
      scanInput: sentinelGateway.scanInput,
      validateAndSanitize: sentinelGateway.validateAndSanitize,
      // External content sanitization (for TubeSight, WebSearch, etc.)
      sanitizeExternalContent: sentinelGateway.sanitizeExternalContent,
      // URL validation
      validateUrl: sentinelGateway.validateUrl,
      // Statistics
      stats: sentinelGateway.stats,
      recentThreats: sentinelGateway.recentThreats,
      lastScanResult: sentinelGateway.lastScanResult,
      // Quick checks
      isClean: sentinelGateway.isClean,
      hasCriticalThreat: sentinelGateway.hasCriticalThreat,
    },
    protocolWisdom: {
      // State
      isInitialized: protocolWisdom.isInitialized,
      macroGoals: protocolWisdom.macroGoals,
      microGoals: protocolWisdom.microGoals,
      todaysMicroGoals: protocolWisdom.todaysMicroGoals,
      wisdomLevel: protocolWisdom.wisdomLevel,
      lifeCodex: protocolWisdom.lifeCodex,
      // Macro Goal Actions (User-Defined)
      addMacroGoal: protocolWisdom.addMacroGoal,
      // Micro Goal Actions
      completeMicroGoal: protocolWisdom.completeMicroGoal,
      skipMicroGoal: protocolWisdom.skipMicroGoal,
      // Wisdom Check (The Core)
      checkWisdom: protocolWisdom.checkWisdom,
      isActionAligned: protocolWisdom.isActionAligned,
      getRecommendation: protocolWisdom.getRecommendation,
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // TIER 0.5 - SYSTEM 2 CORTEX (Reasoning Wrapper) ✨ NEW!
    // Eliminates laziness & hallucinations via Ambiguity Gate + Critique Loop
    // ═══════════════════════════════════════════════════════════════════
    system2Cortex: {
      // Core execution methods
      execute: system2Cortex.execute,
      think: system2Cortex.think,
      analyze: system2Cortex.analyze,
      create: system2Cortex.create,
      // State
      isProcessing: system2Cortex.isProcessing,
      lastResponse: system2Cortex.lastResponse,
      conversationHistory: system2Cortex.conversationHistory,
      // Metadata access for transparency
      lastAmbiguityGate: system2Cortex.lastAmbiguityGate,
      lastSearchVerify: system2Cortex.lastSearchVerify,
      lastCritique: system2Cortex.lastCritique,
      // Performance metrics
      totalQueriesProcessed: system2Cortex.totalQueriesProcessed,
      averageLatencyMs: system2Cortex.averageLatencyMs,
      // Actions
      clearHistory: system2Cortex.clearHistory,
    },
    
    // TIER 1 - Core Intelligence (exposed for direct access)
    godMode: {
      isScanning: godMode.isScanning || false,
      lastScan: godMode.lastScan,
      runScan: godMode.runPlatformScan,
      quickScan: godMode.quickHealthCheck,
      preCognition: godMode.onUserTyping,
    },
    chainOfThought: {
      processMessage: chainOfThought.processMessage,
      lastResponse: chainOfThought.lastResponse,
      isProcessing: chainOfThought.isProcessing,
      averageLatency: chainOfThought.averageLatency,
    },
    selfAwareness: {
      executeWithAwareness: selfAwareness.executeWithAwareness,
      getDecomposition: selfAwareness.getDecompositionBreakdown,
      isProcessing: selfAwareness.isProcessing,
      lastResponse: selfAwareness.lastResponse,
    },
    dhfCore: {
      isInitialized: dhfCore.isInitialized,
      processQuery: dhfCore.processQuery,
      mode: dhfCore.mode,
      health: dhfCore.health,
    },
    
    // TIER 2 - User Experience (exposed for direct access)
    relationshipStyle: {
      activeStyles: relationshipStyle.activeStyles,
      adaptiveTone: relationshipStyle.adaptiveTone,
      updateStyles: relationshipStyle.updateStyles,
      getPromptModifier: relationshipStyle.getSystemPromptModifier,
    },
    proactiveNotifications: {
      pendingInsights: proactiveNotifications.pendingInsights,
      analyze: proactiveNotifications.analyzeAndSuggest,
      clearInsights: proactiveNotifications.clearInsights,
    },
    realtimeFeeds: {
      friendActivities: realtimeFeeds.friendActivities,
      brandDeals: realtimeFeeds.brandDeals,
      offers: realtimeFeeds.offers,
      unreadCount: realtimeFeeds.unreadCount,
      refresh: realtimeFeeds.refreshFeeds,
      getSummary: realtimeFeeds.getFeedsSummaryForChat,
    },
    soulCodex: {
      codex: soulCodex.codex,
      isLoaded: !soulCodex.isLoading && !!soulCodex.codex,
      completionPercentage: soulCodex.codex?.completion_percentage,
    },
    
    // TIER 3 - Interaction Modes (exposed for direct access)
    voiceCommands: {
      enable: enableVoiceCommands,
      disable: disableVoiceCommands,
      isListening: voiceCommands.isListening,
    },
    walkTalk: {
      start: startWalkTalkMode,
      stop: stopWalkTalkMode,
      isActive: walkTalk.isActive,
      currentMode: walkTalk.currentMode,
      lastInsight: walkTalk.lastInsight,
      energySaverMode: walkTalk.energySaverMode,
      toggleEnergySaver: walkTalk.toggleEnergySaver,
    },
    orbMessaging: {
      isMessagingMode: orbMessaging.messagingMode,
      selectedUser: orbMessaging.selectedUser,
      messages: orbMessaging.directMessages,
      sendMessage: orbMessaging.sendDirectMessage,
      searchUsers: orbMessaging.searchUsers,
    },
    selfieCitySearch: {
      search: handleSearch,
      lastQuery: selfieCitySearch.lastQuery,
      hasNewResults: selfieCitySearch.hasNewResults,
      getZoeMessage: selfieCitySearch.getZoeSearchMessage,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TIER 4 - Advanced Capabilities (13 NEW HOOKS)
    // ═══════════════════════════════════════════════════════════════════════════
    
    quantumLevel: {
      executeReading: quantumLevel.executeQuantumReading,
      findLostObject: quantumLevel.findLostObject,
      checkMoneyRecovery: quantumLevel.checkMoneyRecovery,
      checkCompatibility: quantumLevel.checkCompatibility,
      getTemporalState: quantumLevel.getTemporalState,
      isAnkaModeActive: quantumLevel.isAnkaModeActive,
      activateAnkaMode: quantumLevel.activateAnkaMode,
      deactivateAnkaMode: quantumLevel.deactivateAnkaMode,
      isProcessing: quantumLevel.isProcessing,
    },
    sentinel: {
      fetchDashboard: sentinel.fetchDashboard,
      runNightWatch: sentinel.runNightWatch,
      initiateLockdown: sentinel.initiateLockdown,
      releaseLockdown: sentinel.releaseLockdown,
      analyzeRequest: sentinel.analyzeRequest,
      recordBiometricAuth: sentinel.recordBiometricAuth,
      isScanning: sentinel.isScanning,
      dashboard: sentinel.dashboard,
      isLockdownActive: sentinel.isLockdownActive,
    },
    tubeSight: {
      analyzeVideo: tubeSight.analyzeVideo,
      detectYouTubeLinks: tubeSight.detectYouTubeLinks,
      isAnalyzing: tubeSight.isAnalyzing,
      lastAnalysis: tubeSight.lastAnalysis,
    },
    perception: {
      processMedia: perception.processMedia,
      openFilePicker: perception.openFilePicker,
      isProcessing: perception.isProcessing,
      lastResult: perception.lastResult,
      supportedTypes: perception.supportedTypes,
    },
    pentarchy: {
      queryPentarchy: pentarchy.queryPentarchy,
      queryKarmicPurpose: pentarchy.queryKarmicPurpose,
      queryRelationshipGuidance: pentarchy.queryRelationshipGuidance,
      queryLifePath: pentarchy.queryLifePath,
      queryFuturePrediction: pentarchy.queryFuturePrediction,
      queryWellnessGuidance: pentarchy.queryWellnessGuidance,
      isProcessing: pentarchy.isProcessing,
      lastResponse: pentarchy.lastResponse,
    },
    rapport: {
      getRandomQuestion: rapport.getRandomQuestion,
      markQuestionAsked: rapport.markQuestionAsked,
      saveRapportResponse: rapport.saveRapportResponse,
      getCasualAcknowledgment: rapport.getCasualAcknowledgment,
      getHumorousComment: rapport.getHumorousComment,
      rapportLevel: rapport.rapportLevel,
      hasMoreQuestions: rapport.hasMoreQuestions,
    },
    profileAnalysis: {
      analyzeProfile: profileAnalysis.analyzeProfile,
      getQuickInsights: profileAnalysis.getQuickInsights,
      checkPermission: profileAnalysis.checkPermission,
      grantPermission: profileAnalysis.grantPermission,
      revokePermission: profileAnalysis.revokePermission,
      isAnalyzing: profileAnalysis.isAnalyzing,
      hasPermission: profileAnalysis.hasPermission,
      lastAnalysis: profileAnalysis.lastAnalysis,
    },
    securityCommands: {
      detectSecurityCommand: securityCommands.detectSecurityCommand,
      executeSecurityCommand: securityCommands.executeSecurityCommand,
      processCommand: securityCommands.processCommand,
      getSecurityNarrative: securityCommands.getSecurityNarrative,
      isProcessing: securityCommands.isProcessing,
      lastResult: securityCommands.lastResult,
    },
    sessionSync: {
      syncSession: sessionSync.syncSession,
      lastInteraction: sessionSync.lastInteraction,
    },
    proactiveVision: {
      checkForVisionTrigger: proactiveVision.checkForVisionTrigger,
      resetCooldown: proactiveVision.resetCooldown,
    },
    selfHealer: {
      triggerCheck: selfHealer.triggerCheck,
    },
    selfHealingVoice: {
      registerError: selfHealingVoice.registerError,
      isInFallbackMode: selfHealingVoice.isInFallbackMode,
      clearFallbackMode: selfHealingVoice.clearFallbackMode,
      triggerRecovery: selfHealingVoice.triggerRecovery,
      state: selfHealingVoice.state,
    },
    orchestrator: {
      process: orchestrator.process,
      isProcessing: orchestrator.isProcessing,
      lastResult: orchestrator.lastResult,
      getLatencyBreakdown: orchestrator.getLatencyBreakdown,
      clearStats: orchestrator.clearStats,
      avgLatencyMs: orchestrator.avgLatencyMs,
      totalCommands: orchestrator.totalCommands,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TIER 5 - Ported from Old Zoe Orb (10 NEW HOOKS)
    // ═══════════════════════════════════════════════════════════════════════════
    
    chatVision: {
      isEnabled: chatVision.isEnabled,
      isAnalyzing: chatVision.isAnalyzing,
      hasPermission: chatVision.hasPermission,
      lastAnalysis: chatVision.lastAnalysis,
      analysisCount: chatVision.analysisCount,
      currentCameraFacing: chatVision.currentCameraFacing,
      startVision: chatVision.startVision,
      stopVision: chatVision.stopVision,
      toggleVision: chatVision.toggleVision,
      flipCamera: chatVision.flipCamera,
      captureAndAnalyze: chatVision.captureAndAnalyze,
      getVisionContext: chatVision.getVisionContext,
    },
    visionGreeting: {
      triggerGreeting: visionGreeting.triggerGreeting,
      resetGreeting: visionGreeting.resetGreeting,
      generateContextGreeting: visionGreeting.generateContextGreeting,
    },
    omegaCore: {
      state: omegaCore.omegaCoreState,
      uploadToOmegaCore: omegaCore.uploadToOmegaCore,
      downloadFromOmegaCore: omegaCore.downloadFromOmegaCore,
      uploadProgress: omegaCore.uploadProgress,
      downloadProgress: omegaCore.downloadProgress,
      getContextForChat: omegaCore.getOmegaCoreContextForChat,
      isLoading: omegaCore.isLoading,
    },
    voiceNoteRecorder: {
      isRecording: voiceNoteRecorder.isRecording,
      recordingDuration: voiceNoteRecorder.recordingDuration,
      isProcessing: voiceNoteRecorder.isProcessing,
      startRecording: voiceNoteRecorder.startRecording,
      stopRecording: voiceNoteRecorder.stopRecording,
      cancelRecording: voiceNoteRecorder.cancelRecording,
      formatDuration: voiceNoteRecorder.formatDuration,
    },
    liveVideoRecorder: {
      isRecording: liveVideoRecorder.isRecording,
      isInitializing: liveVideoRecorder.isInitializing,
      recordingDuration: liveVideoRecorder.recordingDuration,
      maxDuration: liveVideoRecorder.maxDuration,
      hasPermission: liveVideoRecorder.hasPermission,
      isMaxDurationReached: liveVideoRecorder.isMaxDurationReached,
      startRecording: liveVideoRecorder.startRecording,
      stopRecording: liveVideoRecorder.stopRecording,
      cancelRecording: liveVideoRecorder.cancelRecording,
      formatDuration: liveVideoRecorder.formatDuration,
      getVideoStream: liveVideoRecorder.getVideoStream,
    },
    quantumCall: {
      callState: quantumCall.callState,
      currentCall: quantumCall.currentCall,
      incomingCall: quantumCall.incomingCall,
      isMuted: quantumCall.isMuted,
      isSpeaking: quantumCall.isSpeaking,
      remoteIsSpeaking: quantumCall.remoteIsSpeaking,
      connectionQuality: quantumCall.connectionQuality,
      video: quantumCall.video,
      godEyeEnabled: quantumCall.godEyeEnabled,
      lastGodEyeAnalysis: quantumCall.lastGodEyeAnalysis,
      isInCall: quantumCall.isInCall,
      hasIncomingCall: quantumCall.hasIncomingCall,
      callDuration: quantumCall.callDuration,
      error: quantumCall.error,
      initiateCall: quantumCall.initiateCall,
      acceptCall: quantumCall.acceptCall,
      rejectCall: quantumCall.rejectCall,
      toggleMute: quantumCall.toggleMute,
      toggleVideo: quantumCall.toggleVideo,
      setLowDataMode: quantumCall.setLowDataMode,
      setLocalVideoRef: quantumCall.setLocalVideoRef,
      setRemoteVideoRef: quantumCall.setRemoteVideoRef,
      startGodEye: quantumCall.startGodEye,
      stopGodEye: quantumCall.stopGodEye,
      endCall: quantumCall.endCall,
      flipCamera: quantumCall.flipCamera,
    },
    profileAutoFill: {
      isProfileUpdateRequest: profileAutoFill.isProfileUpdateRequest,
      extractProfileData: profileAutoFill.extractProfileData,
      processProfileAutoFill: profileAutoFill.processProfileAutoFill,
      saveExtractedToProfile: profileAutoFill.saveExtractedToProfile,
    },
    backgroundTasks: {
      pending: backgroundTasks.pending,
      processing: backgroundTasks.processing,
      completed: backgroundTasks.completed,
      failed: backgroundTasks.failed,
      isProcessing: backgroundTasks.isProcessing,
      hasPending: backgroundTasks.hasPending,
      addChatTask: backgroundTasks.addChatTask,
      addYouTubeTask: backgroundTasks.addYouTubeTask,
      addMediaTask: backgroundTasks.addMediaTask,
      addVoiceCommandTask: backgroundTasks.addVoiceCommandTask,
      clearCompleted: backgroundTasks.clearCompleted,
      refresh: backgroundTasks.refresh,
    },
    handsFreeReader: {
      isEnabled: handsFreeReader.isEnabled,
      isReading: handsFreeReader.isReading,
      pendingCount: handsFreeReader.pendingCount,
      enable: handsFreeReader.enable,
      disable: handsFreeReader.disable,
      toggle: handsFreeReader.toggle,
      skipCurrent: handsFreeReader.skipCurrent,
      clearQueue: handsFreeReader.clearQueue,
    },
    newUserNotifications: {
      newUserEvents: newUserNotifications.newUserEvents,
      unreadCount: newUserNotifications.unreadCount,
      markAsRead: newUserNotifications.markAsRead,
      markAllAsRead: newUserNotifications.markAllAsRead,
      getLatestForChat: newUserNotifications.getLatestForChat,
      isSubscribed: newUserNotifications.isSubscribed,
    },
    // TIER 6: Agentic Mail
    mailSentinel: {
      isAnalyzing: mailSentinel.isAnalyzing,
      isGeneratingBriefing: mailSentinel.isGeneratingBriefing,
      isGeneratingResponse: mailSentinel.isGeneratingResponse,
      error: mailSentinel.error,
      analyzeEmail: mailSentinel.analyzeEmail,
      generateBriefing: mailSentinel.generateBriefing,
      generateAutoResponse: mailSentinel.generateAutoResponse,
      batchProcess: mailSentinel.batchProcess,
      analysisToGatekeeperAction: mailSentinel.analysisToGatekeeperAction,
    },
    // STEP 2: Speculative Speech - Zero-Latency Voice
    speculativeSpeech: {
      isActive: speculativeSpeech.isActive,
      lastContext: speculativeSpeech.lastContext,
      lastLatencyMs: speculativeSpeech.lastLatencyMs,
      acknowledgedEarlyMs: speculativeSpeech.acknowledgedEarlyMs,
      analyzeMessage: speculativeSpeech.analyzeMessage,
      processWithSpeech: speculativeSpeech.processWithSpeech,
      startSession: speculativeSpeech.startSession,
      abort: speculativeSpeech.abort,
    },
  };
};

export default useZoeInfinityIntegration;
