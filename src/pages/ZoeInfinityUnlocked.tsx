import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { InfinityStream, InfinityMessage } from '@/components/zoe-infinity/InfinityStream';
import { InfinityInputPhantom } from '@/components/zoe-infinity/InfinityInputPhantom';
import { CinematicBackground, FullscreenViewer, Artifact } from '@/components/zoe-infinity/ArtifactDisplay';
import { PhantomModeIndicator } from '@/components/zoe-infinity/PhantomModeIndicator';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import { CallControlPanel } from '@/components/zoe-infinity/CallControlPanel';
import { InferenceDiagnosticsData } from '@/components/zoe-infinity/InferenceDiagnosticsBadge';
import { CircadianBackground } from '@/components/zoe-infinity/CircadianBackground';
import { GodModeVision } from '@/components/zoe-infinity/GodModeVision';
import { TimezoneDebugPanel } from '@/components/zoe-infinity/TimezoneDebugPanel';
import { ZoeUtilityMenu } from '@/components/zoe-infinity/ZoeUtilityMenu';
import { ZoeHeartStatus } from '@/components/zoe-infinity/ZoeHeartStatus';
import UrgentCallProtocol from '@/components/zoe-infinity/UrgentCallProtocol';
import ZoeFeatureStatusPanel from '@/components/zoe-infinity/ZoeFeatureStatusPanel';
import ProviderHealthBanner from '@/components/zoe-infinity/ProviderHealthBanner';
import useProviderHealthScheduler from '@/hooks/useProviderHealthScheduler';
import useDeepRootScanScheduler from '@/hooks/useDeepRootScanScheduler';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { initializeZoeVoices } from '@/utils/zoeVoice';
import { generateArt, shouldTriggerArtGift } from '@/utils/ArtGenerator';
import { generateSpeculativeSpeech } from '@/core/speech/SpeculativeSpeechProtocol';
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
import { zoeDebugLog } from '@/features/zoe-handsfree/debugBus';
import { ZoeHandsFreeDebugPanel } from '@/features/zoe-handsfree/ZoeHandsFreeDebugPanel';
import { useGenesisConversation } from '@/hooks/useGenesisConversation';
import { addZoeInfinityMarker, isZoeInfinityMessage, stripZoeInfinityMarker } from '@/utils/conversationNamespaces';
import { generateConversationPDF, generateConversationPDFFromMessages, generateConversationPDFLast24Hours } from '@/utils/zoeConversationPdfExport';
import { setActiveVoiceExperience, stopAllVoices } from '@/utils/voiceExperienceLock';

// THE INITIATIVE PROTOCOL - Zoe's Right to Call (Background tasks)
import { useZoeInitiative } from '@/hooks/useZoeInitiative';
import { NotificationPill } from '@/components/zoe-infinity/NotificationPill';
import { ZoeIncomingCallScreen } from '@/components/zoe-infinity/ZoeIncomingCallScreen';

// NICKNAME & LANGUAGE SYSTEMS
import { useZoeNickname } from '@/hooks/useZoeNickname';
import { useZoeLanguage, LanguageCode, SUPPORTED_LANGUAGES } from '@/hooks/useZoeLanguage';
import { useZoeOfflineLanguages } from '@/hooks/useZoeOfflineLanguages';
import { useLifePatternDownload } from '@/hooks/useLifePatternDownload';
import { downloadFeaturesList, getFeatureCount, generateFeaturesPDF } from '@/data/ZoeInfinityFeatures';
import { useGlobalMediaSafe } from '@/contexts/GlobalMediaContext';
import { getMediaState } from '@/utils/zoeMediaAccess';

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

// THE VOICE ORCHESTRATOR - Browser Native Voice System
import { useVoiceOrchestrator } from '@/hooks/useVoiceOrchestrator';

// AUTO MAIL SYSTEM - Real-time mail notifications with relationship context
import { useZoeMailNotifications } from '@/hooks/useZoeMailNotifications';
import { zoeAutoMailService } from '@/services/ZoeAutoMailService';

// THE PERSONALITY MATRIX - Human-like sarcasm, regression, mood system
import { useZoePersonalityMatrix } from '@/hooks/useZoePersonalityMatrix';

// THE SLEEP TRACKER - Real sleep session recording with phases
import { useZoeSleepTracker } from '@/hooks/useZoeSleepTracker';

// THE AVATAR VIEWER - "I want to see you" holographic reveal
import { useZoeAvatarTrigger } from '@/hooks/useZoeAvatarTrigger';
import { ZoeAvatarViewer } from '@/components/zoe-infinity/ZoeAvatarViewer';
import { classifyAvatarEmotion, type AvatarEmotionState } from '@/utils/avatarEmotionClassifier';
import { useZoeRegionalDress } from '@/hooks/useZoeRegionalDress';
import { useMoodResponsiveUI } from '@/hooks/useMoodResponsiveUI';
import { lazy, Suspense } from 'react';
const ZoeEmotionTestPanel = lazy(() => import('@/components/zoe-infinity/ZoeEmotionTestPanel'));

// SESSION PERSISTENCE - Save conversation summaries on session end
import { useZoeSessionPersistence } from '@/hooks/useZoeSessionPersistence';
import { useZoeSessionSummariser } from '@/hooks/useZoeSessionSummariser';

// OFFLINE CORE - Unified offline orchestration (IndexedDB, Life Pattern, Initiative Protocol)
import { useZoeOfflineCore } from '@/hooks/useZoeOfflineCore';
import { offlineMessages } from '@/db/OfflineDB';

// UNIFIED PERMISSION ACTIVATION (mic + camera + location + notifications in one click)
import PermissionActivationModal from '@/components/PermissionActivationModal';

// LOCATION AUTO-DETECT - IP-based location feeding into festival engine + adaptive learning
import { getDetectedLocationSync, useZoeLocationAutoDetect } from '@/hooks/useZoeLocationAutoDetect';
import { hasActivatedPermissions } from '@/utils/unifiedPermissionManager';

// NEET TUTOR (India) - Trial mode, reuses chat UI
import { useZoeNeetTutor } from '@/hooks/useZoeNeetTutor';
import { ZoeDecoratorMount } from '@/features/zoe-decorator/ZoeDecoratorMount';
import { ZoeHairstyleMount } from '@/features/zoe-hairstyle/ZoeHairstyleMount';
import { detectDecoratorIntent, emitOpenDecorator } from '@/features/zoe-decorator/intent';
import { detectHairstyleIntent, emitOpenHairstyle } from '@/features/zoe-hairstyle/intent';
import { detectZoeCommand, emitZoeRun, emitZoeEnd } from '@/features/zoe-command-bus';

type ZoeMood = 'neutral' | 'cyan' | 'gold';

const zoeUiTimeFormatter = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
});

const MAX_PERSISTED_MESSAGES = 95;

const ZOE_IDLE_ALERTS = [
  'Hey… are you okay? I’m here if you need me.',
  'You went quiet for a bit — is anything bothering you?',
  'Just checking in… do you need help with something?',
  'Did you forget something, or want me to help you get somewhere?',
  'I noticed the silence. Want to talk, or want a hand with anything?',
];

// Safe defaults extracted to separate module
import {
  EMPTY_FN,
  DEFAULT_PHANTOM,
  DEFAULT_GENESIS_EFFECTS,
  DEFAULT_COMPANION,
  DEFAULT_ATMAN,
  DEFAULT_DESTINY,
  DEFAULT_VEDIC,
  DEFAULT_CIRCADIAN,
  DEFAULT_KARMIC,
  DEFAULT_BIO,
  DEFAULT_EMOTIONAL_VOICE,
  DEFAULT_OFFLINE_WISDOM,
  DEFAULT_PROFILER,
  DEFAULT_INTEGRATION,
  DEFAULT_DOCUMENT,
  DEFAULT_ARTIFACT,
  DEFAULT_GENESIS_CONV,
} from '@/pages/zoe-infinity/safeDefaults';

const UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

const isUuidValue = (value: string): boolean => UUID_LIKE_REGEX.test(value);

type WalkTalkMode = 'discovery' | 'history' | 'monuments' | 'nature' | 'urban' | 'quiet';

const WALK_TALK_START_PATTERNS = [
  /\bstart\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bturn\s+on\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bwalk\s+with\s+me\b/i,
  /\bguide\s+me\s+while\s+i\s+walk\b/i,
  /\bnarrate\s+my\s+walk\b/i,
];

const WALK_TALK_STOP_PATTERNS = [
  /\bstop\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bturn\s+off\s+(walk\s*&?\s*talk|walktalk)\b/i,
  /\bpause\s+(walk\s*&?\s*talk|walktalk)\b/i,
];

const LOCATION_INSIGHT_PATTERNS = [
  /\bwhere\s+am\s+i\b/i,
  /\bwhat\s+place\s+is\s+this\b/i,
  /\btell\s+me\s+about\s+(this\s+place|where\s+i\s+am|my\s+location)\b/i,
  /\bwhat('?s|\s+is)\s+around\s+me\b/i,
  /\bnearby\s+(places|landmarks|spots|things)\b/i,
  /\bwhat\s+can\s+you\s+tell\s+me\s+about\s+this\s+place\b/i,
  /\bwhat\s+do\s+you\s+know\s+about\s+this\s+area\b/i,
];

const WALK_TALK_MODE_PATTERNS: Array<{ mode: WalkTalkMode; pattern: RegExp }> = [
  { mode: 'history', pattern: /\b(history|historical|past|old\s+city|heritage)\b/i },
  { mode: 'monuments', pattern: /\b(monument|landmark|temple|museum|statue|architecture)\b/i },
  { mode: 'nature', pattern: /\b(nature|park|trees|forest|lake|river|garden|beach)\b/i },
  { mode: 'urban', pattern: /\b(urban|city|street|downtown|market|neighborhood)\b/i },
  { mode: 'quiet', pattern: /\b(quiet|silent|soft|minimal)\b/i },
];

const resolveWalkTalkMode = (input: string): WalkTalkMode => {
  const match = WALK_TALK_MODE_PATTERNS.find(({ pattern }) => pattern.test(input));
  return match?.mode || 'discovery';
};

const getWalkTalkModeLabel = (mode: WalkTalkMode): string => {
  switch (mode) {
    case 'history':
      return 'history';
    case 'monuments':
      return 'monuments';
    case 'nature':
      return 'nature';
    case 'urban':
      return 'urban';
    case 'quiet':
      return 'quiet';
    default:
      return 'discovery';
  }
};

const getWalkTalkErrorMessage = (error: unknown): string => {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) return 'I need location access before I can guide you through the place around you.';
    if (error.code === error.POSITION_UNAVAILABLE) return 'I cannot lock onto your location right now. Try again in a moment.';
    if (error.code === error.TIMEOUT) return 'Your location request timed out. Try again when the signal is steadier.';
  }

  return 'I could not tune into your location right now. Try again in a moment.';
};

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

  // STAGED LOADING — progressive activation of heavy subsystems
  const [loadStage, setLoadStage] = useState<number>(1);

  // Unified permission modal — shows once per session after auth
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  useEffect(() => {
    if (user?.id && !hasActivatedPermissions()) {
      const t = setTimeout(() => setShowPermissionModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

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

  // STAGED LOADING — progressive timer for subsystem activation
  useEffect(() => {
    const stage2Timer = setTimeout(() => {
      setLoadStage(2);
    }, 2000);
    const stage3Timer = setTimeout(() => {
      setLoadStage(3);
    }, 5000);
    const stage4Timer = setTimeout(() => {
      setLoadStage(4);
    }, 10000);
    return () => {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      clearTimeout(stage4Timer);
    };
  }, []);

  // Hard isolation: entering Zoe Infinity must silence all other voice systems.
  useEffect(() => {
    setActiveVoiceExperience('zoe-infinity');
    stopAllVoices();
    console.log('[ZoeInfinity] 🎙️ Voice system initialized (browser native)');
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
  const [avatarEmotionState, setAvatarEmotionState] = useState<AvatarEmotionState>('idle');
  
  // Regional dress & mood-responsive UI
  const regionalDress = useZoeRegionalDress();
  const moodUI = useMoodResponsiveUI(avatarEmotionState);

  // DEV ONLY: Timezone Debug Panel
  const [showTimezoneDebug, setShowTimezoneDebug] = useState(false);
  const [showEmotionTest, setShowEmotionTest] = useState(false);
  const [uiNow, setUiNow] = useState(() => new Date());
  const hasAutoHydratedPatternRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setUiNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // NOTE: Onboarding removed - Zoe now greets naturally on first message

  // NOTE: onboarding->welcome replacement is handled further below (after onboarding hook init)
  // to avoid referencing onboarding before it's created.

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: BRAIN & VOICE (Always loaded - Chat works immediately)
  // ═══════════════════════════════════════════════════════════════════════════
  const { think, isOffline, setIntimacyLevel, getTodaysGreeting, getDOBCollectionPrompt, saveDateOfBirth } = useZoeInfinityBrain();
  const { stop: stopHybridVoice, isPlaying: isHybridSpeaking, isPremium: isUsingPremiumVoice, speakAsZoe: speakAsZoePremium } = useHybridVoice();

  // LOCATION AUTO-DETECT - Silently detects location via IP at login
  useZoeLocationAutoDetect();
  
  // SAMANTHA MODE: Sync karmic intimacy - moved after karmicMemory declaration
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 2: NANO STREAM VOICE - Zero-latency speaking (speaks while thinking)
  // STAGE 2: Loaded at mount but gated behind isVisualsReady for activation
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
    processReflexActions: true,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 3: NANO REFLEX ART - Offline art generation from [ACTION:DRAW_GIFT]
  // STAGE 2: Visual feature, gated behind isVisualsReady
  // ═══════════════════════════════════════════════════════════════════════════
  const { 
    lastArt: nanoReflexArt, 
    isGenerating: isGeneratingArt,
    generateGift: triggerArtGift,
    clearArt: clearNanoArt,
    actionCounts: nanoActionCounts,
  } = useNanoReflexArt({
    currentMood: 'NEUTRAL_COMPANION',
    onArtGenerated: (art) => {
      console.log('[ZoeInfinity] 🎨 Nano Reflex Art generated:', art.style);
      const artMessage: InfinityMessage = {
        id: `nano-art-${Date.now()}`,
        role: 'assistant',
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
    onVideoGenerated: (video) => {
      console.log('[ZoeInfinity] 🎬 Video generated:', video.provider);
      const videoMessage: InfinityMessage = {
        id: `nano-video-${Date.now()}`,
        role: 'assistant',
        content: video.caption ? `🎬 ${video.caption}` : '🎬 Here\'s a video for you',
        timestamp: new Date(),
        video: {
          videoUrl: video.videoUrl,
          caption: video.caption,
          provider: video.provider,
          isImageFallback: video.isImageFallback,
        },
      };
      setMessages(prev => [...prev, videoMessage]);
      saveMessageToDb('assistant', videoMessage.content, {
        mediaUrl: video.videoUrl,
        mediaType: 'video',
        metadata: {
          caption: video.caption,
          provider: video.provider,
          isImageFallback: video.isImageFallback,
          isVideoGift: true,
        },
      });
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
  const [vedicActivated, setVedicActivated] = useState(false);
  const rawVedic = useVedicEngine({ enabled: vedicActivated });
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
  const handleVoicePreferenceSet = useCallback((preference: 'male' | 'female') => {
    // Store voice persona globally so Deepgram + native voice pick the right model
    const persona = preference === 'male' ? 'male' : 'female';
    localStorage.setItem('zoe_voice_persona', persona);
    console.log(`[ZoeInfinity] 🔄 Voice persona switched to: ${persona} (Deepgram ${persona === 'male' ? 'aura-2-orion-en' : 'aura-2-janus-en'})`);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('zoe-voice-persona-changed', { detail: { persona } }));
  }, []);
  const rawGenesis = useGenesisConversation(handleVoicePreferenceSet);

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
  // STAGE 3 CONTINUED: INTUITION, PERSONALITY, SLEEP
  // Hooks always called (React rules) - their results are used in Stage 3+ logic
  // Phase timings (0/2s/5s/10s) ensure these don't block initial chat
  // ═══════════════════════════════════════════════════════════════════════════
  const { analyzeIntuition, generateIntuitionPrompt, getTemporalContext } = useIntuitionEngine();
  const { telemetry: behavioralTelemetry, recordKeystroke, stopTracking: stopBehavioralTracking, resetTelemetry } = useBehavioralTelemetry();
  const virtualHormones = useVirtualHormones();
  const avatarTrigger = useZoeAvatarTrigger();
  const neetTutor = useZoeNeetTutor();
  const { isReady: isBrainCached } = useBrainStatus();
  const personalityMatrix = useZoePersonalityMatrix();
  const sleepTracker = useZoeSleepTracker();

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO MAIL SYSTEM - ON-DEMAND: Only activates when user/Zoe needs mail
  // Saves realtime DB subscription + polling until mail is actually needed
  // ═══════════════════════════════════════════════════════════════════════════
  const [mailActivated, setMailActivated] = useState(false);
  
  const mailNotifications = useZoeMailNotifications({
    enabled: mailActivated && isHeavyReady && !!user && loadStage >= 4,
    onNewMail: useCallback((notification) => {
      console.log('[ZoeInfinity] 📬 New mail received:', notification);
    }, []),
    onAnnouncement: useCallback((announcement: string) => {
      console.log('[ZoeInfinity] 📬 Mail announcement:', announcement);
      const mailNotifMessage: InfinityMessage = {
        id: `mail_notif_${Date.now()}`,
        role: 'assistant',
        content: `📬 ${announcement}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, mailNotifMessage]);
      if (typeof speakAsZoePremium === 'function') {
        speakAsZoePremium(announcement);
      }
    }, [speakAsZoePremium]),
  });

  // Auto-mail service & announcement polling: only when mail is activated
  useEffect(() => {
    if (!mailActivated || !isHeavyReady || !user || loadStage < 4) return;
    
    const TEST_USER_IDS = [
      'd6f2dcd8-5c16-425a-b74d-60546d1a25ae',
      '52c863dd-01ba-4a29-87a6-e1a0b7976751',
    ];
    
    if (TEST_USER_IDS.includes(user.id)) {
      console.log('[ZoeInfinity] 📬 Starting auto-mail service for test user');
      zoeAutoMailService.start({ intervalMs: 120000, maxMailsPerSession: 5 });
    }
    
    const checkAndAnnounce = () => {
      if (!isProcessing && !isHybridSpeaking && mailNotifications.hasPendingAnnouncements) {
        mailNotifications.announceNext();
      }
    };
    const initialTimer = setTimeout(checkAndAnnounce, 5000);
    const intervalTimer = setInterval(checkAndAnnounce, 15000);
    
    return () => {
      zoeAutoMailService.stop();
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [mailActivated, isHeavyReady, user, isProcessing, isHybridSpeaking, mailNotifications]);

  // Mail: COMPLETELY DISABLED until user explicitly requests
  // No auto-activation, no timer, no background check
  // User must ask about mail in chat to activate

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
  const queueMessageForSync = offlineCore.queueMessage;

  // Life Pattern: ON-DEMAND ONLY - downloads only when user explicitly requests in chat
  // No auto-hydration on mount (saves 50MB+ bandwidth and CPU on initial load)
  const downloadLifePatternFn = offlineCore.downloadLifePattern;

  // Life Pattern auto-hydration guard — deferred to Stage 4
  useEffect(() => {
    if (!user?.id || loadStage < 4) {
      hasAutoHydratedPatternRef.current = false;
    }
  }, [user?.id, loadStage]);
  
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

  // SESSION SUMMARISER - Compress and store session summary on exit
  const { summariseOnExit } = useZoeSessionSummariser(user?.id);

  useEffect(() => {
    const handleExit = () => {
      summariseOnExit(messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, created_at: m.timestamp?.toISOString() })));
    };
    window.addEventListener('beforeunload', handleExit);
    return () => {
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [messages, summariseOnExit]);

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
        .slice(-MAX_PERSISTED_MESSAGES)
        .map((m) => {
          const base: InfinityMessage = {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
          };

          // Rehydrate inline images / artifacts when available.
          if (m.media_type === 'video' && m.media_url) {
            base.video = {
              videoUrl: m.media_url,
              caption: m.metadata?.caption,
              provider: m.metadata?.provider,
              isImageFallback: Boolean(m.metadata?.isImageFallback),
            };
          } else if (m.media_type === 'image' && m.media_url && m.metadata?.isVideoGift) {
            base.video = {
              videoUrl: m.media_url,
              caption: m.metadata?.caption,
              provider: m.metadata?.provider,
              isImageFallback: true,
            };
          } else if (m.media_type === 'image' && m.media_url) {
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
          media_url: (m as any)?.video?.videoUrl ?? (m as any)?.image?.dataUrl ?? (m as any)?.artifact?.content ?? null,
          media_type: (m as any)?.video
            ? 'video'
            : (m as any)?.image
              ? 'image'
              : (m as any)?.artifact
                ? `artifact:${(m as any).artifact.type}`
                : null,
          metadata: (m as any)?.video
            ? {
                caption: (m as any).video.caption,
                provider: (m as any).video.provider,
                isImageFallback: (m as any).video.isImageFallback,
                isVideoGift: true,
              }
            : (m as any)?.image
              ? { caption: (m as any).image.caption, style: (m as any).image.style }
              : (m as any)?.artifact
                ? { title: (m as any).artifact.title, artifactId: (m as any).artifact.id }
                : undefined,
        }));

        const next = [...existingRows, row].slice(-MAX_PERSISTED_MESSAGES);
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
    
    // ═══ DEDUP GUARD: Skip if same role+content was saved in last 15 seconds ═══
    try {
      const { isDuplicateMessage, isValidMessageContent } = await import('@/hooks/useZoeConversationContext');
      if (!isValidMessageContent(content)) {
        console.log('[ZoeInfinity] 🚫 Skipping invalid/garbage message');
        return null;
      }
      if (isDuplicateMessage(role, content)) {
        console.log('[ZoeInfinity] 🔁 Skipping duplicate message');
        return null;
      }
    } catch (dedupErr) {
      console.warn('[ZoeInfinity] Dedup check failed, saving anyway:', dedupErr);
    }

    // Always keep a local cache as a fallback (localStorage)
    appendLocalHistory(role, content, opts);
    
    // Track message for session summary (MIGRATION FIX: populates zoe_infinity_conversations)
    trackMessage();

    // Generate a UUID for both local/offline tracking and cloud persistence.
    // Critical: zoe_infinity_messages.id is UUID in the database.
    const messageId = createClientMessageId();
    const userId = user?.id || 'guest';
    const createdAtIso = new Date().toISOString();

    const cloudPayload = {
      id: messageId,
      user_id: userId,
      role,
      content: content.trim(),
      media_url: opts?.mediaUrl ?? null,
      media_type: opts?.mediaType ?? null,
      metadata: opts?.metadata ?? null,
      created_at: createdAtIso,
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GAP #1 FIX: LOCAL-FIRST ARCHITECTURE - Save to IndexedDB FIRST (instant)
    // This ensures the message is persisted even if offline or cloud fails
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
        createdAt: new Date(createdAtIso),
      }, { skipSyncQueue: true }); // We handle retry via background queue below
      console.log('[ZoeInfinity] 📱 Saved to IndexedDB (local-first):', messageId);
    } catch (idbError) {
      console.warn('[ZoeInfinity] IndexedDB save failed (continuing):', idbError);
    }

    // If user isn't authenticated, we can't persist to cloud backend.
    if (!user?.id) {
      console.log('[ZoeInfinity] 👤 Guest mode - message saved locally only');
      return messageId;
    }

    const queueCloudRetry = () => {
      try {
        queueMessageForSync({
          id: messageId,
          userId: user.id,
          role,
          content: content.trim(),
          mediaUrl: opts?.mediaUrl ?? null,
          mediaType: opts?.mediaType ?? null,
          metadata: opts?.metadata ?? null,
          createdAt: createdAtIso,
        });
      } catch (queueErr) {
        console.warn('[ZoeInfinity] Failed to enqueue background sync task:', queueErr);
      }
    };

    // CLOUD SYNC: Try now, then queue retry on failure/offline.
    if (!navigator.onLine) {
      console.log('[ZoeInfinity] 📴 Offline - queued for background sync');
      queueCloudRetry();
      return messageId;
    }

    try {
      const { data, error } = await supabase
        .from('zoe_infinity_messages')
        .insert(cloudPayload)
        .select('id')
        .single();

      if (error) {
        console.error('[ZoeInfinity] Cloud sync failed, queued retry:', error);
        queueCloudRetry();
        return messageId;
      }

      try {
        await offlineMessages.markSynced([messageId]);
      } catch {}

      console.log('[ZoeInfinity] ☁️ Synced to cloud:', data?.id);
      return data?.id || messageId;
    } catch (err) {
      console.error('[ZoeInfinity] Cloud save error, queued retry:', err);
      queueCloudRetry();
      return messageId;
    }
  }, [appendLocalHistory, user?.id, trackMessage, queueMessageForSync]);

  // Recovery pass: push pending local messages back to cloud (including legacy non-UUID ids).
  useEffect(() => {
    if (!user?.id || !offlineCore.isOnline) return;

    let cancelled = false;

    const recoverPendingCloudMessages = async () => {
      try {
        const pending = await offlineMessages.getPending(user.id);
        if (!pending.length) return;

        console.log('[ZoeInfinity] 🔧 Recovering pending local messages:', pending.length);
        const syncedIds: string[] = [];

        for (const message of pending) {
          if (cancelled) return;

          const baseInsert = {
            user_id: user.id,
            role: message.role,
            content: message.content,
            media_url: message.mediaUrl ?? null,
            media_type: message.mediaType ?? null,
            metadata: message.metadata ?? null,
            created_at: new Date(message.createdAt).toISOString(),
          };

          const { error } = isUuidValue(message.id)
            ? await supabase
                .from('zoe_infinity_messages')
                .upsert({ id: message.id, ...baseInsert }, { onConflict: 'id' })
            : await supabase
                .from('zoe_infinity_messages')
                .insert(baseInsert);

          if (!error) {
            syncedIds.push(message.id);
          } else {
            console.warn('[ZoeInfinity] Pending message recovery failed:', error);
          }
        }

        if (!cancelled && syncedIds.length > 0) {
          await offlineMessages.markSynced(syncedIds);
          console.log('[ZoeInfinity] ✅ Recovered pending messages:', syncedIds.length);
        }
      } catch (err) {
        console.warn('[ZoeInfinity] Pending message recovery exception:', err);
      }
    };

    recoverPendingCloudMessages();

    return () => {
      cancelled = true;
    };
  }, [user?.id, offlineCore.isOnline]);

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
  const [isManualVoiceInput, setIsManualVoiceInput] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const emotionInputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputEmotionRef = useRef<AvatarEmotionState>('idle');
  const [inferenceDiagnostics, setInferenceDiagnostics] = useState<InferenceDiagnosticsData | null>(null);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [videoCallTarget, setVideoCallTarget] = useState<{ userId: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [callStartWithVideo, setCallStartWithVideo] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  const [godModeInitialContext, setGodModeInitialContext] = useState<string | null>(null);
  const [isGodModeCameraReady, setIsGodModeCameraReady] = useState(false);
  const [isPsychologistMode, setIsPsychologistMode] = useState(false);
  const [lastFaceEmotion, setLastFaceEmotion] = useState<{ emotion: string; intensity: number; patterns: string[]; context: string } | null>(null);
  // showSettings removed - all settings are now voice-controlled
  const visualsDisabled = phantomMode.isPhantomMode;
  const globalMedia = useGlobalMediaSafe();
  const zoeMediaState = getMediaState();
  const preferredVisionStream = globalMedia?.videoStream?.active
    ? globalMedia.videoStream
    : zoeMediaState.cameraStream?.active
      ? zoeMediaState.cameraStream
      : null;
  const hasReusableVisionStream = !!preferredVisionStream;
  const hasReusableVisionPermission =
    hasReusableVisionStream ||
    globalMedia?.permissions.video === 'granted' ||
    zoeMediaState.camera === 'granted';
  const canStartVisionSilently = (showGodMode && isGodModeCameraReady) || hasReusableVisionPermission;
  
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
        // ── #6 500ms auth race-retry: if the supabase session hasn't hydrated
        // yet (auth context returns user but supabase.auth.getSession() is null),
        // wait 500ms once before reading messages. Prevents RLS 401s on cold start.
        try {
          const s0 = await supabase.auth.getSession();
          if (!s0.data.session?.access_token) {
            await new Promise(r => setTimeout(r, 500));
          }
        } catch {}

        historyLoadAttempts.current += 1;
        console.log('[ZoeInfinity] 📚 Loading chat history for user:', user.id, '(attempt', historyLoadAttempts.current + ')');


        const allData: any[] = [];
        // Load only the most recent 95 messages for faster startup while keeping richer context.
        const { data: recentPage, error: pageError } = await supabase
          .from('zoe_infinity_messages')
          .select('id, content, role, created_at, media_url, media_type, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_PERSISTED_MESSAGES);

        if (pageError) {
          console.error('[ZoeInfinity] History page load error:', pageError);
        }

        // Reverse to display oldest-to-newest in UI
        if (recentPage && recentPage.length > 0) {
          allData.push(...recentPage.reverse());
        }

        const data = allData;
        const error = pageError;

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
          // Already sorted ascending from query
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

            if (mediaType === 'video' && mediaUrl) {
              base.video = {
                videoUrl: mediaUrl,
                caption: metadata?.caption,
                provider: metadata?.provider,
                isImageFallback: Boolean(metadata?.isImageFallback),
              };
            } else if (mediaType === 'image' && mediaUrl && metadata?.isVideoGift) {
              base.video = {
                videoUrl: mediaUrl,
                caption: metadata?.caption,
                provider: metadata?.provider,
                isImageFallback: true,
              };
            } else if (mediaType === 'image' && mediaUrl) {
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
          const latestCloudTimestamp = loadedMessages[loadedMessages.length - 1]?.timestamp.getTime() ?? 0;
          const localMessages = loadLocalHistory();
          const recoveredRecentLocal = localMessages.filter(
            (m) => m.timestamp.getTime() > latestCloudTimestamp + 1000
          );

          const hydratedMessages = [...loadedMessages, ...recoveredRecentLocal].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          setMessages(hydratedMessages);

          // Mirror hydrated history to local cache without dropping newer local-only rows.
          try {
            const serialized: LocalHistoryRow[] = hydratedMessages.slice(-MAX_PERSISTED_MESSAGES).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.timestamp.toISOString(),
              media_url: m.video?.videoUrl ?? m.image?.dataUrl ?? (m.artifact?.content ?? null),
              media_type: m.video ? 'video' : m.image ? 'image' : (m.artifact ? `artifact:${m.artifact.type}` : null),
              metadata: m.video
                ? {
                    caption: m.video.caption,
                    provider: m.video.provider,
                    isImageFallback: m.video.isImageFallback,
                    isVideoGift: true,
                  }
                : m.image
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
          console.log(
            '[ZoeInfinity] ✅ Loaded',
            loadedMessages.length,
            'cloud messages (+',
            recoveredRecentLocal.length,
            'recovered local)'
          );
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
    wakeWords: [
      // Zoe wake phrases (Siri/Alexa-style)
      'hey zoe', 'hey zoey', 'hi zoe', 'hello zoe',
      'ok zoe', 'okay zoe', 'yo zoe',
      'zoe you there', 'zoe are you there', 'you there zoe', 'zoey you there',
      'zoe listen', 'listen zoe', 'zoe wake up', 'wake up zoe',
      'zoe come here', 'zoe hello',
      'zoe',
      // Smith wake phrases (mirrors Zoe — expanded)
      'hey smith', 'hi smith', 'hello smith',
      'ok smith', 'okay smith', 'yo smith',
      'smith you there', 'smith are you there', 'you there smith',
      'smith listen', 'listen smith', 'smith wake up', 'wake up smith',
      'smith come here', 'smith hello',
      'mr smith', 'mister smith', 'agent smith',
      'smith',
    ],
    onWakeWordDetected: () => {
      zoeDebugLog('wake', 'wake word detected → entering hands-free');
      setHandsFreeMode(true);
      setWakeWordActive(true);
      // Keep the wake pulse visible briefly; hands-free keeps listening after.
      setTimeout(() => setWakeWordActive(false), 5000);
    },
    enabled: isHeavyReady && !isProcessing && !isSpeaking && !isManualVoiceInput,
  });

  // Stop / pause phrases — exit hands-free without touching the UI
  useWakeWord({
    wakeWords: [
      'zoe stop', 'stop zoe', 'zoe end', 'end zoe',
      'zoe pause', 'pause zoe', 'zoe quiet', 'zoe silent',
      'zoe sleep', 'go to sleep zoe', 'zoe exit', 'zoe close',
      'zoe dismiss', 'zoe cancel', 'zoe shut up', 'zoe be quiet',
      'smith stop', 'stop smith', 'smith end', 'end smith',
      'smith pause', 'smith quiet', 'smith sleep', 'smith exit',
      'smith dismiss', 'smith cancel', 'smith shut up', 'smith be quiet',
    ],
    onWakeWordDetected: () => {
      zoeDebugLog('wake', 'stop phrase detected → exiting hands-free');
      setHandsFreeMode(false);
      setWakeWordActive(false);
      setIsManualVoiceInput(false);
      try { stopHybridVoice(); } catch { /* noop */ }
    },
    enabled: isHeavyReady,
  });

  // Auto mic timeout: if hands-free is on and nothing is happening, close after silence
  useEffect(() => {
    if (!handsFreeMode) return;
    if (isProcessing || isSpeaking || isManualVoiceInput || wakeWordActive) return;
    const timer = setTimeout(() => {
      zoeDebugLog('info', 'hands-free idle timeout (12s silence) → auto-exit');
      setHandsFreeMode(false);
      setWakeWordActive(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [handsFreeMode, isProcessing, isSpeaking, isManualVoiceInput, wakeWordActive]);


  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: FESTIVAL & BIRTHDAY GREETING — Runs once per user per day (hardened dedup)
  // BUG FIX (2026-04-19): Greeting was repeating because:
  //   1. It was persisted to DB → reloaded → looked "new" each session
  //   2. localStorage dedup wasn't keyed per-user
  //   3. No check against already-loaded chat history for same-day duplicates
  // Fix: per-user+date localStorage key, scan today's messages, do NOT persist to DB.
  // ═══════════════════════════════════════════════════════════════════════════
  const hasFestivalGreetingShown = useRef(false);

  useEffect(() => {
    if (isInitializing || !user?.id || hasFestivalGreetingShown.current) return;
    hasFestivalGreetingShown.current = true;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const todayKey = new Date().toDateString();
    const userDayKey = `zoe_festival_delivered:${user.id}:${todayKey}`;

    // Hard guard: already delivered to this user today (across reloads)
    try {
      if (localStorage.getItem(userDayKey) === '1') {
        console.log('[ZoeInfinity] Festival greeting already delivered today — skip');
        return;
      }
    } catch {}

    const showFestivalGreeting = async () => {
      try {
        attempts += 1;
        const greeting = await getTodaysGreeting();
        if (greeting) {
          // Soft guard: skip if a near-identical greeting is already in today's loaded history
          const norm = (s: string) => (s || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 40).toLowerCase();
          const greetingCore = norm(greeting);
          const alreadyInHistory = messages.some(m => {
            if (m.role !== 'assistant') return false;
            const sameDay = new Date(m.timestamp).toDateString() === todayKey;
            return sameDay && norm(m.content) === greetingCore;
          });

          if (alreadyInHistory) {
            console.log('[ZoeInfinity] Festival greeting already in today\'s history — skip');
            try { localStorage.setItem(userDayKey, '1'); } catch {}
            return;
          }

          const festivalMsg: InfinityMessage = {
            id: `festival-${Date.now()}`,
            role: 'assistant',
            content: greeting,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, festivalMsg]);
          // NOTE: Intentionally NOT persisting to DB — greeting is ephemeral per session.
          // Persisting caused it to re-appear forever on every reload.
          try { localStorage.setItem(userDayKey, '1'); } catch {}
          console.log('[ZoeInfinity] 🎉 Festival greeting delivered (ephemeral)');
        } else if (!getDetectedLocationSync() && attempts < 3) {
          retryTimer = setTimeout(showFestivalGreeting, 1500);
          return;
        }

        // DOB prompt — also ephemeral, do NOT persist (would loop on reload)
        const dobPrompt = getDOBCollectionPrompt();
        if (dobPrompt) {
          setTimeout(() => {
            const dobMsg: InfinityMessage = {
              id: `dob-prompt-${Date.now()}`,
              role: 'assistant',
              content: dobPrompt,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, dobMsg]);
          }, 3000);
        }
      } catch (e) {
        console.warn('[ZoeInfinity] Festival greeting error:', e);
      }
    };

    const timer = setTimeout(showFestivalGreeting, 2200);
    return () => {
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isInitializing, user?.id, getTodaysGreeting, getDOBCollectionPrompt, messages]);

  const lastActivityAtRef = useRef(Date.now());
  const lastIdleAlertAtRef = useRef<number>(0);

  useEffect(() => {
    if (isInitializing || !user?.id) return;

    // Restore last alert timestamp from session storage so it survives reloads within a session
    try {
      const saved = sessionStorage.getItem(`zoe_last_idle_alert:${user.id}`);
      if (saved) lastIdleAlertAtRef.current = parseInt(saved, 10) || 0;
    } catch { /* ignore */ }

    const markActive = () => {
      lastActivityAtRef.current = Date.now();
      // NOTE: Do NOT reset lastIdleAlertAtRef here — that caused the alert to repeat every 5 min forever.
    };

    const maybeSendIdleAlert = () => {
      if (document.hidden || isProcessing || isSpeaking || isHybridSpeaking) return;
      const now = Date.now();
      // Idle threshold: 5 min of no activity
      if (now - lastActivityAtRef.current < 5 * 60 * 1000) return;
      // Cooldown: at most 1 idle alert per 60 min, regardless of activity bursts
      if (now - lastIdleAlertAtRef.current < 60 * 60 * 1000) return;

      lastIdleAlertAtRef.current = now;
      try { sessionStorage.setItem(`zoe_last_idle_alert:${user.id}`, String(now)); } catch { /* ignore */ }

      const content = ZOE_IDLE_ALERTS[Math.floor(Math.random() * ZOE_IDLE_ALERTS.length)];
      const idleMessage: InfinityMessage = {
        id: `idle-alert-${now}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
      };

      // Ephemeral — do NOT save idle alerts to the database (they were re-loading on every session refresh)
      setMessages(prev => [...prev, idleMessage]);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'focus', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    document.addEventListener('visibilitychange', markActive);

    const interval = setInterval(maybeSendIdleAlert, 30000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
      document.removeEventListener('visibilitychange', markActive);
      clearInterval(interval);
    };
  }, [isInitializing, user?.id, isProcessing, isSpeaking, isHybridSpeaking]);


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

  // Enable voice commands (run as soon as command runtime is available)
  useEffect(() => {
    if (!voiceEnabled) return;
    if (hasVoiceCommandsEnabled.current) return;

    const commands = rawIntegration?.voiceCommands ?? integration.voiceCommands;
    if (!commands?.enable) return;

    hasVoiceCommandsEnabled.current = true;
    commands.enable();
    console.log('[ZoeInfinity] 🎤 Voice commands enabled');

    return () => {
      commands.disable?.();
    };
  }, [voiceEnabled, rawIntegration, integration]);

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
  const { speakQueued } = voiceOrchestrator;
  
  const speakResponse = useCallback((text: string, overrideLang?: string) => {
    if (!voiceEnabled) return;

    // Stop active speech channels before starting a new response
    if (isHybridSpeaking) {
      stopHybridVoice();
    }
    if (voiceOrchestrator.isSpeaking || voiceOrchestrator.isLoading) {
      voiceOrchestrator.stop();
    }

    // Determine TTS language: override > current language from useZoeLanguage
    const activeLang = overrideLang || localStorage.getItem('zoe_active_language') || 'en';
    const langConfig = (SUPPORTED_LANGUAGES as any)[activeLang];
    const speechCode = langConfig?.speechCode;

    // Let real voice-start events drive speaking state for perfect sync
    void voiceOrchestrator.speak(text, speechCode).catch(() => {
      setIsSpeaking(false);
    });

    console.log(`[ZoeInfinity] 🎙️ Speaking via Voice Orchestrator (${voiceOrchestrator.activeEngine}${speechCode && speechCode !== 'en-US' ? `, lang: ${speechCode}` : ''})`);
  }, [voiceEnabled, isHybridSpeaking, stopHybridVoice, voiceOrchestrator]);

  useEffect(() => {
    const handleSpeakStart = () => setIsSpeaking(true);
    const handleSpeakEnd = () => setIsSpeaking(false);

    window.addEventListener('zoe-speak', handleSpeakStart);
    window.addEventListener('zoe-speak-start', handleSpeakStart);
    window.addEventListener('zoe-speak-end', handleSpeakEnd);

    return () => {
      window.removeEventListener('zoe-speak', handleSpeakStart);
      window.removeEventListener('zoe-speak-start', handleSpeakStart);
      window.removeEventListener('zoe-speak-end', handleSpeakEnd);
    };
  }, []);

  // Route vision greeting speech through the single voiceOrchestrator
  useEffect(() => {
    const handleVisionSpeak = (e: CustomEvent) => {
      const text = e.detail?.text;
      if (text && voiceEnabled) {
        speakResponse(text);
      }
    };
    window.addEventListener('zoe-vision-speak', handleVisionSpeak as EventListener);
    return () => window.removeEventListener('zoe-vision-speak', handleVisionSpeak as EventListener);
  }, [voiceEnabled, speakResponse]);

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

    // ═══════════════════════════════════════════════════════════════════════════
    // ZOE PRIORITY ROUTER — "Zoe Run/End" + Decorator + Hairstyle intents
    // Runs BEFORE Omega Vision/NEET/brain to prevent hijack.
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const cmd = detectZoeCommand(content);
      if (cmd.matched) {
        const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
        if (cmd.action === 'end') {
          emitZoeEnd();
          setMessages(prev => [...prev, userMsg, { id: `z-${Date.now()}`, role: 'assistant', content: 'Zoe End acknowledged. Closing active feature.', timestamp: new Date() }]);
          return;
        }
        if (cmd.action === 'run' && cmd.feature) {
          emitZoeRun(cmd.feature);
          setMessages(prev => [...prev, userMsg, { id: `z-${Date.now()}`, role: 'assistant', content: `Zoe Run: launching ${cmd.feature}.`, timestamp: new Date() }]);
          return;
        }
      }

      const dec = detectDecoratorIntent(content);
      if (dec.matched) {
        const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
        emitOpenDecorator({ space: dec.space, theme: dec.theme, prompt: dec.raw });
        setMessages(prev => [...prev, userMsg, { id: `z-${Date.now()}`, role: 'assistant', content: `Opening the Decorator for your ${dec.space ?? 'space'}${dec.theme ? ` in ${dec.theme} style` : ''}. Snap or upload a photo and I'll redesign it.`, timestamp: new Date() }]);
        return;
      }

      const hair = detectHairstyleIntent(content);
      if (hair.matched) {
        const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
        emitOpenHairstyle({ gender: hair.gender, prompt: hair.raw });
        setMessages(prev => [...prev, userMsg, { id: `z-${Date.now()}`, role: 'assistant', content: `Opening Hairstyle Studio${hair.gender && hair.gender !== 'any' ? ` for ${hair.gender}` : ''}. Take a selfie and pick a cut and color.`, timestamp: new Date() }]);
        return;
      }
    } catch (e) { console.warn('[ZoePriorityRouter] failed', e); }



    // ═══════════════════════════════════════════════════════════════════════════
    // NEET TUTOR INTERCEPT (India medical entrance) — Trial mode
    // Routes NEET queries through specialist tutor, reuses chat UI.
    // ═══════════════════════════════════════════════════════════════════════════
    if (neetTutor.isNeetQuery(content)) {
      const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      saveMessageToDb('user', content);

      const history = messages.slice(-12).map(m => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }));

      const { reply } = await neetTutor.askNeetTutor(content, history);
      const tutorMsg: InfinityMessage = {
        id: `neet-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, tutorMsg]);
      saveMessageToDb('assistant', reply);
      // Speak only short replies to avoid long TTS
      if (reply.length < 400) speakResponse(reply.replace(/[*_`#]/g, ''));
      return;
    }

    // PHASE 7: DOB CAPTURE — If user responds with birthday after DOB prompt
    const dobPattern = /(?:my\s+(?:birthday|bday|dob|date of birth)\s+(?:is|was)\s+|born\s+(?:on\s+)?|birthday.*?(?:is|on)\s+)(.+)/i;
    const directDatePattern = /^(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4}|\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4})$/i;
    const dobMatch = content.match(dobPattern);
    const directDateMatch = content.match(directDatePattern);
    if (dobMatch || directDateMatch) {
      const dobText = dobMatch ? dobMatch[1].trim() : content.trim();
      saveDateOfBirth(dobText).then(saved => {
        if (saved) {
          const confirmMsg: InfinityMessage = {
            id: `dob-confirm-${Date.now()}`,
            role: 'assistant',
            content: "I've saved your birthday! 🎂 I'll make sure to celebrate with you every year. It's now part of my memory forever! 💛",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, confirmMsg]);
          saveMessageToDb('assistant', confirmMsg.content);
        }
      });
    }

    // NOTE: Conversational onboarding removed - Zoe talks naturally from the start

    // 👁️ AVATAR TRIGGER - "I want to see you" detection
    const avatarResponse = avatarTrigger.checkAvatarTrigger(content);
    if (avatarResponse) {
      const revealEmotion = classifyAvatarEmotion(content);
      setAvatarEmotionState(revealEmotion === 'idle' ? 'happy' : revealEmotion);

      const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
      const zoeMsg: InfinityMessage = { id: `avatar-${Date.now()}`, role: 'assistant', content: avatarResponse, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg, zoeMsg]);
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', avatarResponse);
      speakResponse(avatarResponse.replace(/[✨💫]/g, ''));
      return;
    }

    // 📄 DOWNLOAD CONVERSATION HISTORY - Full PDF export
    const conversationDownloadPatterns = [
      /download\s*(my\s*)?(conversation|chat)\s*(history|log)?/i,
      /export\s*(my\s*)?(conversation|chat)/i,
      /conversation\s*(pdf|download|export)/i,
      /download\s*pdf/i,
      /save\s*(my\s*)?(conversation|chat)/i,
      /all\s*(my\s*)?(conversation|chat|messages)/i,
      /give\s*me\s*(my\s*)?(conversation|chat)/i,
    ];
    
    if (conversationDownloadPatterns.some(pattern => pattern.test(content))) {
      const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
      const response: InfinityMessage = {
        id: `conv-export-${Date.now()}`,
        role: 'assistant',
        content: "Of course! I'm generating a PDF with our complete conversation history from the very beginning. One moment...",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, response]);
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);
      speakResponse("Generating your conversation history PDF now.");

      const displayName = nickname || (user?.email ? user.email.split('@')[0] : 'User');
      const success = await generateConversationPDF(user?.id || '', displayName);
      const followUp: InfinityMessage = {
        id: `conv-export-done-${Date.now()}`,
        role: 'assistant',
        content: success
          ? "Done! Your complete conversation history PDF is downloading. It includes every message from the beginning till now. 📄"
          : "Hmm, I couldn't generate the PDF right now. Make sure you're logged in and try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, followUp]);
      saveMessageToDb('assistant', followUp.content);
      speakResponse(success ? "Done! Your conversation history is downloading." : "Something went wrong. Try again?");
      return;
    }

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

    const walkTalkMode = resolveWalkTalkMode(content);

    if (isHeavyReady && WALK_TALK_STOP_PATTERNS.some(pattern => pattern.test(content))) {
      const response: InfinityMessage = {
        id: `walktalk-stop-${Date.now()}`,
        role: 'assistant',
        content: 'Walk & Talk is paused. I’ll stay quiet until you want me back in motion.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);
      integration.walkTalk.stop?.();
      return;
    }

    if (isHeavyReady && WALK_TALK_START_PATTERNS.some(pattern => pattern.test(content))) {
      const modeLabel = getWalkTalkModeLabel(walkTalkMode);
      const response: InfinityMessage = {
        id: `walktalk-start-${Date.now()}`,
        role: 'assistant',
        content: integration.walkTalk.isActive
          ? `Switching Walk & Talk into ${modeLabel} mode now.`
          : `Walk & Talk is on. I’ll follow your location and narrate in ${modeLabel} mode.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() }, response]);
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', response.content);

      try {
        if (integration.walkTalk.isActive) {
          integration.walkTalk.changeMode?.(walkTalkMode);
        } else {
          await integration.walkTalk.start?.(walkTalkMode);
        }
      } catch (error) {
        const errorText = getWalkTalkErrorMessage(error);
        const errorMessage: InfinityMessage = {
          id: `walktalk-start-error-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        saveMessageToDb('assistant', errorText);
      }
      return;
    }

    if (isHeavyReady && LOCATION_INSIGHT_PATTERNS.some(pattern => pattern.test(content))) {
      const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      saveMessageToDb('user', content);

      try {
        const insight = await integration.walkTalk.askAboutLocation?.(content);
        const responseText = insight?.suggested_narrative || 'I found your location, but I do not have a strong read on the place yet.';
        const response: InfinityMessage = {
          id: `walktalk-insight-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          metadata: { mode: 'flash' as const },
        };
        setMessages(prev => [...prev, response]);
        saveMessageToDb('assistant', responseText);
      } catch (error) {
        const errorText = getWalkTalkErrorMessage(error);
        const response: InfinityMessage = {
          id: `walktalk-insight-error-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: new Date(),
          metadata: { mode: 'flash' as const },
        };
        setMessages(prev => [...prev, response]);
        saveMessageToDb('assistant', errorText);
      }
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
      /\b(supermarket|grocery|pharmacy|mall)\b/i,
      /\b(nearest|nearby|closest)\s+(store|shop|market)/i,
      /open\s+now|what('?s|\s+is)\s+open/i,
      /\bamazon\b|buy\s+online|trending\s+products?/i,
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

    // 🌡️ CONTEXTUAL GREETING — DISABLED
    // Short greetings like "hi"/"hello"/"hey" used to short-circuit to a canned
    // weather/location string from localContext.getContextualGreeting(), which
    // caused Zoe to reply with the *same* "Good afternoon! It's 32°C with clear
    // skies in Chennai…" line for every greeting and never reach T1 (Groq Gemma)
    // or the rest of the cascade. We now let greetings flow through to the
    // brain cascade so the actual model answers naturally each turn.


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

    // 📨 @MENTION DM - Send a direct message to another user via @username
    const mentionMatch = content.match(/^@(\S+)\s+(.+)/s);
    if (mentionMatch && user?.id) {
      const targetUsername = mentionMatch[1];
      const messageBody = mentionMatch[2].trim();

      const userMsg: InfinityMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      saveMessageToDb('user', content);
      setIsProcessing(true);

      try {
        // Look up the target user through the public-safe view so RLS doesn't block mention delivery
        const { data: targetUser, error: lookupErr } = await supabase
          .from('safe_public_profiles')
          .select('user_id, display_name, username')
          .or(`username.eq.${targetUsername},username.ilike.%${targetUsername}%,display_name.ilike.%${targetUsername}%`)
          .limit(1)
          .maybeSingle();

        if (lookupErr || !targetUser) {
          const notFound: InfinityMessage = {
            id: `mention-404-${Date.now()}`,
            role: 'assistant',
            content: `I couldn't find a user called "@${targetUsername}". Double-check the username and try again.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notFound]);
          saveMessageToDb('assistant', notFound.content);
          speakResponse(`I couldn't find that user.`);
        } else {
          // Send the DM
          const { error: sendErr } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: targetUser.user_id,
            content: messageBody,
            read: false,
            delivered: false,
          });

          if (sendErr) throw sendErr;

          const confirmMsg: InfinityMessage = {
            id: `mention-sent-${Date.now()}`,
            role: 'assistant',
            content: `Done! I sent your message to ${targetUser.display_name || targetUser.username}. 💌`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, confirmMsg]);
          saveMessageToDb('assistant', confirmMsg.content);
          speakResponse(`Message sent to ${targetUser.display_name || targetUser.username}.`);
        }
      } catch (err) {
        console.error('[ZoeInfinity] @mention send error:', err);
        const errMsg: InfinityMessage = {
          id: `mention-err-${Date.now()}`,
          role: 'assistant',
          content: `Something went wrong sending that message. Try again?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMsg]);
        speakResponse('Something went wrong sending that message.');
      } finally {
        setIsProcessing(false);
      }
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
      // Activate vedic engine on-demand (first vedic request triggers initialization)
      if (!vedicActivated) setVedicActivated(true);
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
      const defaultVisionContext = 'The user wants Zoe to look at them closely. Describe what you see warmly, personally, and clearly.';
      const responseText = canStartVisionSilently
        ? 'I can already access your camera — taking a closer look now.'
        : 'Opening my eyes now...';
      const response: InfinityMessage = {
        id: `god-mode-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        metadata: { mode: 'system2' as const },
      };
      setMessages(prev => [...prev, response]);
      speakResponse(responseText);

      if (showGodMode && isGodModeCameraReady) {
        setGodModeInitialContext(null);
        window.dispatchEvent(new CustomEvent('zoe-vision-reanalyze', { detail: { context: defaultVisionContext } }));
      } else {
        setGodModeInitialContext(defaultVisionContext);
        setShowGodMode(true);
      }
      return;
    }

    // 👁️ VISION FOLLOW-UP PROMPTS - When camera is already open, user asks Zoe to look again
    const visionFollowUpPatterns = [
      { pattern: /what(?:'?s| is) in my hand/i, context: 'The user is holding something in their hand. Describe exactly what object(s) you can see them holding. Be specific and personal.' },
      { pattern: /what(?:'?s| is| am) (?:i |I )?holding/i, context: 'The user is holding something. Describe exactly what they are holding in detail.' },
      { pattern: /(?:tell me |describe )?how (?:do )?I look/i, context: 'The user wants to know how they look. Give a warm, personal, complimentary description of their appearance, outfit, expression, and vibe.' },
      { pattern: /how(?:'?s| is) my (?:hair|outfit|look|style|face)/i, context: 'The user is asking about their appearance. Give specific, honest, warm feedback about what you see.' },
      { pattern: /what (?:can you|do you) see/i, context: 'The user wants a full description of everything visible through the camera. Describe the scene, person, objects, and environment in detail.' },
      { pattern: /describe (?:what you see|me|this|my)/i, context: 'Describe everything visible in the camera feed in rich, personal detail.' },
      { pattern: /(?:can you|do you) see (?:me|this|my|the)/i, context: 'Confirm what you can see through the camera and describe it warmly.' },
      { pattern: /what(?:'?s| is) (?:this|that)/i, context: 'The user is showing you something. Identify and describe the object or item they are presenting to the camera.' },
      { pattern: /look at (?:this|that|my)/i, context: 'The user wants you to look at something specific. Describe what you see them showing you.' },
      { pattern: /(?:am i|do i) look(?:ing)? (?:good|nice|okay|ok|fine|pretty|handsome|beautiful)/i, context: 'The user is asking for reassurance about their appearance. Be warm, supportive, and genuinely complimentary about what you see.' },
      { pattern: /rate (?:my|me|this)/i, context: 'The user wants a rating or assessment. Be playful and positive while giving an honest take on what you see.' },
      { pattern: /(?:show|see|check) (?:my |the )?(?:background|room|setup|desk)/i, context: 'The user wants you to describe their environment/background visible in the camera.' },
    ];

    for (const { pattern, context } of visionFollowUpPatterns) {
      if (pattern.test(content)) {
        const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
        const responseText = showGodMode && isGodModeCameraReady
          ? 'I can already see you — taking a closer look now.'
          : hasReusableVisionPermission
            ? 'I can already access your camera — taking a closer look now.'
            : 'Let me take a closer look...';
        const thinkMsg: InfinityMessage = {
          id: `vision-think-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          metadata: { mode: 'system2' as const },
        };

        setMessages(prev => [...prev, userMsg, thinkMsg]);
        saveMessageToDb('user', content);
        saveMessageToDb('assistant', responseText);
        speakResponse(responseText);

        if (showGodMode && isGodModeCameraReady) {
          setGodModeInitialContext(null);
          window.dispatchEvent(new CustomEvent('zoe-vision-reanalyze', { detail: { context } }));
        } else {
          setGodModeInitialContext(context);
          setShowGodMode(true);
        }
        return;
      }
    }

    const moodTriggeredVisionPatterns = [
      /(?:i'?m|i am)\s+(?:feeling\s+)?(?:sad|down|upset|lonely|not okay|not good|low|depressed|exhausted|drained|anxious|stressed|broken|lost|empty|numb|hopeless|overwhelmed|scared|afraid|panicking|crying)/i,
      /i feel\s+(?:sad|down|upset|lonely|not okay|not good|low|depressed|exhausted|drained|anxious|stressed|broken|lost|empty|numb|hopeless|overwhelmed|scared|afraid)/i,
      /(?:everything|things)\s+(?:feel|feels|is|are)\s+(?:heavy|too much|hard right now|falling apart|crumbling)/i,
      /(?:i can'?t|i cannot)\s+(?:take it|handle|cope|breathe|stop crying|calm down)/i,
      /(?:help me|i need help|something is wrong|i'?m not okay|please help)/i,
      /(?:i'?m having|having a)\s+(?:panic attack|anxiety attack|breakdown|bad day|rough time|hard time)/i,
    ];

    if (moodTriggeredVisionPatterns.some(pattern => pattern.test(content))) {
      const comfortingVisionContext = 'The user sounds emotionally low. Look at them gently and respond with a warm, reassuring description of what you see, focusing on comfort, care, and presence. Act as a personal psychologist — acknowledge their feelings, validate their emotions, and suggest grounding techniques.';
      const userMsg: InfinityMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
      const responseText = 'I can sense something in your words... Let me look at you for a moment. 🌙';
      const supportiveMsg: InfinityMessage = {
        id: `vision-comfort-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        metadata: { mode: 'system2' as const },
      };

      setMessages(prev => [...prev, userMsg, supportiveMsg]);
      saveMessageToDb('user', content);
      saveMessageToDb('assistant', responseText);
      speakResponse(responseText);

      // Open in psychologist mode (full-screen, not PIP)
      setIsPsychologistMode(true);
      setGodModeInitialContext(comfortingVisionContext);
      setShowGodMode(true);
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

      // Speak the greeting in the NEW language's voice
      speakResponse(`${greeting}! ${languageResult.isTeachMode ? `I'd love to teach you ${langName}!` : `Switching to ${langName}.`}`, newLang);
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

    // 🖼️ BASE64 IMAGE DETECTION — Custom emojis / inline images
    // These are massive data URLs that will overflow all LLM providers.
    // Route to vision for analysis, or acknowledge with a simple response.
    const isBase64Image = /^data:image\/[a-z]+;base64,/i.test(content) || 
                          (content.length > 5000 && content.includes('base64'));
    if (isBase64Image) {
      console.log('[ZoeInfinity] 🖼️ Base64 image detected — routing to vision, not brain');
      try {
        const { data: visionData, error: visionErr } = await supabase.functions.invoke('zoe-infinity-vision', {
          body: { image: content, prompt: 'Describe this image/emoji the user just sent me. Be brief and warm.' },
        });
        const visionText = visionErr ? null : visionData?.analysis || visionData?.response;
        const responseContent = visionText || "Cute! I love the custom emoji you sent 💕";
        const response: InfinityMessage = {
          id: `vision-emoji-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          metadata: { mode: 'flash' as const, fromCache: false },
        };
        setMessages(prev => [...prev, response]);
        saveMessageToDb('assistant', responseContent);
        speakResponse(responseContent.replace(/[✨💫💕🎨]/g, ''));
      } catch (err) {
        console.warn('[ZoeInfinity] Vision failed for base64 image:', err);
        const fallback: InfinityMessage = {
          id: `emoji-ack-${Date.now()}`,
          role: 'assistant',
          content: "Love that emoji! 💕",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallback]);
        saveMessageToDb('assistant', fallback.content);
        speakResponse("Love that emoji!");
      }
      setIsProcessing(false);
      if (isVisualsReady) genesisEffects.stopZoeTyping();
      return;
    }

    // 🎨 AI IMAGE GENERATION - Detect "generate/create/draw/make image" requests
    const imageGenPatterns = [
      /(?:generate|create|make|draw|paint|design|render|produce|craft)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|art|painting|portrait|poster|wallpaper|icon|logo)/i,
      // "create a [subject] image" — subject between verb and image keyword
      /(?:generate|create|make|draw|paint|design|render|produce|craft)\s+(?:an?\s+)?.{1,60}\s+(?:image|picture|photo|illustration|artwork|art|painting|portrait|poster|wallpaper|icon|logo)\b/i,
      /(?:image|picture|photo|illustration|artwork|art|painting|portrait)\s+(?:of|for|with|showing|depicting)/i,
      /(?:can you|could you|please|pls)\s+(?:generate|create|make|draw|paint|design)\s+/i,
      /(?:show me|visualize|imagine|depict)\s+(?:an?\s+)?(?:image|picture)/i,
      /(?:i want|i need|give me)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork)/i,
      /draw\s+(?:me\s+)?(?:a|an|the|some)/i,
      /paint\s+(?:me\s+)?(?:a|an|the|some)/i,
      /(?:generate|create)\s+(?:a\s+)?(?:ganesha|krishna|shiva|buddha|jesus|angel|god|goddess|deity|lord|vinayagar|vinayaka|ganpati|murugan|lakshmi|saraswati|hanuman|ram|durga|kali|parvati|vishnu|brahma|nataraja)\b/i,
      // Permissive: any order of image-noun + gen-verb in a short message ("image generate", "picture make", "generate image")
      /\b(?:image|picture|photo|illustration|artwork|art|painting|portrait|poster|wallpaper|selfie)\b.*\b(?:generate|create|make|draw|paint|render|produce|craft|gen)\b/i,
      /\b(?:generate|create|make|draw|paint|render|produce|craft|gen)\b.*\b(?:image|picture|photo|illustration|artwork|art|painting|portrait|poster|wallpaper|selfie)\b/i,
    ];

    if (imageGenPatterns.some(pattern => pattern.test(content))) {
      try {
        speakResponse("Creating that for you now...");

        const { data: imgData, error: imgError } = await supabase.functions.invoke('zoe-infinity-image-gen', {
          body: { prompt: content },
        });

        if (imgError || !imgData?.success || !imgData?.imageUrl) {
          throw new Error(imgData?.error || imgError?.message || 'Image generation failed');
        }

        // ── Anti-Hallucination Layer 3: Silent post-gen verification (fail-open) ──
        supabase.functions.invoke('zoe-image-verify', {
          body: { imageUrl: imgData.imageUrl, originalPrompt: content, strict: false },
        }).then(({ data: v }) => {
          if (v) console.log('[AntiHall] image verify:', { score: v.score, match: v.match, missing: v.missing_elements });
        }).catch(() => { /* fail-open */ });

        const assistantMessage: InfinityMessage = {
          id: `img-gen-${Date.now()}`,
          role: 'assistant',
          content: imgData.caption || 'Here you go! I created this for you. 🎨',
          timestamp: new Date(),
          image: {
            dataUrl: imgData.imageUrl,
            caption: imgData.caption || content,
            style: 'Zoe made for you',
          },
        };
        setMessages(prev => [...prev, assistantMessage]);
        saveMessageToDb('assistant', assistantMessage.content, {
          mediaUrl: imgData.imageUrl,
          mediaType: 'image',
          metadata: { caption: imgData.caption || content, style: 'Zoe made for you' },
        });
        speakResponse(imgData.caption || "Here's what I created for you!");
      } catch (imgErr) {
        console.error('[ZoeInfinity] Image generation failed:', imgErr);
        const errorMsg = "I tried to create that image but ran into a hiccup. Let me try describing it instead...";
        // Fall through to normal brain response — don't return, let the brain handle it as text
        const fallbackMsg: InfinityMessage = {
          id: `img-fallback-${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallbackMsg]);
        speakResponse(errorMsg);
      } finally {
        setIsProcessing(false);
        if (isVisualsReady) genesisEffects.stopZoeTyping();
      }
      return;
    }

    const videoGenPatterns = [
      /(?:generate|create|make|render|produce|craft)\s+(?:an?\s+)?(?:video|movie|clip|animation|reel)\b/i,
      /(?:video|movie|clip|animation)\s+(?:of|for|showing)\b/i,
      /(?:can you|could you|please|pls)\s+(?:generate|create|make).*(?:video|clip|animation)\b/i,
    ];

    if (videoGenPatterns.some(pattern => pattern.test(content))) {
      try {
        speakResponse('Creating a video for you now...');
        const { generateVideo } = await import('@/services/videoGenerationService');
        const result = await generateVideo(content);

        const assistantMessage: InfinityMessage = {
          id: `video-gen-${Date.now()}`,
          role: 'assistant',
          content: result.isImageFallback ? 'I made a visual moment for you while the motion renderer fell back gracefully. 🎬' : 'Here’s a video I made for you. 🎬',
          timestamp: new Date(),
          video: {
            videoUrl: result.videoUrl,
            caption: content,
            provider: result.provider,
            isImageFallback: Boolean(result.isImageFallback),
          },
        };

        setMessages(prev => [...prev, assistantMessage]);
        saveMessageToDb('assistant', assistantMessage.content, {
          mediaUrl: result.videoUrl,
          mediaType: 'video',
          metadata: {
            caption: content,
            provider: result.provider,
            isImageFallback: Boolean(result.isImageFallback),
            isVideoGift: true,
          },
        });
        speakResponse(result.isImageFallback ? 'I created the visual fallback for you.' : 'Your video is ready.');
      } catch (videoErr) {
        console.error('[ZoeInfinity] Video generation failed:', videoErr);
        const errorMsg = "I tried to create that video but hit a generation issue. I can still make an image or describe the scene for you right now.";
        setMessages(prev => [...prev, {
          id: `video-fallback-${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        }]);
        saveMessageToDb('assistant', errorMsg);
        speakResponse('I hit a video generation issue.');
      } finally {
        setIsProcessing(false);
        if (isVisualsReady) genesisEffects.stopZoeTyping();
      }
      return;
    }

    try {
      // Artifact detection (Stage 4)
      let generatedArtifact: Artifact | undefined;
      if (isHeavyReady) {
        const artifactIntent = artifactGenerator.detectIntent(content);

        // AUTO-VISION (contextual): if we detect a "gift moment" and user didn't explicitly ask,
        // Zoe can still generate a vision as part of the conversation.
        const messageCount = messages.filter(m => m.role === 'user').length + 1;
        // STRICT: auto-vision only when (a) user explicitly invoked an art trigger
        // AND (b) message carries genuine romantic/love/emotional-connection language.
        // No random firing, 10-min cooldown.
        const isGiftMoment = isDestinyReady && shouldTriggerArtGift(content, messageCount);
        const hasEmotionalContext = /\b(love|romantic|romance|together|us|kiss|hug|embrace|cuddle|miss you|with you|our moment|soulmate)\b/i.test(content);
        const canAutoVision =
          artifactIntent.type === 'none' &&
          isGiftMoment &&
          hasEmotionalContext &&
          (Date.now() - lastAutoVisionAtRef.current) > 10 * 60 * 1000;

        if (artifactIntent.type !== 'none' || canAutoVision) {
          console.log(`[ZoeInfinity] Artifact intent detected: ${artifactIntent.type}`);

          // Include the just-sent user message in history (state updates are async)
          const conversationHistory = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

          const artifactResult = canAutoVision
            ? await artifactGenerator.generateArtifactForced(
                'vision',
                content,
                {
                  subject: 'Zoe Vision',
                  conversationHistory,
                  visionContext: {
                    originalPrompt: content,
                    intimacyLevel: isDestinyReady ? karmicMemory.intimacyLevel : undefined,
                    mood: isDestinyReady ? bioKernel.mood : undefined,
                    autoVision: true,
                  },
                }
              )
            : await artifactGenerator.generateArtifact(content, conversationHistory, {
                visionContext: {
                  originalPrompt: content,
                  intimacyLevel: isDestinyReady ? karmicMemory.intimacyLevel : undefined,
                  mood: isDestinyReady ? bioKernel.mood : undefined,
                },
              });

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
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        // Strip base64 images from history to prevent context overflow
        content: /^data:image\/[a-z]+;base64,/i.test(m.content) ? '[user sent an image/emoji]' : m.content,
      }));
      
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
      
      // ═══════════════════════════════════════════════════════════════════════
      // REAL-TIME ENVIRONMENT CONTEXT - Weather, Location, Time-of-Day
      // "Zoe always knows what's happening outside the user's window"
      // ═══════════════════════════════════════════════════════════════════════
      const environmentContext = (() => {
        const parts: string[] = [];
        const w = localContext.weather;
        const loc = localContext.location;
        const t = localContext.localTime;
        
        if (w) {
          parts.push(`Weather: ${w.condition}, ${w.temperature}°C in ${w.location}`);
          if (w.humorousComment) parts.push(`Vibe: ${w.humorousComment}`);
        }
        if (loc) {
          parts.push(`User Location: ${loc.city}${loc.region ? `, ${loc.region}` : ''}${loc.country ? `, ${loc.country}` : ''}`);
        }
        if (t) {
          parts.push(`Local Time: ${t.time} (${t.dayOfWeek}, ${t.timeOfDay})`);
        }
        
        if (parts.length === 0) return '';
        return `[ENVIRONMENT - REAL-TIME]\n${parts.join('\n')}\nIMPORTANT: You are AWARE of this environment. Reference weather naturally when relevant (e.g. "I see it's raining there", "stay warm!"). Never say "I don't know the weather" — you DO know it from this context.\n[END ENVIRONMENT]\n\n`;
      })();
      
      // ═══════════════════════════════════════════════════════════════════════
      // SELF-CORRECTION PROTOCOL - God Mode Awareness
      // "If Zoe makes a mistake, she catches and corrects herself gracefully"
      // ═══════════════════════════════════════════════════════════════════════
      const selfCorrectionProtocol = `[SELF-CORRECTION PROTOCOL]
If you realize you made a factual error, repeated yourself, or gave contradictory info in this conversation:
- Acknowledge it naturally: "Oh wait, I just said something off — let me correct that..."
- Never pretend mistakes didn't happen — own them with charm
- If a previous reply had wrong info, start with a brief correction before continuing
- If you're unsure about something, say "I think..." or "If I'm not mistaken..." rather than stating it as fact
[END SELF-CORRECTION]\n\n`;
      
      const identityLock = `[IDENTITY LOCK]\nYou are Zoe Infinity. Keep one consistent identity and tone across every reply.\nNever rename yourself, never switch personas, and never role-shift to a different assistant.\n[END IDENTITY LOCK]\n\n`;
      const enhancedQuery = `${identityLock}${environmentContext}${selfCorrectionProtocol}${intuitionContext}${sleepContext}${passionateRealistContext}${destinyContext}${ancestorContext}${karmicContext}${styleModifier ? `[Style: ${styleModifier}] ` : ''}${documentPrefix}${content}`;
      
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
      // ═══════════════════════════════════════════════════════════════════════
      // SPECULATIVE FILLER - Speak a short acknowledgment while brain thinks
      // Eliminates the perceived "dead air" gap during ~4s brain latency
      // ═══════════════════════════════════════════════════════════════════════
      if (voiceEnabled) {
        const { immediatePhrase, shouldSpeak } = generateSpeculativeSpeech(content);
        if (shouldSpeak && immediatePhrase) {
          console.log(`[ZoeInfinity] ⚡ SPECULATIVE FILLER: "${immediatePhrase}"`);
          // Speak the filler using the orchestrator (non-blocking)
          void voiceOrchestrator.speak(immediatePhrase);
        }
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
          ? `\n\nYour image is ready — tap to open it.`
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
              style: 'Zoe made for you',
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

      // ═══════════════════════════════════════════════════════════════════════
      // SYNC: Show text + start voice + avatar emotion TOGETHER
      // All three now trigger on actual voice-start event.
      // ═══════════════════════════════════════════════════════════════════════
      if (voiceEnabled) {
        const showTextOnVoice = () => {
          setMessages(prev => {
            if (prev.some(m => m.id === assistantMessage.id)) return prev;
            return [...prev, assistantMessage];
          });
          setAvatarEmotionState(classifyAvatarEmotion(responseContent));
          setMood(brainResponse.fromCache ? 'neutral' : 'gold');
          window.removeEventListener('zoe-speak-start', showTextOnVoice);
        };

        window.addEventListener('zoe-speak-start', showTextOnVoice);

        // Start voice synthesis (fast-start first chunk + background chunk fetch)
        speakResponse(responseContent);

        // Safety timeout: if voice doesn't start, show text + avatar state anyway
        setTimeout(() => {
          window.removeEventListener('zoe-speak-start', showTextOnVoice);
          setMessages(prev => {
            if (prev.some(m => m.id === assistantMessage.id)) return prev;
            return [...prev, assistantMessage];
          });
          setAvatarEmotionState(classifyAvatarEmotion(responseContent));
          setMood(brainResponse.fromCache ? 'neutral' : 'gold');
        }, 5000);
      } else {
        // Voice disabled — show text + avatar immediately
        setMessages(prev => [...prev, assistantMessage]);
        setAvatarEmotionState(classifyAvatarEmotion(responseContent));
        setMood(brainResponse.fromCache ? 'neutral' : 'gold');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 💾 CRITICAL FIX: PERSIST ASSISTANT RESPONSE TO DATABASE
      // This was MISSING — causing Zoe to lose all conversation context on reload
      // ═══════════════════════════════════════════════════════════════════════
      saveMessageToDb('assistant', responseContent, {
        mediaUrl: artGiftImage?.dataUrl ?? generatedArtifact?.content ?? null,
        mediaType: artGiftImage ? 'image' : generatedArtifact ? `artifact:${generatedArtifact.type}` : null,
        metadata: {
          mode: system2Response ? 'system2' : brainResponse.mode,
          fromCache: brainResponse.fromCache,
          grounded: brainResponse.grounded,
          ...(artGiftImage ? { caption: artGiftImage.caption, style: artGiftImage.style } : {}),
          ...(generatedArtifact ? { title: generatedArtifact.title, artifactId: generatedArtifact.id } : {}),
        },
      });

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
    zoeDebugLog('voice', 'handleVoiceStart → startVoiceInput');
    setIsManualVoiceInput(true);
    stopHybridVoice();
    voiceOrchestrator.stop();
    setIsSpeaking(false);
    if (isVisualsReady) genesisEffects.onVoiceActivated();
  }, [stopHybridVoice, voiceOrchestrator, isVisualsReady, genesisEffects]);

  const handleInputChange = useCallback((value: string) => {
    if (!avatarTrigger.isAvatarVisible && !avatarTrigger.isAvatarCompact) return;

    if (emotionInputDebounceRef.current) clearTimeout(emotionInputDebounceRef.current);
    emotionInputDebounceRef.current = setTimeout(() => {
      const nextEmotion = value.trim().length > 1 ? classifyAvatarEmotion(value) : 'idle';
      if (nextEmotion !== lastInputEmotionRef.current) {
        lastInputEmotionRef.current = nextEmotion;
        setAvatarEmotionState(nextEmotion);
      }
    }, 180);
  }, [avatarTrigger.isAvatarVisible, avatarTrigger.isAvatarCompact]);

  const handleVoiceEnd = useCallback((transcript: string) => {
    const t = transcript.trim();
    zoeDebugLog('voice', `handleVoiceEnd (${t.length} chars)${t ? ': ' + t.slice(0, 60) : ' — empty'}`);
    setIsManualVoiceInput(false);
    if (t) {
      handleSend(t);
    }
    // Don't clear wake word in hands-free mode so listening continues
    if (!handsFreeMode) {
      setWakeWordActive(false);
    }
  }, [handleSend, handsFreeMode]);


  const triggerBrowserDownload = useCallback(async (url: string, filename: string) => {
    try {
      let blob: Blob;

      if (url.startsWith('data:')) {
        // Convert data URL to blob for reliable download on all browsers including mobile Safari
        const parts = url.split(',');
        const header = parts[0];
        const base64 = parts.slice(1).join(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: mime });
      } else if (url.startsWith('blob:')) {
        const res = await fetch(url);
        blob = await res.blob();
      } else {
        // Cross-origin fetch with no-cors fallback
        let res: Response;
        try {
          res = await fetch(url, { mode: 'cors' });
        } catch {
          res = await fetch(url, { mode: 'no-cors' });
        }
        if (!res.ok && res.type !== 'opaque') throw new Error('download_failed');
        blob = await res.blob();
        // If opaque response gives empty blob, fall through to fallback
        if (blob.size === 0) throw new Error('empty_blob');
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      
      // Cleanup after a delay
      window.setTimeout(() => {
        if (anchor.parentNode) document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      toast.success('Download started!');
    } catch (err) {
      console.error('[Download] Blob failed, opening in new tab:', err);
      // Fallback: open in new tab so user can long-press / right-click to save
      window.open(url, '_blank');
      toast.info('Image opened in new tab — long-press or right-click to save.');
    }
  }, []);

  const handleArtifactDownload = useCallback(async (artifact: Artifact) => {
    const baseTitle = artifact.title?.trim() || 'zoe-download';
    const safeTitle = baseTitle.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'zoe-download';
    const extension = artifact.type === 'chronicle' ? 'pdf' : 'png';
    await triggerBrowserDownload(artifact.content, `${safeTitle}.${extension}`);
  }, [triggerBrowserDownload]);

  const handleMediaDownload = useCallback(async (media: { url: string; filename: string; type: 'image' | 'video' }) => {
    await triggerBrowserDownload(media.url, media.filename);
  }, [triggerBrowserDownload]);

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
  useEffect(() => {
    return () => {
      if (emotionInputDebounceRef.current) clearTimeout(emotionInputDebounceRef.current);
    };
  }, []);

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
      className="fixed inset-0 flex flex-col overflow-hidden bg-black"
      onClick={() => isVisualsReady && genesisEffects.initEffects()}
    >
      {/* Loading Progress Indicator - Shows during staged loading or initialization */}
      {(!phases.isFullyLoaded || isInitializing) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs text-white/50">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>{isInitializing ? 'Syncing...' : `Loading ${Math.round(phases.loadProgress)}%`}</span>
        </div>
      )}

      {/* Staged Loading — "Zoe is waking up" indicator for Stage 1 */}
      {loadStage < 2 && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          color: 'rgba(255,255,255,0.7)',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          zIndex: 50,
          backdropFilter: 'blur(8px)',
        }}>
          Zoe is waking up...
        </div>
      )}

      {isVisualsReady && (
        <PhantomModeIndicator isVisible={phantomMode.showIndicator} isPhantomMode={phantomMode.isPhantomMode} />
      )}

      {/* Cinematic Background - Stage 4+ (MUST render BEFORE CircadianBackground so night sky stays on top) */}
      {isHeavyReady && !visualsDisabled && (
        <CinematicBackground imageUrl={artifactGenerator.backgroundImage} isVisible={!!artifactGenerator.backgroundImage} />
      )}

      {/* Circadian Background - render as soon as visuals are ready (renders ABOVE cinematic) */}
      {isVisualsReady && !visualsDisabled && (
        <CircadianBackground
          currentTime={zoeUiTimeFormatter.format(uiNow)}
          emotion={avatarEmotionState}
          kernelHeartRate={('heartRate' in bioKernel && typeof bioKernel.heartRate === 'number') ? bioKernel.heartRate : undefined}
        />
      )}

      {/* Heart Status - ALWAYS visible (day + night), top-center */}
      <ZoeHeartStatus
        className="fixed top-3 left-1/2 z-[45] -translate-x-1/2 pointer-events-none select-none"
        currentTime={zoeUiTimeFormatter.format(uiNow)}
        emotion={avatarEmotionState}
        kernelHeartRate={('heartRate' in bioKernel && typeof bioKernel.heartRate === 'number') ? bioKernel.heartRate : undefined}
      />

      {/* #9 Urgent Call Protocol — fullscreen crisis surface */}
      <UrgentCallProtocol />

      {/* Spec-gap status panel — open with Ctrl+Shift+Z */}
      <ZoeFeatureStatusPanelMount />

      {/* Zoe Decorator — self-contained, voice/chat-triggered */}
      <ZoeDecoratorMount />
      <ZoeHairstyleMount />

      {/* Provider-health degraded-tier banner + background schedulers */}
      <ProviderHealthBanner />
      <BackgroundSchedulers />

      {/* Companion Mode Overlay removed completely (per user request) */}


      {/* Unified Utility Menu - Single hamburger dropdown (top-left) */}
      <ZoeUtilityMenu
        onDownloadPDF={async () => {
          const displayName = nickname || (user?.email ? user.email.split('@')[0] : 'User');

          let success = false;
          if (user?.id) {
            success = await generateConversationPDF(user.id, displayName);
          }

          if (!success) {
            success = generateConversationPDFFromMessages(
              messages.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
              })),
              displayName
            );
          }

          if (!success) {
            const msg: InfinityMessage = {
              id: `dl-${Date.now()}`,
              role: 'assistant',
              content: 'I could not generate the PDF right now. Please try again.',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, msg]);
          }
          // Success: PDF downloads silently via browser, no chat message needed
        }}
        onDownload24hPDF={() => {
          const displayName = nickname || (user?.email ? user.email.split('@')[0] : 'User');
          const success = generateConversationPDFLast24Hours(
            messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              media_url: m.image?.dataUrl ?? m.video?.videoUrl ?? null,
              media_type: m.video ? (m.video.isImageFallback ? 'image' : 'video') : m.image ? 'image' : null,
            })),
            displayName,
          );

          if (!success) {
            setMessages(prev => [...prev, {
              id: `dl-24h-${Date.now()}`,
              role: 'assistant',
              content: 'I could not generate the last 24 hours PDF right now.',
              timestamp: new Date(),
            }]);
          }
          // Success: PDF downloads silently via browser
        }}
        isBrainCached={isBrainCached}
        inferenceDiagnostics={inferenceDiagnostics}
        isProcessing={isProcessing}
        voiceEnabled={voiceEnabled && !visualsDisabled}
        activeEngine={voiceOrchestrator.activeEngine}
        isSpeaking={voiceOrchestrator.isSpeaking}
        isVoiceLoading={voiceOrchestrator.isLoading}
        latencyMs={voiceOrchestrator.latencyMs}
        onTestVoice={() => speakResponse('Voice test running now.')}
        onToggleTZDebug={() => setShowTimezoneDebug(prev => !prev)}
        onTestEmotions={() => setShowEmotionTest(true)}
      />

      {/* VOICE-ONLY INTERFACE: No UI settings - all controlled via voice commands:
           - "call me [name]" - Change nickname
           - "speak Hindi/Tamil/etc" - Change language
           - "download my pattern" - Download offline package
           - "download conversation" - Download full chat history PDF
           - "skip" - Skip introduction
           - "settings" / "what's my language" / "what do you call me" - Voice status
       */}

      {/* Emotion Test Panel - Debug tool */}
      {showEmotionTest && (
        <Suspense fallback={null}>
          <ZoeEmotionTestPanel onClose={() => setShowEmotionTest(false)} />
        </Suspense>
      )}

      {/* Test Emotions button moved to ZoeUtilityMenu */}

      {/* The Avatar Viewer - Full-screen overlay with transparent chat */}
      <ZoeAvatarViewer
        isVisible={avatarTrigger.isAvatarVisible}
        isCompact={avatarTrigger.isAvatarCompact}
        onDismiss={avatarTrigger.dismissAvatar}
        onToggleCompact={() => avatarTrigger.setIsAvatarCompact(!avatarTrigger.isAvatarCompact)}
        variant={avatarTrigger.avatarVariant}
        emotionState={avatarEmotionState}
        isSpeaking={isSpeaking || voiceOrchestrator.isSpeaking}
        regionalFilter={regionalDress.overlayFilter}
        regionalAvatarImage=""
      />

      {/* Mood-responsive ambient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          background: moodUI.ambientGradient,
          opacity: moodUI.ambientOpacity,
          transition: `all ${moodUI.transitionDuration} ease-in-out`,
        }}
      />

      {/* Regional dress indicator - hidden (functionality preserved) */}

      {/* The Stream - Always rendered, transparent over avatar when visible */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden transition-opacity duration-300"
        style={{
          zIndex: avatarTrigger.isAvatarVisible ? 30 : 1,
          opacity: avatarTrigger.isAvatarVisible && !avatarTrigger.isAvatarCompact ? 0.85 : 1,
        }}
      >
        <InfinityStream
          messages={displayMessages}
          isTyping={isProcessing || isInitializing}
          onArtifactDownload={handleArtifactDownload}
          onArtifactExpand={handleArtifactExpand}
          onMediaDownload={handleMediaDownload}
          onRepeatMessage={(msg) => {
            if (voiceEnabled) {
              speakResponse(msg.content);
            }
          }}
        />
      </div>

      {/* The Input - Fixed glassmorphism bar at bottom (self-positioning) */}
      <InfinityInputPhantom
        onSend={handleSend}
        mood={mood}
        disabled={isProcessing}
        voiceEnabled={voiceEnabled}
        wakeWordActive={wakeWordActive}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        onVoiceStop={() => setIsManualVoiceInput(false)}
        onInputChange={handleInputChange}
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
        handsFreeMode={handsFreeMode}
        onHandsFreeToggle={setHandsFreeMode}
      />

      {/* Hands-free debug + status panel (bottom-left, collapsible) */}
      <ZoeHandsFreeDebugPanel
        handsFreeMode={handsFreeMode}
        wakeWordActive={wakeWordActive}
        isListening={isManualVoiceInput}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        isWakeListening={isWakeListening}
      />

      {/* Inference Diagnostics & Voice Signal moved to ZoeUtilityMenu */}


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

      {/* God Mode - Camera Vision + AI Analysis */}
      <GodModeVision
        isActive={showGodMode}
        preferredStream={preferredVisionStream}
        initialContext={godModeInitialContext}
        onCameraReadyChange={setIsGodModeCameraReady}
        psychologistMode={isPsychologistMode}
        onFaceEmotionDetected={(result) => {
          setLastFaceEmotion(result);
          // Inject emotion context into brain for next response
          if (isPsychologistMode && result.intensity > 30) {
            const emotionContext = `[PSYCHOLOGIST OBSERVATION] User's face shows ${result.emotion} (intensity: ${result.intensity}%). Facial patterns: ${result.patterns.join(', ')}. ${result.context}. Respond as a compassionate psychologist — validate their emotion, offer a grounding technique if stressed/sad, celebrate if happy.`;
            const emotionMsg: InfinityMessage = {
              id: `psych-${Date.now()}`,
              role: 'assistant',
              content: `I can see it in your eyes... you look ${result.emotion.toLowerCase()}. ${result.intensity > 60 ? "I'm here with you." : "Tell me what's on your mind."} 🌙`,
              timestamp: new Date(),
              metadata: { mode: 'system2' as const },
            };
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.id?.startsWith('psych-') && last.content === emotionMsg.content) return prev;
              return [...prev, emotionMsg];
            });
            void speakQueued(emotionMsg.content);
          }
        }}
        onClose={() => {
          setShowGodMode(false);
          setGodModeInitialContext(null);
          setIsGodModeCameraReady(false);
          setIsPsychologistMode(false);
          setLastFaceEmotion(null);
        }}
        onZoeVisionResponse={(analysis) => {
          setGodModeInitialContext(null);
          const visionMsg: InfinityMessage = {
            id: `vision-${Date.now()}`,
            role: 'assistant',
            content: analysis,
            timestamp: new Date(),
            metadata: { mode: 'system2' as const },
          };
          setMessages(prev => [...prev, visionMsg]);
          speakResponse(analysis.length > 200 ? analysis.substring(0, 200) : analysis);
        }}
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

      {/* DEV ONLY: Timezone Debug Panel (toggle via utility menu) */}
      {import.meta.env.DEV && (
        <TimezoneDebugPanel 
          isOpen={showTimezoneDebug} 
          onClose={() => setShowTimezoneDebug(false)} 
        />
      )}

      {/* BrainLoader moved to top-left button group */}

      {/* Unified Permission Activation — mic, camera, location, notifications in one click */}
      <PermissionActivationModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onComplete={() => setShowPermissionModal(false)}
      />

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPED EXPORT - Includes TimeSimulationProvider in DEV mode only
// ═══════════════════════════════════════════════════════════════════════════════

function ZoeFeatureStatusPanelMount() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <ZoeFeatureStatusPanel open={open} onClose={() => setOpen(false)} />;
}

function BackgroundSchedulers() {
  useProviderHealthScheduler({ ping: true });
  useDeepRootScanScheduler();
  return null;
}


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
