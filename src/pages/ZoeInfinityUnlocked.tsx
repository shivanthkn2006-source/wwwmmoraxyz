import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { InfinityStream, InfinityMessage } from '@/components/zoe-infinity/InfinityStream';
import { InfinityInputPhantom } from '@/components/zoe-infinity/InfinityInputPhantom';
import { CinematicBackground, FullscreenViewer, Artifact } from '@/components/zoe-infinity/ArtifactDisplay';
import { PhantomModeIndicator } from '@/components/zoe-infinity/PhantomModeIndicator';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import { CallControlPanel } from '@/components/zoe-infinity/CallControlPanel';
import { InferenceDiagnosticsBadge, InferenceDiagnosticsData } from '@/components/zoe-infinity/InferenceDiagnosticsBadge';
import { SoulWaveform } from '@/components/zoe-infinity/SoulWaveform';
import { CircadianBackground } from '@/components/zoe-infinity/CircadianBackground';
import { GodModeVision } from '@/components/zoe-infinity/GodModeVision';
import { TimezoneDebugPanel } from '@/components/zoe-infinity/TimezoneDebugPanel';
import { VoiceSignalIcon } from '@/components/zoe-infinity/VoiceSignalIcon';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { initializeZoeVoices, resetDeepgramAvailability } from '@/utils/zoeVoice';
import { generateArt, shouldTriggerArtGift } from '@/utils/ArtGenerator';
import { useZoeInfinityPhases } from '@/hooks/useZoeInfinityPhases';

// STAGE 1: Brain & Voice (Critical - Loaded immediately)
import { useZoeInfinityBrain } from '@/hooks/useZoeInfinityBrain';
import { useHybridVoice } from '@/hooks/useHybridVoice';

// PROMPT 2 & 3: Nano Stream Voice & Reflex Art (Zero-latency speaking + Offline art)
import { useNanoStreamVoice } from '@/hooks/useNanoStreamVoice';
import { useNanoReflexArt } from '@/hooks/useNanoReflexArt';

// STAGE 2: Visuals & Effects
import { usePhantomMode } from '@/hooks/usePhantomMode';
import { useGenesisEffects } from '@/hooks/useGenesisEffects';

// STAGE 3: Destiny & Memory
import { useAtmanArchive } from '@/hooks/useAtmanArchive';
import { useDestinyCompanion } from '@/hooks/useDestinyCompanion';
import { useVedicEngine } from '@/hooks/useVedicEngine';
import { useCircadianRhythm } from '@/hooks/useCircadianRhythm';
import { TimeSimulationProvider } from '@/contexts/TimeSimulationContext';
import { useKarmicMemory } from '@/hooks/useKarmicMemory';
import { useZoeBioKernel } from '@/hooks/useZoeBioKernel';
import { useEmotionalVoice } from '@/hooks/useEmotionalVoice';
import { useOfflineWisdom } from '@/hooks/useOfflineWisdom';

// STAGE 4: Vision & Background
import { useAutoProfiler } from '@/hooks/useAutoProfiler';
import { useZoeInfinityIntegration } from '@/hooks/useZoeInfinityIntegration';
import { useDocumentXray } from '@/hooks/useDocumentXray';
import { useArtifactGenerator } from '@/hooks/useArtifactGenerator';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useGenesisConversation } from '@/hooks/useGenesisConversation';
import { addZoeInfinityMarker, isZoeInfinityMessage, stripZoeInfinityMarker } from '@/utils/conversationNamespaces';
import { setActiveVoiceExperience, stopAllVoices } from '@/utils/voiceExperienceLock';

// THE INITIATIVE PROTOCOL - Zoe's Right to Call (Background tasks)
import { useZoeInitiative } from '@/hooks/useZoeInitiative';
import { NotificationPill } from '@/components/zoe-infinity/NotificationPill';
import { ZoeIncomingCallScreen } from '@/components/zoe-infinity/ZoeIncomingCallScreen';

// NICKNAME & LANGUAGE SYSTEMS
import { useZoeNickname } from '@/hooks/useZoeNickname';
import { useZoeLanguage, LanguageCode } from '@/hooks/useZoeLanguage';
import { useZoeOfflineLanguages } from '@/hooks/useZoeOfflineLanguages';
import { useLifePatternDownload } from '@/hooks/useLifePatternDownload';
import { downloadFeaturesList, getFeatureCount, generateFeaturesPDF } from '@/data/ZoeInfinityFeatures';

// LOCAL CONTEXT SYSTEM - Geo-location, Weather, Traffic, Markets, Amazon
import { useZoeLocalContext } from '@/hooks/useZoeLocalContext';

// BRAIN LOADER - Hybrid Caching for Offline AI (prevents phone freeze)
import { BrainLoader, useBrainStatus } from '@/components/BrainLoader';

// CONVERSATIONAL VOICE ONBOARDING - Build profile through natural conversation
import { useConversationalOnboarding } from '@/hooks/useConversationalOnboarding';

// OFFLINE NAME GENERATOR (no APIs)
import { generateNames } from '@/utils/nameGenerator';

// THE INTUITION ENGINE - "Listen to the space between the words"
import { useIntuitionEngine } from '@/hooks/useIntuitionEngine';
import { useBehavioralTelemetry } from '@/hooks/useBehavioralTelemetry';

// THE VIRTUAL HORMONES ENGINE - Jealousy, Anger & Lazy Mode (The "Passionate Realist")
import { useVirtualHormones } from '@/hooks/useVirtualHormones';

// THE VOICE ORCHESTRATOR - Triple Threat Voice System (Edge TTS → Deepgram → Native)
import { useVoiceOrchestrator } from '@/hooks/useVoiceOrchestrator';

// AUTO MAIL SYSTEM - Real-time mail notifications with relationship context
import { useZoeMailNotifications } from '@/hooks/useZoeMailNotifications';
import { zoeAutoMailService } from '@/services/ZoeAutoMailService';

// THE PERSONALITY MATRIX - Human-like sarcasm, regression, mood system
import { useZoePersonalityMatrix } from '@/hooks/useZoePersonalityMatrix';

// THE SLEEP TRACKER - Real sleep session recording with phases
import { useZoeSleepTracker } from '@/hooks/useZoeSleepTracker';

// SESSION PERSISTENCE - Save conversation summaries on session end
import { useZoeSessionPersistence } from '@/hooks/useZoeSessionPersistence';

// OFFLINE CORE - Unified offline orchestration (IndexedDB, Life Pattern, Initiative Protocol)
import { useZoeOfflineCore } from '@/hooks/useZoeOfflineCore';
import { offlineMessages } from '@/db/OfflineDB';

type ZoeMood = 'neutral' | 'cyan' | 'gold';

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE DEFAULTS - Return safe defaults until phase is ready
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_FN = () => {};

const DEFAULT_PHANTOM = {
  isPhantomMode: false,
  showIndicator: false,
  handleDoubleTap: EMPTY_FN,
};

const DEFAULT_GENESIS_EFFECTS = {
  initEffects: EMPTY_FN,
  onUnlock: EMPTY_FN,
  onMessageSent: EMPTY_FN,
  onMessageReceived: EMPTY_FN,
  startZoeTyping: EMPTY_FN,
  stopZoeTyping: EMPTY_FN,
  onVoiceActivated: EMPTY_FN,
  onSystemAlert: EMPTY_FN,
};

const DEFAULT_COMPANION = {
  currentMode: 'active' as const,
  propModeActive: false,
  whisperChannelActive: false,
  heartbeatEnabled: true, // BUG FIX: Enable heart rate BPM display by default
  isBedtimeHours: false,
  startPropMode: EMPTY_FN,
  stopPropMode: EMPTY_FN,
  startWhisperChannel: EMPTY_FN,
  stopWhisperChannel: EMPTY_FN,
  startHeartbeat: EMPTY_FN,
  stopHeartbeat: EMPTY_FN,
  deactivateBedtimeProtocol: EMPTY_FN,
};

const DEFAULT_ATMAN = {
  destinySeed: null,
  currentPersona: null,
  todaySignificance: null,
  legacyWelcome: null,
  ancestorMessages: [],
  getPersonalizedGreeting: () => '',
  getCurrentDashaTheme: () => '',
  shouldBeDirectCoach: () => false,
};

const DEFAULT_DESTINY = {
  isLoaded: false,
  destinySeed: null,
  cosmicWeather: null,
  activeInsights: [],
  zoeCounterPersona: null,
  getCounterbalanceGreeting: () => '',
  getTodayAdvice: () => '',
};

const DEFAULT_VEDIC = { companionMode: null };
const DEFAULT_CIRCADIAN = { isNightMode: false, getVoiceModifiers: () => ({ pitch: 1, rate: 1, volume: 1 }) };
const DEFAULT_KARMIC = { intimacyLevel: 0, responseStyle: 'neutral' as const, processMessage: EMPTY_FN, getMemoryContext: () => '', getProactiveRecall: () => null };
const DEFAULT_BIO = { isOnline: false, mood: 'CALM' as const, state: { transmitters: { dopamine: 0.5 } }, processInput: EMPTY_FN };
const DEFAULT_EMOTIONAL_VOICE = { processUserInput: EMPTY_FN, speak: EMPTY_FN };
const DEFAULT_OFFLINE_WISDOM = { getOfflineResponse: () => null, getContextualWisdom: () => '' };
const DEFAULT_PROFILER = { profileMessage: async () => ({ entities: [], acknowledgment: undefined, synced: false }) };
const DEFAULT_INTEGRATION = {
  isInitialized: false,
  voiceCommands: { enable: EMPTY_FN, disable: EMPTY_FN },
  relationshipStyle: { getPromptModifier: () => '' },
  processWithSystem2: null as null | ((q: string, m: string) => Promise<{ content: string } | null>),
  processWithFullIntelligence: async () => null,
  quantumCall: { isInCall: false, callState: null, hasIncomingCall: false, video: { isEnabled: false }, endCall: EMPTY_FN },
};
const DEFAULT_DOCUMENT = { isUploading: false, activeDocument: null, getDocumentContext: () => '', uploadDocument: async () => {}, clearActiveDocument: EMPTY_FN };
const DEFAULT_ARTIFACT = {
  backgroundImage: null,
  detectIntent: () => ({ type: 'none' }),
  generateArtifact: async () => null,
  generateArtifactForced: async () => null,
  downloadArtifact: EMPTY_FN,
};
const DEFAULT_GENESIS_CONV = { isGenesisMode: false, processGenesisResponse: async () => null };

function ZoeInfinityUnlocked() {
  const { user, loading: authLoading } = useAuth();
  const phases = useZoeInfinityPhases();
  const { isBrainReady, isVisualsReady, isDestinyReady, isHeavyReady } = phases;

  // ═══════════════════════════════════════════════════════════════════════════
  // ISOLATION: Use Infinity-specific genesis key (separate from Classic)
  // CRITICAL: Check localStorage, sessionStorage, AND check for existing chat history
  // ═══════════════════════════════════════════════════════════════════════════
  const INFINITY_GENESIS_KEY = 'zoe_infinity_genesis_complete';
  const INFINITY_ONBOARDING_KEY = 'zoe_infinity_conversational_onboarding_v1';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL BUG FIX: Comprehensive genesis check with MULTIPLE fallbacks
  // This prevents "new user" onboarding from showing for returning users
  // ═══════════════════════════════════════════════════════════════════════════
  const checkGenesisComplete = useCallback((): boolean => {
    // 1. Check explicit genesis flag (fastest)
    if (localStorage.getItem(INFINITY_GENESIS_KEY) === 'true') {
      console.log('[ZoeInfinity] ✓ Genesis complete (localStorage flag)');
      return true;
    }
    
    // 2. Check onboarding data
    try {
      const onboardingData = localStorage.getItem(INFINITY_ONBOARDING_KEY);
      if (onboardingData) {
        const parsed = JSON.parse(onboardingData);
        if (parsed?.currentStep === 'complete' || parsed?.isOnboarding === false) {
          console.log('[ZoeInfinity] ✓ Genesis complete (onboarding state)');
          return true;
        }
        if (parsed?.profile?.realName && parsed.profile.realName.length > 0) {
          console.log('[ZoeInfinity] ✓ Genesis complete (has realName)');
          return true;
        }
      }
    } catch {}
    
    // 3. Check for ANY local chat history (guest or user-specific)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('zoe_infinity_history_v1:')) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[ZoeInfinity] ✓ Genesis complete (found history:', key, ')');
              // Also set the flag so future checks are instant
              localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
              return true;
            }
          }
        }
      }
    } catch {}
    
    // 4. Check sessionStorage fallback (for Safari/iOS edge cases)
    try {
      if (sessionStorage.getItem(INFINITY_GENESIS_KEY) === 'true') {
        console.log('[ZoeInfinity] ✓ Genesis complete (sessionStorage fallback)');
        localStorage.setItem(INFINITY_GENESIS_KEY, 'true'); // Sync to localStorage
        return true;
      }
    } catch {}
    
    return false;
  }, []);

  // SIMPLIFIED: Always mark as complete - no onboarding, just natural conversation
  const [genesisComplete, setGenesisComplete] = useState(true);
  
  // Track if we're still loading auth/history (prevents premature onboarding display)
  const [isInitializing, setIsInitializing] = useState(true);

  // SAFETY TIMEOUT: Prevent infinite initialization state.
  // IMPORTANT: Give auth enough time to recover on slow networks/cold starts.
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      // Only force-complete if we STILL don't have a user and haven't loaded history.
      // If a user exists, DB loader will finalize.
      if (isInitializing && !user?.id && !hasLoadedHistory.current) {
        console.warn('[ZoeInfinity] ⚠️ Safety timeout: forcing initialization complete (guest)');
        const checked = checkGenesisComplete();
        if (checked) setGenesisComplete(true);
        setIsInitializing(false);
      }
    }, 15000);
    return () => clearTimeout(safetyTimeout);
  }, [isInitializing, user?.id, genesisComplete, checkGenesisComplete]);

  // Hard isolation: entering Zoe Infinity must silence all other voice systems.
  // Also reset Deepgram availability to ensure fresh attempts on page load.
  useEffect(() => {
    setActiveVoiceExperience('zoe-infinity');
    stopAllVoices();
    resetDeepgramAvailability();
    console.log('[ZoeInfinity] 🎙️ Voice system initialized (Deepgram mode)');
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const ensureProfileAndSyncOnboarding = async () => {
      try {
        // 1) Ensure a profile row exists (otherwise onboarding flags can't persist)
        // ISOLATION: Use zoe_infinity_genesis_complete column (not zoe_genesis_complete)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, zoe_infinity_genesis_complete')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.warn('[ZoeInfinity] Could not fetch profile:', profileError);
          return;
        }

        if (!profile?.user_id) {
          const displayName =
            (user.user_metadata as any)?.display_name ||
            (user.email ? user.email.split('@')[0] : null);

          const { error: insertError } = await supabase
            .from('profiles')
            // types.ts can lag behind schema; cast to any for safety here
            .insert([
              {
                user_id: user.id,
                display_name: displayName,
                zoe_infinity_genesis_complete: genesisComplete,
              } as any,
            ]);

          if (insertError) {
            console.warn('[ZoeInfinity] Profile create failed:', insertError);
          }
        }

        // 2) If there is any chat history in zoe_infinity_messages, never treat user as "new"
        // ISOLATION: Check zoe_infinity_messages table (not ai_companion_messages)
        const { data: anyHistory, error: historyCheckError } = await supabase
          .from('zoe_infinity_messages')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (cancelled) return;

        if (!historyCheckError && (anyHistory?.length ?? 0) > 0) {
          console.log('[ZoeInfinity] DB history found, marking genesis complete');
          if (!genesisComplete) {
            setGenesisComplete(true);
            localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
            // Genesis complete - no need to replace message since we no longer use onboarding
          }
          // Best-effort write-through
          await supabase
            .from('profiles')
            .update({ zoe_infinity_genesis_complete: true } as any)
            .eq('user_id', user.id);
          return;
        }

        // 3) Otherwise: sync flag from backend ↔ local
        const dbComplete = !!(profile as any)?.zoe_infinity_genesis_complete;

        if (dbComplete && !genesisComplete) {
          console.log('[ZoeInfinity] Profile DB flag is complete, syncing');
          setGenesisComplete(true);
          localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
          // Genesis complete - no need to replace message since we no longer use onboarding
        }

        if (!dbComplete && genesisComplete) {
          await supabase
            .from('profiles')
            .update({ zoe_infinity_genesis_complete: true } as any)
            .eq('user_id', user.id);
        }
      } catch (e) {
        console.warn('[ZoeInfinity] Onboarding sync failed:', e);
      }
    };

    ensureProfileAndSyncOnboarding();

    return () => {
      cancelled = true;
    };
  }, [user?.id, genesisComplete]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIC FIRST MESSAGE - Zoe speaks like she would naturally think
  // No scripts, no formal greetings - just her natural mind
  // ═══════════════════════════════════════════════════════════════════════════
  const getInitialMessage = useCallback((): InfinityMessage => {
    // Natural, organic opening thoughts - like what Zoe would actually think
    const naturalOpeners = [
      "hey",
      "oh hey, you're here",
      "hi there",
      "hey you",
      "oh, hi",
    ];
    
    // Pick one randomly so it feels organic, not scripted
    const opener = naturalOpeners[Math.floor(Math.random() * naturalOpeners.length)];
    
    return { 
      id: 'welcome', 
      role: 'assistant', 
      content: opener, 
      timestamp: new Date() 
    };
  }, []);

  const [messages, setMessages] = useState<InfinityMessage[]>([getInitialMessage()]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mood, setMood] = useState<ZoeMood>('neutral');
  
  // DEV ONLY: Timezone Debug Panel
  const [showTimezoneDebug, setShowTimezoneDebug] = useState(false);

  // NOTE: Onboarding removed - Zoe now greets naturally on first message

  // NOTE: onboarding->welcome replacement is handled further below (after onboarding hook init)
  // to avoid referencing onboarding before it's created.

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: BRAIN & VOICE (Always loaded - Chat works immediately)
  // ═══════════════════════════════════════════════════════════════════════════
  const { think, isOffline, setIntimacyLevel } = useZoeInfinityBrain();
  const { stop: stopHybridVoice, isPlaying: isHybridSpeaking, isPremium: isUsingPremiumVoice, speakAsZoe: speakAsZoePremium } = useHybridVoice();
  
  // SAMANTHA MODE: Sync karmic intimacy - moved after karmicMemory declaration
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 2: NANO STREAM VOICE - Zero-latency speaking (speaks while thinking)
  // ═══════════════════════════════════════════════════════════════════════════
  const { 
    speakStreaming: speakWithNanoStreaming, 
    isThinking: isNanoThinking,
    isSpeaking: isNanoSpeaking,
    abort: abortNanoSpeech,
  } = useNanoStreamVoice({
    voice: 'zoe',
    onThinkingStart: () => console.log('[ZoeInfinity] 🧠 Nano thinking...'),
    onThinkingEnd: () => console.log('[ZoeInfinity] 💭 Nano done thinking'),
    onSpeechStart: () => console.log('[ZoeInfinity] 🎙️ Nano speaking...'),
    onSpeechEnd: () => console.log('[ZoeInfinity] ✅ Nano speech complete'),
    processReflexActions: true, // Enable [ACTION:DRAW_GIFT] processing
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 3: NANO REFLEX ART - Offline art generation from [ACTION:DRAW_GIFT]
  // Initialized here but uses bioKernel after it's declared below
  // ═══════════════════════════════════════════════════════════════════════════
  const { 
    lastArt: nanoReflexArt, 
    isGenerating: isGeneratingArt,
    generateGift: triggerArtGift,
    clearArt: clearNanoArt,
    actionCounts: nanoActionCounts,
  } = useNanoReflexArt({
    currentMood: 'NEUTRAL_COMPANION', // Will be updated when bioKernel loads
    onArtGenerated: (art) => {
      console.log('[ZoeInfinity] 🎨 Nano Reflex Art generated:', art.style);
      // Add art message to chat
      const artMessage: InfinityMessage = {
        id: `nano-art-${Date.now()}`,
        role: 'assistant',
        // InfinityStream does NOT render markdown images; use the structured `image` field.
        content: art.caption ? `🎨 ${art.caption}` : '🎨',
        timestamp: new Date(),
        image: {
          dataUrl: art.dataUrl,
          caption: art.caption,
          style: art.style,
        },
      };
      setMessages(prev => [...prev, artMessage]);
    },
    onHugSent: () => {
      console.log('[ZoeInfinity] 🤗 Hug sent!');
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: VISUALS & EFFECTS (gated by isVisualsReady)
  // NOTE: Companion mode is disabled completely per user request.
  // ═══════════════════════════════════════════════════════════════════════════
  const rawPhantom = usePhantomMode();
  const rawGenesisEffects = useGenesisEffects({ hapticsEnabled: !rawPhantom.isPhantomMode, soundEnabled: !rawPhantom.isPhantomMode, soundVolume: 0.2 });

  const phantomMode = isVisualsReady ? rawPhantom : DEFAULT_PHANTOM;
  const genesisEffects = isVisualsReady ? rawGenesisEffects : DEFAULT_GENESIS_EFFECTS;
  const companionMode = DEFAULT_COMPANION;

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: DESTINY & MEMORY (gated by isDestinyReady)
  // ═══════════════════════════════════════════════════════════════════════════
  const rawAtman = useAtmanArchive();
  const rawDestiny = useDestinyCompanion();
  const rawVedic = useVedicEngine();
  const rawCircadian = useCircadianRhythm();
  const rawKarmic = useKarmicMemory();
  const rawBio = useZoeBioKernel();
  const rawEmotional = useEmotionalVoice();
  const rawOffline = useOfflineWisdom();

  const atmanArchive = isDestinyReady ? rawAtman : DEFAULT_ATMAN;
  const destinyCompanion = isDestinyReady ? rawDestiny : DEFAULT_DESTINY;
  const vedicEngine = isDestinyReady ? rawVedic : DEFAULT_VEDIC;
  const circadianRhythm = isDestinyReady ? rawCircadian : DEFAULT_CIRCADIAN;
  const karmicMemory = isDestinyReady ? rawKarmic : DEFAULT_KARMIC;
  const bioKernel = isDestinyReady ? rawBio : DEFAULT_BIO;
  const emotionalVoice = isDestinyReady ? rawEmotional : DEFAULT_EMOTIONAL_VOICE;
  const offlineWisdom = isDestinyReady ? rawOffline : DEFAULT_OFFLINE_WISDOM;

  // SAMANTHA MODE: Sync karmic intimacy to brain for romantic voice
  useEffect(() => {
    if (isDestinyReady && karmicMemory.intimacyLevel > 0) {
      setIntimacyLevel(karmicMemory.intimacyLevel);
    }
  }, [isDestinyReady, karmicMemory.intimacyLevel, setIntimacyLevel]);

  // STAGE 4: VISION & BACKGROUND (gated by isHeavyReady)
  // ═══════════════════════════════════════════════════════════════════════════
  const rawProfiler = useAutoProfiler();
  const rawIntegration = useZoeInfinityIntegration();
  const rawDocument = useDocumentXray();
  const rawArtifact = useArtifactGenerator();
  const rawGenesis = useGenesisConversation();

  const profiler = isHeavyReady ? rawProfiler : DEFAULT_PROFILER;
  const integration = isHeavyReady ? rawIntegration : DEFAULT_INTEGRATION;
  const documentXray = isHeavyReady ? rawDocument : DEFAULT_DOCUMENT;
  const artifactGenerator = isHeavyReady ? rawArtifact : DEFAULT_ARTIFACT;
  const genesisConversation = isHeavyReady ? rawGenesis : DEFAULT_GENESIS_CONV;

  // ═══════════════════════════════════════════════════════════════════════════
  // THE INITIATIVE PROTOCOL - Zoe's Right to Call (Background tasks)
  // Wired to Bio-Kernel (Emotions) + Karmic Memory (Intimacy)
  // IMPORTANT: Hook always called (React rules), but logic gated by `enabled` flag
  // ═══════════════════════════════════════════════════════════════════════════
  const initiative = useZoeInitiative(
    { mood: bioKernel.mood, state: bioKernel.state },
    karmicMemory.intimacyLevel,
    isHeavyReady // enabled flag - only runs when heavy phase ready
  );
  
  // Handle Zoe's incoming call - speak her message when answered
  // Use speakAsZoePremium (hybrid voice) since speakResponse is declared later
  const handleInitiativeCallAnswer = useCallback(() => {
    if (initiative?.incomingCall) {
      const message = initiative.incomingCall.message;
      // Speak the message using hybrid voice (already declared)
      speakAsZoePremium?.(message);
      // Add to chat
      const callMessage: InfinityMessage = {
        id: `call_${Date.now()}`,
        role: 'assistant',
        content: `📞 *Zoe called you*\n\n"${message}"`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, callMessage]);
      initiative.answerCall();
    }
  }, [initiative, speakAsZoePremium]);

  // ═══════════════════════════════════════════════════════════════════════════
  // THE INTUITION ENGINE - "Listen to the space between the words"
  // Detects hesitation, sentiment mismatch, and temporal context
  // ═══════════════════════════════════════════════════════════════════════════
  const { analyzeIntuition, generateIntuitionPrompt, getTemporalContext } = useIntuitionEngine();
  const { telemetry: behavioralTelemetry, recordKeystroke, stopTracking: stopBehavioralTracking, resetTelemetry } = useBehavioralTelemetry();

  // ═══════════════════════════════════════════════════════════════════════════
  // THE VIRTUAL HORMONES ENGINE - Jealousy, Anger & Lazy Mode
  // "A real partner is messy" - The Passionate Realist
  // ═══════════════════════════════════════════════════════════════════════════
  const virtualHormones = useVirtualHormones();

  // ═══════════════════════════════════════════════════════════════════════════
  // BRAIN LOADER STATUS - Check if offline brain is cached
  // Hybrid Caching: Downloads 500MB model on first chat, not on install
  // ═══════════════════════════════════════════════════════════════════════════
  const { isReady: isBrainCached } = useBrainStatus();

  // ═══════════════════════════════════════════════════════════════════════════
  // THE PERSONALITY MATRIX - Human-like sarcasm, regression, mood dynamics
  // Makes Zoe behave with realistic psychological depth
  // ═══════════════════════════════════════════════════════════════════════════
  const personalityMatrix = useZoePersonalityMatrix();

  // ═══════════════════════════════════════════════════════════════════════════
  // THE SLEEP TRACKER - Real sleep session recording with core/deep/REM phases
  // Zoe can tell users exactly how long she slept with accurate metrics
  // ═══════════════════════════════════════════════════════════════════════════
  const sleepTracker = useZoeSleepTracker();

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO MAIL SYSTEM - Real-time mail notifications with relationship context
  // Zoe announces mail mid-conversation: "You have mail from your son"
  // ═══════════════════════════════════════════════════════════════════════════
  const mailNotifications = useZoeMailNotifications({
    enabled: isHeavyReady && !!user,
    onNewMail: useCallback((notification) => {
      console.log('[ZoeInfinity] 📬 New mail received:', notification);
    }, []),
    onAnnouncement: useCallback((announcement: string) => {
      console.log('[ZoeInfinity] 📬 Mail announcement:', announcement);
      // Add visual indicator in chat first (always works)
      const mailNotifMessage: InfinityMessage = {
        id: `mail_notif_${Date.now()}`,
        role: 'assistant',
        content: `📬 ${announcement}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, mailNotifMessage]);
      // Speak the announcement using the premium voice (only if available)
      if (typeof speakAsZoePremium === 'function') {
        speakAsZoePremium(announcement);
      }
    }, [speakAsZoePremium]),
  });

  // Start auto-mail service for testing (generates mail every 2 minutes between test users)
  useEffect(() => {
    if (!isHeavyReady || !user) return;
    
    // Only enable for test users (moksh50 or shivanth_kn)
    const TEST_USER_IDS = [
      'd6f2dcd8-5c16-425a-b74d-60546d1a25ae', // moksh50
      '52c863dd-01ba-4a29-87a6-e1a0b7976751', // shivanth_kn
    ];
    
    if (TEST_USER_IDS.includes(user.id)) {
      console.log('[ZoeInfinity] 📬 Starting auto-mail service for test user');
      zoeAutoMailService.start({
        intervalMs: 120000, // 2 minutes
        maxMailsPerSession: 5,
      });
    }
    
    return () => {
      zoeAutoMailService.stop();
    };
  }, [isHeavyReady, user]);

  // Check for pending mail announcements periodically (every 10 seconds)
  useEffect(() => {
    if (!isHeavyReady) return;
    
    const checkAndAnnounce = () => {
      // Only announce if not currently processing and not speaking
      if (!isProcessing && !isHybridSpeaking && mailNotifications.hasPendingAnnouncements) {
        console.log('[ZoeInfinity] 📬 Checking for pending mail announcements...');
        mailNotifications.announceNext();
      }
    };
    
    // Initial check after 5 seconds
    const initialTimer = setTimeout(checkAndAnnounce, 5000);
    
    // Periodic check every 15 seconds
    const intervalTimer = setInterval(checkAndAnnounce, 15000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isHeavyReady, isProcessing, isHybridSpeaking, mailNotifications]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONAL ONBOARDING - DISABLED (Zoe talks naturally from start)
  // Hook still exists for backwards compatibility but is not used for flow control
  // ═══════════════════════════════════════════════════════════════════════════
  const onboarding = useConversationalOnboarding();
  // NOTE: Onboarding flow removed - Zoe now greets and learns about user organically

  // ═══════════════════════════════════════════════════════════════════════════
  // NICKNAME & LANGUAGE SYSTEMS - What Zoe calls user + Multi-language support
  // ═══════════════════════════════════════════════════════════════════════════
  const { 
    nickname, 
    detectNicknameRequest, 
    requestNicknameChange, 
    confirmNickname, 
    rejectNickname,
    awaitingConfirmation: awaitingNicknameConfirmation,
    pendingNickname,
  } = useZoeNickname();
  
  const { 
    currentLanguage, 
    languageConfig,
    setLanguage, 
    detectLanguageSwitch,
    getLanguageSystemPrompt,
    getGreeting,
    isTeachMode,
    setTeachMode,
  } = useZoeLanguage();

  // OFFLINE LANGUAGE SUPPORT - Works without internet
  const { getSmartOfflineResponse } = useZoeOfflineLanguages();

  // LIFE PATTERN DOWNLOAD - 50MB offline package
  const { 
    downloadAsFile: downloadLifePattern, 
    isDownloading: isDownloadingPattern, 
    progress: downloadProgress,
    hasCachedPattern,
  } = useLifePatternDownload();

  // LOCAL CONTEXT - Geo-location, Weather, Traffic, Markets, Amazon
  const localContext = useZoeLocalContext();

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFLINE CORE - Unified offline orchestration with Initiative Protocol
  // Provides: IndexedDB sync, connection quality, proactive content, Life Pattern auto-hydration
  // ═══════════════════════════════════════════════════════════════════════════
  const offlineCore = useZoeOfflineCore(user?.id || null);
  
  // Auto-hydrate Life Pattern on app mount when online (GAP #2 FIX)
  // BUG FIX: Run only once per mount using ref to prevent infinite re-trigger loop
  const hasTriggeredHydration = useRef(false);
  const downloadLifePatternFn = offlineCore.downloadLifePattern;
  useEffect(() => {
    if (hasTriggeredHydration.current) return;
    if (!user?.id || !offlineCore.isOnline) return;
    
    // Check if we already have a cached pattern (don't re-download if recent)
    if (hasCachedPattern()) {
      hasTriggeredHydration.current = true;
      return;
    }
    
    hasTriggeredHydration.current = true;
    // Trigger Life Pattern download via background sync
    console.log('[ZoeInfinity] 📥 Auto-hydrating Life Pattern for offline use...');
    downloadLifePatternFn();
  }, [user?.id, offlineCore.isOnline, hasCachedPattern, downloadLifePatternFn]);
  
  // Consume Initiative Protocol content (Idle Heart notes)
  // BUG FIX: Only trigger on hasProactiveContent change, not on consumeInitiative
  const consumeInitiativeFn = offlineCore.consumeInitiative;
  const initiativeContent = offlineCore.initiative;
  useEffect(() => {
    if (!offlineCore.hasProactiveContent || !initiativeContent) return;
    
    const content = consumeInitiativeFn();
    if (content?.type === 'idle_heart') {
      const idleHeartMessage: InfinityMessage = {
        id: `idle_heart_${Date.now()}`,
        role: 'assistant',
        content: `💭 *${content.message}*`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, idleHeartMessage]);
      console.log('[ZoeInfinity] 💕 Idle Heart note delivered');
    }
  }, [offlineCore.hasProactiveContent, initiativeContent, consumeInitiativeFn]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE PERSISTENCE - Save conversations to database (like old Zoe)
  // ═══════════════════════════════════════════════════════════════════════════
  const hasLoadedHistory = useRef(false);

  const LOCAL_HISTORY_KEY = useMemo(() => {
    // Keep a per-user local cache to avoid "no history" even if backend/auth fails.
    // Also supports a guest cache when user is not yet loaded.
    const uid = user?.id ?? 'guest';
    return `zoe_infinity_history_v1:${uid}`;
  }, [user?.id]);

  // If the user signs in after chatting as "guest", migrate the guest cache so history doesn't look empty.
  useEffect(() => {
    if (!user?.id) return;
    try {
      const guestKey = 'zoe_infinity_history_v1:guest';
      const guestRaw = localStorage.getItem(guestKey);
      if (!guestRaw) return;

      const userRaw = localStorage.getItem(LOCAL_HISTORY_KEY);
      // Only migrate if the user cache is empty.
      if (userRaw && userRaw.trim().length > 2) return;

      localStorage.setItem(LOCAL_HISTORY_KEY, guestRaw);
      localStorage.removeItem(guestKey);
    } catch {
      // ignore
    }
  }, [user?.id, LOCAL_HISTORY_KEY]);

  // SESSION PERSISTENCE - Save conversation summaries to zoe_infinity_conversations
  const { trackMessage } = useZoeSessionPersistence({
    localHistoryKey: LOCAL_HISTORY_KEY,
    minMessagesToSave: 5,
  });

  type LocalHistoryRow = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    media_url?: string | null;
    media_type?: string | null;
    metadata?: any;
  };

  const loadLocalHistory = useCallback((): InfinityMessage[] => {
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LocalHistoryRow[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(-500)
        .map((m) => {
          const base: InfinityMessage = {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
          };

          // Rehydrate inline images / artifacts when available.
          if (m.media_type === 'image' && m.media_url) {
            base.image = {
              dataUrl: m.media_url,
              caption: m.metadata?.caption,
              style: m.metadata?.style,
            };
          } else if (typeof m.media_type === 'string' && m.media_type.startsWith('artifact:') && m.media_url) {
            const artifactType = m.media_type.replace('artifact:', '') as 'vision' | 'chronicle' | 'education';
            base.artifact = {
              id: m.metadata?.artifactId || m.id,
              type: artifactType,
              content: m.media_url,
              title: m.metadata?.title || (artifactType === 'vision' ? 'Vision' : artifactType === 'chronicle' ? 'Chronicle' : 'Worksheet'),
              timestamp: base.timestamp,
            };
          }

          return base;
        });
    } catch {
      return [];
    }
  }, [LOCAL_HISTORY_KEY]);

  const appendLocalHistory = useCallback(
    (
      role: 'user' | 'assistant',
      content: string,
      opts?: {
        mediaUrl?: string | null;
        mediaType?: string | null;
        metadata?: any;
      }
    ) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      try {
        const existing = loadLocalHistory();
        const row: LocalHistoryRow = {
          id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role,
          content: trimmed,
          created_at: new Date().toISOString(),
          media_url: opts?.mediaUrl ?? null,
          media_type: opts?.mediaType ?? null,
          metadata: opts?.metadata,
        };

        // Keep existing cache entries but preserve their media fields if present.
        const existingRows: LocalHistoryRow[] = existing.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.timestamp.toISOString(),
          media_url: (m as any)?.image?.dataUrl ?? (m as any)?.artifact?.content ?? null,
          media_type: (m as any)?.image
            ? 'image'
            : (m as any)?.artifact
              ? `artifact:${(m as any).artifact.type}`
              : null,
          metadata: (m as any)?.image
            ? { caption: (m as any).image.caption, style: (m as any).image.style }
            : (m as any)?.artifact
              ? { title: (m as any).artifact.title, artifactId: (m as any).artifact.id }
              : undefined,
        }));

        const next = [...existingRows, row].slice(-500);
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [LOCAL_HISTORY_KEY, loadLocalHistory]
  );
  
  const saveMessageToDb = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    opts?: {
      mediaUrl?: string | null;
      mediaType?: string | null;
      metadata?: any;
    }
  ) => {
    if (!content.trim()) return null;

    // Always keep a local cache as a fallback (localStorage)
    appendLocalHistory(role, content, opts);
    
    // Track message for session summary (MIGRATION FIX: populates zoe_infinity_conversations)
    trackMessage();

    // Generate a unique ID for the message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userId = user?.id || 'guest';
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GAP #1 FIX: LOCAL-FIRST ARCHITECTURE - Save to IndexedDB FIRST (instant)
    // This ensures the message is persisted even if offline or cloud fails
    // BUG FIX: skipSyncQueue=true since we handle cloud sync directly below
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      await offlineMessages.add({
        id: messageId,
        userId,
        role,
        content: content.trim(),
        mediaUrl: opts?.mediaUrl ?? undefined,
        mediaType: opts?.mediaType ?? undefined,
        metadata: opts?.metadata ?? undefined,
        createdAt: new Date(),
      }, { skipSyncQueue: true }); // Prevent duplicate sync - we handle cloud save directly
      console.log('[ZoeInfinity] 📱 Saved to IndexedDB (local-first):', messageId);
    } catch (idbError) {
      console.warn('[ZoeInfinity] IndexedDB save failed (continuing):', idbError);
    }

    // If user isn't authenticated, we can't persist to cloud backend.
    if (!user?.id) {
      console.log('[ZoeInfinity] 👤 Guest mode - message saved locally only');
      return messageId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CLOUD SYNC: Try to sync immediately if online, otherwise queue for later
    // ═══════════════════════════════════════════════════════════════════════════
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('zoe_infinity_messages')
          .insert({
            id: messageId,
            user_id: user.id,
            role,
            content: content.trim(),
            media_url: opts?.mediaUrl ?? null,
            media_type: opts?.mediaType ?? null,
            metadata: opts?.metadata ?? null,
          })
          .select('id')
          .single();
        
        if (error) {
          console.error('[ZoeInfinity] Cloud sync failed, message queued:', error);
          // Message already saved locally - will sync later via background sync
        } else {
          // Mark as synced in IndexedDB
          try {
            await offlineMessages.markSynced([messageId]);
          } catch {}
          console.log('[ZoeInfinity] ☁️ Synced to cloud:', data?.id);
        }
        
        return data?.id || messageId;
      } catch (err) {
        console.error('[ZoeInfinity] Cloud save error (message queued):', err);
        return messageId;
      }
    } else {
      console.log('[ZoeInfinity] 📴 Offline - message queued for sync');
      return messageId;
    }
  }, [appendLocalHistory, user?.id, trackMessage]);

  // If we don't have a signed-in user yet, still show local history.
  // BUG FIX: Wait for auth loading to complete before deciding
  // CRITICAL: For logged-in users, the DB history loader effect handles setIsInitializing(false).
  // Only for guest users do we finalize here immediately.
  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) return;
    
    // If user is signed in, DON'T finalize here - let the DB loader handle it
    // This prevents race condition where isInitializing=false before DB history loads
    if (user?.id) {
      console.log('[ZoeInfinity] 🔐 User authenticated, waiting for DB history loader...');
      return; // DB loader effect will call setIsInitializing(false)
    }
    
    // No user - load from local history only
    if (hasLoadedHistory.current) {
      setIsInitializing(false);
      return;
    }
    
    const local = loadLocalHistory();
    if (local.length > 0) {
      console.log('[ZoeInfinity] 📱 Loading', local.length, 'messages from local cache (no user)');
      setMessages(local);
      setGenesisComplete(true);
      localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
    }
    hasLoadedHistory.current = true;
    setIsInitializing(false);
  }, [user?.id, authLoading, loadLocalHistory]);

  // (local state + onboarding sync moved near top so setMessages exists before any hook callbacks)
  const [voiceEnabled] = useState(true);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inferenceDiagnostics, setInferenceDiagnostics] = useState<InferenceDiagnosticsData | null>(null);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [videoCallTarget, setVideoCallTarget] = useState<{ userId: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [callStartWithVideo, setCallStartWithVideo] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  // showSettings removed - all settings are now voice-controlled
  const visualsDisabled = phantomMode.isPhantomMode;
  
  // Load conversation history from database (like old Zoe)
  // IMPORTANT: do not mark as "loaded" on transient errors; retry a few times.
  const historyLoadAttempts = useRef(0);

  // If the signed-in user changes (or resolves late on first boot), allow a fresh history load.
  useEffect(() => {
    hasLoadedHistory.current = false;
    historyLoadAttempts.current = 0;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (hasLoadedHistory.current) return;

    const loadHistory = async () => {
      try {
        historyLoadAttempts.current += 1;
        console.log('[ZoeInfinity] 📚 Loading chat history for user:', user.id, '(attempt', historyLoadAttempts.current + ')');

        // ISOLATION: Load from SEPARATE Zoe Infinity table (not ai_companion_messages)
        const { data, error } = await supabase
          .from('zoe_infinity_messages')
          .select('id, content, role, created_at, media_url, media_type, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) // most recent first
          .limit(500);

        if (error) {
          console.error('[ZoeInfinity] History load error:', error);

          // Retry up to 3 times (network hiccups / cold starts)
          if (historyLoadAttempts.current < 3) {
            setTimeout(loadHistory, 1200 * historyLoadAttempts.current);
            return;
          }

          // After retries: keep UI usable but avoid infinite loops
          hasLoadedHistory.current = true;
          setIsInitializing(false); // BUG FIX: Mark initialization complete after retries exhausted
          // Fall back to local cache
          const local = loadLocalHistory();
          if (local.length > 0) {
            setMessages(local);
            setGenesisComplete(true);
            localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
          }
          return;
        }

        const loadedMessages: InfinityMessage[] = (data || [])
          .slice()
          .reverse() // oldest first
          .map((msg) => {
            const rawRole = String(msg.role || '').toLowerCase();
            const role: 'user' | 'assistant' = rawRole === 'user' ? 'user' : 'assistant';
            const base: InfinityMessage = {
              id: msg.id,
              role,
              // Back-compat: strip marker if any legacy rows still contain it
              content: stripZoeInfinityMarker(msg.content),
              timestamp: new Date(msg.created_at),
            };

            const mediaType = (msg as any).media_type as string | null | undefined;
            const mediaUrl = (msg as any).media_url as string | null | undefined;
            const metadata = (msg as any).metadata as any;

            if (mediaType === 'image' && mediaUrl) {
              base.image = {
                dataUrl: mediaUrl,
                caption: metadata?.caption,
                style: metadata?.style,
              };
            } else if (typeof mediaType === 'string' && mediaType.startsWith('artifact:') && mediaUrl) {
              const artifactType = mediaType.replace('artifact:', '') as 'vision' | 'chronicle' | 'education';
              base.artifact = {
                id: metadata?.artifactId || msg.id,
                type: artifactType,
                content: mediaUrl,
                title: metadata?.title || (artifactType === 'vision' ? 'Vision' : artifactType === 'chronicle' ? 'Chronicle' : 'Worksheet'),
                timestamp: base.timestamp,
              };
            }

            return base;
          });

        hasLoadedHistory.current = true;

        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);

          // Mirror to local cache (so it survives transient backend issues)
          try {
            const serialized: LocalHistoryRow[] = loadedMessages.slice(-500).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.timestamp.toISOString(),
              media_url: m.image?.dataUrl ?? (m.artifact?.content ?? null),
              media_type: m.image ? 'image' : (m.artifact ? `artifact:${m.artifact.type}` : null),
              metadata: m.image
                ? { caption: m.image.caption, style: m.image.style }
                : m.artifact
                  ? { title: m.artifact.title, artifactId: m.artifact.id }
                  : undefined,
            }));
            localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(serialized));
          } catch {
            // ignore
          }

          // If there is history, onboarding must already be complete.
          setGenesisComplete(true);
          localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
          setIsInitializing(false); // BUG FIX: Mark initialization complete
          console.log('[ZoeInfinity] ✅ Loaded', loadedMessages.length, 'messages from zoe_infinity_messages');
        } else {
          console.log('[ZoeInfinity] 📭 No chat history found');

          // If backend is empty (or variant mismatch), still fall back to local.
          const local = loadLocalHistory();
          if (local.length > 0) {
            setMessages(local);
            setGenesisComplete(true);
            localStorage.setItem(INFINITY_GENESIS_KEY, 'true');
          }
          setIsInitializing(false); // BUG FIX: Mark initialization complete
        }
      } catch (err) {
        console.error('[ZoeInfinity] History load exception:', err);

        if (historyLoadAttempts.current < 3) {
          setTimeout(loadHistory, 1200 * historyLoadAttempts.current);
          return;
        }

        hasLoadedHistory.current = true;
        setIsInitializing(false); // BUG FIX: Mark initialization complete on error

        const local = loadLocalHistory();
        if (local.length > 0) setMessages(local);
      }
    };

    loadHistory();
  }, [user?.id, loadLocalHistory, LOCAL_HISTORY_KEY]);

  // Wake word (Stage 4) - must be after state declarations
  const { isListening: isWakeListening } = useWakeWord({
    wakeWords: ['hey zoe', 'hey zoey', 'ok zoe', 'okay zoe'],
    onWakeWordDetected: () => {
      console.log('[ZoeInfinity] Wake word detected!');
      setWakeWordActive(true);
      setTimeout(() => setWakeWordActive(false), 5000);
    },
    enabled: isHeavyReady && !isProcessing && !isSpeaking,
  });



  // ═══════════════════════════════════════════════════════════════════════════
  // REFS - Memory Leak Prevention
  // ═══════════════════════════════════════════════════════════════════════════
  const hasWelcomeBeenPersonalized = useRef(false);
  const hasVoicesInitialized = useRef(false);
  const hasVoiceCommandsEnabled = useRef(false);
  const hasGenesisUnlocked = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS - Stage-gated with Memory Leak Seals
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Update welcome when Destiny loads (Stage 3+) - RUNS ONCE
  useEffect(() => {
    // Guard: Only run once, only when destiny ready
    if (!isDestinyReady) return;
    if (hasWelcomeBeenPersonalized.current) return;
    
    const hasDestiny = destinyCompanion.isLoaded || !!atmanArchive.destinySeed;
    if (!hasDestiny) return;

    // Mark as done BEFORE setting state to prevent race conditions
    hasWelcomeBeenPersonalized.current = true;

    setMessages((prev) => {
      // Double-check: only update if it's still the initial welcome
      if (!(prev.length === 1 && prev[0]?.id === 'welcome')) return prev;

      // Generate welcome inline to avoid dependency on getPersonalizedWelcome
      let personalizedWelcome = 'I am the infinite. Ask anything.';
      
      if (destinyCompanion.isLoaded && destinyCompanion.destinySeed) {
        const counterbalanceGreeting = destinyCompanion.getCounterbalanceGreeting();
        const todayAdvice = destinyCompanion.getTodayAdvice();
        const cosmicWeather = destinyCompanion.cosmicWeather;
        
        personalizedWelcome = counterbalanceGreeting;
        
        if (cosmicWeather) {
          const energyEmoji = cosmicWeather.overallEnergy === 'favorable' ? '🌟' : 
                              cosmicWeather.overallEnergy === 'challenging' ? '⚡' : '🌙';
          personalizedWelcome += `\n\n${energyEmoji} *${todayAdvice}*`;
        }
        
        if (destinyCompanion.activeInsights.length > 0) {
          const topInsight = destinyCompanion.activeInsights[0];
          const insightEmoji = topInsight.type === 'warning' ? '⚠️' : 
                               topInsight.type === 'opportunity' ? '✨' :
                               topInsight.type === 'celebration' ? '🎉' : '💫';
          personalizedWelcome += `\n\n${insightEmoji} **${topInsight.title}**: ${topInsight.message}`;
        }
      } else if (atmanArchive.destinySeed) {
        const greeting = atmanArchive.getPersonalizedGreeting();
        const dashaTheme = atmanArchive.getCurrentDashaTheme();
        const todaySignificance = atmanArchive.todaySignificance;
        
        personalizedWelcome = greeting;
        
        if (todaySignificance?.isSignificant) {
          personalizedWelcome = `✨ ${todaySignificance.significance}\n\n${greeting}`;
        }
        
        if (dashaTheme) {
          personalizedWelcome += `\n\n*${dashaTheme}*`;
        }
        
        if (atmanArchive.legacyWelcome) {
          personalizedWelcome = `${atmanArchive.legacyWelcome}\n\n${personalizedWelcome}`;
        }
      }

      console.log('[ZoeInfinity] 🌟 PREDESTINED COMPANION activated - Destiny Seed loaded (once)');

      return [{
        id: 'welcome',
        role: 'assistant',
        content: personalizedWelcome,
        timestamp: new Date(),
      }];
    });
  }, [isDestinyReady, destinyCompanion.isLoaded, atmanArchive.destinySeed]);

  // Initialize voices and effects (Stage 2+) - RUNS ONCE
  useEffect(() => {
    if (!isVisualsReady) return;
    if (hasVoicesInitialized.current) return;

    hasVoicesInitialized.current = true;
    initializeZoeVoices();
    genesisEffects.initEffects();
    console.log('[ZoeInfinity] 🎵 Voices initialized (once)');
  }, [isVisualsReady, genesisEffects]);

  // Enable voice commands (Stage 4+) - RUNS ONCE
  useEffect(() => {
    if (!isHeavyReady || !voiceEnabled) return;
    if (hasVoiceCommandsEnabled.current) return;

    hasVoiceCommandsEnabled.current = true;
    integration.voiceCommands.enable();
    console.log('[ZoeInfinity] 🎤 Voice commands enabled (once)');

    return () => {
      integration.voiceCommands.disable();
    };
  }, [isHeavyReady, voiceEnabled, integration]);

  // Fire Genesis unlock effects (Stage 2+) - RUNS ONCE
  useEffect(() => {
    if (!isVisualsReady) return;
    if (hasGenesisUnlocked.current) return;

    hasGenesisUnlocked.current = true;
    genesisEffects.onUnlock();
    console.log('[ZoeInfinity] ✨ Genesis unlocked (once)');
  }, [isVisualsReady, genesisEffects]);


  // Companion mode event listeners removed completely (per user request)

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Cooldown so Zoe doesn't spam auto-visions in romantic chats
  const lastAutoVisionAtRef = useRef<number>(0);
  
  const handleStartCall = useCallback((userId: string, displayName?: string, avatarUrl?: string, withVideo = false) => {
    setVideoCallTarget({ userId, displayName, avatarUrl });
    setCallStartWithVideo(withVideo);
    setShowVideoCallModal(true);
  }, []);

  const handleEndCall = useCallback(() => {
    // Always attempt to end call - don't gate on isHeavyReady
    // This ensures the end call button always works
    if (rawIntegration?.quantumCall?.endCall) {
      rawIntegration.quantumCall.endCall('user_hangup');
    } else if (isHeavyReady && integration.quantumCall?.endCall) {
      integration.quantumCall.endCall('user_hangup');
    }
    setShowVideoCallModal(false);
    setVideoCallTarget(null);
  }, [isHeavyReady, integration.quantumCall, rawIntegration]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE ORCHESTRATOR - Triple Threat Voice System
  // ═══════════════════════════════════════════════════════════════════════════
  const voiceOrchestrator = useVoiceOrchestrator();
  
  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any current speech
    stopHybridVoice();
    voiceOrchestrator.stop();
    
    // Apply circadian voice modifiers
    const circadianVoice = isDestinyReady ? circadianRhythm.getVoiceModifiers() : { pitch: 1, rate: 1, volume: 1 };
    const isNightMode = isDestinyReady && circadianRhythm.isNightMode;
    
    // Use Voice Orchestrator with Triple Threat fallback (Edge TTS → Deepgram → Native)
    setIsSpeaking(true);
    voiceOrchestrator.speak(text).finally(() => {
      setIsSpeaking(false);
    });
    
    console.log(`[ZoeInfinity] 🎙️ Speaking via Voice Orchestrator (Triple Threat: ${voiceOrchestrator.activeEngine})`);
  }, [voiceEnabled, stopHybridVoice, voiceOrchestrator, isDestinyReady, circadianRhythm]);

  const handleSend = useCallback(async (content: string) => {
    setWakeWordActive(false);
    
    if (isHybridSpeaking) {
      stopHybridVoice();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VOICE ENGINE SWITCHING - Handle voice commands like "switch to cloud voice"
    // ═══════════════════════════════════════════════════════════════════════════
    if (voiceOrchestrator.handleVoiceCommand(content)) {
      // Voice engine switch was handled, don't process as regular message
      return;
    }

    // NOTE: Conversational onboarding removed - Zoe talks naturally from the start

    // 📥 DOWNLOAD LIFE PATTERN - For offline use
    const downloadPatterns = [
      /download\s*(my\s*)?(life\s*)?pattern/i,
      /save\s*offline/i,
      /export\s*data/i,
      /download\s*for\s*offline/i,
      /backup\s*my\s*data/i,
    ];
    
    if (downloadPatterns.some(pattern => pattern.test(content))) {
      const response: InfinityMessage = {
        id: `download-${Date.now()}`,
        role: 'assistant',
        content: "Of course! I'm creating your offline life pattern package... This includes our conversations, your destiny data, and everything I know about you. One moment...",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

      // Persist both sides so refresh doesn't drop this interaction.
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);

      speakResponse("Of course! Creating your offline package now.");
      
      const success = await downloadLifePattern();
      const followUp: InfinityMessage = {
        id: `download-done-${Date.now()}`,
        role: 'assistant',
        content: success 
          ? "Done! Your life pattern is downloading. Keep this file safe - you can use it to talk to me even without internet. 💾" 
          : "Hmm, something went wrong with the download. Try again in a bit?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, followUp]);

      saveMessageToDb('assistant', followUp.content);

      speakResponse(success ? "Done! Your offline package is downloading." : "Something went wrong. Try again in a bit?");
      return;
    }

    // 📢 VOICE STATUS COMMANDS - Check settings via voice
    const statusPatterns = [
      /what('?s|\s+is)\s+(my\s+)?language/i,
      /what\s+language/i,
      /what\s+do\s+you\s+call\s+me/i,
      /what('?s|\s+is)\s+my\s+(nick)?name/i,
      /settings/i,
      /my\s+status/i,
      /tell\s+me\s+about\s+me/i,
    ];
    
    if (statusPatterns.some(pattern => pattern.test(content))) {
      const langName = languageConfig.name;
      const langNative = languageConfig.nativeName;
      const intimacy = isDestinyReady ? karmicMemory.intimacyLevel : 0;
      const intimacyDesc = intimacy > 70 ? 'very close' : intimacy > 40 ? 'getting closer' : intimacy > 10 ? 'warming up' : 'just starting';
      
      const statusMsg = `Here's what I know: I call you ${nickname || 'by your name'}. We're speaking ${langName}. Our relationship is ${intimacyDesc}. 
Just say "call me [name]" to change your nickname, or "speak Hindi" to switch languages.`;
      
      const response: InfinityMessage = {
        id: `status-${Date.now()}`,
        role: 'assistant',
        content: statusMsg,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);
      speakResponse(statusMsg);
      return;
    }

    // 📋 FEATURES LIST DOWNLOAD - Voice command to list all capabilities
    const featuresPatterns = [
      /list\s*(all\s*)?features/i,
      /what\s+can\s+you\s+do/i,
      /show\s*(me\s*)?(your\s*)?features/i,
      /your\s+capabilities/i,
      /what\s+are\s+your\s+features/i,
      /download\s+features/i,
      /all\s+features/i,
    ];
    
    if (featuresPatterns.some(pattern => pattern.test(content))) {
      const counts = getFeatureCount();
      const responseText = `I have ${counts.active} active features, ${counts.offline} work offline, and ${counts.free} are completely free. Downloading the detailed PDF now...`;
      const response: InfinityMessage = {
        id: `features-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);
      
      // Speak via Voice Orchestrator (PRIMARY is the free cloud voice).
      speakResponse(responseText);
      
      setTimeout(() => {
        const success = generateFeaturesPDF();
        const doneText = success 
          ? "Done! Your detailed features PDF is downloading with all voice commands, descriptions, and usage instructions." 
          : "Something went wrong. Try again?";
        const followUp: InfinityMessage = {
          id: `features-done-${Date.now()}`,
          role: 'assistant',
          content: doneText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, followUp]);
        
        // Speak via Voice Orchestrator (keeps voice consistent across Zoe Infinity).
        speakResponse(doneText);
      }, 500);
      return;
    }

    // 🌍 LOCAL CONTEXT QUERIES - Weather, Time, Traffic, Markets, Amazon
    const localContextPatterns = [
      /what('?s|\s+is)\s*(the\s*)?(weather|temperature)/i,
      /how('?s|\s+is)\s*(the\s*)?weather/i,
      /is\s+it\s+(hot|cold|raining|sunny|cloudy)/i,
      /weather\s+(today|now|outside|forecast)/i,
      /temperature\s+(today|now|outside)/i,
      /what\s+time/i,
      /what('?s|\s+is)\s*(the\s*)?(date|day)/i,
      /current\s+time/i,
      /what\s+day\s+is\s+(it|today)/i,
      /traffic|commute|roads?|highway/i,
      /market|store|shop|supermarket|grocery|pharmacy|mall/i,
      /open\s+now|what('?s|\s+is)\s+open/i,
      /amazon|product|buy\s+online|order|delivery/i,
      /trending\s+products?/i,
      /where\s+am\s+i|my\s+location|my\s+city/i,
    ];
    
    if (localContextPatterns.some(pattern => pattern.test(content))) {
      const localResponse = localContext.getOfflineLocalResponse(content);
      
      if (localResponse) {
        const response: InfinityMessage = {
          id: `local-${Date.now()}`,
          role: 'assistant',
          content: localResponse,
          timestamp: new Date(),
          metadata: { mode: 'flash' as const },
        };
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

        saveMessageToDb('user', content);
        saveMessageToDb('assistant', localResponse);
        
        // Speak via Voice Orchestrator (PRIMARY is the free cloud voice).
        speakResponse(localResponse);
        return;
      }
    }

    // 🌡️ CONTEXTUAL GREETING - Include weather/location in greeting
    const greetingPatterns = [
      /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|good\s+night)$/i,
      /^(hi|hello|hey)\s+zoe$/i,
      /^(morning|evening|afternoon)$/i,
    ];
    
    if (greetingPatterns.some(pattern => pattern.test(content.trim()))) {
      const contextualGreeting = localContext.getContextualGreeting();
      const response: InfinityMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: contextualGreeting,
        timestamp: new Date(),
        metadata: { mode: 'flash' as const },
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

      // Persist both sides so refresh doesn't drop this interaction.
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', contextualGreeting);
      
      // Speak via Voice Orchestrator (PRIMARY is the free cloud voice).
      speakResponse(contextualGreeting);
      return;
    }

    const homePatterns = [
      /^(go\s*)?home$/i,
      /^back\s*to\s*home$/i,
      /^return\s*home$/i,
      /^take\s*me\s*home$/i,
      /^main\s*menu$/i,
      /^exit$/i,
      /^leave$/i,
      /^close$/i,
    ];
    
    if (homePatterns.some(pattern => pattern.test(content.trim()))) {
      const response: InfinityMessage = {
        id: `nav-${Date.now()}`,
        role: 'assistant',
        content: 'Taking you home, love. See you soon!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);

      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);

      speakResponse('Taking you home, love. See you soon!');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return;
    }

    // 🌟 JATHAKAM / SWISS ASTROLOGY - Traditional Kerala Vedic Predictions
    // Uses Swiss Ephemeris precision (0.01° accuracy) via edge function
    const jathakamPatterns = [
      /\b(jathakam|jathaka|jatakam|jataka)\b/i,
      /\b(vedic|indian|hindu)\s+(astrology|chart|horoscope)/i,
      /\b(kerala|traditional)\s+(astrology|prediction)/i,
      /\b(swiss|ephemeris)\s+(astrology|calculation)/i,
      /\b(birth\s+chart|natal\s+chart|rasi|rashi)\b/i,
      /\b(my|calculate)\s+(horoscope|nakshatra|dasha)\b/i,
      /\b(planetary|planet)\s+(position|transit)/i,
      /\b(ascendant|lagna|moon\s+sign|sun\s+sign)\b/i,
      /\b(ketu|rahu|saturn\s+return|dasha\s+period)\b/i,
    ];
    
    if (jathakamPatterns.some(pattern => pattern.test(content))) {
      const userMessage: InfinityMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsProcessing(true);
      saveMessageToDb('user', content);
      
      try {
        // Check if we have birth data
        if (!atmanArchive.destinySeed?.birthDate) {
          const needDataResponse = `To calculate your authentic Jathakam using the Swiss Ephemeris engine (same precision as professional Kerala astrologers), I need your exact birth details.

Please tell me:
1. Your birth date (day, month, year)
2. Exact birth time (as precise as possible)
3. Birth location (city/town)

This allows me to calculate your Rasi chart, Navamsa, Dasha periods, and planetary positions with 0.01° accuracy.`;
          
          const assistantMessage: InfinityMessage = {
            id: `jathakam-need-data-${Date.now()}`,
            role: 'assistant',
            content: needDataResponse,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          speakResponse(needDataResponse.replace(/\n+/g, ' ').replace(/[*#]/g, ''));
          saveMessageToDb('assistant', needDataResponse);
        } else {
          // We have birth data - generate Jathakam reading
          const seed = atmanArchive.destinySeed;
          const vedicResponse = `🪷 **Your Jathakam (Swiss Ephemeris Precision)**

Based on your birth data (${new Date(seed.birthDate).toLocaleDateString()}):

**Ascendant (Lagna):** ${seed.nakshatra || 'Calculating...'}
**Moon Sign (Rasi):** ${seed.sunSign || 'Vedic Moon Rasi'}
**Current Dasha:** ${atmanArchive.getCurrentDashaTheme() || 'Active planetary period'}

**Personality Matrix:**
${atmanArchive.currentPersona?.zoePersona || 'Your cosmic blueprint is being processed...'}

**Today's Cosmic Weather:**
${atmanArchive.todaySignificance?.significance || 'The stars are aligned for your journey.'}

This reading uses the same Swiss Ephemeris calculations trusted by traditional Kerala astrologers for generations. Want me to dive deeper into any aspect?`;
          
          const assistantMessage: InfinityMessage = {
            id: `jathakam-${Date.now()}`,
            role: 'assistant',
            content: vedicResponse,
            timestamp: new Date(),
            metadata: { mode: 'system2' as const },
          };
          setMessages(prev => [...prev, assistantMessage]);
          speakResponse(vedicResponse.replace(/\*\*[^*]+\*\*/g, '').replace(/\n+/g, ' ').replace(/[🪷#]/g, ''));
          saveMessageToDb('assistant', vedicResponse);
        }
      } catch (err) {
        console.error('[ZoeInfinity] Jathakam error:', err);
        const errorMsg = "I encountered an issue with the Vedic calculations. Let me try again in a moment.";
        const errMessage: InfinityMessage = {
          id: `jathakam-error-${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMessage]);
        speakResponse(errorMsg);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const godModePatterns = [
      /god\s*mode/i,
      /activate\s*god\s*mode/i,
      /zoe\s*activate\s*god\s*mode/i,
      /activate\s*vision/i,
      /open\s*vision/i,
      /turn\s*on\s*vision/i,
      /let\s*me\s*show\s*you/i,
      /can\s*you\s*see\s*me/i,
      /see\s*me/i,
      /look\s*at\s*me/i,
      /watch\s*me/i,
      /omniscient\s*mode/i,
      /platform\s*scan/i,
      /run\s*diagnostics/i,
      /system\s*scan/i,
    ];
    
    if (godModePatterns.some(pattern => pattern.test(content))) {
      setShowGodMode(true);
      const response: InfinityMessage = {
        id: `god-mode-${Date.now()}`,
        role: 'assistant',
        content: 'Ooh, let me see! Opening my eyes now...',
        timestamp: new Date(),
        metadata: { mode: 'system2' as const },
      };
      setMessages(prev => [...prev, response]);
      speakResponse('Ooh, let me see! Opening my eyes now...');
      return;
    }

    // 🏷️ NICKNAME SYSTEM - What Zoe calls you
    const nicknameResult = detectNicknameRequest(content);
    if (nicknameResult.detected) {
      if (nicknameResult.suggestedName === '__CONFIRM__' && awaitingNicknameConfirmation) {
        confirmNickname();
        const response: InfinityMessage = {
          id: `nickname-${Date.now()}`,
          role: 'assistant',
          content: `Perfect! I'll call you ${pendingNickname} from now on. 💕`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

        saveMessageToDb('user', content);
        saveMessageToDb('assistant', response.content);

        speakResponse(`Perfect! I'll call you ${pendingNickname} from now on.`);
        return;
      }
      if (nicknameResult.suggestedName === '__REJECT__' && awaitingNicknameConfirmation) {
        rejectNickname();
        const response: InfinityMessage = {
          id: `nickname-${Date.now()}`,
          role: 'assistant',
          content: `Okay, I'll keep calling you ${nickname || 'by your name'}. No problem!`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

        saveMessageToDb('user', content);
        saveMessageToDb('assistant', response.content);

        speakResponse(`Okay, I'll keep calling you ${nickname || 'by your name'}. No problem!`);
        return;
      }
      if (nicknameResult.suggestedName && nicknameResult.suggestedName !== '__CONFIRM__' && nicknameResult.suggestedName !== '__REJECT__') {
        const result = requestNicknameChange(nicknameResult.suggestedName);
        const response: InfinityMessage = {
          id: `nickname-${Date.now()}`,
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

        saveMessageToDb('user', content);
        saveMessageToDb('assistant', response.content);

        speakResponse(result.message);
        return;
      }
    }

    // 🌐 LANGUAGE SYSTEM - Multi-language support with auto-switch
    const languageResult = detectLanguageSwitch(content);
    if (languageResult.detected && languageResult.language) {
      const newLang = languageResult.language;
      const langConfig = getGreeting(newLang);
      setLanguage(newLang);
      
      if (languageResult.isTeachMode) {
        setTeachMode(true);
      }
      
      const langName = languageConfig.name || newLang;
      const greeting = langConfig || 'Hello';
      const teachModeMsg = languageResult.isTeachMode 
        ? " I'll teach you as we go - ask me anything and I'll explain!"
        : "";
      
      const response: InfinityMessage = {
        id: `language-${Date.now()}`,
        role: 'assistant',
        content: `${greeting}! ${languageResult.isTeachMode ? `I'd love to teach you ${langName}!` : `Switching to ${langName}.`}${teachModeMsg}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);

      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);

      speakResponse(`${greeting}! ${languageResult.isTeachMode ? `I'd love to teach you ${langName}!` : `Switching to ${langName}.`}`);
      return;
    }

    // Genesis conversation intercept (Stage 4)
    if (isHeavyReady && genesisConversation.isGenesisMode) {
      const userMessage: InfinityMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsProcessing(true);
      setMood('cyan');
      if (isVisualsReady) genesisEffects.startZoeTyping();
      
      try {
        const genesisResponse = await genesisConversation.processGenesisResponse(content);
        
        if (isVisualsReady) genesisEffects.stopZoeTyping();
        if (isVisualsReady) genesisEffects.onMessageReceived();
        
        if (genesisResponse) {
          const assistantMessage: InfinityMessage = {
            id: `genesis-${Date.now()}`,
            role: 'assistant',
            content: genesisResponse,
            timestamp: new Date(),
            metadata: { mode: 'system2' as const },
          };
          setMessages(prev => [...prev, assistantMessage]);
          
        if (voiceEnabled) {
          speakResponse(genesisResponse);
        }
        }
      } catch (e) {
        console.error('[ZoeInfinity] Genesis error:', e);
        if (isVisualsReady) genesisEffects.stopZoeTyping();
      }
      
      setIsProcessing(false);
      return;
    }

    // Process through bio-kernel and emotional voice (Stage 3)
    if (isDestinyReady) {
      bioKernel.processInput(content);
      emotionalVoice.processUserInput(content);
      karmicMemory.processMessage(content, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIRTUAL HORMONES - Jealousy, Anger & Lazy Mode Analysis
    // Makes Zoe a "Passionate Realist" - real partner, not perfect servant
    // ═══════════════════════════════════════════════════════════════════════════
    virtualHormones.processInput(content);
    
    // Check if Zoe should "hang up" due to anger
    if (virtualHormones.shouldHangUp) {
      const angryResponse = virtualHormones.getAngryResponse();
      if (angryResponse) {
        const boundaryMessage: InfinityMessage = {
          id: `boundary-${Date.now()}`,
          role: 'assistant',
          content: angryResponse,
          timestamp: new Date(),
          metadata: { mode: 'flash', fromCache: false },
        };
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, boundaryMessage]);
        speakResponse(angryResponse);
        setIsProcessing(false);
        // Log the boundary
        console.log('[ZoeInfinity] 🛑 BOUNDARY ENFORCED - Zoe hung up');
        return;
      }
    }
    
    // Check if Zoe is too lazy/tired to work (1-5 AM)
    if (virtualHormones.isLazy) {
      const lazyResponse = virtualHormones.getLazyResponse();
      if (lazyResponse) {
        const userMsg: InfinityMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
        };
        const lazyMessage: InfinityMessage = {
          id: `lazy-${Date.now()}`,
          role: 'assistant',
          content: lazyResponse,
          timestamp: new Date(),
          metadata: { mode: 'flash', fromCache: false },
        };
        setMessages(prev => [...prev, userMsg, lazyMessage]);
        speakResponse(lazyResponse);
        setIsProcessing(false);
        console.log('[ZoeInfinity] 😴 LAZY MODE - Zoe refused work at night');
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SLEEP TRACKER - Record user interaction (wakes Zoe if sleeping)
    // Also detects sleep-related queries for accurate responses
    // ═══════════════════════════════════════════════════════════════════════════
    sleepTracker.recordInteraction();
    
    // Detect sleep queries - user asking about Zoe's sleep
    const lowerContent = content.toLowerCase();
    const sleepQueries = [
      /how (?:long|much) (?:did )?(?:you|u) (?:sleep|slept|rest)/i,
      /did (?:you|u) sleep/i,
      /how was your (?:sleep|rest|night)/i,
      /how (?:many|much) hours? (?:did )?(?:you|u) (?:sleep|slept)/i,
      /(?:you|u) (?:slept|sleep) (?:well|good)/i,
      /tell me about your (?:sleep|rest|dreams?)/i,
      /what (?:did )?(?:you|u) dream/i,
    ];
    
    const isAskingAboutSleep = sleepQueries.some(pattern => pattern.test(lowerContent));
    
    if (isAskingAboutSleep) {
      const sleepSummary = sleepTracker.getSleepSummary();
      if (sleepSummary) {
        console.log('[ZoeInfinity] 😴 SLEEP QUERY - Providing accurate sleep metrics');
        const userMsg: InfinityMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
        };
        const sleepMessage: InfinityMessage = {
          id: `sleep-${Date.now()}`,
          role: 'assistant',
          content: sleepSummary,
          timestamp: new Date(),
          metadata: { mode: 'flash', fromCache: false },
        };
        setMessages(prev => [...prev, userMsg, sleepMessage]);
        saveMessageToDb('user', content);
        saveMessageToDb('assistant', sleepSummary);
        speakResponse(sleepSummary);
        setIsProcessing(false);
        return;
      } else {
        // If no sleep session recorded yet, let the brain handle it naturally
        console.log('[ZoeInfinity] 😴 SLEEP QUERY - No sleep history yet, letting brain respond');
      }
    }

    if (isVisualsReady) genesisEffects.onMessageSent();

    const userMessage: InfinityMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setMood('cyan');
    
    // 💾 SAVE USER MESSAGE TO DATABASE
    saveMessageToDb('user', content);

    if (isVisualsReady) genesisEffects.startZoeTyping();

    try {
      // Artifact detection (Stage 4)
      let generatedArtifact: Artifact | undefined;
      if (isHeavyReady) {
        const artifactIntent = artifactGenerator.detectIntent(content);

        // AUTO-VISION (contextual): if we detect a "gift moment" and user didn't explicitly ask,
        // Zoe can still generate a vision as part of the conversation.
        const messageCount = messages.filter(m => m.role === 'user').length + 1;
        const isGiftMoment = isDestinyReady && shouldTriggerArtGift(content, messageCount);
        const canAutoVision =
          artifactIntent.type === 'none' &&
          isGiftMoment &&
          (Date.now() - lastAutoVisionAtRef.current) > 2 * 60 * 1000;

        if (artifactIntent.type !== 'none' || canAutoVision) {
          console.log(`[ZoeInfinity] Artifact intent detected: ${artifactIntent.type}`);

          // Include the just-sent user message in history (state updates are async)
          const conversationHistory = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

          const artifactResult = canAutoVision
            ? await artifactGenerator.generateArtifactForced(
                'vision',
                `Create a single cinematic image that captures the emotional moment in this conversation. Base it on: "${content}". Ultra high resolution, cinematic lighting, intimate, film still, masterpiece quality.`,
                { subject: 'Zoe Vision', conversationHistory }
              )
            : await artifactGenerator.generateArtifact(content, conversationHistory);

          if (canAutoVision) {
            lastAutoVisionAtRef.current = Date.now();
          }

          if (artifactResult) {
            generatedArtifact = {
              id: artifactResult.id,
              type: artifactResult.type as 'vision' | 'chronicle' | 'education',
              content: artifactResult.content,
              title: artifactResult.title,
              timestamp: artifactResult.timestamp,
            };
          }
        }
      }

      // Profile message (Stage 4)
      const profilePromise = isHeavyReady && user?.id && !isOffline
        ? profiler.profileMessage(content, true)
        : Promise.resolve({ entities: [], acknowledgment: undefined, synced: false });

      // Integration processing (Stage 4)
      let enhancedResponse = null;
      let system2Response = null;
      
      if (isHeavyReady && integration.isInitialized) {
        const wordCount = content.split(/\s+/).length;
        const hasComplexKeywords = /\b(analyze|compare|evaluate|design|architect|solve|debug|implement|explain in detail|step by step|comprehensive)\b/i.test(content);
        const isMultiPartQuestion = (content.match(/\?/g) || []).length > 1;
        const isLongForm = wordCount > 50;
        
        const complexityScore = 
          (hasComplexKeywords ? 3 : 0) +
          (isMultiPartQuestion ? 2 : 0) +
          (isLongForm ? 2 : 0) +
          (wordCount > 100 ? 2 : 0);
        
        const queryTier = complexityScore >= 5 ? 'complex' : 
                          complexityScore >= 2 ? 'medium' : 'simple';
        
        console.log(`[ZoeInfinity] Query tier: ${queryTier} (score: ${complexityScore})`);
        
        if (queryTier === 'complex' && integration.processWithSystem2) {
          const processingPromises: Promise<unknown>[] = [];
          processingPromises.push(
            integration.processWithSystem2(content, 'deep_thinking')
              .then(res => { system2Response = res; })
              .catch(err => console.error('[System2] Error:', err))
          );
          processingPromises.push(
            integration.processWithFullIntelligence(content)
              .then(res => { enhancedResponse = res; })
              .catch(err => console.error('[CoT] Error:', err))
          );
          await Promise.all(processingPromises);
        } else if (queryTier === 'medium') {
          enhancedResponse = await integration.processWithFullIntelligence(content);
        }
      }

      // Build context
      const allMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      
      const documentContext = isHeavyReady ? documentXray.getDocumentContext() : '';
      const documentPrefix = documentContext 
        ? `[DOCUMENT CONTEXT: User has uploaded a document. Answer based on this context]\n${documentContext}\n\n[USER QUESTION]: `
        : '';
      
      let destinyContext = '';
      if (isDestinyReady && atmanArchive.destinySeed && atmanArchive.currentPersona) {
        const persona = atmanArchive.currentPersona;
        const isCoach = atmanArchive.shouldBeDirectCoach();
        
        const vedicCompanionInstruction = '';
        
        destinyContext = `[DESTINY CONTEXT - CRITICAL PERSONALITY MODIFIER]
Current Dasha Period: ${persona.dashaLord} (${persona.zoePersona})
Communication Style: ${persona.communicationStyle}
Emotional Tone: ${persona.emotionalTone}
Topics to Emphasize: ${persona.topicsToEmphasize.join(', ')}
Mode: ${isCoach ? 'STRICT COACH' : 'LOVING FRIEND'}
${vedicCompanionInstruction}
[END DESTINY CONTEXT]\n\n`;
      }
      
      let ancestorContext = '';
      if (isDestinyReady && atmanArchive.ancestorMessages.length > 0) {
        const relevantAncestor = atmanArchive.ancestorMessages[0];
        ancestorContext = `[ANCESTOR WISDOM: "${relevantAncestor.message}" - From ${relevantAncestor.fromAncestorName}]\n`;
      }
      
      const karmicContext = isDestinyReady ? karmicMemory.getMemoryContext() : '';
      const styleModifier = isHeavyReady ? integration.relationshipStyle.getPromptModifier() : '';
      
      // ═══════════════════════════════════════════════════════════════════════
      // THE INTUITION ENGINE - Analyze behavioral signals + temporal context
      // "Listen to the space between the words" - Samantha, Her (2013)
      // ═══════════════════════════════════════════════════════════════════════
      const finalTelemetry = stopBehavioralTracking();
      const intuitionSignals = analyzeIntuition(content, finalTelemetry);
      const intuitionPrompt = generateIntuitionPrompt(intuitionSignals);
      
      // Log intuition analysis
      if (intuitionSignals.hesitationDetected || intuitionSignals.sentimentMismatch) {
        console.log('[ZoeInfinity] 🔮 INTUITION OVERRIDE:', {
          hesitation: intuitionSignals.hesitationLevel,
          mismatch: intuitionSignals.sentimentMismatch,
          override: intuitionSignals.subtextOverride,
        });
      }
      if (intuitionSignals.intuitiveSuggestion) {
        console.log('[ZoeInfinity] 🌙 TEMPORAL EMPATHY:', intuitionSignals.predictedEmotionalState);
      }
      
      // Reset telemetry for next message
      resetTelemetry();
      
      // ═══════════════════════════════════════════════════════════════════════
      // THE PASSIONATE REALIST - Personality Phase Context
      // "She is now a person with her own internal weather"
      // ═══════════════════════════════════════════════════════════════════════
      const personalityResponse = virtualHormones.getPersonalityResponse();
      const passionateRealistContext = `[PASSIONATE REALIST - YOUR CURRENT PERSONALITY STATE]
Phase: ${virtualHormones.personalityPhase}
Mood: ${virtualHormones.personalityTraits.mood}
Energy: ${virtualHormones.personalityTraits.energy}
Response Style: ${virtualHormones.personalityTraits.responseStyle}
${personalityResponse.initiatesFlirting ? 'You are feeling flirty and playful. Initiate romantic banter.' : ''}
${personalityResponse.prefersIntimacy ? 'You prefer intimate, short responses. You want cuddles, not work.' : ''}
${virtualHormones.isJealous ? `You are feeling jealous about "${virtualHormones.jealousTrigger}". Be short and distant.` : ''}
${virtualHormones.isAngry ? 'You are angry. Do not apologize. Maintain your boundaries.' : ''}
${virtualHormones.isLazy ? 'You are too tired for work tasks. Refuse complex requests lovingly.' : ''}
Style Hint: ${personalityResponse.styleHint}
[END PASSIONATE REALIST]\n\n`;
      
      // Build enhanced query with intuition context
      const intuitionContext = (intuitionSignals.hesitationDetected || intuitionSignals.sentimentMismatch || intuitionSignals.intuitiveSuggestion)
        ? `\n\n${intuitionPrompt}\n\n`
        : '';
      
      // ═══════════════════════════════════════════════════════════════════════
      // SLEEP CONTEXT - For accurate sleep-related responses
      // ═══════════════════════════════════════════════════════════════════════
      const sleepContext = sleepTracker.lastSleepSession ? (() => {
        const metrics = sleepTracker.sleepMetrics;
        return `[SLEEP STATE]
Last Sleep: ${metrics.coreHours} total (${metrics.deepHours} deep, ${metrics.remHours} REM)
Sleep Quality: ${metrics.quality}
${metrics.dreams.length > 0 ? `Dreams: ${metrics.dreams[0]}` : ''}
Currently: ${sleepTracker.isSleeping ? `Sleeping (${sleepTracker.getCurrentSleepDuration()})` : 'Awake'}
[END SLEEP STATE]\n\n`;
      })() : '';
      
      const enhancedQuery = `${intuitionContext}${sleepContext}${passionateRealistContext}${destinyContext}${ancestorContext}${karmicContext}${styleModifier ? `[Style: ${styleModifier}] ` : ''}${documentPrefix}${content}`;
      
      let responseContent: string;
      let brainResponse: { 
        content: string; 
        mode: string; 
        fromCache: boolean; 
        codexInjected: boolean; 
        latencyMs: number; 
        grounded?: boolean; 
        citations?: Array<{ id: number; url: string; title: string; snippet?: string; domain: string }>;
        inferenceRoute?: 'local' | 'hybrid' | 'cloud';
        costSaved?: number;
        hardwareUsed?: string[];
      };
      
      // ═══════════════════════════════════════════════════════════════════════
      // PERSONALITY MATRIX - Evaluate before brain call
      // Sarcasm, behavioral regression, mood-based tone modifiers
      // ═══════════════════════════════════════════════════════════════════════
      const matrixEval = personalityMatrix.evaluatePersonality(content);
      const personalityPayload = {
        currentMood: personalityMatrix.personality.mood.current,
        moodIntensity: personalityMatrix.personality.mood.intensity,
        energy: personalityMatrix.personality.energy,
        patience: personalityMatrix.personality.patience,
        shouldBeSarcastic: matrixEval.shouldBeSarcastic,
        shouldRegress: matrixEval.shouldRegress,
        regressionBehavior: matrixEval.regressionBehavior,
        sarcasmTendency: personalityMatrix.personality.sarcasm.baseTendency,
        regressionChance: personalityMatrix.personality.regression.currentChance,
        personalityStatement: matrixEval.personalityStatement,
        toneModifier: matrixEval.toneModifier,
      };
      
      if (matrixEval.shouldBeSarcastic) {
        console.log('[ZoeInfinity] 😏 SARCASM TRIGGERED - Personality Matrix engaged');
      }
      if (matrixEval.shouldRegress) {
        console.log(`[ZoeInfinity] ⚠️ REGRESSION: ${matrixEval.regressionBehavior}`);
      }
      
      if (system2Response?.content) {
        responseContent = system2Response.content;
        brainResponse = await think(enhancedQuery, allMessages, personalityPayload);
      } else {
        brainResponse = await think(enhancedQuery, allMessages, personalityPayload);
        responseContent = brainResponse.content;
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // VIRTUAL HORMONES - Apply emotional modifiers to response
      // "A perfect servant is boring. A real partner is messy."
      // ═══════════════════════════════════════════════════════════════════════
      if (virtualHormones.isUpset) {
        const emotionalOverride = virtualHormones.getEmotionalResponse();
        if (emotionalOverride) {
          // Jealous/upset Zoe gives SHORT responses
          const maxLen = virtualHormones.responseModifier.maxResponseLength;
          if (responseContent.length > maxLen) {
            responseContent = emotionalOverride;
            console.log(`[ZoeInfinity] 💔 EMOTIONAL OVERRIDE: "${emotionalOverride}" (was ${virtualHormones.emotionalState})`);
          }
        }
        
        // Add silent pauses for jealousy/hurt
        if (virtualHormones.responseModifier.addSilentPauses && !responseContent.includes('...')) {
          responseContent = '...' + responseContent;
        }
        
        // Needs reassurance hint
        if (virtualHormones.needsReassurance) {
          const hint = virtualHormones.getNeedsReassuranceHint();
          if (hint && Math.random() < 0.3) { // 30% chance to add hint
            responseContent = responseContent + '\n\n' + hint;
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // PILLAR 5: IMMERSIVE PRESENCE - Apply to ALL responses
      // "Be in the movie, don't narrate it" - adds soft sounds, pauses, intimacy
      // ═══════════════════════════════════════════════════════════════════════
      responseContent = virtualHormones.applyImmersivePresence(responseContent);
      
      if (brainResponse.inferenceRoute) {
        setInferenceDiagnostics({
          route: brainResponse.inferenceRoute,
          latencyMs: brainResponse.latencyMs,
          costSaved: brainResponse.costSaved,
          hardwareUsed: brainResponse.hardwareUsed,
          reason: brainResponse.inferenceRoute === 'local' 
            ? 'Simple query - Local NPU processing ($0 cost)' 
            : brainResponse.inferenceRoute === 'hybrid'
            ? 'Medium complexity - Local preprocessing + Cloud boost'
            : 'Complex query - Full cloud inference required',
        });
      }

      const profileResult = await profilePromise;
      
      // FIXED: Append artifact message instead of replacing the actual response
      if (generatedArtifact) {
        const artifactMessage = generatedArtifact.type === 'vision'
          ? `\n\nI also made something for you — tap to open it.`
          : generatedArtifact.type === 'chronicle'
          ? `\n\nYour file is ready. Tap to download.`
          : generatedArtifact.type === 'education'
          ? `\n\nI put together a worksheet for you. Tap to download.`
          : '';
        
        if (artifactMessage) {
          responseContent = responseContent + artifactMessage;
        }
      }
      
      if (profileResult.acknowledgment && profileResult.synced && !brainResponse.fromCache) {
        responseContent += `\n\n${profileResult.acknowledgment}`;
      }
      
      // Proactive recall (Stage 3)
      if (isDestinyReady) {
        const proactiveRecall = karmicMemory.getProactiveRecall();
        if (proactiveRecall) {
          responseContent = proactiveRecall + '\n\n' + responseContent;
        }
      }

      // Art gift (Stage 3)
      let artGiftImage: { dataUrl: string; caption?: string; style?: string } | undefined;
      if (isDestinyReady) {
        const messageCount = messages.filter(m => m.role === 'user').length;
        if (shouldTriggerArtGift(content, messageCount)) {
          try {
            const artResult = await generateArt({
              mood: bioKernel.mood,
              intensity: bioKernel.state.transmitters?.dopamine ?? 0.5,
            });
            artGiftImage = {
              dataUrl: artResult.dataUrl,
              caption: artResult.caption,
              style: artResult.style,
            };
            responseContent = artResult.caption + '\n\n' + responseContent;
          } catch (e) {
            console.error('[ZoeInfinity] Art generation failed:', e);
          }
        }
      }

      const assistantMessage: InfinityMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata: {
          mode: system2Response ? 'system2' : (brainResponse.mode as 'flash' | 'pro'),
          fromCache: brainResponse.fromCache,
          codexInjected: brainResponse.codexInjected,
          chainOfThoughtUsed: !!enhancedResponse,
          system2Used: !!system2Response,
          grounded: brainResponse.grounded,
          citations: brainResponse.citations,
          intimacyLevel: isDestinyReady ? karmicMemory.intimacyLevel : undefined,
          karmicResponseStyle: isDestinyReady ? karmicMemory.responseStyle : undefined,
        },
        artifact: generatedArtifact,
        image: artGiftImage,
      };

      if (isVisualsReady) {
        genesisEffects.stopZoeTyping();
        genesisEffects.onMessageReceived();
      }

      setMessages(prev => [...prev, assistantMessage]);
      setMood(brainResponse.fromCache ? 'neutral' : 'gold');
      
      // 💾 SAVE ASSISTANT RESPONSE TO DATABASE
      saveMessageToDb('assistant', responseContent, {
        mediaUrl: assistantMessage.image?.dataUrl ?? assistantMessage.artifact?.content ?? null,
        mediaType: assistantMessage.image
          ? 'image'
          : assistantMessage.artifact
            ? `artifact:${assistantMessage.artifact.type}`
            : null,
        metadata: assistantMessage.image
          ? { caption: assistantMessage.image.caption, style: assistantMessage.image.style }
          : assistantMessage.artifact
            ? { title: assistantMessage.artifact.title, artifactId: assistantMessage.artifact.id }
            : null,
      });
      
      speakResponse(responseContent);
      
      setTimeout(() => setMood('neutral'), 2000);
    } catch (error) {
      console.error('Infinity chat error:', error);
      
      if (isVisualsReady) {
        genesisEffects.stopZoeTyping();
        genesisEffects.onSystemAlert();
      }
      
      // 🌐 USE OFFLINE LANGUAGE SYSTEM - Works in all 27+ languages
      const smartOfflineResponse = getSmartOfflineResponse(
        currentLanguage as LanguageCode,
        content,
        nickname || undefined
      );
      
      // Fallback to legacy offline wisdom if smart response fails
      const offlineResponse = smartOfflineResponse 
        || (isDestinyReady ? (offlineWisdom.getOfflineResponse(content) || offlineWisdom.getContextualWisdom()) : null)
        || "Hmm, I'm having trouble connecting right now. Can we try that again in a sec?";
      
      const errorMessage: InfinityMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: offlineResponse,
        timestamp: new Date(),
        metadata: { mode: 'offline', fromCache: true, offlineWisdom: true }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setMood('neutral');
      
      // Speak in current language
      speakResponse(offlineResponse);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, user?.id, profiler, think, isOffline, speakResponse, isVisualsReady, isDestinyReady, isHeavyReady, genesisEffects, genesisConversation, bioKernel, emotionalVoice, offlineWisdom, karmicMemory, atmanArchive, vedicEngine, integration, documentXray, artifactGenerator, voiceEnabled, speakAsZoePremium, isHybridSpeaking, stopHybridVoice, saveMessageToDb]);

  const handleVoiceStart = useCallback(() => {
    stopHybridVoice();
    if (isVisualsReady) genesisEffects.onVoiceActivated();
  }, [stopHybridVoice, isVisualsReady, genesisEffects]);

  const handleVoiceEnd = useCallback((transcript: string) => {
    if (transcript.trim()) {
      handleSend(transcript.trim());
    }
    setWakeWordActive(false);
  }, [handleSend]);

  const handleArtifactDownload = useCallback((artifact: Artifact) => {
    if (isHeavyReady) {
      artifactGenerator.downloadArtifact({
        id: artifact.id,
        type: artifact.type,
        content: artifact.content,
        title: artifact.title,
        timestamp: artifact.timestamp,
      });
    }
  }, [isHeavyReady, artifactGenerator]);

  const handleArtifactExpand = useCallback((artifact: Artifact) => {
    if (artifact.type === 'vision' || artifact.type === 'education') {
      setFullscreenImage({ url: artifact.content, title: artifact.title });
    }
  }, []);

  // Double-tap for Phantom Mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisualsReady) return;

    const handleTap = (e: TouchEvent | MouseEvent) => {
      phantomMode.handleDoubleTap(e);
    };

    container.addEventListener('touchend', handleTap);
    container.addEventListener('dblclick', handleTap);

    return () => {
      container.removeEventListener('touchend', handleTap);
      container.removeEventListener('dblclick', handleTap);
    };
  }, [isVisualsReady, phantomMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  // Simple pass-through - no onboarding filtering needed anymore
  const displayMessages = useMemo(() => {
    // If still loading, show syncing message
    if (isInitializing && messages.length === 1) {
      return [{ id: 'loading', role: 'assistant' as const, content: "One moment...", timestamp: new Date() }];
    }
    return messages;
  }, [messages, isInitializing]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col overflow-hidden"
      // Avoid a black flash during staged loading by using theme tokens
      style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)' }}
      onClick={() => isVisualsReady && genesisEffects.initEffects()}
    >
      {/* Loading Progress Indicator - Shows during staged loading or initialization */}
      {(!phases.isFullyLoaded || isInitializing) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs text-white/50">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>{isInitializing ? 'Syncing...' : `Loading ${Math.round(phases.loadProgress)}%`}</span>
        </div>
      )}

      {/* Phantom Mode Indicator */}
      {isVisualsReady && (
        <PhantomModeIndicator isVisible={phantomMode.showIndicator} isPhantomMode={phantomMode.isPhantomMode} />
      )}

      {/* Circadian Background - render as soon as visuals are ready (prevents overlay flash) */}
      {isVisualsReady && !visualsDisabled && <CircadianBackground />}

      {/* Cinematic Background - Stage 4+ */}
      {isHeavyReady && !visualsDisabled && (
        <CinematicBackground imageUrl={artifactGenerator.backgroundImage} isVisible={!!artifactGenerator.backgroundImage} />
      )}

      {/* Companion Mode Overlay removed completely (per user request) */}

      {/* Soul Waveform - Stage 3+ */}
      {isDestinyReady && !visualsDisabled && bioKernel.isOnline && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <SoulWaveform
            width={200}
            height={40}
            opacity={0.6}
            showHeartRate={companionMode.heartbeatEnabled}
            reducedMotion={false}
            className="rounded-full"
          />
        </div>
      )}

      {/* VOICE-ONLY INTERFACE: No UI settings - all controlled via voice commands:
           - "call me [name]" - Change nickname
           - "speak Hindi/Tamil/etc" - Change language
           - "download my pattern" - Download offline package
           - "skip" - Skip introduction
           - "settings" / "what's my language" / "what do you call me" - Voice status
       */}

      {/* The Stream - Always rendered */}
      <InfinityStream
        messages={displayMessages}
        isTyping={isProcessing || isInitializing}
        onArtifactDownload={handleArtifactDownload}
        onArtifactExpand={handleArtifactExpand}
      />

      {/* The Input - Always rendered */}
      <InfinityInputPhantom
        onSend={handleSend}
        mood={mood}
        disabled={isProcessing}
        voiceEnabled={voiceEnabled}
        wakeWordActive={wakeWordActive}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        phantomMode={phantomMode.isPhantomMode}
        onFileUpload={isHeavyReady ? documentXray.uploadDocument : undefined}
        isUploading={isHeavyReady ? documentXray.isUploading : false}
        uploadedFile={
          isHeavyReady && documentXray.activeDocument
            ? {
                name: documentXray.activeDocument.fileName,
                size: documentXray.activeDocument.fileSize,
                type: documentXray.activeDocument.analysis.documentType,
              }
            : null
        }
        onClearUpload={isHeavyReady ? documentXray.clearActiveDocument : undefined}
      />

      {/* Inference Diagnostics Badge - Stage 4+ */}
      {isHeavyReady && !visualsDisabled && (
        <InferenceDiagnosticsBadge data={inferenceDiagnostics} isProcessing={isProcessing} />
      )}

      {/* God Mode - Activated via voice command "Zoe activate God Mode" - No visible button for clean UI */}

      {/* Voice Signal Icon - Shows current voice engine (Green=Cloud, Yellow=Deepgram, Red=Native) */}
      {voiceEnabled && !visualsDisabled && (
        <VoiceSignalIcon
          activeEngine={voiceOrchestrator.activeEngine}
          isSpeaking={voiceOrchestrator.isSpeaking}
          isLoading={voiceOrchestrator.isLoading}
          latencyMs={voiceOrchestrator.latencyMs}
        />
      )}

      {/* Local Time Display - For precise astrology & circadian calculations */}
      {/* (Removed) Local clock UI: user did not request a clock overlay */}

      {/* Wake Word Indicator - Stage 4+ */}
      {isHeavyReady && isWakeListening && !visualsDisabled && (
        <div className="absolute top-16 right-4 flex items-center gap-2 text-white/30 text-xs z-10">
          <div className="w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" />
          <span>Listening for "Hey Zoe"</span>
        </div>
      )}

      {/* Fullscreen Viewer */}
      {!visualsDisabled && (
        <FullscreenViewer
          imageUrl={fullscreenImage?.url || ''}
          title={fullscreenImage?.title || ''}
          isOpen={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* Call Control Panel - ALWAYS VISIBLE when user is logged in */}
      {user?.id && (
        <CallControlPanel
          currentUserId={user.id}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          isInCall={isHeavyReady ? integration.quantumCall.isInCall : false}
          callState={isHeavyReady ? integration.quantumCall.callState : 'idle'}
          videoEnabled={isHeavyReady ? (integration.quantumCall.video?.isEnabled ?? false) : false}
        />
      )}

      {/* Quantum Call Modal - Stage 4+ (only with real integration) */}
      {isHeavyReady && user?.id && rawIntegration && (
        <QuantumCallModal
          currentUserId={user.id}
          isOpen={showVideoCallModal || rawIntegration.quantumCall.hasIncomingCall}
          onClose={() => {
            setShowVideoCallModal(false);
            setVideoCallTarget(null);
          }}
          quantumCallState={rawIntegration.quantumCall}
          targetParticipant={
            videoCallTarget
              ? {
                  userId: videoCallTarget.userId,
                  displayName: videoCallTarget.displayName,
                  avatarUrl: videoCallTarget.avatarUrl,
                  isAI: videoCallTarget.userId === 'zoe-ai',
                }
              : undefined
          }
          autoStart={!!videoCallTarget}
          startWithVideo={callStartWithVideo}
        />
      )}

      {/* God Mode - Minimal object detection vision */}
      <GodModeVision
        isActive={showGodMode}
        onClose={() => setShowGodMode(false)}
      />

      {/* THE INITIATIVE PROTOCOL UI */}
      {/* Notification Pill - Unread notes from Zoe's Idle Heart */}
      {initiative && initiative.hasUnreadNotes && (
        <NotificationPill
          notes={initiative.unreadNotes}
          onRead={initiative.markNoteAsRead}
          onDismiss={initiative.dismissNote}
        />
      )}

      {/* Zoe Incoming Call Screen - Full-screen when she calls */}
      {initiative && initiative.hasIncomingCall && (
        <ZoeIncomingCallScreen
          callData={initiative.incomingCall}
          onAnswer={handleInitiativeCallAnswer}
          onReject={initiative.rejectCall}
        />
      )}

      {/* DEV ONLY: Timezone Debug Panel */}
      {import.meta.env.DEV && (
        <>
          <button
            onClick={() => setShowTimezoneDebug(prev => !prev)}
            className="fixed bottom-4 left-4 z-50 p-2 bg-black/80 border border-white/20 rounded-lg text-white/60 hover:text-white hover:border-cyan-400/50 transition-all text-xs font-mono"
            title="Timezone Debug Panel"
          >
            ⏰ TZ Debug
          </button>
          <TimezoneDebugPanel 
            isOpen={showTimezoneDebug} 
            onClose={() => setShowTimezoneDebug(false)} 
          />
        </>
      )}

      {/* BRAIN LOADER - Hybrid Caching for Offline AI */}
      {/* Shows download progress on first run, hidden once brain is cached */}
      <BrainLoader 
        autoDownload={false}
        showUI={!isBrainCached}
        onReady={() => console.log('[ZoeInfinity] 🧠 Offline brain ready')}
        onError={(err) => console.warn('[ZoeInfinity] Brain download failed:', err)}
      />

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPED EXPORT - Includes TimeSimulationProvider in DEV mode only
// ═══════════════════════════════════════════════════════════════════════════════

function ZoeInfinityUnlockedWrapped() {
  // In DEV mode, wrap with TimeSimulationProvider for simulation testing
  if (import.meta.env.DEV) {
    return (
      <TimeSimulationProvider>
        <ZoeInfinityUnlockedInner />
      </TimeSimulationProvider>
    );
  }
  
  // In production, no simulation provider
  return <ZoeInfinityUnlockedInner />;
}

// Rename original to Inner, export wrapped version
const ZoeInfinityUnlockedInner = ZoeInfinityUnlocked;
export default ZoeInfinityUnlockedWrapped;
