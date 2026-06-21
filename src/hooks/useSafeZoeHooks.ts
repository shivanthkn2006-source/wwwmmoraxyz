// ═══════════════════════════════════════════════════════════════════════════════
// SAFE ZOE INFINITY HOOKS - Progressive loading with error boundaries
// Prevents cascading failures when individual hooks crash
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

// Safe hook wrapper that catches initialization errors
export function useSafeHook<T>(
  hookFn: () => T,
  fallback: T,
  hookName: string
): { value: T; error: Error | null; isReady: boolean } {
  const [value, setValue] = useState<T>(fallback);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const result = hookFn();
      setValue(result);
      setIsReady(true);
    } catch (e) {
      console.error(`[SafeHook] ${hookName} failed to initialize:`, e);
      setError(e instanceof Error ? e : new Error(String(e)));
      setIsReady(true); // Still mark as ready so app continues
    }
  }, [hookFn, hookName]);

  return { value, error, isReady };
}

// Deferred initialization - only runs hook after specified delay
export function useDeferredHook<T>(
  hookFn: () => T,
  fallback: T,
  delayMs: number = 0
): T {
  const [value, setValue] = useState<T>(fallback);
  const [shouldRun, setShouldRun] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs > 0) {
      const timer = setTimeout(() => setShouldRun(true), delayMs);
      return () => clearTimeout(timer);
    }
  }, [delayMs]);

  useEffect(() => {
    if (shouldRun) {
      try {
        setValue(hookFn());
      } catch (e) {
        console.error('[DeferredHook] Failed:', e);
      }
    }
  }, [shouldRun, hookFn]);

  return value;
}

// Default fallbacks for complex hooks
export const HOOK_FALLBACKS = {
  autoProfiler: {
    profileMessage: async () => ({ entities: [], synced: false }),
    quickProfile: () => ({ entities: [], profileUpdates: [], shouldAcknowledge: false }),
    hasSignificantData: () => false,
  },
  
  zoeBrain: {
    think: async () => ({
      content: "I'm still waking up. Give me a moment...",
      mode: 'flash' as const,
      fromCache: false,
      codexInjected: false,
      latencyMs: 0,
    }),
    isOffline: false,
    connectionState: 'online' as const,
    currentMode: 'flash' as const,
    codexLoaded: false,
    refreshCodex: async () => {},
    offlineCapabilities: [],
    inferenceMetrics: null,
    costSavingsReport: null,
  },
  
  hybridVoice: {
    speak: async () => {},
    stop: () => {},
    isPlaying: false,
    isPremium: false,
    speakAsZoe: async () => {},
    currentVoice: 'zoe' as const,
    latencyMs: null,
    error: null,
    checkPremiumStatus: async () => false,
    setPremiumEnabled: () => {},
    speakAsZoeCalm: async () => {},
    speakAsSmith: async () => {},
    speakAsSmithAuthority: async () => {},
  },
  
  integration: {
    isInitialized: false,
    voiceCommands: {
      enable: () => {},
      disable: () => {},
    },
    proactiveNotifications: {
      pendingInsights: [],
    },
    initialize: async () => {},
    enhanceMessage: async (msg: string) => ({ content: msg }),
    integrationStatus: {
      tier1: { godMode: false, chainOfThought: false, selfAwareness: false, dhfCore: false },
      tier2: { relationshipStyle: false, proactiveNotifications: false, realtimeFeeds: false, soulCodex: false },
      tier3: { voiceCommands: false, walkTalk: false, orbMessaging: false, selfieCitySearch: false },
      overallHealth: 0,
      activeFeatures: 0,
      totalFeatures: 38,
    },
  },
  
  documentXray: {
    isUploading: false,
    activeDocument: null,
    uploadDocument: async () => null,
    clearActiveDocument: () => {},
    getDocumentContext: () => '',
  },
  
  phantomMode: {
    isPhantomMode: false,
    showIndicator: false,
    handleDoubleTap: () => {},
  },
  
  genesisEffects: {
    initEffects: () => {},
    startZoeTyping: () => {},
    stopZoeTyping: () => {},
    onMessageSent: () => {},
    onMessageReceived: () => {},
    onUnlock: () => {},
    onVoiceActivated: () => {},
    onSystemAlert: () => {},
  },
  
  companionMode: {
    state: {
      currentMode: 'active' as const,
      timeOfDay: 'morning' as const,
      isBedtimeHours: false,
      propModeActive: false,
      whisperChannelActive: false,
      ambientListeningActive: false,
      lastInteraction: null,
      presenceLevel: 0.5,
      heartbeatEnabled: false,
      morningGreetingSent: false,
    },
    enterBedtimeMode: () => {},
    exitBedtimeMode: () => {},
    startPropMode: () => {},
    stopPropMode: () => {},
    generatePropModeComment: () => 'Hello!',
    generateAmbientResponse: () => null,
    generateMemoryLaneMessage: async () => null,
    generateMirrorValidation: () => '',
    getBedtimeStory: () => ({ title: '', opening: '' }),
    getMorningGreeting: () => '',
  },
  
  bioKernel: {
    mood: 'NEUTRAL' as const,
    state: {
      currentMood: 'NEUTRAL' as const,
      neurotransmitters: { dopamine: 0.5, serotonin: 0.5, adrenaline: 0.3, oxytocin: 0.4, cortisol: 0.3 },
      heartRate: 72,
      breathingRate: 12,
      lastUpdate: Date.now(),
    },
    heartRate: 72,
    breathingRate: 12,
    processInput: () => {},
    boost: () => {},
    reset: () => {},
    isOnline: true,
  },
  
  emotionalVoice: {
    getVoiceForMood: () => ({ voice: 'zoe', style: 'warm', rate: 1 }),
    currentMood: 'NEUTRAL',
  },
  
  offlineWisdom: {
    getWisdomForMood: () => 'Take a moment to breathe.',
    getRandomInsight: () => 'Every moment is a new beginning.',
  },
  
  atmanArchive: {
    destinySeed: null,
    isDestinySeedLoading: true,
    hasLocalDestinySeed: false,
    currentPersona: null,
    communicationStyle: null,
    todaySignificance: null,
    lineageTree: null,
    hasLocalLineageTree: false,
    ancestorMessages: [],
    lineageWisdom: [],
    legacyWelcome: null,
    generateAndSaveDestinySeed: async () => null,
    refreshDestinySeed: () => {},
    addFamilyMemberToTree: () => {},
    getPersonalizedGreeting: () => 'Hello, seeker of wisdom.',
    shouldBeDirectCoach: () => false,
    shouldBeLovingFriend: () => true,
    getCurrentDashaTheme: () => 'Soul Journey',
    error: null,
  },
  
  destinyCompanion: {
    isLoaded: false,
    destinySeed: null,
    biologicalClock: null,
    zoeCounterPersona: null,
    counterPersonaTraits: null,
    cosmicWeather: null,
    activeInsights: [],
    lifePhaseAdvice: null,
    getCounterbalanceGreeting: () => 'I am the infinite. Ask anything.',
    getTodayAdvice: () => 'Trust the journey.',
    acknowledgeInsight: () => {},
    refreshCosmicWeather: () => {},
  },
  
  vedicEngine: {
    isLoading: false,
    jathakam: null,
    personalityMatrix: null,
    destinyProfile: null,
    companionMode: null,
    calculateJathakam: async () => null,
    downloadDestinySeed: () => {},
    getCompanionInstruction: () => '',
  },
  
  artifactGenerator: {
    isGenerating: false,
    backgroundImage: null,
    generateArtifact: async () => null,
    downloadArtifact: async () => {},
    detectIntent: () => ({ type: 'none' as const, confidence: 0, extractedSubject: '', originalPrompt: '' }),
  },
  
  wakeWord: {
    isListening: false,
    startWakeWordDetection: () => {},
    stopWakeWordDetection: () => {},
  },
};

// Hook initialization order for progressive loading
export const HOOK_INIT_ORDER = [
  { name: 'auth', priority: 0 },      // Critical - load first
  { name: 'phantomMode', priority: 0 }, // Performance - load first
  { name: 'brain', priority: 100 },    // Core - load after 100ms
  { name: 'voice', priority: 200 },    // Voice - load after 200ms  
  { name: 'integration', priority: 500 }, // Heavy - load after 500ms
  { name: 'destiny', priority: 1000 },  // Optional - load after 1s
];

console.log('[SafeZoeHooks] Module loaded');
