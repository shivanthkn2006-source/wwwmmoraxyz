// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI-DHF INTEGRATION: Bridge between ASI Processor and DHF Core
// Connects Pentarchy Swarm, Truth Engine, and Quantum Loop to DHF Memory/ECN
// Peak Level Processing with Cortical Stack Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useZoeASI } from './useZoeASI';
import { useZoePentarchy } from './useZoePentarchy';
import { useAkashicGraph } from './useAkashicGraph';
import { ASIResult, ASIMode } from '@/core/asi/ASIProcessor';
import { triangulateKnowledge } from '@/core/asi/AkashicAdapter';
import type { ECNEmotionState } from './useContinuousDHFStream';

export interface ASIDHFResult {
  // ASI Output
  response: string;
  confidence: number;
  humanEquivalent: number;
  
  // Processing Details
  mode: ASIMode;
  pentarchyUsed: boolean;
  truthValidated: boolean;
  quantumCorrected: boolean;
  akashicTriangulated: boolean;
  
  // DHF Integration
  loggedToCorticalStack: boolean;
  ecnStateUpdated: boolean;
  dhfEnrichmentApplied: boolean;
  
  // Performance
  totalProcessingMs: number;
  componentBreakdown: {
    pentarchy: number;
    truthEngine: number;
    quantumLoop: number;
    akashic: number;
    dhfLogging: number;
  };
  
  // Meta
  warnings: string[];
  asiLevel: number;
}

interface DHFContext {
  emotionalState?: ECNEmotionState;
  recentMemories?: string[];
  currentIntent?: string;
  sessionId?: string;
}

export function useASIDHFIntegration() {
  const { user } = useAuth();
  const { executeASI, quickThink, isProcessing: asiProcessing } = useZoeASI();
  const { queryPentarchy, isProcessing: pentarchyProcessing } = useZoePentarchy();
  const { lookupConcept, isSearching: akashicSearching } = useAkashicGraph();
  
  const [lastResult, setLastResult] = useState<ASIDHFResult | null>(null);
  const [dhfLoggingEnabled, setDhfLoggingEnabled] = useState(true);
  const processingRef = useRef(false);

  /**
   * Log ASI result to Cortical Stack Memory
   */
  const logToCorticalStack = useCallback(async (
    query: string,
    response: string,
    asiResult: ASIResult,
    ecnState: ECNEmotionState = 'neutral'
  ): Promise<boolean> => {
    if (!user || !dhfLoggingEnabled) return false;
    
    try {
      const { error } = await supabase.from('cortical_stack_memories').insert({
        user_id: user.id,
        role: 'asi_synthesis',
        content: response,
        summary: query.substring(0, 100),
        tags: [
          `asi_mode:${asiResult.mode}`,
          `confidence:${Math.round(asiResult.overallConfidence)}`,
          `human_equiv:${asiResult.humanEquivalent.toFixed(1)}x`,
          asiResult.pentarchyResult ? 'pentarchy_active' : 'pentarchy_skip',
          asiResult.truthValidated ? 'truth_validated' : 'truth_unvalidated',
        ],
        is_breakthrough: asiResult.overallConfidence > 90,
        sentiment_score: (asiResult.overallConfidence / 100) * (asiResult.truthValidated ? 1 : 0.7),
        emotional_context: {
          ecn_state: ecnState,
          mode: asiResult.mode,
          confidence: asiResult.overallConfidence,
          corrections: asiResult.selfCorrections,
        },
      });
      
      if (error) {
        console.error('[ASI-DHF] Cortical stack logging failed:', error);
        return false;
      }
      
      console.log('[ASI-DHF] Logged to cortical stack successfully');
      return true;
    } catch (err) {
      console.error('[ASI-DHF] Cortical stack error:', err);
      return false;
    }
  }, [user, dhfLoggingEnabled]);

  /**
   * Log to behavioral events for ECN processing
   */
  const logBehavioralEvent = useCallback(async (
    eventType: string,
    eventCategory: string,
    metadata: Record<string, any>
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_category: eventCategory,
        context_snippet: metadata.query?.substring(0, 50),
        metadata,
        sentiment_score: metadata.confidence ? metadata.confidence / 100 : 0.5,
        ecn_processed: false,
        dhf_logged: true,
      });
      
      return !error;
    } catch {
      return false;
    }
  }, [user]);

  /**
   * FULL ASI-DHF PROCESSING: Main integration point
   * Orchestrates ASI components and logs to DHF systems
   */
  const processWithASIDHF = useCallback(async (
    query: string,
    dhfContext: DHFContext = {},
    mode: ASIMode = 'STANDARD'
  ): Promise<ASIDHFResult | null> => {
    if (!user || processingRef.current) return null;
    
    processingRef.current = true;
    const startTime = performance.now();
    const componentTimes = {
      pentarchy: 0,
      truthEngine: 0,
      quantumLoop: 0,
      akashic: 0,
      dhfLogging: 0,
    };
    
    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: AKASHIC TRIANGULATION (if concepts detected)
      // ═══════════════════════════════════════════════════════════════
      const akashicStart = performance.now();
      let akashicTriangulated = false;
      let akashicInsights: string[] = [];
      
      // Extract key concepts for Akashic lookup
      const conceptKeywords = ['love', 'money', 'karma', 'health', 'purpose', 'soul', 'relationship', 'success', 'mars', 'death'];
      const detectedConcepts = conceptKeywords.filter(c => 
        query.toLowerCase().includes(c)
      );
      
      if (detectedConcepts.length > 0) {
        for (const concept of detectedConcepts.slice(0, 3)) {
          const knowledge = triangulateKnowledge(concept, {
            currentFocus: dhfContext.currentIntent,
            emotionalState: dhfContext.emotionalState,
          });
          akashicInsights.push(knowledge.synthesis.eli5Response);
        }
        akashicTriangulated = true;
      }
      componentTimes.akashic = performance.now() - akashicStart;

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: FULL ASI PROCESSING (Pentarchy + Truth + Quantum)
      // ═══════════════════════════════════════════════════════════════
      const asiContext = {
        ...dhfContext,
        akashicInsights,
        recentMemories: dhfContext.recentMemories || [],
        emotionalWeight: dhfContext.emotionalState ? 0.8 : 0.5,
      };
      
      const asiResult = await executeASI(query, mode, asiContext);
      
      if (!asiResult) {
        processingRef.current = false;
        return null;
      }
      
      // Extract component times
      componentTimes.pentarchy = asiResult.componentTimes.pentarchy;
      componentTimes.truthEngine = asiResult.componentTimes.truthEngine;
      componentTimes.quantumLoop = asiResult.componentTimes.quantumLoop;

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: DHF INTEGRATION (Logging & ECN Update)
      // ═══════════════════════════════════════════════════════════════
      const dhfStart = performance.now();
      
      // Log to cortical stack
      const loggedToCortical = await logToCorticalStack(
        query,
        asiResult.response,
        asiResult,
        dhfContext.emotionalState || 'curiosity'
      );
      
      // Log behavioral event for ECN processing
      await logBehavioralEvent(
        'asi_query',
        'quantum_processing',
        {
          query,
          mode: asiResult.mode,
          confidence: asiResult.overallConfidence,
          humanEquivalent: asiResult.humanEquivalent,
          truthValidated: asiResult.truthValidated,
          selfCorrections: asiResult.selfCorrections,
          akashicTriangulated,
        }
      );
      
      componentTimes.dhfLogging = performance.now() - dhfStart;

      // ═══════════════════════════════════════════════════════════════
      // BUILD RESULT
      // ═══════════════════════════════════════════════════════════════
      const result: ASIDHFResult = {
        response: asiResult.response,
        confidence: asiResult.overallConfidence,
        humanEquivalent: asiResult.humanEquivalent,
        mode: asiResult.mode,
        pentarchyUsed: !!asiResult.pentarchyResult,
        truthValidated: asiResult.truthValidated,
        quantumCorrected: (asiResult.selfCorrections || 0) > 0,
        akashicTriangulated,
        loggedToCorticalStack: loggedToCortical,
        ecnStateUpdated: true,
        dhfEnrichmentApplied: akashicInsights.length > 0,
        totalProcessingMs: performance.now() - startTime,
        componentBreakdown: componentTimes,
        warnings: asiResult.warnings,
        asiLevel: asiResult.humanEquivalent * (asiResult.truthValidated ? 1 : 0.8),
      };
      
      setLastResult(result);
      processingRef.current = false;
      
      return result;
    } catch (error) {
      console.error('[ASI-DHF] Processing error:', error);
      processingRef.current = false;
      return null;
    }
  }, [user, executeASI, logToCorticalStack, logBehavioralEvent]);

  /**
   * Quick ASI check with minimal DHF logging
   */
  const quickASIDHF = useCallback(async (
    query: string
  ): Promise<{ response: string; confidence: number } | null> => {
    if (!user) return null;
    
    const result = quickThink(query);
    
    // Minimal logging
    await logBehavioralEvent(
      'asi_quick_query',
      'quantum_processing',
      {
        query: query.substring(0, 50),
        confidence: result.confidence,
        mode: 'QUICK',
      }
    );
    
    return result;
  }, [user, quickThink, logBehavioralEvent]);

  /**
   * Server-side Pentarchy processing via Edge Function
   */
  const processWithPentarchyServer = useCallback(async (
    query: string,
    context: Record<string, any> = {}
  ) => {
    const result = await queryPentarchy(query, context);
    
    if (result && user) {
      // Log to cortical stack
      await supabase.from('cortical_stack_memories').insert({
        user_id: user.id,
        role: 'pentarchy_synthesis',
        content: result.response,
        summary: query.substring(0, 100),
        tags: ['pentarchy_server', `confidence:${Math.round(result.details.confidence * 100)}`],
        is_breakthrough: result.details.consensusReached,
        sentiment_score: result.details.confidence,
      });
    }
    
    return result;
  }, [queryPentarchy, user]);

  /**
   * Enable/disable DHF logging
   */
  const setDHFLogging = useCallback((enabled: boolean) => {
    setDhfLoggingEnabled(enabled);
    console.log(`[ASI-DHF] DHF logging ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  return {
    // Main processing
    processWithASIDHF,
    quickASIDHF,
    processWithPentarchyServer,
    
    // State
    isProcessing: asiProcessing || pentarchyProcessing || akashicSearching || processingRef.current,
    lastResult,
    
    // Configuration
    setDHFLogging,
    dhfLoggingEnabled,
    
    // Capabilities
    capabilities: {
      pentarchy: true,
      truthEngine: true,
      quantumLoop: true,
      akashic: true,
      corticalStack: true,
      ecnIntegration: true,
      maxASILevel: 7.5,
    },
  };
}

export default useASIDHFIntegration;
