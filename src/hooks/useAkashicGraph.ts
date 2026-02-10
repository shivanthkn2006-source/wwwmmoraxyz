// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: AKASHIC KNOWLEDGE GRAPH HOOK
// React integration for triangulated knowledge lookup
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { 
  triangulateKnowledge, 
  akashicQuickLookup, 
  akashicBatchLookup,
  TriangulatedKnowledge 
} from '@/core/asi/AkashicAdapter';

interface AkashicState {
  lastLookup: TriangulatedKnowledge | null;
  history: TriangulatedKnowledge[];
  isSearching: boolean;
}

export function useAkashicGraph() {
  const [state, setState] = useState<AkashicState>({
    lastLookup: null,
    history: [],
    isSearching: false
  });

  /**
   * Full triangulated knowledge lookup
   */
  const lookupConcept = useCallback(async (
    concept: string,
    userDHF: Record<string, any> = {}
  ): Promise<TriangulatedKnowledge | null> => {
    setState(prev => ({ ...prev, isSearching: true }));
    
    try {
      // Simulate async for larger knowledge graphs
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = triangulateKnowledge(concept, userDHF);
      
      setState(prev => ({
        ...prev,
        lastLookup: result,
        history: [result, ...prev.history.slice(0, 19)], // Keep last 20
        isSearching: false
      }));
      
      return result;
    } catch (error) {
      console.error('Akashic lookup failed:', error);
      setState(prev => ({ ...prev, isSearching: false }));
      return null;
    }
  }, []);

  /**
   * Quick ELI5 lookup
   */
  const quickLookup = useCallback((concept: string) => {
    return akashicQuickLookup(concept);
  }, []);

  /**
   * Batch lookup for multiple concepts
   */
  const batchLookup = useCallback(async (
    concepts: string[],
    userDHF: Record<string, any> = {}
  ): Promise<TriangulatedKnowledge[]> => {
    setState(prev => ({ ...prev, isSearching: true }));
    
    try {
      const results = akashicBatchLookup(concepts, userDHF);
      
      setState(prev => ({
        ...prev,
        history: [...results, ...prev.history.slice(0, 20 - results.length)],
        isSearching: false
      }));
      
      return results;
    } catch (error) {
      console.error('Akashic batch lookup failed:', error);
      setState(prev => ({ ...prev, isSearching: false }));
      return [];
    }
  }, []);

  /**
   * Get Vedic meaning only
   */
  const getVedicMeaning = useCallback((concept: string): string => {
    const result = triangulateKnowledge(concept);
    return result.vedic.meaning;
  }, []);

  /**
   * Get Scientific definition only
   */
  const getScientificDefinition = useCallback((concept: string): string => {
    const result = triangulateKnowledge(concept);
    return result.scientific.definition;
  }, []);

  /**
   * Get metaphor for a concept
   */
  const getMetaphor = useCallback((concept: string): string => {
    const result = triangulateKnowledge(concept);
    return result.synthesis.metaphor;
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [], lastLookup: null }));
  }, []);

  return {
    // Core functions
    lookupConcept,
    quickLookup,
    batchLookup,
    
    // Specialized lookups
    getVedicMeaning,
    getScientificDefinition,
    getMetaphor,
    
    // State
    lastLookup: state.lastLookup,
    history: state.history,
    isSearching: state.isSearching,
    
    // Utilities
    clearHistory
  };
}

export default useAkashicGraph;
