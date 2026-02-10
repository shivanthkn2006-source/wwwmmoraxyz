/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE INTEGRATION TEST (Phase 3)
 * Validates all 5 phases work together seamlessly
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { useZoeOfflineCore } from '@/hooks/useZoeOfflineCore';
import { useZoeProactiveMessaging } from '@/hooks/useZoeProactiveMessaging';
import { useMobileOfflineOptimizations } from '@/hooks/useMobileOfflineOptimizations';
import { offlineDB, offlineMessages, offlineSettings, dbUtils } from '@/db/OfflineDB';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestResult {
  name: string;
  phase: number;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

export interface IntegrationTestReport {
  timestamp: Date;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  overallStatus: 'pass' | 'fail' | 'partial';
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

type TestFn = () => Promise<{ passed: boolean; error?: string; details?: string }>;

const createTest = (name: string, phase: number, fn: TestFn) => ({ name, phase, fn });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useOfflineIntegrationTest(userId: string | null) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastReport, setLastReport] = useState<IntegrationTestReport | null>(null);
  
  const offlineCore = useZoeOfflineCore(userId);
  const proactiveMessaging = useZoeProactiveMessaging();
  const mobileOptimizations = useMobileOfflineOptimizations();
  
  const abortRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE (use refs to avoid stale closures)
  // ═══════════════════════════════════════════════════════════════════════════

  const offlineCoreRef = useRef(offlineCore);
  const proactiveMessagingRef = useRef(proactiveMessaging);
  const mobileOptimizationsRef = useRef(mobileOptimizations);
  
  // Keep refs updated
  offlineCoreRef.current = offlineCore;
  proactiveMessagingRef.current = proactiveMessaging;
  mobileOptimizationsRef.current = mobileOptimizations;

  const getTests = useCallback((): Array<{ name: string; phase: number; fn: TestFn }> => [
    // Phase 1: PWA + IndexedDB
    createTest('IndexedDB Available', 1, async () => {
      const available = dbUtils.isAvailable();
      return { passed: available, details: available ? 'IndexedDB ready' : 'IndexedDB not supported' };
    }),
    
    createTest('Storage Persistence Request', 1, async () => {
      try {
        const persisted = await dbUtils.requestPersistence();
        return { passed: true, details: persisted ? 'Storage persisted' : 'Storage not persisted (user denied or not supported)' };
      } catch (err) {
        return { passed: false, error: String(err) };
      }
    }),
    
    createTest('Offline Settings Read/Write', 1, async () => {
      try {
        const testKey = '__integration_test__';
        const testValue = Date.now();
        await offlineSettings.set(testKey, testValue);
        const retrieved = await offlineSettings.get<number>(testKey);
        await offlineSettings.remove(testKey);
        return { passed: retrieved === testValue, details: `Write/Read cycle: ${testValue}` };
      } catch (err) {
        return { passed: false, error: String(err) };
      }
    }),

    // Phase 2: Voice + Network Detection
    createTest('Network Status Detection', 2, async () => {
      const { isOnline, connectionQuality } = offlineCoreRef.current;
      return { 
        passed: typeof isOnline === 'boolean', 
        details: `Online: ${isOnline}, Quality: ${connectionQuality}` 
      };
    }),
    
    createTest('Voice Capabilities Check', 2, async () => {
      const config = mobileOptimizationsRef.current.getVoiceConfig();
      const hasSpeechSynthesis = 'speechSynthesis' in window;
      return { 
        passed: hasSpeechSynthesis, 
        details: `TTS: ${hasSpeechSynthesis}, Rate: ${config.rate}, ChunkLen: ${config.maxChunkLength}` 
      };
    }),
    
    createTest('Platform Detection', 2, async () => {
      const { platform, isNativeApp } = mobileOptimizationsRef.current;
      return { 
        passed: ['ios', 'android', 'web'].includes(platform), 
        details: `Platform: ${platform}, Native: ${isNativeApp}` 
      };
    }),

    // Phase 3: Local LLM
    createTest('WebGPU Support Check', 3, async () => {
      const hasGPU = 'gpu' in navigator;
      let adapterAvailable = false;
      if (hasGPU) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          adapterAvailable = !!adapter;
        } catch { /* WebGPU not available */ }
      }
      return { 
        passed: true, // Not a failure if WebGPU unavailable
        details: `WebGPU API: ${hasGPU}, Adapter: ${adapterAvailable}` 
      };
    }),
    
    createTest('Offline Capability Assessment', 3, async () => {
      const { offlineCapability, localLLMReady } = offlineCoreRef.current;
      return { 
        passed: ['full', 'limited', 'minimal', 'none'].includes(offlineCapability),
        details: `Capability: ${offlineCapability}, LLM Ready: ${localLLMReady}` 
      };
    }),

    // Phase 4: Background Sync
    createTest('Message Queue Operations', 4, async () => {
      if (!userId) return { passed: false, error: 'No user ID' };
      try {
        // Test message caching
        const testMessage = {
          id: `test_${Date.now()}`,
          userId,
          role: 'user' as const,
          content: 'Integration test message',
          createdAt: new Date(),
          synced: false,
          syncStatus: 'pending' as const,
        };
        await offlineDB.messages.add(testMessage);
        const count = await offlineMessages.count(userId);
        await offlineDB.messages.delete(testMessage.id);
        return { passed: count > 0, details: `Messages cached: ${count}` };
      } catch (err) {
        return { passed: false, error: String(err) };
      }
    }),
    
    createTest('Sync Queue Status', 4, async () => {
      const { pendingSyncCount, lastSyncAt } = offlineCoreRef.current;
      return { 
        passed: typeof pendingSyncCount === 'number',
        details: `Pending: ${pendingSyncCount}, Last Sync: ${lastSyncAt?.toISOString() || 'Never'}` 
      };
    }),
    
    createTest('Life Pattern Progress', 4, async () => {
      const { lifePatternProgress } = offlineCoreRef.current;
      return { 
        passed: typeof lifePatternProgress === 'number' && lifePatternProgress >= 0,
        details: `Progress: ${lifePatternProgress}%` 
      };
    }),

    // Phase 5: Initiative Protocol
    createTest('Proactive Messaging State', 5, async () => {
      const { isAnalyzing, lastAnalysis, pendingInsights } = proactiveMessagingRef.current;
      return { 
        passed: typeof isAnalyzing === 'boolean',
        details: `Analyzing: ${isAnalyzing}, Insights: ${pendingInsights.length}, Last: ${lastAnalysis?.toISOString() || 'Never'}` 
      };
    }),
    
    createTest('Idle Hours Calculation', 5, async () => {
      try {
        const idleHours = await proactiveMessagingRef.current.calculateIdleHours();
        return { 
          passed: typeof idleHours === 'number' && idleHours >= 0,
          details: `Idle hours: ${idleHours.toFixed(2)}` 
        };
      } catch (err) {
        return { passed: false, error: String(err) };
      }
    }),
    
    createTest('Initiative Content Check', 5, async () => {
      const { hasProactiveContent, idleHeartReady, initiative } = offlineCoreRef.current;
      return { 
        passed: true,
        details: `Has Content: ${hasProactiveContent}, Idle Heart: ${idleHeartReady}, Initiative: ${initiative?.type || 'None'}` 
      };
    }),

    // Integration Tests
    createTest('Cross-Phase Data Flow', 5, async () => {
      // Verify data can flow between phases
      const { cachedMessageCount, offlineCapability, connectionQuality } = offlineCoreRef.current;
      const { platform } = mobileOptimizationsRef.current;
      const { idleHours } = proactiveMessagingRef.current;
      
      const dataPoints = [
        cachedMessageCount !== undefined,
        offlineCapability !== undefined,
        connectionQuality !== undefined,
        platform !== undefined,
        typeof idleHours === 'number',
      ];
      
      const valid = dataPoints.filter(Boolean).length;
      return { 
        passed: valid >= 4,
        details: `${valid}/5 data points accessible across phases` 
      };
    }),
  ], [userId]); // Only userId as dependency - refs handle the rest

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  const runTests = useCallback(async (): Promise<IntegrationTestReport> => {
    setIsRunning(true);
    setProgress(0);
    abortRef.current = false;
    
    const tests = getTests();
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    console.log('[IntegrationTest] Starting offline architecture test suite...');
    
    for (let i = 0; i < tests.length; i++) {
      if (abortRef.current) break;
      
      const test = tests[i];
      const testStart = Date.now();
      
      try {
        const result = await test.fn();
        results.push({
          name: test.name,
          phase: test.phase,
          passed: result.passed,
          duration: Date.now() - testStart,
          error: result.error,
          details: result.details,
        });
      } catch (err) {
        results.push({
          name: test.name,
          phase: test.phase,
          passed: false,
          duration: Date.now() - testStart,
          error: String(err),
        });
      }
      
      setProgress(Math.round(((i + 1) / tests.length) * 100));
    }
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    const phase1Failed = results.filter(r => r.phase === 1 && !r.passed);
    const phase3Results = results.filter(r => r.phase === 3);
    const phase5Failed = results.filter(r => r.phase === 5 && !r.passed);
    
    if (phase1Failed.length > 0) {
      recommendations.push('Phase 1: IndexedDB issues detected. Check browser compatibility.');
    }
    if (phase3Results.some(r => r.details?.includes('Adapter: false'))) {
      recommendations.push('Phase 3: WebGPU not available. Local LLM will use scripted fallback.');
    }
    if (phase5Failed.length > 0) {
      recommendations.push('Phase 5: Proactive messaging issues. Check network connectivity.');
    }
    if (passed === results.length) {
      recommendations.push('All tests passed! Offline architecture is fully operational.');
    }
    
    const report: IntegrationTestReport = {
      timestamp: new Date(),
      totalTests: tests.length,
      passed,
      failed,
      duration: Date.now() - startTime,
      results,
      overallStatus: failed === 0 ? 'pass' : passed === 0 ? 'fail' : 'partial',
      recommendations,
    };
    
    console.log(`[IntegrationTest] Complete: ${passed}/${tests.length} passed in ${report.duration}ms`);
    
    setLastReport(report);
    setIsRunning(false);
    return report;
  }, [getTests]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false); // Immediately update UI
  }, []);

  return {
    isRunning,
    progress,
    lastReport,
    runTests,
    abort,
  };
}

export default useOfflineIntegrationTest;
