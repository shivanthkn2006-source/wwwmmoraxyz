// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL ZOE ASSISTANT - 360-Degree Conversational Foundation
// Integrates Wake Word, DHF Stream, Orb Visualization, and Voice Commands
// Part-by-Part Design: Components can be disabled without breaking data pipeline
// NOW WITH: Full conversation panel accessible from any page via orb tap
// GENESIS MANIFESTO: Identity Calibration, PCE, and Flaw Injection integrated
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useZoeSovereignVoice } from '@/hooks/useZoeSovereignVoice';
import { useZoeSovereignCommand } from '@/hooks/useZoeSovereignCommand';
import { useEnhancedWakeWord } from '@/hooks/useEnhancedWakeWord';
import { useContinuousDHFStream, ECNEmotionState } from '@/hooks/useContinuousDHFStream';
import { useProactiveGreeting } from '@/hooks/useProactiveGreeting';
import { useZoeGenesisManifesto } from '@/hooks/useZoeGenesisManifesto';
import { useAlwaysOnVoice } from '@/hooks/useAlwaysOnVoice';
import { useZoeSovereignBonding } from '@/hooks/useZoeSovereignBonding';
import { useCDSPAgent } from '@/hooks/useCDSPAgent';
import { useCDSPPaymentRails } from '@/hooks/useCDSPPaymentRails';
import { useSkillUpload } from '@/hooks/useSkillUpload';
import { useZoeMediaAccess } from '@/hooks/useZoeMediaAccess';
import { useAuth } from '@/lib/auth';
import zoeAvatar from '@/assets/zoe-avatar.png';
import { toast } from 'sonner';
import { usePhantomVisible } from '@/stores/usePhantomStore'; // PROTOCOL PHANTOM
import { VR_SPEAKING_EVENT, VR_SPEAKING_END_EVENT, VRSpeakerInfo } from '@/hooks/useVRSpeakingToOrb';

// Lazy load heavy Three.js components to reduce initial bundle
const HolographicATLASOrb = lazy(() => 
  import('@/components/HolographicATLASOrb').then(m => ({ default: m.HolographicATLASOrb }))
);
const ZoeOrbConversationPanel = lazy(() => 
  import('@/components/ZoeOrbConversationPanel').then(m => ({ default: m.ZoeOrbConversationPanel }))
);
const ZoeIdentityCalibration = lazy(() => 
  import('@/components/ZoeIdentityCalibration').then(m => ({ default: m.ZoeIdentityCalibration }))
);
const ZoeFeatureDiscovery = lazy(() => 
  import('@/components/ZoeFeatureDiscovery').then(m => ({ default: m.ZoeFeatureDiscovery }))
);
const ZoeSessionCoach = lazy(() => 
  import('@/components/ZoeSessionCoach').then(m => ({ default: m.ZoeSessionCoach }))
);

// Configuration flags for part-by-part integration
interface ZoeConfig {
  enableWakeWord: boolean;
  enableOrb: boolean;
  enableVoice: boolean;
  enableDHFStream: boolean;
  wakeWordPhrase: string[];
}

const DEFAULT_CONFIG: ZoeConfig = {
  // IMPORTANT: do not auto-start wake word / mic on initial load.
  // User can enable voice from the orb or VoiceSystemActivator.
  enableWakeWord: false,
  enableOrb: true,
  enableVoice: true,
  enableDHFStream: true,
  wakeWordPhrase: ['hey zoe', 'ok zoe', 'hi zoe', 'zoe'],
};

export const GlobalZoeAssistant = ({ config = DEFAULT_CONFIG }: { config?: Partial<ZoeConfig> }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Merge config with defaults
  const activeConfig = { ...DEFAULT_CONFIG, ...config };
  
  // State
  // Wake word should ONLY be enabled after voice system activation in this session.
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    const wasActivated = sessionStorage.getItem('zoe-voice-system-activated');
    return wasActivated === 'true';
  });
  const [wakeWordPaused, setWakeWordPaused] = useState(false); // Pause during voice input in panel
  const [currentEmotion, setCurrentEmotion] = useState<ECNEmotionState>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showOrb, setShowOrb] = useState(activeConfig.enableOrb);
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  // Feature Discovery & Session Coach state
  const [showFeatureDiscovery, setShowFeatureDiscovery] = useState(false);
  const [showSessionCoach, setShowSessionCoach] = useState(false);
  const [sessionCoachType, setSessionCoachType] = useState<'morning_briefing' | 'day_planning' | 'evolution_reflection' | 'goal_check' | 'evening_review' | 'quick_chat' | null>(null);
  const [discoveryProfession, setDiscoveryProfession] = useState<string | null>(null);
  
  // ═══ PROTOCOL PHANTOM: Ghost Mode Toggle ═══
  const isPhantomVisible = usePhantomVisible();
  
  // ═══ ZOE UNIFIED MEDIA ACCESS ═══
  // Pre-warmed audio/mic/camera for instant voice responses
  const zoeMedia = useZoeMediaAccess({ showToasts: false });


  // Listen for voice input start/end to pause wake word detection
  useEffect(() => {
    const handleVoiceInputStart = () => {
      console.log('[GlobalZoe] Pausing wake word for voice input');
      setWakeWordPaused(true);
    };
    
    const handleVoiceInputEnd = () => {
      console.log('[GlobalZoe] Resuming wake word after voice input');
      // Small delay before resuming to avoid immediate re-trigger
      setTimeout(() => setWakeWordPaused(false), 500);
    };
    
    const handleHandsFreeStart = () => {
      console.log('[GlobalZoe] Pausing wake word for hands-free mode');
      setWakeWordPaused(true);
    };
    
    const handleHandsFreeEnd = () => {
      console.log('[GlobalZoe] Resuming wake word after hands-free mode');
      setTimeout(() => setWakeWordPaused(false), 500);
    };
    
    // Listen for voice system activation (from VoiceSystemActivator)
    const handleVoiceSystemActivated = async () => {
      console.log('[GlobalZoe] Voice system activated - enabling wake word');
      setWakeWordEnabled(true);
      setWakeWordPaused(false);
      
      // Activate Zoe media access for instant voice responses
      if (!zoeMedia.isActivated) {
        await zoeMedia.activate({ microphone: true, camera: false });
      }
    };
    
    window.addEventListener('zoe-voice-input-start', handleVoiceInputStart);
    window.addEventListener('zoe-voice-input-end', handleVoiceInputEnd);
    window.addEventListener('zoe-handsfree-start', handleHandsFreeStart);
    window.addEventListener('zoe-handsfree-end', handleHandsFreeEnd);
    window.addEventListener('zoe-voice-system-activated', handleVoiceSystemActivated);
    
    return () => {
      window.removeEventListener('zoe-voice-input-start', handleVoiceInputStart);
      window.removeEventListener('zoe-voice-input-end', handleVoiceInputEnd);
      window.removeEventListener('zoe-handsfree-start', handleHandsFreeStart);
      window.removeEventListener('zoe-handsfree-end', handleHandsFreeEnd);
      window.removeEventListener('zoe-voice-system-activated', handleVoiceSystemActivated);
    };
  }, []);
  
  // Voice system
  const { 
    isActive: isVoiceActive, 
    isListening,
    isProcessing,
    startListening, 
    stopListening,
    WAKE_WORDS,
  } = useZoeSovereignVoice(user?.id);
  
  // SOVEREIGN COMMAND HANDLER - Single entry point for all commands
  const {
    handleZoeSovereignCommand,
    isProcessing: isSovereignProcessing,
    loadZoeState,
    speakResponse,
  } = useZoeSovereignCommand();
  
  // Continuous DHF/ECN data stream (always active for data collection)
  const {
    isStreaming,
    streamHealth,
    trackVoiceCommand,
    trackZoeInteraction,
    trackECNState,
    eventCount,
  } = useContinuousDHFStream({
    enableECNProcessing: true,
    model: 'gemini-2.5-flash-lite', // Cost-effective for continuous processing
  });
  
  // Genesis Manifesto integration (Identity Calibration, PCE, Flaw Injection)
  const {
    genesisState,
    showCalibration,
    setShowCalibration,
    completeIdentityCalibration,
    pce,
    getFlawInjection,
    trackVetoLatency,
    updateEmotionalState,
  } = useZoeGenesisManifesto();

  // Always-on voice - natural conversation without buttons
  const alwaysOnVoice = useAlwaysOnVoice();
  
  // SOVEREIGN BONDING SYSTEM - Deep integration for Zoe-User connection
  const sovereignBonding = useZoeSovereignBonding();
  
  // ═══ CODE GENESIS MANIFESTO INTEGRATION ═══
  // CDSP Agent - Continuous Deep Scan Protocol for emotional/tonal analysis
  const cdspAgent = useCDSPAgent();
  
  // CDSP Payment Rails - Commerce integration for feature payments
  const cdspPaymentRails = useCDSPPaymentRails();
  
  // Skill Upload System - Uploaded Intelligence foundation
  const skillUpload = useSkillUpload();
  
  // Load skills on mount
  useEffect(() => {
    if (user?.id) {
      skillUpload.loadSkills();
    }
  }, [user?.id]);
  
  // Start CDSP continuous scanning when user is active
  useEffect(() => {
    if (user?.id && streamHealth === 'healthy') {
      cdspAgent.startContinuousScan();
    }
    return () => {
      cdspAgent.stopContinuousScan();
    };
  }, [user?.id, streamHealth]);
  
  // Feed conversation data to CDSP for analysis
  useEffect(() => {
    const handleConversationForCDSP = (event: CustomEvent) => {
      const text = event.detail?.text;
      if (text && typeof text === 'string') {
        cdspAgent.addToBuffer(text);
      }
    };
    
    window.addEventListener('zoe-user-message', handleConversationForCDSP as EventListener);
    return () => window.removeEventListener('zoe-user-message', handleConversationForCDSP as EventListener);
  }, [cdspAgent.addToBuffer]);
  
  // DON'T auto-enable - let user activate via voice command or orb interaction

  // ═══ ECN 27 EMOTION STATE CONNECTION ═══
  // Map DHF stream emotion to orb visualization
  useEffect(() => {
    if (streamHealth === 'healthy' && eventCount > 0) {
      // Map genesis emotional state to valid ECN emotion states for orb
      const emotionMap: Record<string, ECNEmotionState> = {
        'joy': 'joy',
        'excitement': 'excitement',
        'curiosity': 'curiosity',
        'calm': 'relief', // Map calm to relief
        'focused': 'realization', // Map focused to realization
        'neutral': 'neutral',
        'tired': 'disappointment', // Map tired to disappointment
        'stressed': 'anxiety', // Map stressed to anxiety
        'anxious': 'anxiety',
        'frustrated': 'frustration',
        'sad': 'sadness',
        'confused': 'confusion',
        'happy': 'joy',
        'angry': 'anger',
        'fear': 'fear',
        'love': 'love',
        'surprise': 'surprise',
      };
      
      const mappedEmotion = emotionMap[genesisState.currentEmotionalState.primaryEmotion] || 'neutral';
      setCurrentEmotion(mappedEmotion);
    }
  }, [genesisState.currentEmotionalState, streamHealth, eventCount]);
  
  // Proactive greeting
  const { greetingMessage, hasGreeted } = useProactiveGreeting();
  
  // Track if wake word was already handled to prevent spam
  const wakeWordHandledRef = useRef(false);
  const wakeWordCooldownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load Zoe state on mount
  useEffect(() => {
    if (user?.id) {
      loadZoeState();
    }
  }, [user?.id, loadZoeState]);
  
  // FULLY AUTOMATED: Enhanced wake word detection that processes "Zoe <command>" in one phrase
  const { 
    isListening: wakeWordListening,
    lastDetection,
  } = useEnhancedWakeWord({
    wakeWords: activeConfig.wakeWordPhrase,
    sensitivity: 0.65, // Slightly more sensitive for natural speech
    continuous: true,
    enabled: wakeWordEnabled && activeConfig.enableWakeWord && !wakeWordPaused, // Pause when voice input active
    onWakeWordDetected: async (result) => {
      // Prevent handling if already handled recently (cooldown)
      if (wakeWordHandledRef.current) {
        return;
      }
      
      console.log('[GlobalZoe] Wake word detected:', result.wakeWord, '| Command:', result.command);
      
      // Set cooldown to prevent rapid repeated triggers (1 second for fluid conversation)
      wakeWordHandledRef.current = true;
      if (wakeWordCooldownRef.current) {
        clearTimeout(wakeWordCooldownRef.current);
      }
      wakeWordCooldownRef.current = setTimeout(() => {
        wakeWordHandledRef.current = false;
      }, 1000); // 1 second cooldown for fluid conversation
      
      // Track wake word in DHF stream
      if (activeConfig.enableDHFStream) {
        trackZoeInteraction('wake_word', result.wakeWord, undefined, 'curiosity');
        
        if (result.voiceMetrics) {
          trackVoiceCommand(result.wakeWord, result.voiceMetrics, 'curiosity');
        }
      }
      
      // HANDLE "ZOE TALK" or "ZOE CHAT" COMMAND - Opens chat panel for typing
      const lowerWakeWord = result.wakeWord.toLowerCase();
      if (lowerWakeWord === 'zoe talk' || lowerWakeWord === 'zoe chat') {
        console.log('[GlobalZoe] Opening chat panel for typing');
        setShowConversationPanel(true);
        toast.success('Chat panel opened', { description: 'You can type your message now', duration: 2000 });
        await speakResponse('Chat panel is open. You can type your message now.', 'calm');
        return;
      }
      
      // HANDLE "ZOE CLOSE" or "CLOSE ZOE" COMMAND - Closes/minimizes chat panel
      if (lowerWakeWord === 'zoe close' || lowerWakeWord === 'close zoe') {
        console.log('[GlobalZoe] Closing chat panel');
        setShowConversationPanel(false);
        alwaysOnVoice.disable(); // Also stop voice if needed
        toast.success('Chat panel closed', { duration: 1500 });
        await speakResponse('Goodbye for now. Call me anytime.', 'calm');
        return;
      }
      
      // HANDLE "HANDS FREE" or "ZOE LISTEN" COMMAND - Enable always-on voice
      if (lowerWakeWord.includes('hands free') || lowerWakeWord.includes('handsfree') || 
          lowerWakeWord === 'zoe listen' || lowerWakeWord === 'listen zoe' ||
          lowerWakeWord === 'zoe conversation' || lowerWakeWord === 'lets talk zoe') {
        console.log('[GlobalZoe] Enabling always-on voice');
        alwaysOnVoice.enable();
        return;
      }
      
      // HANDLE "STOP LISTENING" or "ZOE STOP" COMMAND - Disable voice
      if (lowerWakeWord === 'stop listening' || lowerWakeWord === 'zoe stop' || 
          lowerWakeWord === 'stop zoe' || lowerWakeWord === 'end conversation') {
        console.log('[GlobalZoe] Disabling voice');
        alwaysOnVoice.disable();
        return;
      }
      
      // HANDLE "READ MY MESSAGES" or "ZOE READ MESSAGES" COMMAND - Enable hands-free message reader
      if (lowerWakeWord.includes('read my messages') || lowerWakeWord.includes('read messages') ||
          lowerWakeWord.includes('read my dms') || lowerWakeWord.includes('read dms') ||
          lowerWakeWord.includes('message reader') || lowerWakeWord.includes('read aloud')) {
        console.log('[GlobalZoe] Enabling hands-free message reader via voice command');
        window.dispatchEvent(new CustomEvent('zoe-enable-message-reader'));
        await speakResponse('Message reader enabled. I will read new messages aloud for you.', 'calm');
        return;
      }
      
      // HANDLE "STOP READING MESSAGES" COMMAND
      if (lowerWakeWord.includes('stop reading') || lowerWakeWord.includes('mute messages') ||
          lowerWakeWord.includes('disable reader')) {
        console.log('[GlobalZoe] Disabling hands-free message reader via voice command');
        window.dispatchEvent(new CustomEvent('zoe-disable-message-reader'));
        await speakResponse('Message reader disabled.', 'calm');
        return;
      }
      
      // HANDLE FEATURE DISCOVERY COMMANDS
      if (lowerWakeWord.includes('what can you do') || lowerWakeWord.includes('features') ||
          lowerWakeWord.includes('discover') || lowerWakeWord.includes('personalize')) {
        console.log('[GlobalZoe] Opening feature discovery');
        setShowFeatureDiscovery(true);
        await speakResponse('Let me show you features based on your interests. What do you do?', 'calm');
        return;
      }
      
      // HANDLE PROFESSION DECLARATIONS
      const professionMatch = lowerWakeWord.match(/i('m| am) a (.+)/i) || lowerWakeWord.match(/i work as a (.+)/i);
      if (professionMatch) {
        const profession = professionMatch[2]?.trim() || professionMatch[1]?.trim();
        console.log('[GlobalZoe] Profession detected:', profession);
        setDiscoveryProfession(profession);
        setShowFeatureDiscovery(true);
        return;
      }
      
      // HANDLE SESSION COMMANDS
      if (lowerWakeWord.includes('plan my day') || lowerWakeWord.includes('day planning')) {
        setSessionCoachType('day_planning');
        setShowSessionCoach(true);
        await speakResponse('Let\'s plan your day together!', 'calm');
        return;
      }
      
      if (lowerWakeWord.includes('morning briefing') || lowerWakeWord.includes('good morning')) {
        setSessionCoachType('morning_briefing');
        setShowSessionCoach(true);
        await speakResponse('Good morning! Let\'s start your day right.', 'calm');
        return;
      }
      
      if (lowerWakeWord.includes('evolve') || lowerWakeWord.includes('reflect') || lowerWakeWord.includes('evolution')) {
        setSessionCoachType('evolution_reflection');
        setShowSessionCoach(true);
        await speakResponse('Let\'s reflect and evolve together!', 'calm');
        return;
      }
      
      if (lowerWakeWord.includes('evening') || lowerWakeWord.includes('wrap up') || lowerWakeWord.includes('end of day')) {
        setSessionCoachType('evening_review');
        setShowSessionCoach(true);
        await speakResponse('Let\'s wrap up your day.', 'calm');
        return;
      }
      
      if (lowerWakeWord.includes('goal') || lowerWakeWord.includes('progress')) {
        setSessionCoachType('goal_check');
        setShowSessionCoach(true);
        await speakResponse('Let\'s check on your goals!', 'calm');
        return;
      }
      
      // HANDLE RE-SLEEVE / CAREER COMMANDS - Navigate to career features
      if (lowerWakeWord.includes('career') || lowerWakeWord.includes('resleeve') || 
          lowerWakeWord.includes('re-sleeve') || lowerWakeWord.includes('my career') ||
          lowerWakeWord.includes('career path') || lowerWakeWord.includes('transform me') ||
          lowerWakeWord.includes('what should i do') || lowerWakeWord.includes('find my talent')) {
        console.log('[GlobalZoe] Opening Re-Sleeve for career guidance');
        navigate('/resleeve');
        await speakResponse('Opening Re-Sleeve, your career transformation engine. I can scan your soul to discover your hidden talents, or you can explore Career Divinity for divine career guidance.', 'calm');
        return;
      }
      
      // HANDLE CAREER DIVINITY / ASTROLOGY COMMANDS
      if (lowerWakeWord.includes('divinity') || lowerWakeWord.includes('divine career') ||
          lowerWakeWord.includes('astrology') || lowerWakeWord.includes('nakshatra') ||
          lowerWakeWord.includes('lagna') || lowerWakeWord.includes('vedic') ||
          lowerWakeWord.includes('birth chart') || lowerWakeWord.includes('horoscope')) {
        console.log('[GlobalZoe] Opening Career Divinity engine');
        navigate('/career-divinity');
        await speakResponse('Opening the Agasthya Divine Career Engine. Enter your birth details for vedic career guidance based on your nakshatra and lagna.', 'calm');
        return;
      }
      
      // HANDLE SOUL SCAN COMMANDS
      if (lowerWakeWord.includes('soul scan') || lowerWakeWord.includes('scan my soul') ||
          lowerWakeWord.includes('talent scan') || lowerWakeWord.includes('dormant talent')) {
        console.log('[GlobalZoe] Opening Soul Scanner');
        navigate('/resleeve');
        await speakResponse('Opening the Soul Scanner. I will analyze your behavioral patterns to detect your dormant talents.', 'calm');
        return;
      }
      
      // FULLY AUTOMATED: If command was included with wake word, process it immediately
      if (result.command && result.command.trim().length > 0) {
        console.log('[GlobalZoe] SOVEREIGN COMMAND: Processing:', result.command);
        
        // Show brief feedback
        toast.success('Zoe heard you', {
          description: result.command,
          duration: 2000,
        });
        
        // Use SOVEREIGN COMMAND HANDLER - Single entry point
        const response = await handleZoeSovereignCommand(result.command);
        
        // Track bonding event for voice interaction
        if (response) {
          sovereignBonding.processVoiceInteraction(result.command, response.response || '');
        }
        
        // Track in DHF
        if (activeConfig.enableDHFStream) {
          trackZoeInteraction('command', result.command, undefined, 'curiosity');
        }
      } else {
        // Just wake word without command - acknowledge and wait
        console.log('[GlobalZoe] Wake word only, acknowledging');
        await speakResponse('Yes?', 'calm');
        setIsSpeaking(true);
      }
    },
    onVoiceMetrics: (metrics) => {
      // Track voice metrics for DHF enrichment
      if (activeConfig.enableDHFStream && metrics) {
        trackVoiceCommand('voice_metrics', metrics, 'neutral');
      }
    },
  });
  
  // Safe area constants to avoid overlapping with navigation and UI elements
  const BOTTOM_NAV_HEIGHT = 80; // BottomNavigation height
  const TOP_SAFE_MARGIN = 100; // Safe margin from top (header area)
  const SAFE_MARGIN = 20; // Minimum margin from edges
  const ORB_SIZE = 100; // Orb size used for constraints

  const getBounds = useCallback(() => {
    const minX = SAFE_MARGIN;
    const maxX = Math.max(SAFE_MARGIN, window.innerWidth - ORB_SIZE - SAFE_MARGIN);
    const minY = TOP_SAFE_MARGIN;
    const maxY = Math.max(
      TOP_SAFE_MARGIN,
      window.innerHeight - ORB_SIZE - (BOTTOM_NAV_HEIGHT + SAFE_MARGIN)
    );

    return { minX, maxX, minY, maxY };
  }, []);

  const clampToBounds = useCallback((x: number, y: number) => {
    const { minX, maxX, minY, maxY } = getBounds();
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, [getBounds]);

  // Create a real top-level overlay so nothing in the app can cover Zoe
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = 'zoe-orb-portal';
    let el = document.getElementById(id) as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.zIndex = '2147483647';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
    }
    setPortalEl(el);

    return () => {
      // Intentionally do not remove to avoid flicker on route transitions.
    };
  }, []);

  // Motion values are smoother than state for continuous movement.
  const defaultPos = useRef<{ x: number; y: number } | null>(null);
  if (!defaultPos.current && typeof window !== 'undefined') {
    const { maxX, maxY } = getBounds();
    defaultPos.current = { x: maxX, y: maxY };
  }

  const x = useMotionValue(defaultPos.current?.x ?? 0);
  const y = useMotionValue(defaultPos.current?.y ?? 0);
  const [position, setPosition] = useState(() => ({
    x: defaultPos.current?.x ?? 0,
    y: defaultPos.current?.y ?? 0,
  }));
  const [isDragging, setIsDragging] = useState(false);
  
  // VR Speaking state - pause drift when someone in VR is speaking to Zoe
  const [vrSpeaker, setVrSpeaker] = useState<VRSpeakerInfo | null>(null);
  const isVRSpeaking = vrSpeaker !== null && vrSpeaker.isSpeaking;

  // Keep a slow "ping-pong" drift inside bounds
  const velocityRef = useRef({ vx: 24, vy: 18 }); // px/s

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;

      // Pause drift when dragging OR when VR entity is speaking
      if (!isDragging && !isVRSpeaking) {
        const { minX, maxX, minY, maxY } = getBounds();
        let nx = x.get() + velocityRef.current.vx * dt;
        let ny = y.get() + velocityRef.current.vy * dt;

        if (nx <= minX || nx >= maxX) {
          velocityRef.current.vx *= -1;
          nx = Math.max(minX, Math.min(maxX, nx));
        }
        if (ny <= minY || ny >= maxY) {
          velocityRef.current.vy *= -1;
          ny = Math.max(minY, Math.min(maxY, ny));
        }

        x.set(nx);
        y.set(ny);
        setPosition({ x: nx, y: ny });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getBounds, isDragging, isVRSpeaking, x, y]);

  // Listen for VR speaking events - position orb when avatars/animals talk
  useEffect(() => {
    const handleVRSpeaking = (event: CustomEvent<VRSpeakerInfo>) => {
      const speaker = event.detail;
      setVrSpeaker(speaker);
      
      // Animate orb to center-ish position (conversational distance)
      const centerX = (window.innerWidth - ORB_SIZE) / 2;
      const centerY = (window.innerHeight - ORB_SIZE) / 2 - 50; // Slightly above center
      
      animate(x, centerX, { type: 'spring', stiffness: 200, damping: 25 });
      animate(y, centerY, { type: 'spring', stiffness: 200, damping: 25 });
      setPosition({ x: centerX, y: centerY });
      
      // Show who's talking
      toast.info(`${speaker.speakerName} is talking to Zoe`, { 
        description: `${speaker.speakerType} conversation`,
        duration: 2000 
      });
      
      console.log('[GlobalZoe] VR entity speaking:', speaker.speakerName);
    };

    const handleVRSpeakingEnd = () => {
      setVrSpeaker(null);
      console.log('[GlobalZoe] VR entity stopped speaking');
    };

    window.addEventListener(VR_SPEAKING_EVENT, handleVRSpeaking as EventListener);
    window.addEventListener(VR_SPEAKING_END_EVENT, handleVRSpeakingEnd as EventListener);

    return () => {
      window.removeEventListener(VR_SPEAKING_EVENT, handleVRSpeaking as EventListener);
      window.removeEventListener(VR_SPEAKING_END_EVENT, handleVRSpeakingEnd as EventListener);
    };
  }, [x, y]);

  // Handle window resize - ensure orb stays on-screen
  useEffect(() => {
    const handleResize = () => {
      const next = clampToBounds(x.get(), y.get());
      x.set(next.x);
      y.set(next.y);
      setPosition(next);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampToBounds, x, y]);

  // Handle drag end - clamp + persist
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const next = clampToBounds(x.get(), y.get());
    x.set(next.x);
    y.set(next.y);
    setPosition(next);
  }, [clampToBounds, x, y]);

  // Listen for Zoe speaking events + Poll speech state for reliability
  useEffect(() => {
    const handleZoeSpeak = (event: CustomEvent) => {
      setIsSpeaking(true);
      console.log('[GlobalZoe] Speech started');
      
      // Track in DHF stream
      if (activeConfig.enableDHFStream) {
        trackZoeInteraction('response', event.detail?.text || 'Speaking', undefined, 'neutral');
      }
    };
    
    const handleZoeSpeakEnd = () => {
      setIsSpeaking(false);
      console.log('[GlobalZoe] Speech ended');
    };
    
    window.addEventListener('zoe-speak', handleZoeSpeak as EventListener);
    window.addEventListener('zoe-speak-end', handleZoeSpeakEnd);
    
    // Poll speech synthesis state for reliability (browser sometimes misses events)
    const pollInterval = setInterval(() => {
      if ('speechSynthesis' in window) {
        const actuallySpeaking = window.speechSynthesis.speaking;
        if (!actuallySpeaking && isSpeaking) {
          // Speaking flag is true but synthesis is not speaking - sync it
          setTimeout(() => {
            if (!window.speechSynthesis.speaking) {
              setIsSpeaking(false);
            }
          }, 200);
        }
      }
    }, 500);
    
    return () => {
      window.removeEventListener('zoe-speak', handleZoeSpeak as EventListener);
      window.removeEventListener('zoe-speak-end', handleZoeSpeakEnd);
      clearInterval(pollInterval);
    };
  }, [activeConfig.enableDHFStream, trackZoeInteraction, isSpeaking]);

  // Listen for briefing trigger events
  useEffect(() => {
    const handleBriefingTrigger = async () => {
      console.log('[GlobalZoe] Briefing triggered');
      try {
        const { speakAsZoe } = await import('@/utils/zoeVoice');
        const { getUserLocation, getWeatherInfo } = await import('@/utils/weatherHelpers');
        const { getTrafficInfo } = await import('@/utils/trafficHelpers');
        
        let briefing = '';
        
        // Get user profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        briefing += `${greeting} ${profile?.display_name || 'there'}! `;
        
        // Get weather
        try {
          const position = await getUserLocation();
          const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
          if (weather) {
            briefing += `It's ${weather.temperature} degrees with ${weather.condition} in ${weather.location}. `;
          }
          
          // Get traffic
          const traffic = await getTrafficInfo(position.coords.latitude, position.coords.longitude);
          if (traffic) {
            briefing += `Traffic update: ${traffic.summary}. `;
          }
        } catch (err) {
          console.log('[GlobalZoe] Location not available for briefing');
        }
        
        // Get notifications count
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('read', false);
        
        if (notifCount && notifCount > 0) {
          briefing += `You have ${notifCount} unread notification${notifCount !== 1 ? 's' : ''}. `;
        }
        
        // Get unread messages
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user?.id)
          .eq('read', false);
        
        if (msgCount && msgCount > 0) {
          briefing += `You have ${msgCount} unread message${msgCount !== 1 ? 's' : ''}. `;
        }
        
        briefing += 'What would you like to do?';
        
        speakAsZoe(briefing);
        setIsSpeaking(true);
      } catch (err) {
        console.error('[GlobalZoe] Briefing error:', err);
      }
    };
    
    window.addEventListener('zoe-trigger-briefing', handleBriefingTrigger);
    return () => window.removeEventListener('zoe-trigger-briefing', handleBriefingTrigger);
  }, [user?.id]);

  // Track if we've already initialized to prevent loops
  const hasInitializedRef = useRef(false);
  const sessionKeyRef = useRef<string | null>(null);
  const [orbActivationEmotion, setOrbActivationEmotion] = useState<ECNEmotionState | null>(null);

  useEffect(() => {
    const openWithContext = () => setShowConversationPanel(true);
    window.addEventListener('mmora:zoe-open-with-context', openWithContext);
    return () => window.removeEventListener('mmora:zoe-open-with-context', openWithContext);
  }, []);
  
  // Listen for Entity Activation Protocol orb activation event
  useEffect(() => {
    const handleOrbActivate = (event: CustomEvent) => {
      console.log('[GlobalZoe] EAP Orb activation received:', event.detail);
      
      // Set emotion for orb animation
      if (event.detail?.emotion) {
        setOrbActivationEmotion(event.detail.emotion);
        setCurrentEmotion(event.detail.emotion);
        
        // Reset to neutral after animation completes
        setTimeout(() => {
          setOrbActivationEmotion(null);
        }, 3000);
      }
      
      // Mark speaking state during EAP voice
      setIsSpeaking(true);
      
      // Track in DHF as a response type
      if (activeConfig.enableDHFStream) {
        trackZoeInteraction('response', 'Entity activated - System ready', undefined, 'joy');
      }
    };
    
    window.addEventListener('zoe-orb-activate', handleOrbActivate as EventListener);
    return () => {
      window.removeEventListener('zoe-orb-activate', handleOrbActivate as EventListener);
    };
  }, [activeConfig.enableDHFStream, trackZoeInteraction]);
  
  // Auto-initialize on page load (wake word only, greeting handled by EAP)
  useEffect(() => {
    // Only run once per browser session
    if (hasInitializedRef.current) return;
    if (!user || location.pathname === '/auth') return;
    
    // Check if already initialized in this browser session
    const hasInitializedThisSession = sessionStorage.getItem('zoe-global-init');
    if (hasInitializedThisSession) {
      hasInitializedRef.current = true;
      setWakeWordEnabled(activeConfig.enableWakeWord);
      return;
    }
    
    hasInitializedRef.current = true;
    sessionStorage.setItem('zoe-global-init', 'true');
    
    // Enable wake word detection by default (greeting now handled by EAP)
    setWakeWordEnabled(activeConfig.enableWakeWord);
    
    console.log('[GlobalZoe] Initialized wake word detection, EAP handles greeting');
  }, [user, location.pathname, activeConfig.enableWakeWord]); // Minimal dependencies


  // Toggle voice commands
  const handleToggleVoice = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (isVoiceActive) {
      stopListening();
      setWakeWordEnabled(activeConfig.enableWakeWord); // Re-enable wake word
      
      // Track in DHF
      if (activeConfig.enableDHFStream) {
        trackZoeInteraction('command', 'Voice deactivated', undefined, 'neutral');
      }
    } else {
      startListening();
      setWakeWordEnabled(false); // Disable wake word while actively listening
      
      // Track in DHF
      if (activeConfig.enableDHFStream) {
        trackZoeInteraction('command', 'Voice activated', undefined, 'excitement');
      }
    }
  }, [isVoiceActive, stopListening, startListening, activeConfig, trackZoeInteraction]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (wakeWordCooldownRef.current) {
        clearTimeout(wakeWordCooldownRef.current);
      }
    };
  }, []);

  // Don't show on auth page or if user is not authenticated
  if (location.pathname === '/auth' || !user) {
    return null;
  }

  // Orb position is always independent of chat panel

  return (
    <>
      {portalEl
        ? createPortal(
            <div className="fixed inset-0" style={{ pointerEvents: 'none' }}>
              {/* The constraint box is the "four walls" (safe area) */}
              <div
                ref={constraintsRef}
                className="absolute"
                style={{
                  top: TOP_SAFE_MARGIN,
                  left: SAFE_MARGIN,
                  right: SAFE_MARGIN,
                  bottom: BOTTOM_NAV_HEIGHT + SAFE_MARGIN,
                }}
              />

              <motion.div
                data-zoe-orb="true"
                data-exclude-phantom-tap="true"
                className={cn(
                  'absolute flex flex-col items-center gap-1 select-none touch-none',
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                )}
                style={{ x, y, pointerEvents: 'auto' }}
                drag
                dragConstraints={constraintsRef}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
              >
                {/* Holographic ATLAS Orb Visualization - Lazy loaded for performance */}
                {/* PROTOCOL PHANTOM: Only show orb when isPhantomVisible is true AND chat panel is closed */}
                {showOrb && activeConfig.enableOrb && isPhantomVisible && !showConversationPanel && (
                  <Suspense
                    fallback={
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 animate-pulse" />
                    }
                  >
                    <HolographicATLASOrb
                      isActive={isVoiceActive || wakeWordListening || alwaysOnVoice.isListening}
                      isListening={isListening || alwaysOnVoice.isListening}
                      isProcessing={isProcessing || alwaysOnVoice.isProcessing}
                      isSpeaking={isSpeaking || alwaysOnVoice.isSpeaking}
                      isThinking={isProcessing || alwaysOnVoice.isProcessing}
                      size="lg"
                      onClick={() => {
                        if (!isDragging) setShowConversationPanel(true);
                      }}
                      onDoubleClick={() => {
                        if (!isDragging) navigate('/ai-companion');
                      }}
                      ecnEmotion={currentEmotion}
                    />
                  </Suspense>
                )}
              </motion.div>
            </div>,
            portalEl
          )
        : null}

      {/* Conversation Panel - Full chat from any page - Lazy loaded */}
      <Suspense fallback={null}>
        <ZoeOrbConversationPanel
          isOpen={showConversationPanel}
          onClose={() => setShowConversationPanel(false)}
          position={position}
          isListening={isListening}
          onToggleListening={handleToggleVoice}
        />
      </Suspense>

      {/* Identity Calibration - "Break the Ice" Protocol - Lazy loaded */}
      <Suspense fallback={null}>
        <ZoeIdentityCalibration open={showCalibration} onComplete={completeIdentityCalibration} />
      </Suspense>

      {/* Feature Discovery - Voice-enabled profession-based feature recommendations */}
      <Suspense fallback={null}>
        <ZoeFeatureDiscovery
          isOpen={showFeatureDiscovery}
          onClose={() => {
            setShowFeatureDiscovery(false);
            setDiscoveryProfession(null);
          }}
          initialProfession={discoveryProfession || undefined}
          voiceEnabled={activeConfig.enableVoice}
        />
      </Suspense>

      {/* Session Coach - Daily planning, evolution, and coaching sessions */}
      <Suspense fallback={null}>
        <ZoeSessionCoach
          isOpen={showSessionCoach}
          onClose={() => {
            setShowSessionCoach(false);
            setSessionCoachType(null);
          }}
          sessionType={sessionCoachType || undefined}
          voiceEnabled={activeConfig.enableVoice}
        />
      </Suspense>
    </>
  );
};