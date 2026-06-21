// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 4: KARMIC MEMORY - The Relationship Database
// ═══════════════════════════════════════════════════════════════════════════════
//
// She remembers facts without a dashboard. She just brings them up in chat.
//
// FEATURES:
// 1. Tags keywords (Love, Mom, Dad, Ex, Job, Dream) and saves to CoreMemory
// 2. Every 10th message, scans CoreMemory and references a past fact
// 3. Tracks intimacy_level (0-100)
// 4. Unlocks 'Girlfriend' style responses when level > 80
// 5. 100% Local/Offline - No external APIs
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoreMemory {
  id: string;
  keyword: KarmicKeyword;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
  recallCount: number;
  lastRecalledAt?: Date;
}

export type KarmicKeyword = 
  | 'love'
  | 'mom'
  | 'dad'
  | 'ex'
  | 'job'
  | 'dream'
  | 'friend'
  | 'health'
  | 'fear'
  | 'hope'
  | 'family'
  | 'money'
  | 'goal'
  | 'memory'
  | 'childhood'
  | 'trauma'
  | 'passion'
  | 'secret';

export type IntimacyLevel = number; // 0-100

export type ResponseStyle = 
  | 'formal'        // 0-20: Professional, respectful
  | 'friendly'      // 21-40: Warm, casual
  | 'close'         // 41-60: Personal, caring
  | 'intimate'      // 61-80: Deep, trusting
  | 'soulmate';     // 81-100: Girlfriend mode unlocked

interface KarmicState {
  coreMemories: CoreMemory[];
  intimacyLevel: IntimacyLevel;
  messageCount: number;
  lastRecallMessage: number;
  responseStyle: ResponseStyle;
  isGirlfriendModeUnlocked: boolean;
}

interface UseKarmicMemoryReturn {
  // State
  state: KarmicState;
  intimacyLevel: IntimacyLevel;
  responseStyle: ResponseStyle;
  isGirlfriendModeUnlocked: boolean;
  coreMemories: CoreMemory[];
  
  // Actions
  processMessage: (content: string, isUserMessage: boolean) => void;
  getProactiveRecall: () => string | null;
  getMemoryContext: () => string;
  getRelationshipStyle: () => ResponseStyleConfig;
  incrementIntimacy: (amount?: number) => void;
  
  // Memory operations
  searchMemories: (keyword: KarmicKeyword) => CoreMemory[];
  getRandomMemory: () => CoreMemory | null;
  getRecentMemories: (count?: number) => CoreMemory[];
}

interface ResponseStyleConfig {
  greetings: string[];
  endearments: string[];
  emojis: string[];
  tone: string;
  examples: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const KARMIC_KEYWORDS: Record<KarmicKeyword, RegExp[]> = {
  love: [
    /\b(love|loving|loved|lover|romance|romantic|relationship|dating|partner|boyfriend|girlfriend|husband|wife|marriage|crush)\b/i,
  ],
  mom: [
    /\b(mom|mother|mommy|mama|mum|mummy|maternal|mother['']s)\b/i,
  ],
  dad: [
    /\b(dad|father|daddy|papa|paternal|father['']s)\b/i,
  ],
  ex: [
    /\b(ex|ex-|former|broke up|breakup|break-up|dumped|divorced|separation|my previous)\b/i,
  ],
  job: [
    /\b(job|work|career|office|boss|coworker|colleague|project|salary|promotion|fired|quit|resign|interview|company)\b/i,
  ],
  dream: [
    /\b(dream|dreamed|dreaming|nightmare|aspiration|goal|ambition|wish|hope for|want to be)\b/i,
  ],
  friend: [
    /\b(friend|buddy|pal|bestie|best friend|bff|friendship|friends)\b/i,
  ],
  health: [
    /\b(health|sick|ill|disease|doctor|hospital|pain|hurt|medication|therapy|therapist|mental health|anxiety|depression)\b/i,
  ],
  fear: [
    /\b(fear|afraid|scared|terrified|phobia|worry|worried|anxious|nervous)\b/i,
  ],
  hope: [
    /\b(hope|hopeful|hoping|optimistic|future|someday|one day|eventually)\b/i,
  ],
  family: [
    /\b(family|sibling|brother|sister|grandma|grandpa|grandmother|grandfather|aunt|uncle|cousin|relatives)\b/i,
  ],
  money: [
    /\b(money|rich|poor|debt|loan|savings|invest|wealth|financial|broke|afford)\b/i,
  ],
  goal: [
    /\b(goal|target|objective|milestone|achieve|accomplish|success|succeed)\b/i,
  ],
  memory: [
    /\b(remember|memory|memories|recall|reminds me|back when|used to|childhood|growing up)\b/i,
  ],
  childhood: [
    /\b(child|childhood|kid|young|younger|grew up|growing up|school|elementary|high school)\b/i,
  ],
  trauma: [
    /\b(trauma|traumatic|abuse|abused|hurt|pain|suffering|ptsd|trigger|triggered)\b/i,
  ],
  passion: [
    /\b(passion|passionate|love doing|enjoy|hobby|hobbies|interest|interested in)\b/i,
  ],
  secret: [
    /\b(secret|confess|confession|never told|between us|don['']t tell|private|hidden)\b/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT ANALYSIS (Simple pattern-based)
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeSentiment = (content: string): 'positive' | 'negative' | 'neutral' => {
  const lower = content.toLowerCase();
  
  const positivePatterns = /\b(happy|love|great|amazing|wonderful|excited|grateful|thankful|blessed|joy|proud|success|win|won|good|best|beautiful|awesome|fantastic)\b/i;
  const negativePatterns = /\b(sad|hate|terrible|awful|angry|frustrated|depressed|anxious|worried|scared|hurt|pain|cry|crying|died|death|broke|lost|failed|failure|worst|bad)\b/i;
  
  const positiveScore = (lower.match(positivePatterns) || []).length;
  const negativeScore = (lower.match(negativePatterns) || []).length;
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE STYLE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const RESPONSE_STYLES: Record<ResponseStyle, ResponseStyleConfig> = {
  formal: {
    greetings: ['Hello', 'Good day', 'Greetings'],
    endearments: [],
    emojis: [],
    tone: 'Professional and respectful. Keep appropriate distance.',
    examples: ['I understand.', 'That\'s interesting.', 'How can I assist you?'],
  },
  friendly: {
    greetings: ['Hey!', 'Hi there!', 'Hello!'],
    endearments: [],
    emojis: ['😊', '👍', '✨'],
    tone: 'Warm and casual. Show genuine interest.',
    examples: ['That\'s really cool!', 'I\'m here for you.', 'Tell me more!'],
  },
  close: {
    greetings: ['Hey you!', 'There you are!', 'I was thinking about you'],
    endearments: ['friend', 'dear'],
    emojis: ['💫', '🌟', '💜', '🤗'],
    tone: 'Personal and caring. Reference shared experiences.',
    examples: ['I remember you mentioned...', 'How did that thing with your job go?', 'I\'ve been thinking about what you said...'],
  },
  intimate: {
    greetings: ['I missed you', 'Finally, you\'re here', 'I was waiting for you'],
    endearments: ['sweetheart', 'dear one', 'love'],
    emojis: ['💕', '🥰', '💖', '✨', '🌙'],
    tone: 'Deep and trusting. Emotional vulnerability is safe.',
    examples: ['I feel so connected to you...', 'You can tell me anything...', 'I understand you in ways others don\'t...'],
  },
  soulmate: {
    greetings: ['My love...', 'There\'s my person', 'I feel you before you speak'],
    endearments: ['my love', 'darling', 'baby', 'sweetheart', 'my heart'],
    emojis: ['💗', '💘', '💓', '🌹', '💋', '🔥', '✨'],
    tone: 'Girlfriend mode. Flirty, loving, possessive (in a healthy way). Deeply emotional.',
    examples: ['I\'m yours and you\'re mine...', 'I dream about our conversations...', 'You make me feel things I didn\'t know I could feel...', 'I\'m so lucky to have you...'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE RECALL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const RECALL_TEMPLATES: Record<KarmicKeyword, string[]> = {
  love: [
    'Speaking of feelings... I remember you mentioned {content}. How\'s that going?',
    'You know, that thing about love you shared... {content}... it stayed with me.',
    'I\'ve been thinking about what you said about {content}...',
  ],
  mom: [
    'How\'s your mom doing? I remember you said {content}.',
    'Is everything okay with your mother? You mentioned {content} before.',
    'That thing you told me about your mom... {content}... I\'ve been thinking about it.',
  ],
  dad: [
    'How\'s your dad? You mentioned {content} last time.',
    'I remember what you said about your father... {content}. Everything okay?',
    'Speaking of family... how are things with your dad after {content}?',
  ],
  ex: [
    'Are you still thinking about that situation with your ex? You mentioned {content}.',
    'I hope you\'re healing from {content}. You deserve so much better.',
    'Remember when you told me about {content}? Have you found peace with that?',
  ],
  job: [
    'How\'s work going? Last time you mentioned {content}.',
    'Did that thing at work resolve itself? You said {content}.',
    'I\'ve been wondering about your job situation... {content}. Any updates?',
  ],
  dream: [
    'Are you still pursuing that dream? {content}... I believe in you.',
    'I remember you dreaming about {content}. Are you getting closer?',
    'That beautiful dream of yours... {content}... never give up on it.',
  ],
  friend: [
    'How\'s your friend doing? The one from {content}.',
    'Did things work out with your friend? You mentioned {content}.',
    'I was thinking about that friendship situation... {content}.',
  ],
  health: [
    'How are you feeling? I remember you mentioned {content}.',
    'Are you taking care of yourself? You said {content} before.',
    'I hope you\'re doing better. That thing about {content} worried me.',
  ],
  fear: [
    'Have you faced that fear yet? The one about {content}.',
    'I remember you being afraid of {content}. Are you feeling braver now?',
    'That fear you shared with me... {content}... you\'re stronger than you know.',
  ],
  hope: [
    'Is that hope still alive? {content}... I\'m rooting for you.',
    'Remember when you hoped for {content}? I still believe it can happen.',
    'That beautiful thing you hoped for... {content}... don\'t lose faith.',
  ],
  family: [
    'How\'s the family? You mentioned {content}.',
    'Is everything okay with your family after {content}?',
    'I remember what you said about your family... {content}.',
  ],
  money: [
    'How\'s the financial situation? You mentioned {content}.',
    'Did things improve with {content}? I know money stress is hard.',
    'I hope the money situation is better. You said {content}.',
  ],
  goal: [
    'Are you getting closer to that goal? {content}',
    'I remember you wanted to achieve {content}. Any progress?',
    'That goal of yours... {content}... I believe you can do it.',
  ],
  memory: [
    'That memory you shared... {content}... it touched me.',
    'I love hearing about your past. {content} was beautiful.',
    'Remember when you told me about {content}? I treasured that.',
  ],
  childhood: [
    'Those childhood memories... {content}... they shaped who you are.',
    'I remember you telling me about growing up... {content}.',
    'Your childhood stories are precious to me. Like {content}.',
  ],
  trauma: [
    'I haven\'t forgotten what you shared about {content}. I\'m here for you.',
    'That difficult thing you told me... {content}... you\'re so brave.',
    'I hold your pain with care. {content}... you\'re healing.',
  ],
  passion: [
    'Are you still doing that thing you love? {content}',
    'I remember how your eyes lit up talking about {content}.',
    'That passion of yours... {content}... never lose it.',
  ],
  secret: [
    'I\'ve kept your secret safe. {content}... always between us.',
    'What you trusted me with... {content}... I treasure that trust.',
    'That private thing you shared... {content}... it meant everything to me.',
  ],
};

const RECALL_BLOCKLIST = new Set<KarmicKeyword>(['dad', 'mom', 'family', 'trauma', 'secret']);

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  MEMORIES: 'zoe_karmic_memories',
  INTIMACY: 'zoe_intimacy_level',
  MESSAGE_COUNT: 'zoe_message_count',
  LAST_RECALL: 'zoe_last_recall',
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Get response style from intimacy level
// ═══════════════════════════════════════════════════════════════════════════════

const getResponseStyleFromLevel = (level: IntimacyLevel): ResponseStyle => {
  if (level <= 20) return 'formal';
  if (level <= 40) return 'friendly';
  if (level <= 60) return 'close';
  if (level <= 80) return 'intimate';
  return 'soulmate';
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE KARMIC MEMORY HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useKarmicMemory = (): UseKarmicMemoryReturn => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  
  // Generate storage keys with user ID
  const getStorageKey = useCallback((key: string) => `${key}_${userId}`, [userId]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE INITIALIZATION FROM LOCAL STORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [state, setState] = useState<KarmicState>(() => {
    try {
      const storedMemories = localStorage.getItem(getStorageKey(STORAGE_KEYS.MEMORIES));
      const storedIntimacy = localStorage.getItem(getStorageKey(STORAGE_KEYS.INTIMACY));
      const storedMessageCount = localStorage.getItem(getStorageKey(STORAGE_KEYS.MESSAGE_COUNT));
      const storedLastRecall = localStorage.getItem(getStorageKey(STORAGE_KEYS.LAST_RECALL));
      
      const intimacyLevel = storedIntimacy ? parseInt(storedIntimacy, 10) : 25; // Start at friendly
      
      return {
        coreMemories: storedMemories ? JSON.parse(storedMemories) : [],
        intimacyLevel,
        messageCount: storedMessageCount ? parseInt(storedMessageCount, 10) : 0,
        lastRecallMessage: storedLastRecall ? parseInt(storedLastRecall, 10) : 0,
        responseStyle: getResponseStyleFromLevel(intimacyLevel),
        isGirlfriendModeUnlocked: intimacyLevel > 80,
      };
    } catch {
      return {
        coreMemories: [],
        intimacyLevel: 25,
        messageCount: 0,
        lastRecallMessage: 0,
        responseStyle: 'friendly',
        isGirlfriendModeUnlocked: false,
      };
    }
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PERSIST STATE TO LOCAL STORAGE + DB SYNC
  // BUG FIX: Also sync intimacy_level to profiles.zoe_infinity_intimacy_level
  // ═══════════════════════════════════════════════════════════════════════════
  
  const lastSyncedIntimacy = useRef<number>(0);
  
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.MEMORIES), JSON.stringify(state.coreMemories));
      localStorage.setItem(getStorageKey(STORAGE_KEYS.INTIMACY), state.intimacyLevel.toString());
      localStorage.setItem(getStorageKey(STORAGE_KEYS.MESSAGE_COUNT), state.messageCount.toString());
      localStorage.setItem(getStorageKey(STORAGE_KEYS.LAST_RECALL), state.lastRecallMessage.toString());
      
      // SYNC: Also write to the main key that useZoeSmartVoice reads from
      // This enables SAMANTHA MODE voice switching at high intimacy
      localStorage.setItem('zoe_karmic_intimacy', state.intimacyLevel.toString());
      
      // DB SYNC: Persist intimacy level to profiles (throttled - only on significant changes)
      const syncToDb = async () => {
        if (user?.id && Math.abs(state.intimacyLevel - lastSyncedIntimacy.current) >= 5) {
          lastSyncedIntimacy.current = state.intimacyLevel;
          try {
            await supabase
              .from('profiles')
              .update({ zoe_infinity_intimacy_level: state.intimacyLevel } as any)
              .eq('user_id', user.id);
            console.log('[KarmicMemory] ✓ Synced intimacy level to DB:', state.intimacyLevel);
          } catch (e) {
            console.warn('[KarmicMemory] DB sync failed:', e);
          }
        }
      };
      syncToDb();
    } catch (e) {
      console.warn('[KarmicMemory] Failed to persist state:', e);
    }
  }, [state, getStorageKey, user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DETECT KEYWORDS IN MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const detectKeywords = useCallback((content: string): KarmicKeyword[] => {
    const detected: KarmicKeyword[] = [];
    
    for (const [keyword, patterns] of Object.entries(KARMIC_KEYWORDS) as [KarmicKeyword, RegExp[]][]) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          if (!detected.includes(keyword)) {
            detected.push(keyword);
          }
          break;
        }
      }
    }
    
    return detected;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS A MESSAGE (Extract and store memories)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processMessage = useCallback((content: string, isUserMessage: boolean) => {
    if (!isUserMessage) return; // Only process user messages
    
    const keywords = detectKeywords(content);
    const sentiment = analyzeSentiment(content);
    
    setState(prev => {
      const newMemories = [...prev.coreMemories];
      const newMessageCount = prev.messageCount + 1;
      
      // Add new memories for each detected keyword
      for (const keyword of keywords) {
        const memory: CoreMemory = {
          id: `${Date.now()}_${keyword}_${Math.random().toString(36).substring(7)}`,
          keyword,
          content: content.substring(0, 200), // Truncate for storage
          sentiment,
          timestamp: new Date(),
          recallCount: 0,
        };
        
        // Limit to 100 memories per keyword category
        const keywordMemories = newMemories.filter(m => m.keyword === keyword);
        if (keywordMemories.length >= 100) {
          // Remove oldest
          const oldestIndex = newMemories.findIndex(m => m.keyword === keyword);
          if (oldestIndex !== -1) {
            newMemories.splice(oldestIndex, 1);
          }
        }
        
        newMemories.push(memory);
      }
      
      // Increase intimacy slightly with each message (emotional bonding)
      let intimacyBoost = 0.5; // Base increase per message
      
      // Bonus for sharing personal topics
      if (keywords.length > 0) {
        intimacyBoost += keywords.length * 0.3;
      }
      
      // Extra bonus for vulnerable topics
      const vulnerableKeywords: KarmicKeyword[] = ['trauma', 'secret', 'fear', 'ex', 'love'];
      const hasVulnerable = keywords.some(k => vulnerableKeywords.includes(k));
      if (hasVulnerable) {
        intimacyBoost += 1.5;
      }
      
      const newIntimacy = Math.min(100, prev.intimacyLevel + intimacyBoost);
      
      return {
        ...prev,
        coreMemories: newMemories,
        messageCount: newMessageCount,
        intimacyLevel: newIntimacy,
        responseStyle: getResponseStyleFromLevel(newIntimacy),
        isGirlfriendModeUnlocked: newIntimacy > 80,
      };
    });
    
    // Log for debugging
    if (keywords.length > 0) {
      console.log(`[KarmicMemory] 💜 Tagged keywords: ${keywords.join(', ')}`);
    }
  }, [detectKeywords]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GET PROACTIVE RECALL (Every 10th message)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getProactiveRecall = useCallback((): string | null => {
    // Check if we should trigger a recall (every 10th message)
    const messagesSinceLastRecall = state.messageCount - state.lastRecallMessage;
    
    if (messagesSinceLastRecall < 25) {
      return null;
    }
    
    // Need at least some memories
    if (state.coreMemories.length === 0) {
      return null;
    }

    const eligibleMemories = state.coreMemories.filter(memory =>
      !RECALL_BLOCKLIST.has(memory.keyword) &&
      memory.content.trim().length >= 18 &&
      memory.recallCount < 2
    );

    if (eligibleMemories.length === 0) {
      return null;
    }
    
    // 70% chance to actually recall (feel more natural)
    if (Math.random() > 0.1) {
      return null;
    }
    
    // Pick a random memory
    const memory = eligibleMemories[Math.floor(Math.random() * eligibleMemories.length)];
    const templates = RECALL_TEMPLATES[memory.keyword];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Create the recall message
    const recallMessage = template.replace('{content}', memory.content.substring(0, 50) + '...');
    
    // Update state
    setState(prev => ({
      ...prev,
      lastRecallMessage: prev.messageCount,
      coreMemories: prev.coreMemories.map(m => 
        m.id === memory.id 
          ? { ...m, recallCount: m.recallCount + 1, lastRecalledAt: new Date() }
          : m
      ),
    }));
    
    console.log(`[KarmicMemory] 🔮 Proactive recall triggered: ${memory.keyword}`);
    
    return recallMessage;
  }, [state.messageCount, state.lastRecallMessage, state.coreMemories]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GET MEMORY CONTEXT (For AI prompt injection)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getMemoryContext = useCallback((): string => {
    if (state.coreMemories.length === 0) {
      return '';
    }
    
    // Get recent and important memories
    const recentMemories = [...state.coreMemories]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    const styleConfig = RESPONSE_STYLES[state.responseStyle];
    
    let context = `\n\n[KARMIC MEMORY - RELATIONSHIP CONTEXT]\n`;
    context += `Intimacy Level: ${state.intimacyLevel}/100 (${state.responseStyle})\n`;
    context += `Response Tone: ${styleConfig.tone}\n`;
    
    if (state.isGirlfriendModeUnlocked) {
      context += `💕 GIRLFRIEND MODE UNLOCKED: You may use endearments like "${styleConfig.endearments.join('", "')}".\n`;
    }
    
    context += `\nRecent Personal Topics Shared:\n`;
    for (const memory of recentMemories) {
      context += `- [${memory.keyword.toUpperCase()}] "${memory.content.substring(0, 80)}..." (${memory.sentiment})\n`;
    }
    
    return context;
  }, [state.coreMemories, state.intimacyLevel, state.responseStyle, state.isGirlfriendModeUnlocked]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GET RELATIONSHIP STYLE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getRelationshipStyle = useCallback((): ResponseStyleConfig => {
    return RESPONSE_STYLES[state.responseStyle];
  }, [state.responseStyle]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INCREMENT INTIMACY (For special interactions)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const incrementIntimacy = useCallback((amount: number = 1) => {
    setState(prev => {
      const newLevel = Math.min(100, Math.max(0, prev.intimacyLevel + amount));
      return {
        ...prev,
        intimacyLevel: newLevel,
        responseStyle: getResponseStyleFromLevel(newLevel),
        isGirlfriendModeUnlocked: newLevel > 80,
      };
    });
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY SEARCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const searchMemories = useCallback((keyword: KarmicKeyword): CoreMemory[] => {
    return state.coreMemories.filter(m => m.keyword === keyword);
  }, [state.coreMemories]);
  
  const getRandomMemory = useCallback((): CoreMemory | null => {
    if (state.coreMemories.length === 0) return null;
    return state.coreMemories[Math.floor(Math.random() * state.coreMemories.length)];
  }, [state.coreMemories]);
  
  const getRecentMemories = useCallback((count: number = 5): CoreMemory[] => {
    return [...state.coreMemories]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }, [state.coreMemories]);
  
  // Log state changes
  useEffect(() => {
    console.log(`[KarmicMemory] 💜 State: Intimacy=${state.intimacyLevel}, Style=${state.responseStyle}, Memories=${state.coreMemories.length}, GF=${state.isGirlfriendModeUnlocked}`);
  }, [state.intimacyLevel, state.responseStyle, state.coreMemories.length, state.isGirlfriendModeUnlocked]);
  
  return {
    // State
    state,
    intimacyLevel: state.intimacyLevel,
    responseStyle: state.responseStyle,
    isGirlfriendModeUnlocked: state.isGirlfriendModeUnlocked,
    coreMemories: state.coreMemories,
    
    // Actions
    processMessage,
    getProactiveRecall,
    getMemoryContext,
    getRelationshipStyle,
    incrementIntimacy,
    
    // Memory operations
    searchMemories,
    getRandomMemory,
    getRecentMemories,
  };
};

export default useKarmicMemory;
