/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — LOCAL LLM HOOK
 * React hook for using the Local LLM Engine with fallback chain
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useIsOnline } from '@/hooks/useNetworkStatus';
import {
  generateResponse,
  initializeLocalLLM,
  getLLMStatus,
  cleanupLocalLLM,
  prewarmLocalLLM,
  type LLMResponse,
  type LLMContext,
  type GenerateOptions,
} from '@/core/llm/LocalLLMEngine';

interface UseLocalLLMState {
  isGenerating: boolean;
  lastResponse: LLMResponse | null;
  lastProvider: 'cloud' | 'ollama' | 'local' | 'scripted' | null;
  localLLMReady: boolean;
  localLLMLoading: boolean;
  supportsWebGPU: boolean;
  error: string | null;
}

interface UseLocalLLMOptions {
  autoPrewarm?: boolean;
  context?: LLMContext;
}

export function useLocalLLM(options: UseLocalLLMOptions = {}) {
  const { autoPrewarm = true, context } = options;
  const isOnline = useIsOnline();
  
  const [state, setState] = useState<UseLocalLLMState>(() => {
    const status = getLLMStatus();
    return {
      isGenerating: false,
      lastResponse: null,
      lastProvider: null,
      localLLMReady: status.localReady,
      localLLMLoading: status.localLoading,
      supportsWebGPU: status.supportsWebGPU,
      error: status.error,
    };
  });
  
  const contextRef = useRef(context);
  contextRef.current = context;

  // Pre-warm on mount if enabled
  useEffect(() => {
    if (autoPrewarm) {
      prewarmLocalLLM();
    }
    
    return () => {
      // Don't cleanup on unmount - LLM should persist
    };
  }, [autoPrewarm]);

  // Update status periodically while loading or prewarming
  // BUG FIX: Added proper cleanup and tracking to prevent memory leaks
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true; // Track mount state to prevent state updates after unmount
    
    // Start polling immediately after mount and when autoPrewarm is enabled
    const checkStatus = () => {
      if (!isMounted) return null; // BUG FIX: Don't update state if unmounted
      
      const status = getLLMStatus();
      setState(prev => {
        // Only update if something changed
        if (
          prev.localLLMReady !== status.localReady ||
          prev.localLLMLoading !== status.localLoading ||
          prev.supportsWebGPU !== status.supportsWebGPU ||
          prev.error !== status.error
        ) {
          return {
            ...prev,
            localLLMReady: status.localReady,
            localLLMLoading: status.localLoading,
            supportsWebGPU: status.supportsWebGPU,
            error: status.error,
          };
        }
        return prev;
      });
      return status;
    };
    
    // Check immediately
    const initialStatus = checkStatus();
    
    // If already ready or has error, no need to poll
    if (initialStatus?.localReady || initialStatus?.error) return;
    
    interval = setInterval(() => {
      const status = checkStatus();
      if (status?.localReady || status?.error) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    }, 1000);
    
    // BUG FIX: Always cleanup interval on unmount, even if still loading
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [autoPrewarm]);

  /**
   * Generate AI response with automatic fallback
   */
  const generate = useCallback(async (
    prompt: string,
    cloudFn?: (prompt: string) => Promise<string>,
    overrideOptions?: Partial<GenerateOptions>
  ): Promise<LLMResponse> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const response = await generateResponse(prompt, {
        cloudFn,
        context: contextRef.current,
        ...overrideOptions,
      });
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        lastResponse: response,
        lastProvider: response.provider,
      }));
      
      return response;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMsg,
      }));
      
      // Return scripted fallback on error
      return {
        text: "I had trouble processing that. Could you try again?",
        provider: 'scripted',
        latencyMs: 0,
        confidence: 0.2,
        cached: false,
      };
    }
  }, []);

  /**
   * Force local-only generation (offline mode)
   */
  const generateLocal = useCallback(async (prompt: string): Promise<LLMResponse> => {
    return generate(prompt, undefined, { forceLocal: true });
  }, [generate]);

  /**
   * Force scripted-only generation (ultra-fast, zero compute)
   */
  const generateScripted = useCallback(async (prompt: string): Promise<LLMResponse> => {
    return generate(prompt, undefined, { forceScripted: true });
  }, [generate]);

  /**
   * Initialize local LLM manually
   */
  const initLocal = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, localLLMLoading: true }));
    
    const success = await initializeLocalLLM();
    const status = getLLMStatus();
    
    setState(prev => ({
      ...prev,
      localLLMReady: status.localReady,
      localLLMLoading: false,
      supportsWebGPU: status.supportsWebGPU,
      error: status.error,
    }));
    
    return success;
  }, []);

  /**
   * Cleanup local LLM resources
   */
  const cleanup = useCallback(() => {
    cleanupLocalLLM();
    setState(prev => ({
      ...prev,
      localLLMReady: false,
      localLLMLoading: false,
    }));
  }, []);

  /**
   * Get detailed status
   */
  const getStatus = useCallback(() => {
    return getLLMStatus();
  }, []);

  return {
    // Generation
    generate,
    generateLocal,
    generateScripted,
    
    // State
    isGenerating: state.isGenerating,
    lastResponse: state.lastResponse,
    lastProvider: state.lastProvider,
    error: state.error,
    
    // LLM Status
    localLLMReady: state.localLLMReady,
    localLLMLoading: state.localLLMLoading,
    supportsWebGPU: state.supportsWebGPU,
    isOnline,
    
    // Controls
    initLocal,
    cleanup,
    getStatus,
  };
}

export default useLocalLLM;
