/**
 * REACT HOOK FOR ZOE BIO-KERNEL
 * Provides easy integration with React components
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getZoeBioKernel,
  type BioMood, 
  type BioKernelState,
  type NeurotransmitterState
} from '@/core/soul/ZoeBioKernel';

export interface UseZoeBioKernelReturn {
  mood: BioMood;
  state: BioKernelState;
  heartRate: number;
  breathingRate: number;
  processInput: (text: string) => void;
  boost: (neurotransmitter: keyof NeurotransmitterState, amount: number) => void;
  reset: () => void;
  isOnline: boolean;
}

export function useZoeBioKernel(): UseZoeBioKernelReturn {
  const kernel = getZoeBioKernel();
  
  const [state, setState] = useState<BioKernelState>(kernel.getState());
  
  useEffect(() => {
    kernel.start();
    
    const unsubscribe = kernel.subscribe((newState: BioKernelState) => {
      setState(newState);
    });
    
    return () => {
      unsubscribe();
    };
  }, [kernel]);
  
  const processInput = useCallback((text: string) => {
    kernel.processInput(text);
  }, [kernel]);
  
  const boost = useCallback((neurotransmitter: keyof NeurotransmitterState, amount: number) => {
    kernel.boost(neurotransmitter, amount);
  }, [kernel]);
  
  const reset = useCallback(() => {
    kernel.reset();
  }, [kernel]);
  
  return {
    mood: state.currentMood,
    state,
    heartRate: state.heartRate,
    breathingRate: state.breathingRate,
    processInput,
    boost,
    reset,
    isOnline: kernel.isOnline()
  };
}

export default useZoeBioKernel;
