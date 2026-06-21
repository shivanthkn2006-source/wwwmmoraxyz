// ═══════════════════════════════════════════════════════════════════════════════
// GOD MODE SOVEREIGN PROVIDER - Earth's Core Security Integration
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Integrates the Constitutional Kernel, Zero-Click Defense, EMP Protocol,
// Quantum Shield, and Validator Agent into the React component tree.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  type ReactNode 
} from 'react';
import { 
  validateUserInput,
  getConstitutionalKernel,
  getZeroClickDefense,
  getEMPProtocol,
  getQuantumShield,
  getValidatorAgent,
  type KernelState,
  type EMPState,
  type ConstitutionalViolation,
  type QuantumShieldState,
  type ValidatorAgentState,
  type EMPReactorAction,
} from '@/core/security';
import { useAuth } from '@/lib/auth';
import { logSecurityEvent, SECURITY_EVENTS, SECURITY_CATEGORIES } from './securityConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface GodModeSovereignState {
  isInitialized: boolean;
  kernelState: KernelState | null;
  empState: EMPState;
  quantumShieldState: QuantumShieldState | null;
  validatorAgentState: ValidatorAgentState | null;
  threatStats: {
    total: number;
    byType: Record<string, number>;
    last24Hours: number;
  };
  isLockdownActive: boolean;
  lastViolation: ConstitutionalViolation | null;
  isQuantumProtected: boolean;
  apiPortsOpen: boolean;
  dhfWritable: boolean;
}

interface GodModeSovereignContextValue extends GodModeSovereignState {
  // Actions
  sanitizeInput: (input: string, source?: string) => Promise<{
    isValid: boolean;
    sanitized: string;
    threats: string[];
    empTriggered: boolean;
    actions: string[];
  }>;
  triggerEMP: (reason: string) => Promise<boolean>;
  releaseEMP: (reason: string) => Promise<boolean>;
  getKernelIntegrity: () => boolean;
  refreshThreatStats: () => void;
  // Validator Agent Actions
  triggerSEVER: (reason: string) => Promise<boolean>;
  triggerFREEZE: (reason: string) => void;
  triggerPURGE: (reason: string) => void;
  triggerREBOOT: (reason: string) => Promise<boolean>;
  restoreNormal: () => boolean;
}

const defaultState: GodModeSovereignState = {
  isInitialized: false,
  kernelState: null,
  empState: {
    isActive: false,
    triggeredAt: null,
    triggeredBy: null,
    triggerDetails: null,
    violations: [],
    affectedServices: [],
    autoReleaseAt: null,
    releasedAt: null,
    releasedBy: null,
    lockdownId: null,
  },
  quantumShieldState: null,
  validatorAgentState: null,
  threatStats: { total: 0, byType: {}, last24Hours: 0 },
  isLockdownActive: false,
  lastViolation: null,
  isQuantumProtected: false,
  apiPortsOpen: true,
  dhfWritable: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const GodModeSovereignContext = createContext<GodModeSovereignContextValue | null>(null);

export function useGodModeSovereign(): GodModeSovereignContextValue {
  const context = useContext(GodModeSovereignContext);
  if (!context) {
    // Return safe defaults when outside provider
    return {
      ...defaultState,
      sanitizeInput: async (input) => ({ isValid: true, sanitized: input, threats: [], empTriggered: false, actions: [] }),
      triggerEMP: async () => false,
      releaseEMP: async () => false,
      getKernelIntegrity: () => true,
      refreshThreatStats: () => {},
      triggerSEVER: async () => false,
      triggerFREEZE: () => {},
      triggerPURGE: () => {},
      triggerREBOOT: async () => false,
      restoreNormal: () => false,
    };
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface GodModeSovereignProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const GodModeSovereignProvider: React.FC<GodModeSovereignProviderProps> = ({
  children,
  enabled = true,
}) => {
  const { user } = useAuth();
  const [state, setState] = useState<GodModeSovereignState>(defaultState);

  // Initialize security systems
  useEffect(() => {
    if (!enabled) return;

    const initSecurity = async () => {
      try {
        const kernel = getConstitutionalKernel();
        const defense = getZeroClickDefense();
        const emp = getEMPProtocol();
        const quantumShield = getQuantumShield();
        const validatorAgent = getValidatorAgent();

        // Verify kernel integrity
        const isIntact = kernel.verifyIntegrity();
        if (!isIntact) {
          emp.trigger('integrity_failure', 'Kernel integrity check failed');
        }

        // Activate Quantum Shield
        await quantumShield.activate();

        // Set initial state
        const agentState = validatorAgent.getState();
        setState(prev => ({
          ...prev,
          isInitialized: true,
          kernelState: kernel.getState(),
          empState: emp.getState(),
          quantumShieldState: quantumShield.getState(),
          validatorAgentState: agentState,
          threatStats: defense.getThreatStats(),
          isQuantumProtected: quantumShield.isHNDLProtected(),
          apiPortsOpen: agentState.apiPortsOpen,
          dhfWritable: agentState.dhfMode === 'READ_WRITE',
        }));

        // Listen for EMP state changes
        const unsubscribeEMP = emp.onStateChange((empState) => {
          setState(prev => ({
            ...prev,
            empState,
            isLockdownActive: empState.isActive,
          }));
        });

        // Listen for kernel violations
        const unsubscribeKernel = kernel.onViolation((violation) => {
          setState(prev => ({
            ...prev,
            lastViolation: violation,
            kernelState: kernel.getState(),
          }));

          if (user?.id) {
            logSecurityEvent(
              user.id,
              SECURITY_EVENTS.INTRUSION_ATTEMPT,
              SECURITY_CATEGORIES.VIOLATION,
              `Constitutional violation: ${violation.ruleId}`,
              { rule_id: violation.ruleId, severity: violation.severity }
            );
          }
        });

        // Listen for Quantum Shield state changes
        const unsubscribeQuantum = quantumShield.onStateChange((qState) => {
          setState(prev => ({
            ...prev,
            quantumShieldState: qState,
            isQuantumProtected: qState.isActive && qState.quantumResistant,
          }));
        });

        // Listen for Validator Agent state changes
        const unsubscribeValidator = validatorAgent.onStateChange((vState) => {
          setState(prev => ({
            ...prev,
            validatorAgentState: vState,
            apiPortsOpen: vState.apiPortsOpen,
            dhfWritable: vState.dhfMode === 'READ_WRITE',
            isLockdownActive: prev.isLockdownActive || vState.mode === 'LOCKDOWN',
          }));
        });

        console.log('[GOD MODE SOVEREIGN] ✅ All security systems ACTIVE (incl. Validator Agent)');

        return () => {
          unsubscribeEMP();
          unsubscribeKernel();
          unsubscribeQuantum();
          unsubscribeValidator();
        };
      } catch (error) {
        console.error('[GOD MODE SOVEREIGN] Initialization failed:', error);
      }
    };

    initSecurity();
  }, [enabled, user?.id]);

  // Sanitize input through all security layers
  const sanitizeInput = useCallback(async (input: string, source?: string) => {
    return validateUserInput(input, source);
  }, []);

  // Trigger EMP Protocol
  const triggerEMP = useCallback(async (reason: string): Promise<boolean> => {
    const emp = getEMPProtocol();
    const result = await emp.trigger('manual_admin_trigger', reason);
    return result.success;
  }, []);

  // Release EMP Protocol (requires admin)
  const releaseEMP = useCallback(async (reason: string): Promise<boolean> => {
    const emp = getEMPProtocol();
    // Get current user's username for authorization
    const username = user?.email?.split('@')[0] || 'unknown';
    const result = await emp.release(username, reason);
    return result.success;
  }, [user?.email]);

  // Check kernel integrity
  const getKernelIntegrity = useCallback((): boolean => {
    const kernel = getConstitutionalKernel();
    return kernel.verifyIntegrity();
  }, []);

  // Refresh threat stats
  const refreshThreatStats = useCallback(() => {
    const defense = getZeroClickDefense();
    setState(prev => ({
      ...prev,
      threatStats: defense.getThreatStats(),
    }));
  }, []);

  // Validator Agent Actions
  const triggerSEVER = useCallback(async (reason: string): Promise<boolean> => {
    const agent = getValidatorAgent();
    return agent.manualTrigger('SEVER', reason);
  }, []);

  const triggerFREEZE = useCallback((reason: string): void => {
    const agent = getValidatorAgent();
    agent.manualTrigger('FREEZE', reason);
  }, []);

  const triggerPURGE = useCallback((reason: string): void => {
    const agent = getValidatorAgent();
    agent.manualTrigger('PURGE', reason);
  }, []);

  const triggerREBOOT = useCallback(async (reason: string): Promise<boolean> => {
    const agent = getValidatorAgent();
    return agent.manualTrigger('REBOOT', reason);
  }, []);

  const restoreNormal = useCallback((): boolean => {
    const agent = getValidatorAgent();
    const username = user?.email?.split('@')[0] || 'unknown';
    return agent.restoreNormal(username);
  }, [user?.email]);

  // Context value
  const contextValue = useMemo<GodModeSovereignContextValue>(() => ({
    ...state,
    sanitizeInput,
    triggerEMP,
    releaseEMP,
    getKernelIntegrity,
    refreshThreatStats,
    triggerSEVER,
    triggerFREEZE,
    triggerPURGE,
    triggerREBOOT,
    restoreNormal,
  }), [state, sanitizeInput, triggerEMP, releaseEMP, getKernelIntegrity, refreshThreatStats, triggerSEVER, triggerFREEZE, triggerPURGE, triggerREBOOT, restoreNormal]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <GodModeSovereignContext.Provider value={contextValue}>
      {children}
    </GodModeSovereignContext.Provider>
  );
};

export default GodModeSovereignProvider;
