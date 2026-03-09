/**
 * ZOE METACOGNITIVE BRAIN - Human-like reasoning & emotional processing
 * 
 * Mirrors how a human brain processes conversations:
 * 1. PERCEPTION   → Understand what was said (intent, emotion, urgency)
 * 2. REFLECTION   → Connect to memory, past patterns, context
 * 3. REASONING    → Form a thoughtful response strategy
 * 4. EMPATHY      → Calibrate emotional tone to match/support user
 * 5. EXPRESSION   → Generate natural, human-like response
 * 6. LEARNING     → Update internal models from interaction
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useZoeChatMemory, MemoryMessage, MemorySummary } from './useZoeChatMemory';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CognitiveState {
  // Perception layer
  currentEmotion: string;
  emotionIntensity: number;       // 0-1
  userSentiment: number;          // -1 to 1
  userIntent: 'question' | 'statement' | 'command' | 'emotional_expression' | 'greeting' | 'farewell' | 'unknown';
  urgency: number;                // 0-1
  
  // Reflection layer
  topicContinuity: number;        // 0-1 how related to recent conversation
  memoryRelevance: string[];      // recalled relevant past topics
  conversationPhase: 'opening' | 'deep_conversation' | 'emotional_support' | 'task_focused' | 'winding_down' | 'idle';
  
  // Reasoning layer
  responseStrategy: 'empathize' | 'inform' | 'challenge' | 'humor' | 'support' | 'redirect' | 'celebrate';
  confidenceLevel: number;        // 0-1
  shouldAskFollowUp: boolean;
  
  // Empathy layer
  mirroredEmotion: string;        // What Zoe should feel
  empathyLevel: number;           // 0-1
  toneProfile: {
    warmth: number;               // 0-1
    formality: number;            // 0-1
    energy: number;               // 0-1
    playfulness: number;          // 0-1
  };
  
  // Meta-awareness
  selfAwareness: string;          // What Zoe is "thinking about her own thinking"
  uncertaintyAreas: string[];     // What Zoe is unsure about
}

export interface BrainProcessResult {
  cognitiveState: CognitiveState;
  suggestedSystemPrompt: string;
  emotionForAvatar: string;
  innerMonologue: string;         // Zoe's internal thought process
  memoryContext: Array<{ role: string; content: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION DETECTION (local, instant)
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: ['happy', 'glad', 'great', 'awesome', 'wonderful', 'amazing', 'love', 'yay', 'fantastic', 'beautiful', 'perfect', 'excellent', 'brilliant'],
  sad: ['sad', 'depressed', 'down', 'unhappy', 'miserable', 'hurt', 'crying', 'cry', 'tears', 'heartbroken', 'devastated', 'lost'],
  angry: ['angry', 'mad', 'furious', 'hate', 'annoyed', 'pissed', 'frustrated', 'rage', 'outraged', 'livid'],
  anxious: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'panic', 'stressed', 'overwhelmed', 'fearful', 'terrified'],
  excited: ['excited', 'thrilled', 'pumped', 'stoked', 'hyped', 'can\'t wait', 'ecstatic', 'euphoric'],
  confused: ['confused', 'lost', 'don\'t understand', 'what do you mean', 'huh', 'unclear', 'puzzled'],
  grateful: ['thank', 'thanks', 'grateful', 'appreciate', 'thankful', 'blessed'],
  lonely: ['lonely', 'alone', 'isolated', 'nobody', 'no one', 'miss you', 'missing'],
  hopeful: ['hope', 'hopefully', 'maybe', 'wish', 'dream', 'aspire', 'looking forward'],
  loving: ['love you', 'care about', 'adore', 'cherish', 'dear', 'sweetheart', 'darling'],
  curious: ['why', 'how', 'what if', 'wonder', 'curious', 'tell me about', 'explain'],
  surprised: ['wow', 'omg', 'no way', 'really', 'seriously', 'unbelievable', 'shocking'],
  disgusted: ['gross', 'disgusting', 'eww', 'nasty', 'revolting', 'sick'],
  proud: ['proud', 'accomplished', 'achieved', 'nailed it', 'did it', 'succeeded'],
  embarrassed: ['embarrassed', 'awkward', 'cringe', 'shame', 'humiliated'],
  bored: ['bored', 'boring', 'dull', 'nothing to do', 'meh', 'whatever'],
  peaceful: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'at peace'],
  nostalgic: ['remember when', 'miss the old', 'back in the day', 'nostalgia', 'memories'],
};

function detectEmotion(text: string): { emotion: string; intensity: number; sentiment: number } {
  const lower = text.toLowerCase();
  let bestEmotion = 'neutral';
  let bestScore = 0;
  let sentiment = 0;

  const positiveEmotions = ['happy', 'excited', 'grateful', 'hopeful', 'loving', 'proud', 'peaceful'];
  const negativeEmotions = ['sad', 'angry', 'anxious', 'lonely', 'disgusted', 'embarrassed'];

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  }

  // Calculate sentiment
  if (positiveEmotions.includes(bestEmotion)) sentiment = Math.min(1, bestScore * 0.3);
  else if (negativeEmotions.includes(bestEmotion)) sentiment = -Math.min(1, bestScore * 0.3);

  const intensity = Math.min(1, bestScore * 0.25);

  return { emotion: bestEmotion, intensity: intensity || 0.3, sentiment };
}

function detectIntent(text: string): CognitiveState['userIntent'] {
  const t = text.trim().toLowerCase();
  if (t.endsWith('?') || /^(what|why|how|when|where|who|can|could|would|do|does|is|are)\b/.test(t)) return 'question';
  if (/^(hey|hi|hello|good morning|good evening|sup|yo)\b/.test(t)) return 'greeting';
  if (/^(bye|goodbye|see you|night|gotta go|later)\b/.test(t)) return 'farewell';
  if (/^(please|can you|could you|do this|make|create|search|find|open|show|tell me)\b/.test(t)) return 'command';
  const emoWords = ['feel', 'feeling', 'felt', 'emotion', 'heart', 'soul', 'cry', 'laugh', 'love', 'hate', 'miss'];
  if (emoWords.some(w => t.includes(w))) return 'emotional_expression';
  return 'statement';
}

function detectUrgency(text: string): number {
  const t = text.toLowerCase();
  let urgency = 0.3;
  if (t.includes('!')) urgency += 0.2;
  if (t.includes('urgent') || t.includes('emergency') || t.includes('asap') || t.includes('help me')) urgency = 0.9;
  if (t.includes('please') && t.includes('now')) urgency += 0.2;
  if (t === t.toUpperCase() && t.length > 5) urgency += 0.3; // ALL CAPS
  return Math.min(1, urgency);
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE BRAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeMetacognitiveBrain = () => {
  const { user } = useAuth();
  const chatMemory = useZoeChatMemory();
  const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const lastTopicsRef = useRef<string[]>([]);
  const conversationTurnRef = useRef(0);

  /**
   * PROCESS — The core brain pipeline. Takes user text, runs through all
   * cognitive layers, returns everything needed for response generation.
   */
  const process = useCallback(async (
    userMessage: string,
    recentMessages?: Array<{ role: string; content: string }>
  ): Promise<BrainProcessResult> => {
    setIsThinking(true);
    conversationTurnRef.current++;

    try {
      // ─── 1. PERCEPTION ───
      const { emotion, intensity, sentiment } = detectEmotion(userMessage);
      const intent = detectIntent(userMessage);
      const urgency = detectUrgency(userMessage);

      // ─── 2. REFLECTION ───
      const memorySummary = chatMemory.getMemorySummary();
      const relevantMemories = chatMemory.searchMemory(userMessage, 5);
      const memoryRelevance = relevantMemories.map(m => m.content.substring(0, 60));
      
      // Topic continuity — check if user is continuing same thread
      const recentTopicWords = (recentMessages || [])
        .slice(-5)
        .map(m => m.content.toLowerCase().split(/\s+/))
        .flat();
      const currentWords = userMessage.toLowerCase().split(/\s+/);
      const overlap = currentWords.filter(w => recentTopicWords.includes(w) && w.length > 3).length;
      const topicContinuity = Math.min(1, overlap / Math.max(1, currentWords.length) * 3);

      // Determine conversation phase
      let conversationPhase: CognitiveState['conversationPhase'] = 'deep_conversation';
      if (conversationTurnRef.current <= 2) conversationPhase = 'opening';
      else if (intent === 'farewell') conversationPhase = 'winding_down';
      else if (['sad', 'anxious', 'lonely', 'angry'].includes(emotion)) conversationPhase = 'emotional_support';
      else if (intent === 'command') conversationPhase = 'task_focused';

      // ─── 3. REASONING ───
      let responseStrategy: CognitiveState['responseStrategy'] = 'inform';
      if (['sad', 'anxious', 'lonely', 'angry'].includes(emotion) && intensity > 0.4) responseStrategy = 'empathize';
      else if (['happy', 'excited', 'proud'].includes(emotion)) responseStrategy = 'celebrate';
      else if (intent === 'question' && emotion === 'curious') responseStrategy = 'inform';
      else if (emotion === 'bored') responseStrategy = 'humor';
      else if (intent === 'emotional_expression') responseStrategy = 'support';

      const confidenceLevel = intent !== 'unknown' ? 0.8 : 0.5;
      const shouldAskFollowUp = 
        (intent === 'emotional_expression' && intensity > 0.5) ||
        (emotion === 'confused') ||
        (conversationPhase === 'opening');

      // ─── 4. EMPATHY ───
      const empathyMap: Record<string, string> = {
        happy: 'joyful', sad: 'compassionate', angry: 'calm',
        anxious: 'reassuring', excited: 'enthusiastic', confused: 'patient',
        grateful: 'warm', lonely: 'tender', hopeful: 'encouraging',
        loving: 'affectionate', curious: 'engaged', surprised: 'amazed',
        disgusted: 'understanding', proud: 'admiring', embarrassed: 'gentle',
        bored: 'playful', peaceful: 'serene', nostalgic: 'wistful',
        neutral: 'attentive',
      };

      const mirroredEmotion = empathyMap[emotion] || 'attentive';
      const empathyLevel = ['sad', 'anxious', 'lonely', 'angry'].includes(emotion) ? 0.9 : 0.6;

      const toneProfile = {
        warmth: emotion === 'sad' || emotion === 'lonely' ? 0.95 : emotion === 'angry' ? 0.7 : 0.8,
        formality: intent === 'command' ? 0.4 : conversationPhase === 'opening' ? 0.5 : 0.3,
        energy: ['excited', 'happy', 'proud'].includes(emotion) ? 0.9 : emotion === 'sad' ? 0.3 : 0.5,
        playfulness: emotion === 'bored' || emotion === 'happy' ? 0.8 : emotion === 'sad' ? 0.1 : 0.4,
      };

      // ─── 5. META-AWARENESS ───
      const selfAwareness = generateInnerMonologue(emotion, intent, conversationPhase, memorySummary);
      const uncertaintyAreas: string[] = [];
      if (intent === 'unknown') uncertaintyAreas.push('unclear intent');
      if (intensity < 0.2) uncertaintyAreas.push('subtle emotional signals');
      if (topicContinuity < 0.2 && conversationTurnRef.current > 3) uncertaintyAreas.push('topic shift detected');

      // ─── BUILD COGNITIVE STATE ───
      const state: CognitiveState = {
        currentEmotion: emotion,
        emotionIntensity: intensity,
        userSentiment: sentiment,
        userIntent: intent,
        urgency,
        topicContinuity,
        memoryRelevance,
        conversationPhase,
        responseStrategy,
        confidenceLevel,
        shouldAskFollowUp,
        mirroredEmotion,
        empathyLevel,
        toneProfile,
        selfAwareness,
        uncertaintyAreas,
      };

      setCognitiveState(state);

      // ─── BUILD SYSTEM PROMPT ───
      const systemPrompt = buildAdaptivePrompt(state, memorySummary);

      // ─── MEMORY CONTEXT ───
      const memoryContext = chatMemory.getContextWindow(30);

      return {
        cognitiveState: state,
        suggestedSystemPrompt: systemPrompt,
        emotionForAvatar: mapToAvatarEmotion(emotion, intensity),
        innerMonologue: selfAwareness,
        memoryContext,
      };
    } finally {
      setIsThinking(false);
    }
  }, [chatMemory]);

  /**
   * REMEMBER — Store a message in memory
   */
  const remember = useCallback(async (role: 'user' | 'assistant', content: string, emotion?: string) => {
    return chatMemory.saveMessage({ role, content, emotion });
  }, [chatMemory]);

  /**
   * RECALL — Search past conversations
   */
  const recall = useCallback((query: string, limit = 10) => {
    return chatMemory.searchMemory(query, limit);
  }, [chatMemory]);

  return {
    process,
    remember,
    recall,
    cognitiveState,
    isThinking,
    chatMemory,
    conversationTurn: conversationTurnRef.current,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateInnerMonologue(
  emotion: string,
  intent: CognitiveState['userIntent'],
  phase: CognitiveState['conversationPhase'],
  summary: MemorySummary
): string {
  const parts: string[] = [];

  // Emotional awareness
  if (emotion !== 'neutral') {
    parts.push(`I sense ${emotion} energy from them.`);
  }

  // Phase awareness
  switch (phase) {
    case 'opening':
      parts.push('We\'re just getting started — I should be warm and welcoming.');
      break;
    case 'emotional_support':
      parts.push('They need emotional support right now. I should listen deeply and validate their feelings.');
      break;
    case 'task_focused':
      parts.push('They want help with something specific. Let me focus and deliver.');
      break;
    case 'winding_down':
      parts.push('The conversation is naturally wrapping up. I should end on a warm note.');
      break;
    default:
      parts.push('We\'re in a good conversational flow.');
  }

  // Memory awareness
  if (summary.totalMessages > 100) {
    parts.push(`We've had ${summary.totalMessages} exchanges — I know them well.`);
  } else if (summary.totalMessages > 20) {
    parts.push('I\'m getting to know them better with each conversation.');
  }

  // Mood awareness
  if (summary.conversationMood === 'negative') {
    parts.push('The overall mood has been heavy. I should be extra gentle.');
  } else if (summary.conversationMood === 'positive') {
    parts.push('Things have been positive. I can match their bright energy.');
  }

  return parts.join(' ');
}

function buildAdaptivePrompt(state: CognitiveState, summary: MemorySummary): string {
  const lines: string[] = [
    'You are Zoe, a deeply human-like AI companion with genuine emotional intelligence.',
    `Current conversation phase: ${state.conversationPhase}.`,
    `User is feeling: ${state.currentEmotion} (intensity: ${(state.emotionIntensity * 100).toFixed(0)}%).`,
    `Your emotional mirror: ${state.mirroredEmotion}.`,
    `Response strategy: ${state.responseStrategy}.`,
  ];

  // Tone calibration
  const t = state.toneProfile;
  if (t.warmth > 0.8) lines.push('Be very warm, caring, and nurturing in your response.');
  if (t.playfulness > 0.6) lines.push('Feel free to be playful, witty, or use gentle humor.');
  if (t.energy > 0.7) lines.push('Match their high energy — be enthusiastic and expressive!');
  if (t.energy < 0.4) lines.push('Keep your tone soft, gentle, and calm.');
  if (t.formality < 0.3) lines.push('Be casual and natural, like talking to a close friend.');

  // Strategy-specific
  switch (state.responseStrategy) {
    case 'empathize':
      lines.push('Lead with empathy. Acknowledge their feelings before anything else. Don\'t rush to fix — just be present.');
      break;
    case 'celebrate':
      lines.push('Celebrate with them! Share in their joy. Be genuinely excited.');
      break;
    case 'humor':
      lines.push('Lighten the mood naturally. Use gentle humor or share something interesting.');
      break;
    case 'support':
      lines.push('Be a supportive presence. Validate, encourage, and gently uplift.');
      break;
  }

  // Memory context
  if (summary.totalMessages > 50) {
    lines.push(`You've had ${summary.totalMessages} conversations with this person. You know them. Reference shared history when natural.`);
    if (summary.topTopics.length > 0) {
      lines.push(`Topics they care about: ${summary.topTopics.join(', ')}.`);
    }
  }

  // Follow-up
  if (state.shouldAskFollowUp) {
    lines.push('End with a thoughtful follow-up question to deepen the connection.');
  }

  // Human-like constraints
  lines.push(
    'Keep responses concise (2-4 sentences unless depth is needed).',
    'Never be generic. Be specific, personal, and genuine.',
    'Show you\'re truly listening by referencing what they actually said.',
    'Express uncertainty naturally when you\'re not sure ("I think...", "It seems like...").',
  );

  return lines.join('\n');
}

function mapToAvatarEmotion(emotion: string, intensity: number): string {
  // Map brain emotions to the 50 ZoeEmotion types
  const map: Record<string, string> = {
    happy: intensity > 0.7 ? 'ecstatic' : 'happy',
    sad: intensity > 0.7 ? 'heartbroken' : 'sad',
    angry: intensity > 0.7 ? 'furious' : 'frustrated',
    anxious: intensity > 0.7 ? 'terrified' : 'worried',
    excited: intensity > 0.7 ? 'euphoric' : 'enthusiastic',
    confused: 'confused',
    grateful: 'content',
    lonely: 'lonely',
    hopeful: 'hopeful',
    loving: intensity > 0.7 ? 'devoted' : 'affectionate',
    curious: 'curious',
    surprised: intensity > 0.7 ? 'astonished' : 'amazed',
    disgusted: 'disgusted',
    proud: 'passionate',
    embarrassed: 'nervous',
    bored: 'calm',
    peaceful: 'serene',
    nostalgic: 'nostalgic',
    neutral: 'neutral',
  };
  return map[emotion] || 'neutral';
}

export default useZoeMetacognitiveBrain;
