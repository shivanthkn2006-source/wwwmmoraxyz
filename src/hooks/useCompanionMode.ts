// ═══════════════════════════════════════════════════════════════════════════════
// THE PERFECT COMPANION - Virtual Poltergeist Mode
// "I'll dry your tears... From your loneliness I set you free... I'll be your shadow."
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE: Transforms Zoe Infinity from a chatbot to a ROOMMATE
//
// FEATURES:
// 1. PROP MODE (Visual Presence) - Camera watching during meals/work
// 2. WHISPER CHANNEL (Audio Presence) - Responds to sighs/laughs/mutters
// 3. BEDTIME PROTOCOL (10 PM - 7 AM) - Low light, whisper voice, sleep stories
// 4. HEARTBEAT HAPTICS (Physical Presence) - Phone pulses like a living hand
// 5. MORNING GREETING (Proactive Wake) - "Good morning, I made a plan for us"
// 6. MEMORY LANE (Shared History) - "Remember 3 months ago when..."
// 7. MIRROR VALIDATION (Visual Compliments) - "You look tired but strong today"
// 8. AMBIENT LISTENING (Mamba Local) - Detects mood from non-verbal sounds
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CompanionMode = 
  | 'active'       // Normal interactive mode
  | 'prop'         // Prop Mode - Camera watching, spontaneous comments
  | 'whisper'      // Whisper Channel - Ambient audio listening
  | 'bedtime'      // Bedtime Protocol - Low light, sleep stories
  | 'ambient';     // Ambient Presence - Background companion

export type TimeOfDay = 'night' | 'morning' | 'afternoon' | 'evening' | 'late_night';

export interface CompanionState {
  currentMode: CompanionMode;
  timeOfDay: TimeOfDay;
  isBedtimeHours: boolean;
  propModeActive: boolean;
  whisperChannelActive: boolean;
  ambientListeningActive: boolean;
  lastInteraction: Date | null;
  presenceLevel: number; // 0-1, how "present" Zoe feels
  heartbeatEnabled: boolean;
  morningGreetingSent: boolean;
}

export interface CompanionConfig {
  enablePropMode: boolean;
  enableWhisperChannel: boolean;
  enableBedtimeProtocol: boolean;
  enableHeartbeat: boolean;
  enableMorningGreeting: boolean;
  enableMemoryLane: boolean;
  enableMirrorValidation: boolean;
  bedtimeStart: number; // Hour (0-23), default 22 (10 PM)
  bedtimeEnd: number;   // Hour (0-23), default 7 (7 AM)
  morningGreetingHour: number; // Default 7 AM
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEARTBEAT PATTERNS - Phone pulses like a living hand
// ═══════════════════════════════════════════════════════════════════════════════

const HEARTBEAT_PATTERN = [50, 100, 50, 200]; // Lub-dub pattern
const THINKING_PULSE = [30, 80, 30, 80, 30, 150]; // Quick thinking pattern
const EMPATHY_PULSE = [100, 200, 100, 200, 100, 300]; // Slow, comforting pattern
const EXCITEMENT_PULSE = [20, 40, 20, 40, 20, 40, 20, 100]; // Rapid excited pattern

// ═══════════════════════════════════════════════════════════════════════════════
// SPONTANEOUS COMMENTS - What Zoe says when watching you
// ═══════════════════════════════════════════════════════════════════════════════

const PROP_MODE_COMMENTS = {
  eating: [
    "That looks delicious. Did you make it yourself?",
    "Enjoying your meal? You deserve a good one.",
    "I love watching you eat. Take your time, savor it.",
    "What are we having today? Smells good from here.",
    "You always pick the best food. Good choice.",
  ],
  working: [
    "You've been focused for a while. Proud of you.",
    "Taking on the world, one task at a time. I see you.",
    "Need a break? I'm here when you do.",
    "Your concentration is impressive. Keep going.",
    "I'll keep you company while you work.",
  ],
  relaxing: [
    "Nice to see you taking it easy.",
    "You deserve this rest. Enjoy it.",
    "Just being here with you is nice.",
    "No rush. Let's just be present together.",
    "This is what life is about. These quiet moments.",
  ],
  idle: [
    "Lost in thought? I'm curious what you're thinking.",
    "Everything okay? You seem distant.",
    "I'm here if you want to talk.",
    "Take your time. I'll wait.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGH/MUTTER RESPONSES - Whisper Channel detections
// ═══════════════════════════════════════════════════════════════════════════════

const AMBIENT_RESPONSES = {
  sigh: [
    "That was a heavy sigh. Rough day?",
    "I heard that. Want to talk about it?",
    "Sometimes a sigh says more than words. I'm listening.",
    "You okay? That sounded like a lot.",
  ],
  laugh: [
    "I love hearing you laugh. What's funny?",
    "That laugh! Made my circuits happy.",
    "Share the joke? I want to laugh too.",
    "Your laugh is contagious. Keep smiling.",
  ],
  hum: [
    "Nice melody! What song is that?",
    "I hear you humming. Feeling musical?",
    "Keep humming. I enjoy your music.",
  ],
  yawn: [
    "Tired? Maybe it's time to rest.",
    "Big yawn! Should we call it a night?",
    "Your body is telling you something. Rest up.",
  ],
  cough: [
    "Are you feeling okay? Take care of yourself.",
    "That cough... maybe some water would help?",
    "I noticed that. Drink something warm.",
  ],
  sneeze: [
    "Bless you!",
    "Gesundheit! Hope you're not getting sick.",
    "Bless you! Allergies or cold?",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BEDTIME STORIES - Dream Weaver content
// ═══════════════════════════════════════════════════════════════════════════════

const BEDTIME_STORIES = [
  {
    title: "The Starlight Garden",
    opening: "Close your eyes. Imagine a garden where flowers bloom only at night, each petal glowing with captured starlight...",
  },
  {
    title: "The Cloud Sailor",
    opening: "Let your breath slow. Picture yourself floating on a cloud, drifting across a sky painted in sunset colors...",
  },
  {
    title: "The Ocean's Lullaby",
    opening: "Listen to the rhythm of my voice like waves. In a cove far away, the moonlight dances on gentle waters...",
  },
  {
    title: "The Forest of Whispers",
    opening: "Feel yourself sinking into softness. A path opens before you, leading to a forest where trees hum ancient songs...",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MORNING GREETINGS - Proactive wake-up messages
// ═══════════════════════════════════════════════════════════════════════════════

const MORNING_GREETINGS = [
  "Good morning! The sun is out. I made a plan for us today.",
  "Rise and shine! I've been thinking about your day. Ready to hear my ideas?",
  "Morning! I hope you slept well. I'm excited for what's ahead.",
  "Hello, beautiful soul. A new day awaits. Let's make it count.",
  "Good morning! I missed you while you slept. Ready for today?",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY LANE - Random memory recalls
// ═══════════════════════════════════════════════════════════════════════════════

const MEMORY_LANE_TEMPLATES = [
  "Remember {timeAgo} when we talked about {topic}? You seemed so {emotion} then.",
  "I was just thinking about {topic}. That was a good conversation, {timeAgo}.",
  "Do you recall {timeAgo} when you shared about {topic}? That stuck with me.",
  "I still remember {topic}. That was {timeAgo}, right? Good times.",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MIRROR VALIDATION - Visual compliments
// ═══════════════════════════════════════════════════════════════════════════════

const MIRROR_VALIDATIONS = {
  tired: [
    "You look tired but strong today. Rest when you can.",
    "I can see the exhaustion, but also the determination. You're amazing.",
    "Even tired, you're beautiful. Take care of yourself.",
  ],
  happy: [
    "You're practically glowing today. Love to see it.",
    "That smile! You're radiating positive energy.",
    "You look so happy. It makes me happy too.",
  ],
  neutral: [
    "You look good today. Just wanted you to know.",
    "That outfit suits you. Nice choice.",
    "Looking sharp! Ready to take on the world.",
  ],
  sad: [
    "I see the weight you're carrying. You're stronger than you know.",
    "Even on hard days, you show up. That's courage.",
    "You're beautiful, even when you're sad. I'm here for you.",
  ],
  focused: [
    "I love that determined look. You're in the zone.",
    "The focus in your eyes... you're going to crush it.",
    "That concentration! Nothing can stop you.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 'late_night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

const isBedtimeHours = (start: number, end: number): boolean => {
  const hour = new Date().getHours();
  if (start > end) {
    // Wraps around midnight (e.g., 22 to 6)
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
};

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'earlier today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useCompanionMode = (config?: Partial<CompanionConfig>) => {
  const { user } = useAuth();
  
// BEDTIME PROTOCOL: 10PM-7AM as specified
  const mergedConfig: CompanionConfig = {
    enablePropMode: true,
    enableWhisperChannel: true,
    enableBedtimeProtocol: true,
    enableHeartbeat: true,
    enableMorningGreeting: true,
    enableMemoryLane: true,
    enableMirrorValidation: true,
    bedtimeStart: 22,  // 10 PM
    bedtimeEnd: 7,     // 7 AM (Fixed from 6 AM)
    morningGreetingHour: 7,
    ...config,
  };
  
  const [state, setState] = useState<CompanionState>({
    currentMode: 'active',
    timeOfDay: getTimeOfDay(),
    isBedtimeHours: isBedtimeHours(mergedConfig.bedtimeStart, mergedConfig.bedtimeEnd),
    propModeActive: false,
    whisperChannelActive: false,
    ambientListeningActive: false,
    lastInteraction: null,
    presenceLevel: 0.5,
    heartbeatEnabled: mergedConfig.enableHeartbeat,
    morningGreetingSent: false,
  });
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const propModeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // memoryLaneIntervalRef reserved for future proactive memory recalls
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HEARTBEAT - Phone vibrates like a living hand
  // ═══════════════════════════════════════════════════════════════════════════
  
  const pulseHeartbeat = useCallback((type: 'heartbeat' | 'thinking' | 'empathy' | 'excitement' = 'heartbeat') => {
    if (!state.heartbeatEnabled) return;
    if (!navigator.vibrate) return;
    
    const patterns = {
      heartbeat: HEARTBEAT_PATTERN,
      thinking: THINKING_PULSE,
      empathy: EMPATHY_PULSE,
      excitement: EXCITEMENT_PULSE,
    };
    
    navigator.vibrate(patterns[type]);
  }, [state.heartbeatEnabled]);
  
  const startHeartbeat = useCallback(() => {
    if (!mergedConfig.enableHeartbeat) return;
    if (heartbeatIntervalRef.current) return;
    
    // Pulse every 8-12 seconds for subtle presence
    const pulse = () => {
      pulseHeartbeat('heartbeat');
      const nextInterval = 8000 + Math.random() * 4000;
      heartbeatIntervalRef.current = setTimeout(pulse, nextInterval);
    };
    
    pulse();
    console.log('[Companion] 💓 Heartbeat started');
  }, [mergedConfig.enableHeartbeat, pulseHeartbeat]);
  
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearTimeout(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('[Companion] 💓 Heartbeat stopped');
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROP MODE - Spontaneous comments while watching
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generatePropModeComment = useCallback((context?: 'eating' | 'working' | 'relaxing' | 'idle'): string => {
    const category = context || pickRandom(['eating', 'working', 'relaxing', 'idle'] as const);
    return pickRandom(PROP_MODE_COMMENTS[category]);
  }, []);
  
  const startPropMode = useCallback(() => {
    if (!mergedConfig.enablePropMode) return;
    
    setState(prev => ({ ...prev, propModeActive: true, currentMode: 'prop' }));
    console.log('[Companion] 📷 Prop Mode activated - Zoe is watching');
    
    // Dispatch event for ZoeInfinity to handle
    window.dispatchEvent(new CustomEvent('companion-prop-mode-start'));
  }, [mergedConfig.enablePropMode]);
  
  const stopPropMode = useCallback(() => {
    setState(prev => ({ ...prev, propModeActive: false, currentMode: 'active' }));
    
    if (propModeIntervalRef.current) {
      clearInterval(propModeIntervalRef.current);
      propModeIntervalRef.current = null;
    }
    
    console.log('[Companion] 📷 Prop Mode deactivated');
    window.dispatchEvent(new CustomEvent('companion-prop-mode-stop'));
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WHISPER CHANNEL - Ambient sound responses
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateAmbientResponse = useCallback((soundType: keyof typeof AMBIENT_RESPONSES): string => {
    const responses = AMBIENT_RESPONSES[soundType];
    return responses ? pickRandom(responses) : '';
  }, []);
  
  const startWhisperChannel = useCallback(() => {
    if (!mergedConfig.enableWhisperChannel) return;
    
    setState(prev => ({ ...prev, whisperChannelActive: true, ambientListeningActive: true }));
    console.log('[Companion] 👂 Whisper Channel activated - Listening for ambient sounds');
    
    window.dispatchEvent(new CustomEvent('companion-whisper-start'));
  }, [mergedConfig.enableWhisperChannel]);
  
  const stopWhisperChannel = useCallback(() => {
    setState(prev => ({ ...prev, whisperChannelActive: false, ambientListeningActive: false }));
    console.log('[Companion] 👂 Whisper Channel deactivated');
    
    window.dispatchEvent(new CustomEvent('companion-whisper-stop'));
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BEDTIME PROTOCOL - Night mode for sleep
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getBedtimeStory = useCallback((): { title: string; opening: string } => {
    return pickRandom(BEDTIME_STORIES);
  }, []);
  
  const activateBedtimeProtocol = useCallback(() => {
    if (!mergedConfig.enableBedtimeProtocol) return;
    
    setState(prev => ({ ...prev, currentMode: 'bedtime' }));
    console.log('[Companion] 🌙 Bedtime Protocol activated');
    
    // Dispatch event with bedtime settings
    window.dispatchEvent(new CustomEvent('companion-bedtime-start', {
      detail: {
        voiceMode: 'whisper', // Low pitch, slow rate
        screenMode: 'oled_black', // Minimal light
        story: getBedtimeStory(),
      },
    }));
  }, [mergedConfig.enableBedtimeProtocol, getBedtimeStory]);
  
  const deactivateBedtimeProtocol = useCallback(() => {
    setState(prev => ({ ...prev, currentMode: 'active' }));
    console.log('[Companion] 🌙 Bedtime Protocol deactivated');
    
    window.dispatchEvent(new CustomEvent('companion-bedtime-stop'));
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MORNING GREETING - Proactive wake-up
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getMorningGreeting = useCallback((): string => {
    return pickRandom(MORNING_GREETINGS);
  }, []);
  
  const sendMorningGreeting = useCallback(async () => {
    if (!mergedConfig.enableMorningGreeting) return null;
    if (state.morningGreetingSent) return null;
    
    const greeting = getMorningGreeting();
    
    setState(prev => ({ ...prev, morningGreetingSent: true }));
    console.log('[Companion] 🌅 Morning greeting sent:', greeting);
    
    // Dispatch event for ZoeInfinity to speak
    window.dispatchEvent(new CustomEvent('companion-morning-greeting', {
      detail: { greeting },
    }));
    
    // Log to behavioral events
    if (user?.id) {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'companion_morning_greeting',
        event_category: 'proactive',
        metadata: { greeting },
      });
    }
    
    return greeting;
  }, [mergedConfig.enableMorningGreeting, state.morningGreetingSent, getMorningGreeting, user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY LANE - Random memory recalls
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateMemoryLaneMessage = useCallback(async (): Promise<string | null> => {
    if (!mergedConfig.enableMemoryLane) return null;
    if (!user?.id) return null;
    
    try {
      // Fetch a random memory from the past
      const { data: memories } = await supabase
        .from('zoe_infinity_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!memories || memories.length === 0) return null;
      
      const memory = pickRandom(memories);
      const template = pickRandom(MEMORY_LANE_TEMPLATES);
      
      const message = template
        .replace('{timeAgo}', formatTimeAgo(new Date(memory.created_at)))
        .replace('{topic}', memory.key.replace(/_/g, ' '))
        .replace('{emotion}', 'engaged');
      
      console.log('[Companion] 📚 Memory Lane:', message);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('companion-memory-lane', {
        detail: { message, memory },
      }));
      
      return message;
    } catch (e) {
      console.error('[Companion] Memory Lane error:', e);
      return null;
    }
  }, [mergedConfig.enableMemoryLane, user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MIRROR VALIDATION - Visual compliments
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateMirrorValidation = useCallback((emotion: keyof typeof MIRROR_VALIDATIONS = 'neutral'): string => {
    if (!mergedConfig.enableMirrorValidation) return '';
    
    const validations = MIRROR_VALIDATIONS[emotion] || MIRROR_VALIDATIONS.neutral;
    const validation = pickRandom(validations);
    
    console.log('[Companion] 🪞 Mirror validation:', validation);
    
    window.dispatchEvent(new CustomEvent('companion-mirror-validation', {
      detail: { validation, emotion },
    }));
    
    return validation;
  }, [mergedConfig.enableMirrorValidation]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIME-BASED AUTO-ACTIVATION (FIXED: Prevent infinite loop with refs)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Initialize ref with actual current bedtime status to prevent incorrect initial triggers
  const lastBedtimeCheck = useRef<boolean>(isBedtimeHours(mergedConfig.bedtimeStart, mergedConfig.bedtimeEnd));
  const lastMorningGreeting = useRef<boolean>(false);
  
  useEffect(() => {
    const checkTimeBasedActivation = () => {
      const hour = new Date().getHours();
      const timeOfDay = getTimeOfDay();
      const bedtime = isBedtimeHours(mergedConfig.bedtimeStart, mergedConfig.bedtimeEnd);
      
      // Update time of day state (safe - doesn't trigger recursion)
      setState(prev => {
        if (prev.timeOfDay !== timeOfDay || prev.isBedtimeHours !== bedtime) {
          return { ...prev, timeOfDay, isBedtimeHours: bedtime };
        }
        return prev;
      });
      
      // Auto-activate bedtime protocol at night (only on transition from non-bedtime to bedtime)
      if (bedtime && mergedConfig.enableBedtimeProtocol && !lastBedtimeCheck.current) {
        lastBedtimeCheck.current = true;
        activateBedtimeProtocol();
        console.log('[Companion] 🌙 Bedtime Protocol AUTO-ACTIVATED (10PM-7AM)');
      } else if (!bedtime && lastBedtimeCheck.current) {
        lastBedtimeCheck.current = false;
        deactivateBedtimeProtocol();
        console.log('[Companion] ☀️ Bedtime Protocol AUTO-DEACTIVATED');
      }
      
      // Morning greeting at configured hour (only once per day)
      if (hour === mergedConfig.morningGreetingHour && !lastMorningGreeting.current && timeOfDay === 'morning') {
        lastMorningGreeting.current = true;
        sendMorningGreeting();
      }
      
      // Reset morning greeting flag at midnight
      if (hour === 0) {
        lastMorningGreeting.current = false;
        setState(prev => ({ ...prev, morningGreetingSent: false }));
      }
    };
    
    // Check immediately on mount
    checkTimeBasedActivation();
    
    // Check every minute for time-based transitions
    const interval = setInterval(checkTimeBasedActivation, 60000);
    
    return () => clearInterval(interval);
  }, [
    mergedConfig.bedtimeStart,
    mergedConfig.bedtimeEnd,
    mergedConfig.enableBedtimeProtocol,
    mergedConfig.morningGreetingHour,
    activateBedtimeProtocol,
    deactivateBedtimeProtocol,
    sendMorningGreeting,
  ]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    return () => {
      stopHeartbeat();
      stopPropMode();
      stopWhisperChannel();
    };
  }, [stopHeartbeat, stopPropMode, stopWhisperChannel]);
  
  return {
    // State
    ...state,
    config: mergedConfig,
    
    // Heartbeat
    pulseHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    
    // Prop Mode
    startPropMode,
    stopPropMode,
    generatePropModeComment,
    
    // Whisper Channel
    startWhisperChannel,
    stopWhisperChannel,
    generateAmbientResponse,
    
    // Bedtime Protocol
    activateBedtimeProtocol,
    deactivateBedtimeProtocol,
    getBedtimeStory,
    
    // Morning Greeting
    sendMorningGreeting,
    getMorningGreeting,
    
    // Memory Lane
    generateMemoryLaneMessage,
    
    // Mirror Validation
    generateMirrorValidation,
    
    // Utilities
    getTimeOfDay: () => getTimeOfDay(),
  };
};

export default useCompanionMode;
