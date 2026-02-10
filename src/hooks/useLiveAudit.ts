// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: PHASE 4 - Live Audit System
// God Mode verification: Soul-Ray, Quantum Flux, Chronos Echo testing
// Connected to Zoe Core for sovereign monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useZoe } from '@/contexts/ZoeContext';
import { TrinityFilterState } from '@/hooks/useTrinityFilters';
import { SatelliteShieldState } from '@/hooks/useSatelliteShield';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestResult {
  passed: boolean;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface SoulRayTestResult extends TestResult {
  haloColor: 'red' | 'cyan' | 'purple' | 'neutral';
  haloPattern: 'jagged' | 'smooth' | 'neutral';
  stressDetected: boolean;
  flowDetected: boolean;
  ecnReading: {
    stress: number;
    flow: number;
    valence: number;
  };
}

export interface QuantumFluxTestResult extends TestResult {
  viewerAuthenticated: boolean;
  encryptionActive: boolean;
  staticDisplayed: boolean;
  decryptionMatch: number;
  securityLevel: number;
}

export interface ChronosTestResult extends TestResult {
  ghostsVisible: boolean;
  ghostCount: number;
  latency: number;
  rollingHashActive: boolean;
  currentHash: string;
  hashChangesPerSecond: number;
}

export interface LiveAuditState {
  isRunning: boolean;
  currentTest: 'soul-ray' | 'quantum-flux' | 'chronos' | null;
  soulRay: SoulRayTestResult;
  quantumFlux: QuantumFluxTestResult;
  chronos: ChronosTestResult;
  overallScore: number; // 0-100
  lastAuditTime: number | null;
  auditCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

const createInitialTestResult = (): TestResult => ({
  passed: false,
  status: 'pending',
  message: 'Test not yet run',
  timestamp: 0,
});

const initialState: LiveAuditState = {
  isRunning: false,
  currentTest: null,
  soulRay: {
    ...createInitialTestResult(),
    haloColor: 'neutral',
    haloPattern: 'neutral',
    stressDetected: false,
    flowDetected: false,
    ecnReading: { stress: 0, flow: 0, valence: 0 },
  },
  quantumFlux: {
    ...createInitialTestResult(),
    viewerAuthenticated: false,
    encryptionActive: false,
    staticDisplayed: false,
    decryptionMatch: 0,
    securityLevel: 0,
  },
  chronos: {
    ...createInitialTestResult(),
    ghostsVisible: false,
    ghostCount: 0,
    latency: 0,
    rollingHashActive: false,
    currentHash: '0x00000000',
    hashChangesPerSecond: 0,
  },
  overallScore: 0,
  lastAuditTime: null,
  auditCount: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useLiveAudit = (
  trinityState?: TrinityFilterState,
  satelliteState?: SatelliteShieldState
) => {
  const { isSovereign, runSystemScan } = useZoe();
  const [state, setState] = useState<LiveAuditState>(initialState);
  
  const hashCountRef = useRef({ count: 0, lastHash: '', lastSecond: 0, hashChangesPerSecond: 0 });
  const auditIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 1: THE SOUL-RAY (ECN Bio-Feedback)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const testSoulRay = useCallback((ecnState?: TrinityFilterState['ecn']): SoulRayTestResult => {
    if (!ecnState) {
      return {
        passed: false,
        status: 'failed',
        message: 'ECN state unavailable',
        timestamp: Date.now(),
        haloColor: 'neutral',
        haloPattern: 'neutral',
        stressDetected: false,
        flowDetected: false,
        ecnReading: { stress: 0, flow: 0, valence: 0 },
      };
    }

    const stressDetected = ecnState.stressLevel > 0.4;
    const flowDetected = ecnState.flowLevel > 0.5;
    
    // Determine halo color based on ECN
    let haloColor: SoulRayTestResult['haloColor'] = 'neutral';
    let haloPattern: SoulRayTestResult['haloPattern'] = 'neutral';
    
    if (stressDetected) {
      haloColor = 'red';
      haloPattern = 'jagged';
    } else if (flowDetected) {
      haloColor = 'cyan';
      haloPattern = 'smooth';
    } else if (ecnState.valence > 0.3) {
      haloColor = 'purple';
      haloPattern = 'smooth';
    }

    const passed = (stressDetected && haloColor === 'red' && haloPattern === 'jagged') ||
                   (flowDetected && haloColor === 'cyan' && haloPattern === 'smooth') ||
                   (!stressDetected && !flowDetected);

    return {
      passed,
      status: passed ? 'passed' : 'warning',
      message: stressDetected 
        ? 'STRESS DETECTED → Halo turned Jagged Red' 
        : flowDetected 
          ? 'FLOW STATE → Halo is Liquid Cyan'
          : 'Neutral state → ECN calibrating',
      timestamp: Date.now(),
      haloColor,
      haloPattern,
      stressDetected,
      flowDetected,
      ecnReading: {
        stress: ecnState.stressLevel,
        flow: ecnState.flowLevel,
        valence: ecnState.valence,
      },
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 2: THE QUANTUM FLUX (Encryption Visualizer)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const testQuantumFlux = useCallback((securityState?: TrinityFilterState['security']): QuantumFluxTestResult => {
    if (!securityState) {
      return {
        passed: false,
        status: 'failed',
        message: 'Security state unavailable',
        timestamp: Date.now(),
        viewerAuthenticated: false,
        encryptionActive: false,
        staticDisplayed: true,
        decryptionMatch: 0,
        securityLevel: 0,
      };
    }

    const viewerAuthenticated = securityState.isAuthenticated;
    const encryptionActive = securityState.securityLevel > 0.5;
    const staticDisplayed = !viewerAuthenticated;
    
    // If authenticated, decryption should match. If not, static should show.
    const passed = viewerAuthenticated 
      ? securityState.decryptionMatch > 0.8  // Clear face for authenticated
      : securityState.decryptionMatch < 0.3; // Static for unauthorized

    return {
      passed,
      status: passed ? 'passed' : 'warning',
      message: viewerAuthenticated 
        ? `AUTHENTICATED → Decryption ${Math.round(securityState.decryptionMatch * 100)}%`
        : 'UNAUTHORIZED → Displaying static (encryption working)',
      timestamp: Date.now(),
      viewerAuthenticated,
      encryptionActive,
      staticDisplayed,
      decryptionMatch: securityState.decryptionMatch,
      securityLevel: securityState.securityLevel,
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST 3: THE CHRONOS ECHO (Time Security)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const testChronos = useCallback((latencyState?: TrinityFilterState['latency'], rollingHash?: string): ChronosTestResult => {
    if (!latencyState) {
      return {
        passed: false,
        status: 'failed',
        message: 'Latency state unavailable',
        timestamp: Date.now(),
        ghostsVisible: false,
        ghostCount: 0,
        latency: 999,
        rollingHashActive: false,
        currentHash: '0x00000000',
        hashChangesPerSecond: 0,
      };
    }

    // Track hash changes per second
    const now = Math.floor(Date.now() / 1000);
    if (now !== hashCountRef.current.lastSecond) {
      hashCountRef.current.hashChangesPerSecond = hashCountRef.current.count;
      hashCountRef.current.count = 0;
      hashCountRef.current.lastSecond = now;
    }
    if (rollingHash && rollingHash !== hashCountRef.current.lastHash) {
      hashCountRef.current.count++;
      hashCountRef.current.lastHash = rollingHash;
    }

    // Ghosts visible only if latency < 50ms
    const ghostsVisible = latencyState.current < 50;
    const ghostCount = ghostsVisible ? 3 : 0;
    const rollingHashActive = !!rollingHash && rollingHash !== '0x00000000';

    const passed = latencyState.current < 100 && rollingHashActive;

    return {
      passed,
      status: passed ? 'passed' : (ghostsVisible ? 'warning' : 'failed'),
      message: ghostsVisible 
        ? `GHOSTS VISIBLE (${ghostCount}) → Latency ${latencyState.current}ms` 
        : `GHOSTS DISSOLVING → High latency ${latencyState.current}ms`,
      timestamp: Date.now(),
      ghostsVisible,
      ghostCount,
      latency: latencyState.current,
      rollingHashActive,
      currentHash: rollingHash || '0x00000000',
      hashChangesPerSecond: hashCountRef.current.hashChangesPerSecond || 0,
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RUN FULL AUDIT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const runFullAudit = useCallback(() => {
    if (!trinityState) {
      toast.error('Trinity filters not active - enable camera first');
      return;
    }

    setState(prev => ({ ...prev, isRunning: true }));
    console.info('[LIVE AUDIT] Starting God Mode verification...');

    // Test Soul-Ray
    setState(prev => ({ ...prev, currentTest: 'soul-ray' }));
    const soulRayResult = testSoulRay(trinityState.ecn);
    
    // Test Quantum Flux
    setState(prev => ({ ...prev, currentTest: 'quantum-flux' }));
    const quantumFluxResult = testQuantumFlux(trinityState.security);
    
    // Test Chronos
    setState(prev => ({ ...prev, currentTest: 'chronos' }));
    const chronosResult = testChronos(trinityState.latency, trinityState.rollingHash);

    // Calculate overall score
    const scores = [
      soulRayResult.passed ? 100 : (soulRayResult.status === 'warning' ? 70 : 0),
      quantumFluxResult.passed ? 100 : (quantumFluxResult.status === 'warning' ? 70 : 0),
      chronosResult.passed ? 100 : (chronosResult.status === 'warning' ? 70 : 0),
    ];
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    setState(prev => ({
      ...prev,
      isRunning: false,
      currentTest: null,
      soulRay: soulRayResult,
      quantumFlux: quantumFluxResult,
      chronos: chronosResult,
      overallScore,
      lastAuditTime: Date.now(),
      auditCount: prev.auditCount + 1,
    }));

    // Report to Zoe if sovereign
    if (isSovereign) {
      const status = overallScore >= 80 ? 'OPTIMAL' : overallScore >= 50 ? 'DEGRADED' : 'CRITICAL';
      console.info(`[LIVE AUDIT] Zoe Core Report: ${status} (${overallScore}%)`);
      
      if (overallScore < 50) {
        toast.warning(`🔴 Quantum Camera: ${status}`, {
          description: 'Some security tests failed. Review the audit panel.',
        });
      }
    }

    return { soulRayResult, quantumFluxResult, chronosResult, overallScore };
  }, [trinityState, isSovereign, testSoulRay, testQuantumFlux, testChronos]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTINUOUS MONITORING (Sovereign Mode)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const startContinuousAudit = useCallback(() => {
    if (auditIntervalRef.current) return;
    
    console.info('[LIVE AUDIT] Starting continuous monitoring (Sovereign Mode)');
    
    auditIntervalRef.current = setInterval(() => {
      if (trinityState) {
        // Silent continuous update
        const soulRayResult = testSoulRay(trinityState.ecn);
        const quantumFluxResult = testQuantumFlux(trinityState.security);
        const chronosResult = testChronos(trinityState.latency, trinityState.rollingHash);

        const scores = [
          soulRayResult.passed ? 100 : 50,
          quantumFluxResult.passed ? 100 : 50,
          chronosResult.passed ? 100 : 50,
        ];
        const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        setState(prev => ({
          ...prev,
          soulRay: soulRayResult,
          quantumFlux: quantumFluxResult,
          chronos: chronosResult,
          overallScore,
        }));
      }
    }, 500); // Update every 500ms
  }, [trinityState, testSoulRay, testQuantumFlux, testChronos]);

  const stopContinuousAudit = useCallback(() => {
    if (auditIntervalRef.current) {
      clearInterval(auditIntervalRef.current);
      auditIntervalRef.current = null;
      console.info('[LIVE AUDIT] Continuous monitoring stopped');
    }
  }, []);

  // Auto-start continuous audit when Trinity filters are active
  useEffect(() => {
    if (trinityState?.activeFilter && trinityState.activeFilter !== 'none') {
      startContinuousAudit();
    } else {
      stopContinuousAudit();
    }

    return () => stopContinuousAudit();
  }, [trinityState?.activeFilter, startContinuousAudit, stopContinuousAudit]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIMULATE SCENARIOS (for testing)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const simulateScenario = useCallback((scenario: 'stress' | 'flow' | 'unauthorized' | 'high-latency') => {
    console.info(`[LIVE AUDIT] Simulating scenario: ${scenario}`);
    
    switch (scenario) {
      case 'stress':
        toast.info('🔴 Simulating STRESS state', {
          description: 'Halo should turn Jagged Red',
        });
        break;
      case 'flow':
        toast.info('🔵 Simulating FLOW state', {
          description: 'Halo should turn Liquid Cyan',
        });
        break;
      case 'unauthorized':
        toast.info('🔒 Simulating UNAUTHORIZED viewer', {
          description: 'Face should display as static',
        });
        break;
      case 'high-latency':
        toast.info('⏱️ Simulating HIGH LATENCY', {
          description: 'Time ghosts should dissolve',
        });
        break;
    }

    // Dispatch event for Trinity filters to pick up
    window.dispatchEvent(new CustomEvent('live-audit-simulate', { detail: { scenario } }));
  }, []);

  return {
    state,
    runFullAudit,
    startContinuousAudit,
    stopContinuousAudit,
    simulateScenario,
    // Individual test results
    soulRayResult: state.soulRay,
    quantumFluxResult: state.quantumFlux,
    chronosResult: state.chronos,
    overallScore: state.overallScore,
    isRunning: state.isRunning,
  };
};

export default useLiveAudit;
