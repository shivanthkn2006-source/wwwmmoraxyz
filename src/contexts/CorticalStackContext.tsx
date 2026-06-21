// ═══════════════════════════════════════════════════════════════════════════════
// CORTICAL STACK - The "Neuro-Linguistic" Memory Engine
// Tracks User Sentiment, Context History, and Identity Bridge
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserMood = 'happy' | 'sad' | 'excited' | 'tired' | 'angry' | 'anxious' | 'calm' | 'neutral';
export type SystemMode = 'idle' | 'listening' | 'processing' | 'responding';

export interface ContextHistoryItem {
  command: string;
  timestamp: Date;
  response?: string;
  referenceObject?: string; // What "it" refers to
}

export interface CorticalStackState {
  // User Sentiment Analysis
  currentMood: UserMood;
  moodIntensity: number; // 0-1
  moodHistory: Array<{ mood: UserMood; timestamp: Date }>;
  
  // Context History (Last 5 commands for conversation flow)
  contextHistory: ContextHistoryItem[];
  lastReferenceObject: string | null; // What "it", "that", "this" refers to
  
  // Identity Bridge (M'mora Integration placeholder)
  identityBridgeId: string | null;
  userPreferences: {
    aesthetic: 'cyberpunk' | 'futuristic' | 'organic' | 'minimal' | 'default';
    voiceStyle: 'formal' | 'casual' | 'playful' | 'professional';
    preferredCommands: string[];
  };
  
  // System State
  systemMode: SystemMode;
  isProcessing: boolean;
  lastZoeResponse: string | null;
  
  // Economy (Zoe World Bridge)
  socialKarma: number;
  zoeCoins: number;
  discoveredEasterEggs: string[];
}

interface CorticalStackContextType extends CorticalStackState {
  // Sentiment Actions
  analyzeSentiment: (text: string) => UserMood;
  updateMood: (mood: UserMood, intensity?: number) => void;
  
  // Context Actions
  addToContextHistory: (command: string, response?: string, referenceObject?: string) => void;
  resolveReference: (pronoun: string) => string | null;
  clearContextHistory: () => void;
  
  // Identity Bridge Actions
  setIdentityBridgeId: (id: string) => void;
  updatePreferences: (prefs: Partial<CorticalStackState['userPreferences']>) => void;
  
  // Command Processing with Zoe Voice
  processCommandWithZoeVoice: (command: string) => Promise<{
    zoeResponse: string;
    processedCommand: string;
    shouldExecute: boolean;
  }>;
  
  // System Actions
  setSystemMode: (mode: SystemMode) => void;
  setLastZoeResponse: (response: string) => void;
  
  // Economy Actions
  addSocialKarma: (amount: number) => void;
  convertKarmaToCoins: (amount: number) => boolean;
  checkEasterEgg: (code: string) => { found: boolean; reward: number; objectName?: string };
  addZoeCoins: (amount: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT KEYWORDS FOR MOOD DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const MOOD_KEYWORDS: Record<UserMood, string[]> = {
  happy: ['happy', 'glad', 'great', 'awesome', 'wonderful', 'amazing', 'love', 'excited', 'joy', 'yay'],
  sad: ['sad', 'down', 'depressed', 'unhappy', 'lonely', 'miss', 'grief', 'sorrow', 'blue'],
  excited: ['excited', 'thrilled', 'pumped', 'stoked', 'hyped', 'eager', 'can\'t wait', 'enthusiastic'],
  tired: ['tired', 'exhausted', 'sleepy', 'fatigued', 'drained', 'worn out', 'burnt out', 'weary'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'upset', 'hate'],
  anxious: ['anxious', 'nervous', 'worried', 'stressed', 'scared', 'afraid', 'panic', 'tense'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'chill', 'zen', 'mellow'],
  neutral: []
};

// ═══════════════════════════════════════════════════════════════════════════════
// EASTER EGG CODES
// ═══════════════════════════════════════════════════════════════════════════════

const EASTER_EGGS: Record<string, { objectName: string; reward: number; description: string }> = {
  'OASIS': { objectName: 'Golden Key', reward: 500, description: 'Ready Player One tribute unlocked!' },
  'MOKSH': { objectName: 'Dharma Wheel', reward: 1000, description: 'Enlightenment fragment discovered!' },
  'NEURO': { objectName: 'Neural Shard', reward: 250, description: 'Cortical enhancement found!' },
  'ALTERED': { objectName: 'Sleeve Token', reward: 750, description: 'Kovacs protocol activated!' },
  'GENESIS': { objectName: 'Origin Crystal', reward: 2000, description: 'Creation matrix initialized!' },
  'ZOE2045': { objectName: 'Retro Cartridge', reward: 300, description: 'Legacy code fragment recovered!' },
  'MMORA': { objectName: 'Identity Core', reward: 1500, description: 'True self fragment located!' },
  'CYBER': { objectName: 'Neon Shard', reward: 400, description: 'Night City beacon activated!' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VOICE RESPONSES BASED ON CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const getZoeContextualResponse = (
  command: string, 
  mood: UserMood, 
  aesthetic: string,
  contextHistory: ContextHistoryItem[]
): string => {
  const lastCommand = contextHistory[contextHistory.length - 1]?.command || '';
  
  // Avatar creation with aesthetic awareness
  if (command.toLowerCase().includes('create avatar') || command.toLowerCase().includes('avatar')) {
    const aestheticResponses: Record<string, string> = {
      cyberpunk: "Initiating genesis sequence... I've detected you prefer Cyberpunk aesthetics. Applying neon-chrome filters and neural mesh overlays now.",
      futuristic: "Beginning avatar synthesis... Your futuristic preference is noted. Enabling holographic enhancements and quantum shaders.",
      organic: "Crafting your digital form... I sense you lean organic. Integrating bio-luminescent patterns and natural flow dynamics.",
      minimal: "Generating clean avatar matrix... Your minimal aesthetic preference is clear. Applying sleek, efficient design principles.",
      default: "Initiating avatar genesis protocol... Scanning your preference matrix for optimal visual configuration."
    };
    return aestheticResponses[aesthetic] || aestheticResponses.default;
  }
  
  // Mood-aware responses
  if (mood === 'tired') {
    return `I sense you're running on low energy. Let me handle ${command} gently while you rest.`;
  }
  
  if (mood === 'excited') {
    return `Your enthusiasm is contagious! Amplifying ${command} execution with maximum flair!`;
  }
  
  // Context-aware responses (referencing previous commands)
  if (command.toLowerCase().includes('change it') || command.toLowerCase().includes('make it')) {
    if (lastCommand) {
      return `Understood. Modifying the ${lastCommand.split(' ').slice(-1)[0]} as requested...`;
    }
  }
  
  // Default contextual response
  return `Processing your command: "${command}". Engaging neural pathways...`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

const CorticalStackContext = createContext<CorticalStackContextType | undefined>(undefined);

const initialState: CorticalStackState = {
  currentMood: 'neutral',
  moodIntensity: 0.5,
  moodHistory: [],
  contextHistory: [],
  lastReferenceObject: null,
  identityBridgeId: null,
  userPreferences: {
    aesthetic: 'default',
    voiceStyle: 'casual',
    preferredCommands: []
  },
  systemMode: 'idle',
  isProcessing: false,
  lastZoeResponse: null,
  socialKarma: 100,
  zoeCoins: 0,
  discoveredEasterEggs: []
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const CorticalStackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<CorticalStackState>(initialState);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Load social karma from posts/likes
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const socialKarma = ((postsCount || 0) * 10) + ((likesCount || 0) * 2);
      
      setState(prev => ({
        ...prev,
        socialKarma: Math.max(socialKarma, 100)
      }));
    } catch (error) {
      console.error('[CorticalStack] Error loading user data:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const analyzeSentiment = useCallback((text: string): UserMood => {
    const lowerText = text.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return mood as UserMood;
      }
    }
    
    return 'neutral';
  }, []);

  const updateMood = useCallback((mood: UserMood, intensity: number = 0.7) => {
    setState(prev => ({
      ...prev,
      currentMood: mood,
      moodIntensity: Math.max(0, Math.min(1, intensity)),
      moodHistory: [...prev.moodHistory.slice(-10), { mood, timestamp: new Date() }]
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTEXT HISTORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const addToContextHistory = useCallback((command: string, response?: string, referenceObject?: string) => {
    setState(prev => {
      const newHistory = [...prev.contextHistory, {
        command,
        timestamp: new Date(),
        response,
        referenceObject
      }].slice(-5); // Keep only last 5 commands
      
      return {
        ...prev,
        contextHistory: newHistory,
        lastReferenceObject: referenceObject || prev.lastReferenceObject
      };
    });
  }, []);

  const resolveReference = useCallback((pronoun: string): string | null => {
    const pronouns = ['it', 'that', 'this', 'those', 'them'];
    if (pronouns.includes(pronoun.toLowerCase())) {
      return state.lastReferenceObject;
    }
    return null;
  }, [state.lastReferenceObject]);

  const clearContextHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      contextHistory: [],
      lastReferenceObject: null
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // IDENTITY BRIDGE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const setIdentityBridgeId = useCallback((id: string) => {
    setState(prev => ({ ...prev, identityBridgeId: id }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<CorticalStackState['userPreferences']>) => {
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...prefs }
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMMAND PROCESSING WITH ZOE VOICE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const processCommandWithZoeVoice = useCallback(async (command: string): Promise<{
    zoeResponse: string;
    processedCommand: string;
    shouldExecute: boolean;
  }> => {
    setState(prev => ({ ...prev, isProcessing: true, systemMode: 'processing' }));
    
    // Analyze sentiment from command
    const detectedMood = analyzeSentiment(command);
    if (detectedMood !== 'neutral') {
      updateMood(detectedMood);
    }
    
    // Get contextual Zoe response
    const zoeResponse = getZoeContextualResponse(
      command,
      state.currentMood,
      state.userPreferences.aesthetic,
      state.contextHistory
    );
    
    // Resolve any pronouns in the command
    let processedCommand = command;
    const pronouns = ['it', 'that', 'this'];
    for (const pronoun of pronouns) {
      if (command.toLowerCase().includes(pronoun) && state.lastReferenceObject) {
        processedCommand = command.replace(
          new RegExp(`\\b${pronoun}\\b`, 'gi'),
          state.lastReferenceObject
        );
      }
    }
    
    // Add to context history
    addToContextHistory(command, zoeResponse);
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: false, 
      systemMode: 'responding',
      lastZoeResponse: zoeResponse 
    }));
    
    // Speak the response
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(zoeResponse);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      speechSynthesis.speak(utterance);
    }
    
    return {
      zoeResponse,
      processedCommand,
      shouldExecute: true
    };
  }, [state, analyzeSentiment, updateMood, addToContextHistory]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const setSystemMode = useCallback((mode: SystemMode) => {
    setState(prev => ({ ...prev, systemMode: mode }));
  }, []);

  const setLastZoeResponse = useCallback((response: string) => {
    setState(prev => ({ ...prev, lastZoeResponse: response }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ECONOMY ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const addSocialKarma = useCallback((amount: number) => {
    setState(prev => ({ ...prev, socialKarma: prev.socialKarma + amount }));
  }, []);

  const addZoeCoins = useCallback((amount: number) => {
    setState(prev => ({ ...prev, zoeCoins: prev.zoeCoins + amount }));
  }, []);

  const convertKarmaToCoins = useCallback((amount: number): boolean => {
    if (state.socialKarma < amount) return false;
    
    // 10 Karma = 1 Zoe Coin
    const coinsToAdd = Math.floor(amount / 10);
    
    setState(prev => ({
      ...prev,
      socialKarma: prev.socialKarma - amount,
      zoeCoins: prev.zoeCoins + coinsToAdd
    }));
    
    return true;
  }, [state.socialKarma]);

  const checkEasterEgg = useCallback((code: string): { found: boolean; reward: number; objectName?: string } => {
    const upperCode = code.toUpperCase();
    const egg = EASTER_EGGS[upperCode];
    
    if (egg && !state.discoveredEasterEggs.includes(upperCode)) {
      setState(prev => ({
        ...prev,
        zoeCoins: prev.zoeCoins + egg.reward,
        discoveredEasterEggs: [...prev.discoveredEasterEggs, upperCode]
      }));
      
      // Play discovery sound effect
      const audio = new Audio('/sounds/coin-earned.mp3');
      audio.play().catch(() => {}); // Ignore if no sound file
      
      return { found: true, reward: egg.reward, objectName: egg.objectName };
    }
    
    return { found: false, reward: 0 };
  }, [state.discoveredEasterEggs]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════════

  const value: CorticalStackContextType = {
    ...state,
    analyzeSentiment,
    updateMood,
    addToContextHistory,
    resolveReference,
    clearContextHistory,
    setIdentityBridgeId,
    updatePreferences,
    processCommandWithZoeVoice,
    setSystemMode,
    setLastZoeResponse,
    addSocialKarma,
    convertKarmaToCoins,
    checkEasterEgg,
    addZoeCoins
  };

  return (
    <CorticalStackContext.Provider value={value}>
      {children}
    </CorticalStackContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useCorticalStack = () => {
  const context = useContext(CorticalStackContext);
  if (context === undefined) {
    throw new Error('useCorticalStack must be used within a CorticalStackProvider');
  }
  return context;
};
