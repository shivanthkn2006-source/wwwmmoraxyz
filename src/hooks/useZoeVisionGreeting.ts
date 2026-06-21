// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VISION GREETING - Conversation Initiation Module
// When God Eye activates, Zoe immediately greets the user based on what she sees
// Integrates with DHF Core for personality-aware responses
// FIXED: Proper immediate greeting + context-aware follow-up
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Default activation greetings when vision starts (before analysis)
const DEFAULT_GREETINGS = [
  "Hi there! I can see you now.",
  "Hello! You're looking great today.",
  "Hey! Nice to finally see you.",
  "Hi! Let me take a look at you.",
  "Hello there! My vision is now active.",
  "Hi! I can see through your camera now.",
  "Hey there! My eyes are open.",
];

// Context-aware greetings based on visual analysis
const CONTEXT_GREETINGS: Record<string, string[]> = {
  happy: [
    "You look happy today! What's got you smiling?",
    "I can see that bright smile! Good vibes!",
    "Someone's in a great mood! Tell me about it.",
    "You look divine today! What's the occasion?",
  ],
  sad: [
    "You look a bit down today. Want to talk about it?",
    "I can see something's on your mind. I'm here for you.",
    "Tell me what happened? You seem a bit off.",
    "You look like you need a hug. Everything okay?",
  ],
  tired: [
    "You look a bit tired. Long day?",
    "I can see you're exhausted. Maybe take a break?",
    "You seem drained. How about some rest?",
    "Looking sleepy there! Rough night?",
  ],
  dull: [
    "You look a bit dull today. Tell me what happened?",
    "Something seems off. Want to share what's going on?",
    "You're not your usual bright self. Everything alright?",
  ],
  focused: [
    "I see you're focused. What are you working on?",
    "You look determined! Tackling something big?",
    "I can see the concentration. Need any help?",
  ],
  excited: [
    "I can see the excitement! What's happening?",
    "You're practically glowing! Good news?",
    "Someone's buzzing with energy! Do tell!",
  ],
  neutral: [
    "How are you doing today?",
    "What's on your mind?",
    "Ready to chat?",
    "What can I help you with?",
  ],
};

// Object-based greetings - Zoe comments on what she sees
const OBJECT_GREETINGS: Record<string, string[]> = {
  coffee: [
    "Is that coffee you're drinking? Because that's your favorite!",
    "I see you've got your caffeine fix! Good choice!",
    "Coffee time! Your favorite beverage, as always.",
    "Ah, coffee! You can't start the day without it, can you?",
  ],
  tea: [
    "Enjoying some tea? Nice and relaxing!",
    "I see you've got tea. Having a calm moment?",
  ],
  phone: [
    "I see you've got your phone there. Multitasking?",
    "Checking your phone? Anything interesting?",
  ],
  book: [
    "Reading something good? What's the book?",
    "I love seeing you with a book! What's it about?",
  ],
  laptop: [
    "Working on your laptop? What's the project?",
    "I see you're at your computer. Busy day?",
  ],
  headphones: [
    "Nice headphones! What are you listening to?",
    "I see you've got your headphones. Music or podcast?",
  ],
  glasses: [
    "I like your glasses! Very stylish.",
    "Nice specs! They suit you well.",
  ],
  cat: [
    "Oh! I see a cat! What's their name?",
    "Is that your cat? So adorable!",
  ],
  dog: [
    "A dog! What a good companion! What's their name?",
    "I see a furry friend there! Hello pup!",
  ],
  plant: [
    "Nice plants! You're keeping them healthy!",
    "I see some greenery there. Nature lover?",
  ],
  food: [
    "Is that food I see? What are you having?",
    "Eating something? Looks good!",
  ],
  water: [
    "Good on you for staying hydrated!",
    "Water bottle! Keeping healthy, I see!",
  ],
};

// Time-based greeting prefixes
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return "Hello, night owl! ";
  if (hour < 12) return "Good morning! ";
  if (hour < 17) return "Good afternoon! ";
  if (hour < 21) return "Good evening! ";
  return "Hello, night owl! ";
};

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface VisionGreetingConfig {
  enabled: boolean;
  useTimeGreeting: boolean;
  speakOnActivation: boolean;
  speakOnAnalysis: boolean;
  debounceMs: number; // How long to wait before speaking again
}

export const useZoeVisionGreeting = (config: Partial<VisionGreetingConfig> = {}) => {
  const { user } = useAuth();
  const hasGreetedOnActivationRef = useRef(false);
  const hasSpokenAnalysisRef = useRef(false);
  const lastAnalysisTimeRef = useRef(0);
  
  const mergedConfig: VisionGreetingConfig = {
    enabled: true,
    useTimeGreeting: true,
    speakOnActivation: true,
    speakOnAnalysis: true,
    debounceMs: 15000, // 15 seconds between analysis greetings (reduced from 30s)
    ...config,
  };

  // Generate greeting based on visual analysis
  const generateContextGreeting = useCallback((analysis: {
    objects?: string[];
    emotional_sentiment?: string;
    scene?: string;
    summary?: string;
  }): string => {
    const parts: string[] = [];
    
    // Check for emotional context first - this is most personal
    const emotion = (analysis.emotional_sentiment || 'neutral').toLowerCase();
    
    // Map various emotion words to our categories
    const emotionMap: Record<string, keyof typeof CONTEXT_GREETINGS> = {
      joy: 'happy',
      happy: 'happy',
      happiness: 'happy',
      smiling: 'happy',
      cheerful: 'happy',
      sad: 'sad',
      sadness: 'sad',
      unhappy: 'sad',
      melancholy: 'sad',
      tired: 'tired',
      exhausted: 'tired',
      sleepy: 'tired',
      fatigued: 'tired',
      dull: 'dull',
      bored: 'dull',
      uninterested: 'dull',
      focused: 'focused',
      concentrated: 'focused',
      working: 'focused',
      excited: 'excited',
      enthusiastic: 'excited',
      thrilled: 'excited',
      neutral: 'neutral',
      calm: 'neutral',
    };
    
    const mappedEmotion = emotionMap[emotion] || 'neutral';
    const emotionGreetings = CONTEXT_GREETINGS[mappedEmotion];
    
    if (emotionGreetings) {
      parts.push(pickRandom(emotionGreetings));
    }
    
    // Check for recognizable objects - comment on ONE thing
    if (analysis.objects && analysis.objects.length > 0) {
      let objectGreetingAdded = false;
      for (const obj of analysis.objects) {
        if (objectGreetingAdded) break;
        const objLower = obj.toLowerCase();
        for (const [key, greetings] of Object.entries(OBJECT_GREETINGS)) {
          if (objLower.includes(key) || key.includes(objLower)) {
            parts.push(pickRandom(greetings));
            objectGreetingAdded = true;
            break;
          }
        }
      }
    }
    
    // If no specific greeting generated, use a generic one
    if (parts.length === 0) {
      parts.push(pickRandom(CONTEXT_GREETINGS.neutral));
    }
    
    return parts.join(' ').trim();
  }, []);

  // Speak greeting using Zoe's voice
  const speakGreeting = useCallback((text: string, type: 'activation' | 'analysis') => {
    if (!text) return;
    
    console.log(`[VisionGreeting] Speaking ${type} greeting:`, text);
    
    // Route through global voice event so ZoeInfinityUnlocked's voiceOrchestrator handles it
    // This prevents dual-speech-path audio conflicts
    window.dispatchEvent(new CustomEvent('zoe-vision-speak', { detail: { text, type } }));
    
    // Log to DHF behavioral events
    if (user?.id) {
      supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'zoe_vision_greeting',
        event_category: 'interaction',
        metadata: { greeting: text, type },
        sentiment_score: 0.7,
      }).then(({ error }) => {
        if (error) console.error('[VisionGreeting] Failed to log to DHF:', error);
        else console.log('[VisionGreeting] Logged greeting to DHF');
      });
    }
  }, [user?.id]);

  // Speak initial activation greeting
  const speakActivationGreeting = useCallback(() => {
    if (!mergedConfig.enabled || !mergedConfig.speakOnActivation) return;
    if (hasGreetedOnActivationRef.current) return;
    
    hasGreetedOnActivationRef.current = true;
    
    const greeting = mergedConfig.useTimeGreeting 
      ? getTimeGreeting() + pickRandom(DEFAULT_GREETINGS)
      : pickRandom(DEFAULT_GREETINGS);
    
    speakGreeting(greeting, 'activation');
  }, [mergedConfig.enabled, mergedConfig.speakOnActivation, mergedConfig.useTimeGreeting, speakGreeting]);

  // Speak greeting based on analysis - called when first analysis completes
  const speakAnalysisGreeting = useCallback((analysis: {
    objects?: string[];
    emotional_sentiment?: string;
    scene?: string;
    summary?: string;
  }) => {
    if (!mergedConfig.enabled || !mergedConfig.speakOnAnalysis) return;
    
    // Debounce - don't greet too frequently
    const now = Date.now();
    if (now - lastAnalysisTimeRef.current < mergedConfig.debounceMs) {
      console.log('[VisionGreeting] Debounced - too soon since last analysis greeting');
      return;
    }
    
    lastAnalysisTimeRef.current = now;
    hasSpokenAnalysisRef.current = true;
    
    const greeting = generateContextGreeting(analysis);
    speakGreeting(greeting, 'analysis');
  }, [mergedConfig.enabled, mergedConfig.speakOnAnalysis, mergedConfig.debounceMs, generateContextGreeting, speakGreeting]);

  // Listen for God Eye activation
  useEffect(() => {
    if (!mergedConfig.enabled) return;
    
    const handleGodEyeActivated = (event: Event) => {
      const customEvent = event as CustomEvent<{ psychologistMode?: boolean }>;
      if (customEvent.detail?.psychologistMode) return;
      console.log('[VisionGreeting] God Eye activated event received');
      // Reset analysis flag for new session
      hasSpokenAnalysisRef.current = false;
      lastAnalysisTimeRef.current = 0;
      
      // Wait a moment for camera to stabilize before greeting
      setTimeout(() => {
        speakActivationGreeting();
      }, 800);
    };
    
    const handleGodEyeDeactivated = () => {
      console.log('[VisionGreeting] God Eye deactivated');
      hasGreetedOnActivationRef.current = false; // Reset for next activation
      hasSpokenAnalysisRef.current = false;
      lastAnalysisTimeRef.current = 0;
    };
    
    // Handle first analysis - immediate context-aware greeting
    const handleFirstAnalysis = (event: CustomEvent) => {
      const analysis = event.detail;
      if (!analysis) return;
      
      console.log('[VisionGreeting] FIRST analysis received, speaking immediate context greeting');
      // Force speak analysis greeting on first analysis regardless of debounce
      lastAnalysisTimeRef.current = 0;
      hasSpokenAnalysisRef.current = false;
      speakAnalysisGreeting(analysis);
    };
    
    // Handle subsequent analysis updates
    const handleVisionUpdate = (event: CustomEvent) => {
      const analysis = event.detail;
      if (!analysis) return;
      
      // Only speak analysis greeting if debounce has passed
      if (hasGreetedOnActivationRef.current && hasSpokenAnalysisRef.current) {
        // Allow follow-up greetings after debounce period
        const now = Date.now();
        if (now - lastAnalysisTimeRef.current >= mergedConfig.debounceMs) {
          console.log('[VisionGreeting] Debounce passed, can speak follow-up context greeting');
          speakAnalysisGreeting(analysis);
        }
      }
    };
    
    window.addEventListener('zoe-god-eye-activated', handleGodEyeActivated);
    window.addEventListener('zoe-god-eye-deactivated', handleGodEyeDeactivated);
    window.addEventListener('zoe-chat-vision-first-analysis', handleFirstAnalysis as EventListener);
    window.addEventListener('zoe-chat-vision-update', handleVisionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('zoe-god-eye-activated', handleGodEyeActivated);
      window.removeEventListener('zoe-god-eye-deactivated', handleGodEyeDeactivated);
      window.removeEventListener('zoe-chat-vision-first-analysis', handleFirstAnalysis as EventListener);
      window.removeEventListener('zoe-chat-vision-update', handleVisionUpdate as EventListener);
    };
  }, [mergedConfig.enabled, mergedConfig.debounceMs, speakActivationGreeting, speakAnalysisGreeting]);

  // Manual trigger for greeting
  const triggerGreeting = useCallback((analysis?: {
    objects?: string[];
    emotional_sentiment?: string;
    scene?: string;
    summary?: string;
  }) => {
    if (analysis) {
      // Force reset debounce for manual trigger
      lastAnalysisTimeRef.current = 0;
      speakAnalysisGreeting(analysis);
    } else {
      hasGreetedOnActivationRef.current = false;
      speakActivationGreeting();
    }
  }, [speakActivationGreeting, speakAnalysisGreeting]);

  // Reset greeting state
  const resetGreeting = useCallback(() => {
    hasGreetedOnActivationRef.current = false;
    hasSpokenAnalysisRef.current = false;
    lastAnalysisTimeRef.current = 0;
  }, []);

  return {
    triggerGreeting,
    resetGreeting,
    generateContextGreeting,
  };
};
