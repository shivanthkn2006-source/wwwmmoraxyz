/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — UNIFIED OFFLINE MANAGER (Phase 5)
 * Single entry point for all offline architecture functionality
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useZoeOfflineCore } from '@/hooks/useZoeOfflineCore';
import { useZoeProactiveMessaging } from '@/hooks/useZoeProactiveMessaging';
import { useMobileOfflineOptimizations } from '@/hooks/useMobileOfflineOptimizations';
import { useOfflineIntegrationTest } from '@/hooks/useOfflineIntegrationTest';

// Re-export all types
export type { OfflineCapability, OfflineCoreState, InitiativeContent } from '@/hooks/useZoeOfflineCore';
export type { ProactiveInsight, InsightType, InsightPriority } from '@/hooks/useZoeProactiveMessaging';
export type { TestResult, IntegrationTestReport } from '@/hooks/useOfflineIntegrationTest';

// Re-export components
export { OfflineStatusDashboard } from '@/components/OfflineStatusDashboard';
export { OfflineTestRunner } from '@/components/OfflineTestRunner';
export { InitiativeProtocolIndicator } from '@/components/InitiativeProtocolIndicator';

/**
 * Unified offline manager hook
 * Combines all offline functionality into a single, easy-to-use interface
 */
export function useOfflineManager(userId: string | null) {
  const core = useZoeOfflineCore(userId);
  const proactive = useZoeProactiveMessaging();
  const mobile = useMobileOfflineOptimizations();
  const testing = useOfflineIntegrationTest(userId);

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Whether device is online */
    isOnline: core.isOnline,
    
    /** Current connection quality */
    connectionQuality: core.connectionQuality,
    
    /** Offline capability level: full, limited, minimal, none */
    offlineCapability: core.offlineCapability,
    
    /** Whether local LLM is ready */
    localLLMReady: core.localLLMReady,
    
    /** Whether storage (IndexedDB) is available */
    storageAvailable: core.storageAvailable,
    
    /** Number of cached messages */
    cachedMessageCount: core.cachedMessageCount,
    
    /** Number of items pending sync */
    pendingSyncCount: core.pendingSyncCount,
    
    /** Last sync timestamp */
    lastSyncAt: core.lastSyncAt,

    // ═══════════════════════════════════════════════════════════════════════════
    // PLATFORM
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Current platform: ios, android, web */
    platform: mobile.platform,
    
    /** Whether running as native app */
    isNativeApp: mobile.isNativeApp,
    
    /** Get platform-specific voice config (call when needed) */
    getVoiceConfig: mobile.getVoiceConfig,
    
    /** Get platform-specific storage config (call when needed) */
    getStorageConfig: mobile.getStorageConfig,
    
    /** Unlock audio (required for iOS) */
    unlockAudio: mobile.unlockAudio,
    
    /** Enable wake lock (keep screen on) */
    enableWakeLock: mobile.enableWakeLock,
    
    /** Disable wake lock */
    disableWakeLock: mobile.disableWakeLock,
    
    /** Trigger haptic feedback */
    hapticFeedback: mobile.hapticFeedback,

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIATIVE PROTOCOL
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Whether there's proactive content ready */
    hasProactiveContent: core.hasProactiveContent,
    
    /** Current initiative content */
    initiative: core.initiative,
    
    /** Consume and dismiss initiative */
    consumeInitiative: core.consumeInitiative,
    
    /** Pending proactive insights */
    pendingInsights: proactive.pendingInsights,
    
    /** Hours since last interaction */
    idleHours: proactive.idleHours,
    
    /** Dismiss a specific insight */
    dismissInsight: proactive.dismissInsight,
    
    /** Clear all insights */
    clearAllInsights: proactive.clearAllInsights,
    
    /** Manually trigger analysis */
    analyzeAndSuggest: proactive.analyzeAndSuggest,

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Generate response using best available method */
    generateResponse: core.generateResponse,

    // ═══════════════════════════════════════════════════════════════════════════
    // SYNC & STORAGE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Life pattern download progress (0-100) */
    lifePatternProgress: core.lifePatternProgress,
    
    /** Queue a message for sync */
    queueMessage: core.queueMessage,
    
    /** Retry failed sync tasks */
    retryFailedSync: core.retryFailedSync,
    
    /** Trigger life pattern download */
    downloadLifePattern: core.downloadLifePattern,
    
    /** Request persistent storage */
    requestPersistence: core.requestPersistence,
    
    /** Get storage estimate */
    getStorageEstimate: core.getStorageEstimate,
    
    /** Clear all offline data */
    clearOfflineData: core.clearOfflineData,

    // ═══════════════════════════════════════════════════════════════════════════
    // DIAGNOSTICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Run integration tests */
    runTests: testing.runTests,
    
    /** Whether tests are running */
    isTestRunning: testing.isRunning,
    
    /** Test progress (0-100) */
    testProgress: testing.progress,
    
    /** Last test report */
    lastTestReport: testing.lastReport,
    
    /** Abort running tests */
    abortTests: testing.abort,
  };
}

export default useOfflineManager;
