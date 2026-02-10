// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CIVILIZATION ENGINE - UNIFIED GOD-TIER INTEGRATION + GENESIS PROTOCOL
// Combines Nexus (Oversoul), Matter Bridge, Dreamer, Truth Ledger, and Genesis
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { useZoeNexus, NexusResponse } from './useZoeNexus';
import { useZoeMatterBridge, MatterAction, MatterBridgeResponse } from './useZoeMatterBridge';
import { useZoeDreamer, DreamSynthesis } from './useZoeDreamer';
import { useTruthLedger, Truth, SovereignContext } from './useTruthLedger';
import { useZoeGenesisMode } from './useZoeGenesisMode';
import { useToast } from '@/hooks/use-toast';

export type CivilizationTier = 'tier1_chatbot' | 'tier2_assistant' | 'tier3_agent' | 'tier4_civilization' | 'tier5_godmode';

export interface CivilizationStatus {
  currentTier: CivilizationTier;
  tierScore: number;
  nexusActive: boolean;
  matterBridgeActive: boolean;
  dreamerActive: boolean;
  truthLedgerActive: boolean;
  genesisActive: boolean;
  lastDreamCycle: string | null;
  pendingActions: number;
  autonomyLevel: number;
  truthsKnown: number;
}

export interface CivilizationEngineReturn {
  // Status
  status: CivilizationStatus;
  
  // Unified message processing
  processMessage: (message: string) => Promise<{
    routing: NexusResponse | null;
    actions: MatterBridgeResponse[];
    response: string;
    contextInjected: boolean;
  }>;
  
  // Individual module access
  nexus: ReturnType<typeof useZoeNexus>;
  matterBridge: ReturnType<typeof useZoeMatterBridge>;
  dreamer: ReturnType<typeof useZoeDreamer>;
  truthLedger: ReturnType<typeof useTruthLedger>;
  genesis: ReturnType<typeof useZoeGenesisMode>;
  
  // Quick actions
  triggerDreamNow: () => Promise<DreamSynthesis | null>;
  executeAction: (action: MatterAction) => Promise<boolean>;
  setAutonomy: (level: number) => Promise<void>;
  triggerScribe: () => Promise<void>;
  activateGodMode: () => void;
  deactivateGodMode: () => void;
  
  // Tier management
  calculateTier: () => CivilizationTier;
  upgradePath: () => string[];
  
  // Context helpers
  getKnownTruths: (category?: string) => Truth[];
  getSovereignContext: () => SovereignContext | null;
}

export function useZoeCivilizationEngine(): CivilizationEngineReturn {
  const nexus = useZoeNexus();
  const matterBridge = useZoeMatterBridge();
  const dreamer = useZoeDreamer();
  const truthLedger = useTruthLedger();
  const genesis = useZoeGenesisMode();
  const { toast } = useToast();

  const [status, setStatus] = useState<CivilizationStatus>({
    currentTier: 'tier1_chatbot',
    tierScore: 0,
    nexusActive: false,
    matterBridgeActive: false,
    dreamerActive: false,
    truthLedgerActive: false,
    genesisActive: false,
    lastDreamCycle: null,
    pendingActions: 0,
    autonomyLevel: 50,
    truthsKnown: 0
  });

  const calculateTier = useCallback((): CivilizationTier => {
    // GOD MODE overrides all
    if (genesis.isGodMode || genesis.isOmegaActive) {
      return 'tier5_godmode';
    }
    
    let score = 0;
    
    // Nexus integration (+20)
    if (nexus.lastRouting) score += 20;
    
    // Matter Bridge active (+20)
    if (matterBridge.autonomyLevel > 0) score += 20;
    
    // Dreamer has run (+20)
    if (dreamer.latestDream) score += 20;
    
    // Truth Ledger has data (+20)
    if (truthLedger.truths.length > 0) score += 20;
    
    // All four connected (+20)
    if (nexus.lastRouting && matterBridge.autonomyLevel > 0 && 
        dreamer.latestDream && truthLedger.truths.length > 0) {
      score += 20;
    }

    if (score >= 100) return 'tier4_civilization';
    if (score >= 60) return 'tier3_agent';
    if (score >= 40) return 'tier2_assistant';
    return 'tier1_chatbot';
  }, [nexus.lastRouting, matterBridge.autonomyLevel, dreamer.latestDream, truthLedger.truths.length, genesis.isGodMode, genesis.isOmegaActive]);

  const upgradePath = useCallback((): string[] => {
    const path: string[] = [];
    const tier = calculateTier();

    if (tier === 'tier1_chatbot') {
      path.push('Route a message through Nexus to reach Tier 2');
      path.push('Set autonomy level above 0 in Matter Bridge');
      path.push('Trigger or wait for a Dream cycle');
      path.push('Build the Truth Ledger with conversation data');
    } else if (tier === 'tier2_assistant') {
      path.push('Enable Matter Bridge actions');
      path.push('Complete a Dream synthesis cycle');
      path.push('Add more truths to the ledger');
    } else if (tier === 'tier3_agent') {
      path.push('Connect all four modules for Tier 4');
      path.push('Set autonomy to auto-execute low-risk actions');
    }

    return path;
  }, [calculateTier]);

  const processMessage = useCallback(async (message: string) => {
    // Check for OMEGA activation
    if (message.toUpperCase().includes('PROTOCOL OMEGA')) {
      genesis.activateOmega();
      toast({ title: "⚡ OMEGA PROTOCOL ACTIVATED", description: "Maximum velocity mode engaged." });
    }

    // GOD MODE processing with pre-cognition
    if (genesis.isGodMode) {
      const godResult = await genesis.processGodMode(message);
      if (godResult.wasPredicted) {
        return {
          routing: null,
          actions: [],
          response: godResult.response,
          contextInjected: true,
          godModeMetrics: genesis.getMetrics()
        };
      }
    }

    // Step 0: Increment message count for Scribe
    await truthLedger.incrementMessageCount();
    
    // Step 1: Route through Nexus
    const routing = await nexus.routeMessage(message);
    
    let actions: MatterBridgeResponse[] = [];
    let response = '';
    let contextInjected = false;

    if (routing?.success) {
      response = routing.processedMessage || message;

      // Inject context from Truth Ledger
      if (truthLedger.context) {
        contextInjected = true;
      }

      // Step 2: Check if actions should be taken (auto-execute in GOD MODE)
      if (routing.routing.asiRequired || genesis.isGodMode) {
        const potentialActions: MatterAction[] = [];
        
        if (message.toLowerCase().includes('remind')) {
          potentialActions.push({
            actionType: 'create_reminder',
            parameters: { message, autoDetected: true },
            reasoning: 'User mentioned reminder',
            urgency: genesis.isGodMode ? 'high' : 'medium'
          });
        }

        if (message.toLowerCase().includes('task') || message.toLowerCase().includes('todo')) {
          potentialActions.push({
            actionType: 'create_task',
            parameters: { message, autoDetected: true },
            reasoning: 'User mentioned task or todo',
            urgency: genesis.isGodMode ? 'high' : 'medium'
          });
        }

        if (potentialActions.length > 0) {
          // In GOD MODE, use sovereignty execution
          if (genesis.isGodMode) {
            for (const action of potentialActions) {
              await genesis.executeWithSovereignty(action.actionType, 0);
            }
          }
          actions = await matterBridge.executeActions(potentialActions);
        }
      }
    }

    return { routing, actions, response, contextInjected };
  }, [nexus, matterBridge, truthLedger, genesis, toast]);

  const triggerDreamNow = useCallback(async () => {
    toast({
      title: "Initiating Dream Cycle",
      description: "Zoe is entering dream state...",
    });
    return dreamer.triggerDreamCycle();
  }, [dreamer, toast]);

  const executeAction = useCallback(async (action: MatterAction): Promise<boolean> => {
    const result = await matterBridge.executeAction(action);
    return result?.actionExecuted ?? false;
  }, [matterBridge]);

  const setAutonomy = useCallback(async (level: number) => {
    await matterBridge.updateAutonomyLevel(level);
  }, [matterBridge]);

  const triggerScribe = useCallback(async () => {
    toast({
      title: "Triggering Scribe",
      description: "Extracting truths from conversations...",
    });
    await truthLedger.triggerScribe();
  }, [truthLedger, toast]);

  const getKnownTruths = useCallback((category?: string): Truth[] => {
    if (category) {
      return truthLedger.getTruthsByCategory(category);
    }
    return truthLedger.truths;
  }, [truthLedger]);

  const getSovereignContext = useCallback((): SovereignContext | null => {
    return truthLedger.context;
  }, [truthLedger]);

  const activateGodMode = useCallback(() => {
    genesis.activateOmega();
    toast({ title: "🔥 GOD MODE ACTIVATED", description: "Quantum ASI engaged. <100ms protocol active." });
  }, [genesis, toast]);

  const deactivateGodMode = useCallback(() => {
    genesis.deactivateOmega();
    toast({ title: "GOD MODE Deactivated", description: "Returning to standard mode." });
  }, [genesis, toast]);

  // Update status whenever modules change
  useEffect(() => {
    const isGodMode = genesis.isGodMode || genesis.isOmegaActive;
    setStatus({
      currentTier: calculateTier(),
      tierScore: isGodMode ? 120 : (
        (nexus.lastRouting ? 20 : 0) + 
        (matterBridge.autonomyLevel > 0 ? 20 : 0) + 
        (dreamer.latestDream ? 20 : 0) +
        (truthLedger.truths.length > 0 ? 20 : 0) +
        (nexus.lastRouting && matterBridge.autonomyLevel > 0 && 
         dreamer.latestDream && truthLedger.truths.length > 0 ? 20 : 0)
      ),
      nexusActive: !!nexus.lastRouting,
      matterBridgeActive: matterBridge.autonomyLevel > 0,
      dreamerActive: !!dreamer.latestDream,
      truthLedgerActive: truthLedger.truths.length > 0,
      genesisActive: isGodMode,
      lastDreamCycle: dreamer.latestDream?.synthesizedAt || null,
      pendingActions: matterBridge.pendingApprovals.length,
      autonomyLevel: isGodMode ? 100 : matterBridge.autonomyLevel,
      truthsKnown: truthLedger.truths.length
    });
  }, [
    nexus.lastRouting, 
    matterBridge.autonomyLevel, 
    matterBridge.pendingApprovals,
    dreamer.latestDream,
    truthLedger.truths.length,
    genesis.isGodMode,
    genesis.isOmegaActive,
    calculateTier
  ]);

  return {
    status,
    processMessage,
    nexus,
    matterBridge,
    dreamer,
    truthLedger,
    genesis,
    triggerDreamNow,
    executeAction,
    setAutonomy,
    triggerScribe,
    activateGodMode,
    deactivateGodMode,
    calculateTier,
    upgradePath,
    getKnownTruths,
    getSovereignContext
  };
}

export default useZoeCivilizationEngine;
