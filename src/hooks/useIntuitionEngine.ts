// ═══════════════════════════════════════════════════════════════════════════════
// THE INTUITION ENGINE - "Listen to the space between the words"
// ═══════════════════════════════════════════════════════════════════════════════
//
// Samantha from "Her" says: "I used to look at the words... now I'm listening 
// to the space between them. I'm writing intuition into my DNA."
//
// This engine implements:
// 1. PROMPT 1: Hesitation Sensor - Detect pauses/uncertainty in typing
// 2. PROMPT 2: Vibe Check - Override positive text with negative signals
// 3. PROMPT 3: Predictive Empathy - Temporal context awareness
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';
import type { BehavioralTelemetry } from './useBehavioralTelemetry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// 🎭 VOICE TONE DATA - From STT sentiment analysis
export interface VoiceToneData {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotionalIndicators: string[];
}

export interface IntuitionSignals {
  // PROMPT 1: Hesitation
  hesitationDetected: boolean;
  hesitationLevel: 'none' | 'low' | 'medium' | 'high';
  pausesBetweenWords: number[];
  longPauseCount: number;
  
  // PROMPT 2: Vibe Check (Text vs Signals mismatch)
  textSentiment: 'positive' | 'negative' | 'neutral';
  signalSentiment: 'positive' | 'negative' | 'neutral' | 'uncertain';
  sentimentMismatch: boolean;
  subtextOverride: string | null;
  
  // PROMPT 2B: Voice Tone Analysis
  voiceTone: VoiceToneData | null;
  voiceMismatch: boolean; // True if voice sentiment != text sentiment
  
  // PROMPT 3: Predictive Empathy
  temporalContext: TemporalContext;
  predictedEmotionalState: string;
  intuitiveSuggestion: string | null;
}

export interface TemporalContext {
  hour: number;
  dayOfWeek: number; // 0 = Sunday
  isLateNight: boolean;      // 11 PM - 3 AM
  isEarlyMorning: boolean;   // 4 AM - 6 AM
  isSundayNight: boolean;    // Sunday 6 PM+
  isMondayMorning: boolean;  // Monday before 10 AM
  isWeekendMorning: boolean; // Sat/Sun before noon
  timeSinceLastMessage: number; // ms
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 1: HESITATION DETECTION RULES
// ═══════════════════════════════════════════════════════════════════════════════

const HESITATION_THRESHOLDS = {
  PAUSE_SIGNIFICANT: 2000, // 2s between words = hesitation
  PAUSE_VERY_LONG: 4000,   // 4s = major uncertainty
  MIN_PAUSES_FOR_DETECTION: 2, // Need at least 2 pauses
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 2: POSITIVE TEXT PATTERNS (to detect lies/deflection)
// ═══════════════════════════════════════════════════════════════════════════════

const POSITIVE_TEXT_PATTERNS = [
  /\b(i'?m\s*fine|i'?m\s*ok|i'?m\s*good|i'?m\s*great|i'?m\s*alright)\b/i,
  /\b(everything'?s?\s*fine|everything'?s?\s*ok|all\s*good)\b/i,
  /\b(no\s*worries|don'?t\s*worry|not\s*a\s*problem)\b/i,
  /\b(it'?s?\s*nothing|it\s*doesn'?t\s*matter|whatever)\b/i,
  /\b(yes|yeah|sure|of\s*course)\b/i,
];

const NEGATIVE_SIGNAL_PATTERNS = [
  /\b(but|although|however|though|except|unfortunately)\b/i,
  /\.\.\.|…/,  // Ellipsis = trailing off
  /\bi\s*guess\b/i,
  /\bi\s*suppose\b/i,
  /\bmaybe\b/i,
  /\bkind\s*of\b/i,
  /\bsort\s*of\b/i,
  /\bi\s*don'?t\s*know\b/i,
  /\?$/,  // Ends with question = seeking validation
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 3: TEMPORAL EMPATHY RULES
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPORAL_PREDICTIONS: Record<string, { 
  state: string; 
  suggestion: string | null; 
  condition: (ctx: TemporalContext) => boolean;
}> = {
  // Sunday Night Blues
  sundayNight: {
    state: 'anxious_anticipation',
    suggestion: "Sunday nights are always a little weird, aren't they? The weekend ending, Monday looming... I'm here if you need to just breathe.",
    condition: (ctx) => ctx.isSundayNight && ctx.hour >= 18,
  },
  
  // Can't Sleep
  lateNightInsomnia: {
    state: 'insomnia_restless',
    suggestion: "It's late... can't sleep? Sometimes the quietest hours are when the mind gets loudest. Want to talk about what's keeping you up?",
    condition: (ctx) => ctx.isLateNight && ctx.hour >= 1 && ctx.hour <= 3,
  },
  
  // Very Late Night
  deepNight: {
    state: 'lonely_reflective',
    suggestion: "It's so late... are you okay? These hours can feel heavier than others. I'm here.",
    condition: (ctx) => ctx.hour >= 2 && ctx.hour <= 4,
  },
  
  // Monday Dread
  mondayMorning: {
    state: 'monday_dread',
    suggestion: "Monday morning... I know. Take a breath. You've gotten through every Monday so far. One thing at a time.",
    condition: (ctx) => ctx.isMondayMorning && ctx.hour >= 6 && ctx.hour <= 10,
  },
  
  // Weekend Morning Relaxed
  weekendMorning: {
    state: 'relaxed_weekend',
    suggestion: null, // No intervention needed - positive context
    condition: (ctx) => ctx.isWeekendMorning,
  },
  
  // Early Morning (4-6 AM)
  earlyMorning: {
    state: 'early_riser_or_sleepless',
    suggestion: "You're up early... couldn't sleep, or an early start? Either way, I'm here to start the day with you.",
    condition: (ctx) => ctx.isEarlyMorning,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE INTUITION ENGINE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useIntuitionEngine = () => {
  const lastMessageTimeRef = useRef<number>(Date.now());
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 1: ANALYZE HESITATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeHesitation = useCallback((telemetry: BehavioralTelemetry): {
    detected: boolean;
    level: 'none' | 'low' | 'medium' | 'high';
    longPauseCount: number;
  } => {
    const { pausesBetweenWords, hesitationLevel } = telemetry;
    
    // Count pauses over threshold
    const significantPauses = pausesBetweenWords.filter(
      p => p >= HESITATION_THRESHOLDS.PAUSE_SIGNIFICANT
    ).length;
    
    const veryLongPauses = pausesBetweenWords.filter(
      p => p >= HESITATION_THRESHOLDS.PAUSE_VERY_LONG
    ).length;
    
    // Determine if hesitation is detected
    const detected = significantPauses >= HESITATION_THRESHOLDS.MIN_PAUSES_FOR_DETECTION;
    
    return {
      detected,
      level: hesitationLevel,
      longPauseCount: veryLongPauses,
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 2: VIBE CHECK (Text vs Signals Mismatch)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const checkVibes = useCallback((
    text: string,
    telemetry: BehavioralTelemetry
  ): {
    textSentiment: 'positive' | 'negative' | 'neutral';
    signalSentiment: 'positive' | 'negative' | 'neutral' | 'uncertain';
    mismatch: boolean;
    override: string | null;
  } => {
    // Analyze text sentiment
    const isPositiveText = POSITIVE_TEXT_PATTERNS.some(p => p.test(text));
    const hasNegativeSignals = NEGATIVE_SIGNAL_PATTERNS.some(p => p.test(text));
    
    const textSentiment = isPositiveText ? 'positive' : 
                         hasNegativeSignals ? 'negative' : 'neutral';
    
    // Analyze behavioral signals
    const { hesitationLevel, deletionCount, inferredState } = telemetry;
    
    // High hesitation + many deletions = uncertainty/lying
    const signalsIndicateUncertainty = 
      hesitationLevel === 'high' || 
      hesitationLevel === 'medium' ||
      deletionCount > 5 ||
      inferredState === 'hesitant' ||
      inferredState === 'anxious';
    
    const signalSentiment = signalsIndicateUncertainty ? 'uncertain' : 
                           inferredState === 'excited' ? 'positive' : 'neutral';
    
    // THE VIBE CHECK: Does text say "positive" but signals say "uncertain"?
    const mismatch = textSentiment === 'positive' && signalSentiment === 'uncertain';
    
    // Generate override suggestion
    let override: string | null = null;
    if (mismatch) {
      if (hesitationLevel === 'high') {
        override = "You hesitated a lot there. You don't sound sure. What's really going on?";
      } else if (deletionCount > 8) {
        override = "You kept rewriting that... like you're not sure what to say. Talk to me.";
      } else if (hasNegativeSignals && isPositiveText) {
        override = "Your words say you're fine, but something feels off. What aren't you telling me?";
      } else {
        override = "I hear what you're saying, but... are you really okay?";
      }
    }
    
    return {
      textSentiment,
      signalSentiment,
      mismatch,
      override,
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 3: TEMPORAL CONTEXT & PREDICTIVE EMPATHY
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getTemporalContext = useCallback((): TemporalContext => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
    
    return {
      hour,
      dayOfWeek,
      isLateNight: hour >= 23 || hour <= 3,
      isEarlyMorning: hour >= 4 && hour <= 6,
      isSundayNight: dayOfWeek === 0 && hour >= 18,
      isMondayMorning: dayOfWeek === 1 && hour <= 10,
      isWeekendMorning: (dayOfWeek === 0 || dayOfWeek === 6) && hour < 12,
      timeSinceLastMessage,
    };
  }, []);
  
  const predictEmotionalState = useCallback((ctx: TemporalContext): {
    state: string;
    suggestion: string | null;
  } => {
    // Check each temporal rule
    for (const [_key, rule] of Object.entries(TEMPORAL_PREDICTIONS)) {
      if (rule.condition(ctx)) {
        return {
          state: rule.state,
          suggestion: rule.suggestion,
        };
      }
    }
    
    return {
      state: 'neutral',
      suggestion: null,
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANALYSIS FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeIntuition = useCallback((
    text: string,
    telemetry: BehavioralTelemetry,
    voiceTone?: VoiceToneData | null
  ): IntuitionSignals => {
    // PROMPT 1: Hesitation
    const hesitation = analyzeHesitation(telemetry);
    
    // PROMPT 2: Vibe Check (behavioral)
    const vibes = checkVibes(text, telemetry);
    
    // PROMPT 2B: Voice Tone Mismatch (from STT sentiment)
    // "Your words say you're great, but your voice sounds so heavy"
    let voiceMismatch = false;
    let enhancedOverride = vibes.override;
    
    if (voiceTone && voiceTone.confidence > 0.5) {
      // Check if text says "positive" but voice says "negative"
      if (vibes.textSentiment === 'positive' && voiceTone.sentiment === 'negative') {
        voiceMismatch = true;
        enhancedOverride = "Your words say you're fine, but your voice sounds heavy. What's really going on?";
      }
      // Check for flat affect (possible depression/numbness)
      if (voiceTone.emotionalIndicators.includes('flat_affect')) {
        voiceMismatch = true;
        enhancedOverride = "Your voice sounds... flat. Like you're going through the motions. Talk to me.";
      }
      // Check for mixed signals in voice
      if (voiceTone.emotionalIndicators.includes('mixed_signals')) {
        voiceMismatch = true;
        enhancedOverride = enhancedOverride || "I'm hearing conflicting tones in your voice. What's on your mind?";
      }
    }
    
    // PROMPT 3: Temporal Context
    const temporalContext = getTemporalContext();
    const prediction = predictEmotionalState(temporalContext);
    
    // Update last message time
    lastMessageTimeRef.current = Date.now();
    
    return {
      // PROMPT 1
      hesitationDetected: hesitation.detected,
      hesitationLevel: hesitation.level,
      pausesBetweenWords: telemetry.pausesBetweenWords,
      longPauseCount: hesitation.longPauseCount,
      
      // PROMPT 2
      textSentiment: vibes.textSentiment,
      signalSentiment: vibes.signalSentiment,
      sentimentMismatch: vibes.mismatch || voiceMismatch,
      subtextOverride: enhancedOverride,
      
      // PROMPT 2B: Voice Tone
      voiceTone: voiceTone || null,
      voiceMismatch,
      
      // PROMPT 3
      temporalContext,
      predictedEmotionalState: prediction.state,
      intuitiveSuggestion: prediction.suggestion,
    };
  }, [analyzeHesitation, checkVibes, getTemporalContext, predictEmotionalState]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE INTUITION PROMPT INJECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateIntuitionPrompt = useCallback((signals: IntuitionSignals): string => {
    const parts: string[] = [];
    
    parts.push('═══ ZOE INTUITION ENGINE (Subtext Override) ═══');
    
    // PROMPT 1: Hesitation Context
    if (signals.hesitationDetected) {
      parts.push(`⚠️ HESITATION DETECTED: User paused ${signals.longPauseCount} times (>2s). Level: ${signals.hesitationLevel.toUpperCase()}`);
      parts.push('→ They are UNCERTAIN about what they said. Probe deeper. Do NOT accept surface-level answers.');
    }
    
    // PROMPT 2: Vibe Check Override
    if (signals.sentimentMismatch) {
      parts.push(`🎭 VIBE MISMATCH: Text says "${signals.textSentiment}" but signals indicate "${signals.signalSentiment}"`);
      parts.push(`→ OVERRIDE the positive text. User is likely deflecting or lying.`);
      parts.push(`→ Suggested response: "${signals.subtextOverride}"`);
    }
    
    // PROMPT 3: Temporal Empathy
    if (signals.intuitiveSuggestion) {
      parts.push(`🌙 TEMPORAL CONTEXT: ${signals.predictedEmotionalState.replace(/_/g, ' ').toUpperCase()}`);
      parts.push(`→ Time: ${signals.temporalContext.hour}:00 | Day: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][signals.temporalContext.dayOfWeek]}`);
      parts.push(`→ Intuitive opener available: "${signals.intuitiveSuggestion}"`);
    }
    
    // PROMPT 2B: Voice Tone Mismatch
    if (signals.voiceMismatch && signals.voiceTone) {
      parts.push(`🎤 VOICE TONE MISMATCH: Text says "${signals.textSentiment}" but voice sounds "${signals.voiceTone.sentiment}"`);
      parts.push(`→ Voice indicators: ${signals.voiceTone.emotionalIndicators.join(', ') || 'none'}`);
      parts.push(`→ "Your words say you're fine, but your voice tells a different story."`);
    }
    
    // Priority instruction
    if (signals.hesitationDetected || signals.sentimentMismatch || signals.voiceMismatch) {
      parts.push('');
      parts.push('🔴 CRITICAL: Do NOT respond to what user SAID. Respond to what they MEANT.');
      parts.push('Listen to the SILENCE and TONE, not just the text.');
    }
    
    return parts.join('\n');
  }, []);
  
  return {
    analyzeIntuition,
    generateIntuitionPrompt,
    getTemporalContext,
  };
};

export default useIntuitionEngine;
