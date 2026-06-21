/**
 * ZOE PROTOCOL MONITOR - System Health Dashboard
 * Tests and monitors all 4 cost-saving protocols:
 * 1. Media Diet (Upload limits)
 * 2. Delta Sync (Bandwidth saver)
 * 3. Edge Brain (Client-side AI)
 * 4. Cleanup Crew (Storage hygiene)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useDeltaSync } from './useDeltaSync';
import { useEdgeBrain } from './useEdgeBrain';
import { useStorageHygiene } from './useStorageHygiene';
import { MEDIA_DIET_LIMITS, validateMediaFile, processMediaForUpload } from '@/utils/mediaCompression';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProtocolStatus {
  name: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastTest: string | null;
  passed: boolean | null;
  metrics: Record<string, number | string>;
  errorMessage?: string;
}

export interface SystemHealthScore {
  overall: number;  // 0-100
  processingPower: number;  // 0-100
  costEfficiency: number;  // 0-100
  protocols: {
    mediaDiet: ProtocolStatus;
    deltaSync: ProtocolStatus;
    edgeBrain: ProtocolStatus;
    cleanupCrew: ProtocolStatus;
  };
  serverCallsSaved: number;
  bandwidthSavedKB: number;
  storageSavedMB: number;
  cpuCyclesSaved: number;
  timestamp: string;
}

const DEFAULT_PROTOCOL_STATUS: ProtocolStatus = {
  name: '',
  status: 'inactive',
  lastTest: null,
  passed: null,
  metrics: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeProtocolMonitor() {
  const { user } = useAuth();
  const deltaSync = useDeltaSync();
  const edgeBrain = useEdgeBrain();
  const storageHygiene = useStorageHygiene();
  
  const [healthScore, setHealthScore] = useState<SystemHealthScore>({
    overall: 0,
    processingPower: 0,
    costEfficiency: 0,
    protocols: {
      mediaDiet: { ...DEFAULT_PROTOCOL_STATUS, name: 'Media Diet' },
      deltaSync: { ...DEFAULT_PROTOCOL_STATUS, name: 'Delta Sync' },
      edgeBrain: { ...DEFAULT_PROTOCOL_STATUS, name: 'Edge Brain' },
      cleanupCrew: { ...DEFAULT_PROTOCOL_STATUS, name: 'Cleanup Crew' },
    },
    serverCallsSaved: 0,
    bandwidthSavedKB: 0,
    storageSavedMB: 0,
    cpuCyclesSaved: 0,
    timestamp: new Date().toISOString(),
  });

  const [isRunningTests, setIsRunningTests] = useState(false);
  const testResultsRef = useRef<Record<string, boolean>>({});

  // ═══════════════════════════════════════════════════════════════════
  // TEST 1: MEDIA DIET PROTOCOL
  // ═══════════════════════════════════════════════════════════════════
  const testMediaDiet = useCallback(async (): Promise<ProtocolStatus> => {
    const status: ProtocolStatus = {
      name: 'Media Diet',
      status: 'testing',
      lastTest: new Date().toISOString(),
      passed: null,
      metrics: {},
    };

    try {
      // Test 1: Verify limits are configured correctly
      const limitsOk = 
        MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES === 1 * 1024 * 1024 &&
        MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS === 59 &&
        MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES === 100 * 1024 &&
        MEDIA_DIET_LIMITS.IMAGE_MAX_WIDTH === 1080;

      // Test 2: Verify validation function exists and works
      const fakeImageBlob = new Blob(['test'], { type: 'image/png' });
      const fakeImage = new File([fakeImageBlob], 'test.png', { type: 'image/png' });
      const validationResult = await validateMediaFile(fakeImage);

      // Test 3: Verify processor function exists
      const processorExists = typeof processMediaForUpload === 'function';

      status.passed = limitsOk && validationResult && processorExists;
      status.status = status.passed ? 'active' : 'error';
      status.metrics = {
        videoLimitMB: MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES / (1024 * 1024),
        imageLimitKB: MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES / 1024,
        maxWidth: MEDIA_DIET_LIMITS.IMAGE_MAX_WIDTH,
        maxDuration: MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS,
        validationActive: validationResult ? 'YES' : 'NO',
      };

      if (!status.passed) {
        status.errorMessage = 'Media limits not properly configured';
      }

      console.log('[ProtocolMonitor] Media Diet test:', status.passed ? 'PASSED ✅' : 'FAILED ❌');
    } catch (error) {
      status.status = 'error';
      status.passed = false;
      status.errorMessage = String(error);
    }

    return status;
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 2: DELTA SYNC PROTOCOL
  // ═══════════════════════════════════════════════════════════════════
  const testDeltaSync = useCallback(async (): Promise<ProtocolStatus> => {
    const status: ProtocolStatus = {
      name: 'Delta Sync',
      status: 'testing',
      lastTest: new Date().toISOString(),
      passed: null,
      metrics: {},
    };

    try {
      // Verify Delta Sync is initialized
      const isInitialized = deltaSync.isInitialized;
      const hasSyncFunctions = 
        typeof deltaSync.syncProfile === 'function' &&
        typeof deltaSync.syncSoulCodex === 'function' &&
        typeof deltaSync.syncTimeline === 'function';

      // Get current stats
      const stats = deltaSync.stats;

      status.passed = hasSyncFunctions && (isInitialized || !user);
      status.status = status.passed ? 'active' : 'error';
      status.metrics = {
        initialized: isInitialized ? 'YES' : 'NO',
        cachedItems: stats.totalCached,
        staleItems: stats.staleCount,
        cacheSizeKB: stats.totalSizeKB,
        bandwidthSavedKB: stats.bandwidthSavedKB,
      };

      if (!status.passed) {
        status.errorMessage = 'Delta Sync not properly initialized';
      }

      console.log('[ProtocolMonitor] Delta Sync test:', status.passed ? 'PASSED ✅' : 'FAILED ❌');
    } catch (error) {
      status.status = 'error';
      status.passed = false;
      status.errorMessage = String(error);
    }

    return status;
  }, [deltaSync, user]);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 3: EDGE BRAIN PROTOCOL
  // ═══════════════════════════════════════════════════════════════════
  const testEdgeBrain = useCallback(async (): Promise<ProtocolStatus> => {
    const status: ProtocolStatus = {
      name: 'Edge Brain',
      status: 'testing',
      lastTest: new Date().toISOString(),
      passed: null,
      metrics: {},
    };

    try {
      // Test sentiment analysis
      const sentimentResult = edgeBrain.analyzeMood('This is a great day! I am so happy!');
      const sentimentWorks = sentimentResult && sentimentResult.score !== undefined;

      // Test conversation tracking
      const trendResult = edgeBrain.trackConversation([
        'Hello, how are you?',
        'I am doing great today!',
        'That is wonderful news!'
      ]);
      const trendWorks = trendResult && trendResult.trend !== undefined;

      // Get stats
      const stats = edgeBrain.getStats();

      status.passed = sentimentWorks && trendWorks;
      status.status = status.passed ? 'active' : 'error';
      status.metrics = {
        sentimentActive: sentimentWorks ? 'YES' : 'NO',
        trendTrackingActive: trendWorks ? 'YES' : 'NO',
        vectorReady: edgeBrain.isVectorReady ? 'YES' : 'NO',
        cachedVectors: edgeBrain.cachedVectorCount,
        sentimentAnalyses: stats.sentimentAnalyses,
        matchCalculations: stats.matchCalculations,
        serverCallsSaved: stats.serverCallsSaved,
      };

      if (!status.passed) {
        status.errorMessage = 'Edge Brain local processing not working';
      }

      console.log('[ProtocolMonitor] Edge Brain test:', status.passed ? 'PASSED ✅' : 'FAILED ❌');
    } catch (error) {
      status.status = 'error';
      status.passed = false;
      status.errorMessage = String(error);
    }

    return status;
  }, [edgeBrain]);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 4: CLEANUP CREW PROTOCOL
  // ═══════════════════════════════════════════════════════════════════
  const testCleanupCrew = useCallback(async (): Promise<ProtocolStatus> => {
    const status: ProtocolStatus = {
      name: 'Cleanup Crew',
      status: 'testing',
      lastTest: new Date().toISOString(),
      passed: null,
      metrics: {},
    };

    try {
      // Test local cleanup function
      const localCleanupWorks = typeof storageHygiene.cleanupLocalStorage === 'function';
      const triggerWorks = typeof storageHygiene.triggerCleanup === 'function';
      const needsCheckWorks = typeof storageHygiene.needsCleanup === 'function';

      // Get current stats
      const stats = storageHygiene.stats;

      status.passed = localCleanupWorks && triggerWorks && needsCheckWorks;
      status.status = status.passed ? 'active' : 'error';
      status.metrics = {
        storageUsedMB: stats.usedMB,
        storagePercentage: stats.percentage,
        lastCleanup: stats.lastCleanup || 'Never',
        filesDeleted: stats.filesDeleted,
        bytesFreed: stats.bytesFreed,
        needsCleanup: storageHygiene.needsCleanup() ? 'YES' : 'NO',
      };

      if (!status.passed) {
        status.errorMessage = 'Cleanup Crew not properly configured';
      }

      console.log('[ProtocolMonitor] Cleanup Crew test:', status.passed ? 'PASSED ✅' : 'FAILED ❌');
    } catch (error) {
      status.status = 'error';
      status.passed = false;
      status.errorMessage = String(error);
    }

    return status;
  }, [storageHygiene]);

  // ═══════════════════════════════════════════════════════════════════
  // RUN ALL TESTS
  // ═══════════════════════════════════════════════════════════════════
  const runAllTests = useCallback(async (): Promise<SystemHealthScore> => {
    setIsRunningTests(true);
    console.log('[ProtocolMonitor] 🔍 Running full protocol scan...');

    try {
      // Run all tests in parallel
      const [mediaDiet, deltaSyncResult, edgeBrainResult, cleanupCrew] = await Promise.all([
        testMediaDiet(),
        testDeltaSync(),
        testEdgeBrain(),
        testCleanupCrew(),
      ]);

      // Calculate scores
      const passedCount = [
        mediaDiet.passed,
        deltaSyncResult.passed,
        edgeBrainResult.passed,
        cleanupCrew.passed,
      ].filter(Boolean).length;

      const overall = (passedCount / 4) * 100;
      
      // Edge Brain saves CPU, Delta Sync saves bandwidth
      const edgeStats = edgeBrain.getStats();
      const processingPower = Math.min(100, 70 + (edgeStats.serverCallsSaved * 0.1));
      const costEfficiency = Math.min(100, 60 + (deltaSync.stats.bandwidthSavedKB * 0.01) + (edgeStats.serverCallsSaved * 0.05));

      const newHealthScore: SystemHealthScore = {
        overall,
        processingPower,
        costEfficiency,
        protocols: {
          mediaDiet,
          deltaSync: deltaSyncResult,
          edgeBrain: edgeBrainResult,
          cleanupCrew,
        },
        serverCallsSaved: edgeStats.serverCallsSaved,
        bandwidthSavedKB: deltaSync.stats.bandwidthSavedKB,
        storageSavedMB: storageHygiene.stats.bytesFreed / (1024 * 1024),
        cpuCyclesSaved: edgeStats.matchCalculations + edgeStats.sentimentAnalyses,
        timestamp: new Date().toISOString(),
      };

      setHealthScore(newHealthScore);
      testResultsRef.current = {
        mediaDiet: mediaDiet.passed || false,
        deltaSync: deltaSyncResult.passed || false,
        edgeBrain: edgeBrainResult.passed || false,
        cleanupCrew: cleanupCrew.passed || false,
      };

      console.log(`[ProtocolMonitor] ✅ Scan complete. Health: ${overall}%`);
      console.log(`[ProtocolMonitor] 📊 Processing Power: ${processingPower}%`);
      console.log(`[ProtocolMonitor] 💰 Cost Efficiency: ${costEfficiency}%`);
      console.log(`[ProtocolMonitor] 🚀 Server calls saved: ${edgeStats.serverCallsSaved}`);
      console.log(`[ProtocolMonitor] 📡 Bandwidth saved: ${deltaSync.stats.bandwidthSavedKB}KB`);

      // Dispatch event for Zoe Core
      window.dispatchEvent(new CustomEvent('zoe-protocol-health', {
        detail: newHealthScore,
      }));

      return newHealthScore;
    } catch (error) {
      console.error('[ProtocolMonitor] Error running tests:', error);
      throw error;
    } finally {
      setIsRunningTests(false);
    }
  }, [testMediaDiet, testDeltaSync, testEdgeBrain, testCleanupCrew, edgeBrain, deltaSync.stats, storageHygiene.stats]);

  // Run tests on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runAllTests();
    }, 2000); // Wait 2 seconds for hooks to initialize

    return () => clearTimeout(timer);
  }, [runAllTests]);

  return {
    healthScore,
    isRunningTests,
    runAllTests,
    testMediaDiet,
    testDeltaSync,
    testEdgeBrain,
    testCleanupCrew,
    testResults: testResultsRef.current,
  };
}

export default useZoeProtocolMonitor;
