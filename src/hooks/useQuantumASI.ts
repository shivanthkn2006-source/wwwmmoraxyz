// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI HOOK - FRONTEND INTEGRATION
// Connects the Quantum ASI Protocol to React components
// Enables autonomous operation with user control
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  quantumASI, 
  QuantumState, 
  AutonomyLevel, 
  AutonomousThought, 
  ProactiveInitiative,
  QuantumASIState 
} from '@/core/quantum/QuantumASIProtocol';

interface UseQuantumASIOptions {
  autoStart?: boolean;
  idleThresholdMs?: number;
  onThoughtGenerated?: (thought: AutonomousThought) => void;
  onInitiativePending?: (initiative: ProactiveInitiative) => void;
  onStateChange?: (oldState: QuantumState, newState: QuantumState) => void;
}

interface UseQuantumASIReturn {
  // State
  state: QuantumASIState;
  isActive: boolean;
  currentQuantumState: QuantumState;
  autonomyLevel: AutonomyLevel;
  
  // Control
  start: () => void;
  stop: () => void;
  setAutonomy: (level: AutonomyLevel) => void;
  enterDreamMode: () => void;
  enterProactiveMode: () => void;
  
  // Thoughts & Initiatives
  activeThoughts: AutonomousThought[];
  pendingInitiatives: ProactiveInitiative[];
  approveInitiative: (id: string) => void;
  rejectInitiative: (id: string) => void;
  
  // Backend processing
  triggerDreamSynthesis: () => Promise<void>;
  triggerInitiativeCheck: () => Promise<void>;
  
  // Metrics
  metrics: QuantumASIState['metrics'];
}

export function useQuantumASI(options: UseQuantumASIOptions = {}): UseQuantumASIReturn {
  const {
    autoStart = false,
    idleThresholdMs = 300000, // 5 minutes
    onThoughtGenerated,
    onInitiativePending,
    onStateChange,
  } = options;
  
  const [state, setState] = useState<QuantumASIState>(quantumASI.getState());
  const [isActive, setIsActive] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<number | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleStateChange = (e: CustomEvent) => {
      setState(quantumASI.getState());
      if (onStateChange) {
        onStateChange(e.detail.oldState, e.detail.newState);
      }
    };
    
    const handleThought = (e: CustomEvent) => {
      setState(quantumASI.getState());
      if (onThoughtGenerated) {
        onThoughtGenerated(e.detail);
      }
    };
    
    const handleInitiative = (e: CustomEvent) => {
      setState(quantumASI.getState());
      if (onInitiativePending) {
        onInitiativePending(e.detail);
      }
    };
    
    const handleHeartbeat = () => {
      setState(quantumASI.getState());
    };
    
    window.addEventListener('quantum-state-change', handleStateChange as EventListener);
    window.addEventListener('quantum-thought', handleThought as EventListener);
    window.addEventListener('quantum-initiative-pending', handleInitiative as EventListener);
    window.addEventListener('quantum-heartbeat', handleHeartbeat as EventListener);
    
    return () => {
      window.removeEventListener('quantum-state-change', handleStateChange as EventListener);
      window.removeEventListener('quantum-thought', handleThought as EventListener);
      window.removeEventListener('quantum-initiative-pending', handleInitiative as EventListener);
      window.removeEventListener('quantum-heartbeat', handleHeartbeat as EventListener);
    };
  }, [onStateChange, onThoughtGenerated, onInitiativePending]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // IDLE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      quantumASI.onUserActivity();
    };
    
    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Check for idle state periodically
    idleCheckIntervalRef.current = window.setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime > idleThresholdMs && isActive) {
        quantumASI.onUserIdle(idleTime);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [idleThresholdMs, isActive]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const initializeQuantumASI = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await quantumASI.initialize(user.id);
        setState(quantumASI.getState());
        
        if (autoStart) {
          quantumASI.startAllLoops();
          setIsActive(true);
        }
      }
    };
    
    initializeQuantumASI();
    
    return () => {
      if (isActive) {
        quantumASI.stopAllLoops();
      }
    };
  }, [autoStart]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTROL FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const start = useCallback(() => {
    quantumASI.startAllLoops();
    setIsActive(true);
    setState(quantumASI.getState());
  }, []);
  
  const stop = useCallback(() => {
    quantumASI.stopAllLoops();
    setIsActive(false);
    setState(quantumASI.getState());
  }, []);
  
  const setAutonomy = useCallback((level: AutonomyLevel) => {
    quantumASI.setAutonomyLevel(level);
    setState(quantumASI.getState());
  }, []);
  
  const enterDreamMode = useCallback(() => {
    quantumASI.enterDreamMode();
    setState(quantumASI.getState());
  }, []);
  
  const enterProactiveMode = useCallback(() => {
    quantumASI.enterProactiveMode();
    setState(quantumASI.getState());
  }, []);
  
  const approveInitiative = useCallback((id: string) => {
    quantumASI.approveInitiative(id);
    setState(quantumASI.getState());
  }, []);
  
  const rejectInitiative = useCallback((id: string) => {
    quantumASI.rejectInitiative(id);
    setState(quantumASI.getState());
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BACKEND TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const triggerDreamSynthesis = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      await supabase.functions.invoke('quantum-asi-loop', {
        body: {
          mode: 'dream',
          userId: user.id,
        },
      });
    } catch (error) {
      console.error('[QuantumASI Hook] Dream synthesis trigger failed:', error);
    }
  }, []);
  
  const triggerInitiativeCheck = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      await supabase.functions.invoke('quantum-asi-loop', {
        body: {
          mode: 'initiative',
          userId: user.id,
        },
      });
    } catch (error) {
      console.error('[QuantumASI Hook] Initiative check trigger failed:', error);
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return {
    // State
    state,
    isActive,
    currentQuantumState: state.currentState,
    autonomyLevel: state.autonomyLevel,
    
    // Control
    start,
    stop,
    setAutonomy,
    enterDreamMode,
    enterProactiveMode,
    
    // Thoughts & Initiatives
    activeThoughts: state.activeThoughts,
    pendingInitiatives: state.pendingInitiatives,
    approveInitiative,
    rejectInitiative,
    
    // Backend processing
    triggerDreamSynthesis,
    triggerInitiativeCheck,
    
    // Metrics
    metrics: state.metrics,
  };
}

export default useQuantumASI;
