// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: ZOE VOICE INTELLIGENCE
// Analyzes voice patterns, detects emotions, adapts responses based on voice cues
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VoiceEmotion = 
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'anxious'
  | 'frustrated'
  | 'calm'
  | 'confused'
  | 'tired';

export type SpeechPace = 'slow' | 'normal' | 'fast' | 'rushed';

export interface VoiceAnalysis {
  // Detected emotional tone
  emotion: VoiceEmotion;
  emotionConfidence: number;
  
  // Speaking characteristics
  pace: SpeechPace;
  volumeLevel: 'quiet' | 'normal' | 'loud';
  
  // Derived insights
  stressIndicators: boolean;
  hesitationDetected: boolean;
  
  // Timing
  analyzedAt: Date;
  speechDurationMs: number;
}

export interface VoiceContextModifier {
  responseStyle: 'supportive' | 'energetic' | 'calm' | 'direct' | 'gentle';
  suggestedTone: string;
  adjustedPace: SpeechPace;
  empathyLevel: 'low' | 'medium' | 'high';
}

interface UseVoiceIntelligenceReturn {
  // Current analysis
  currentAnalysis: VoiceAnalysis | null;
  isAnalyzing: boolean;
  
  // Actions
  analyzeVoiceInput: (audioContext: AudioContext, analyserNode: AnalyserNode) => VoiceAnalysis;
  analyzeFromText: (text: string, speechDuration: number) => VoiceAnalysis;
  getContextModifier: () => VoiceContextModifier;
  getVoicePromptEnhancement: () => string;
  
  // History
  recentAnalyses: VoiceAnalysis[];
  getEmotionalTrend: () => VoiceEmotion;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT-BASED EMOTION DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_PATTERNS: Record<VoiceEmotion, RegExp[]> = {
  happy: [
    /\b(happy|glad|great|wonderful|amazing|awesome|love|excited|yay|woohoo)\b/i,
    /(!{2,}|\b(haha|lol|😊|😃|🎉)\b)/i,
  ],
  excited: [
    /\b(can't wait|so excited|amazing|incredible|wow|omg)\b/i,
    /!{3,}/,
    /\b(pumped|stoked|thrilled)\b/i,
  ],
  sad: [
    /\b(sad|upset|depressed|down|lonely|miss|cry|crying|tears)\b/i,
    /\b(heartbroken|lost|empty|hopeless)\b/i,
  ],
  anxious: [
    /\b(worried|anxious|nervous|scared|stress|stressed|panic|afraid)\b/i,
    /\b(what if|can't stop thinking|keep worrying)\b/i,
  ],
  frustrated: [
    /\b(frustrated|annoyed|angry|mad|irritated|ugh|argh)\b/i,
    /\b(sick of|tired of|fed up|hate)\b/i,
  ],
  calm: [
    /\b(calm|peaceful|relaxed|chill|serene|at peace)\b/i,
    /\b(taking it easy|no rush|in no hurry)\b/i,
  ],
  confused: [
    /\b(confused|don't understand|what do you mean|huh|lost|unclear)\b/i,
    /\?{2,}/,
    /\b(makes no sense|I'm not sure)\b/i,
  ],
  tired: [
    /\b(tired|exhausted|sleepy|worn out|drained|fatigued)\b/i,
    /\b(need sleep|can't think|so done)\b/i,
  ],
  neutral: [],
};

const HESITATION_PATTERNS = [
  /\b(um+|uh+|er+|hmm+|well\.\.\.|let me think|how do I say)\b/i,
  /\.{3,}/,
  /\b(I guess|maybe|perhaps|not sure)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useVoiceIntelligence = (): UseVoiceIntelligenceReturn => {
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<VoiceAnalysis[]>([]);
  
  const analysisHistoryRef = useRef<VoiceAnalysis[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Analyze audio data from Web Audio API
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeVoiceInput = useCallback((
    audioContext: AudioContext,
    analyserNode: AnalyserNode
  ): VoiceAnalysis => {
    setIsAnalyzing(true);
    
    // Get frequency data
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(frequencyData);
    
    // Get time domain data for volume analysis
    const timeData = new Uint8Array(analyserNode.fftSize);
    analyserNode.getByteTimeDomainData(timeData);
    
    // Calculate average volume
    let volumeSum = 0;
    for (let i = 0; i < timeData.length; i++) {
      volumeSum += Math.abs(timeData[i] - 128);
    }
    const avgVolume = volumeSum / timeData.length;
    
    // Determine volume level
    let volumeLevel: 'quiet' | 'normal' | 'loud' = 'normal';
    if (avgVolume < 20) volumeLevel = 'quiet';
    else if (avgVolume > 60) volumeLevel = 'loud';
    
    // Analyze frequency distribution for emotion hints
    // High frequencies often indicate excitement/stress
    // Low frequencies often indicate calm/sadness
    const lowFreqSum = frequencyData.slice(0, 10).reduce((a, b) => a + b, 0);
    const highFreqSum = frequencyData.slice(-20).reduce((a, b) => a + b, 0);
    const freqRatio = lowFreqSum / (highFreqSum + 1);
    
    let emotion: VoiceEmotion = 'neutral';
    let emotionConfidence = 0.5;
    
    if (freqRatio > 3) {
      emotion = 'calm';
      emotionConfidence = 0.7;
    } else if (freqRatio < 0.5 && avgVolume > 50) {
      emotion = 'excited';
      emotionConfidence = 0.7;
    } else if (avgVolume < 15) {
      emotion = 'sad';
      emotionConfidence = 0.6;
    }
    
    const analysis: VoiceAnalysis = {
      emotion,
      emotionConfidence,
      pace: 'normal',
      volumeLevel,
      stressIndicators: volumeLevel === 'loud' || freqRatio < 0.3,
      hesitationDetected: false,
      analyzedAt: new Date(),
      speechDurationMs: 0,
    };
    
    setCurrentAnalysis(analysis);
    setRecentAnalyses(prev => [analysis, ...prev.slice(0, 9)]);
    analysisHistoryRef.current = [analysis, ...analysisHistoryRef.current.slice(0, 19)];
    setIsAnalyzing(false);
    
    return analysis;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Text-based analysis (when audio analysis unavailable)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeFromText = useCallback((text: string, speechDuration: number): VoiceAnalysis => {
    setIsAnalyzing(true);
    
    // Detect emotion from text patterns
    let detectedEmotion: VoiceEmotion = 'neutral';
    let highestConfidence = 0;
    
    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
      if (emotion === 'neutral') continue;
      
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          const confidence = 0.6 + (matches.length * 0.1);
          if (confidence > highestConfidence) {
            highestConfidence = Math.min(confidence, 0.95);
            detectedEmotion = emotion as VoiceEmotion;
          }
        }
      }
    }
    
    // Detect hesitation
    const hesitationDetected = HESITATION_PATTERNS.some(p => p.test(text));
    
    // Calculate pace based on words per minute
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = speechDuration > 0 ? (wordCount / speechDuration) * 60000 : 120;
    
    let pace: SpeechPace = 'normal';
    if (wordsPerMinute < 100) pace = 'slow';
    else if (wordsPerMinute > 180) pace = 'fast';
    else if (wordsPerMinute > 220) pace = 'rushed';
    
    // Detect stress from text
    const stressIndicators = 
      /!{2,}/.test(text) ||
      /\?{2,}/.test(text) ||
      /\b(urgent|asap|emergency|help|now)\b/i.test(text);
    
    // Volume estimation from text cues
    let volumeLevel: 'quiet' | 'normal' | 'loud' = 'normal';
    if (text === text.toUpperCase() && text.length > 10) volumeLevel = 'loud';
    else if (/\.\.\.|hmm|sigh/i.test(text)) volumeLevel = 'quiet';
    
    const analysis: VoiceAnalysis = {
      emotion: detectedEmotion,
      emotionConfidence: highestConfidence || 0.5,
      pace,
      volumeLevel,
      stressIndicators,
      hesitationDetected,
      analyzedAt: new Date(),
      speechDurationMs: speechDuration,
    };
    
    setCurrentAnalysis(analysis);
    setRecentAnalyses(prev => [analysis, ...prev.slice(0, 9)]);
    analysisHistoryRef.current = [analysis, ...analysisHistoryRef.current.slice(0, 19)];
    setIsAnalyzing(false);
    
    console.log(`[VoiceIntelligence] Analyzed: ${detectedEmotion} (${(highestConfidence * 100).toFixed(0)}%), pace: ${pace}`);
    
    return analysis;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Get response modifier based on current analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getContextModifier = useCallback((): VoiceContextModifier => {
    const analysis = currentAnalysis;
    
    if (!analysis) {
      return {
        responseStyle: 'direct',
        suggestedTone: 'friendly and natural',
        adjustedPace: 'normal',
        empathyLevel: 'medium',
      };
    }
    
    const modifiers: Record<VoiceEmotion, VoiceContextModifier> = {
      neutral: {
        responseStyle: 'direct',
        suggestedTone: 'friendly and conversational',
        adjustedPace: 'normal',
        empathyLevel: 'medium',
      },
      happy: {
        responseStyle: 'energetic',
        suggestedTone: 'enthusiastic and celebratory',
        adjustedPace: 'normal',
        empathyLevel: 'medium',
      },
      excited: {
        responseStyle: 'energetic',
        suggestedTone: 'matching their energy, upbeat',
        adjustedPace: 'fast',
        empathyLevel: 'medium',
      },
      sad: {
        responseStyle: 'supportive',
        suggestedTone: 'gentle, warm, validating',
        adjustedPace: 'slow',
        empathyLevel: 'high',
      },
      anxious: {
        responseStyle: 'calm',
        suggestedTone: 'reassuring, grounding, steady',
        adjustedPace: 'slow',
        empathyLevel: 'high',
      },
      frustrated: {
        responseStyle: 'supportive',
        suggestedTone: 'validating, solution-focused',
        adjustedPace: 'normal',
        empathyLevel: 'high',
      },
      calm: {
        responseStyle: 'calm',
        suggestedTone: 'peaceful, relaxed',
        adjustedPace: 'slow',
        empathyLevel: 'medium',
      },
      confused: {
        responseStyle: 'gentle',
        suggestedTone: 'patient, clear, clarifying',
        adjustedPace: 'slow',
        empathyLevel: 'medium',
      },
      tired: {
        responseStyle: 'gentle',
        suggestedTone: 'soft, understanding, concise',
        adjustedPace: 'slow',
        empathyLevel: 'high',
      },
    };
    
    return modifiers[analysis.emotion] || modifiers.neutral;
  }, [currentAnalysis]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Get prompt enhancement for AI
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getVoicePromptEnhancement = useCallback((): string => {
    const analysis = currentAnalysis;
    
    if (!analysis) return '';
    
    const modifier = getContextModifier();
    
    const parts: string[] = [];
    
    // Emotion detection
    if (analysis.emotion !== 'neutral' && analysis.emotionConfidence > 0.6) {
      parts.push(`[VOICE INTEL] User's emotional state detected as: ${analysis.emotion.toUpperCase()} (${(analysis.emotionConfidence * 100).toFixed(0)}% confidence)`);
    }
    
    // Pace analysis
    if (analysis.pace !== 'normal') {
      const paceDescriptions: Record<SpeechPace, string> = {
        slow: 'speaking slowly, may be tired or thoughtful',
        normal: '',
        fast: 'speaking quickly, may be excited or pressed for time',
        rushed: 'speaking very fast, may be stressed or urgent',
      };
      if (paceDescriptions[analysis.pace]) {
        parts.push(`[VOICE INTEL] User is ${paceDescriptions[analysis.pace]}`);
      }
    }
    
    // Stress indicators
    if (analysis.stressIndicators) {
      parts.push('[VOICE INTEL] Stress indicators detected - prioritize calming, grounding response');
    }
    
    // Hesitation
    if (analysis.hesitationDetected) {
      parts.push('[VOICE INTEL] Hesitation detected - user may be uncertain or processing');
    }
    
    // Response guidance
    parts.push(`[RESPONSE STYLE] Use ${modifier.suggestedTone} tone. Empathy level: ${modifier.empathyLevel}`);
    
    return parts.join('\n');
  }, [currentAnalysis, getContextModifier]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Get emotional trend from recent analyses
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getEmotionalTrend = useCallback((): VoiceEmotion => {
    const history = analysisHistoryRef.current;
    
    if (history.length === 0) return 'neutral';
    
    // Count emotions in recent history
    const emotionCounts: Record<VoiceEmotion, number> = {
      neutral: 0,
      happy: 0,
      excited: 0,
      sad: 0,
      anxious: 0,
      frustrated: 0,
      calm: 0,
      confused: 0,
      tired: 0,
    };
    
    // Weight recent analyses more heavily
    history.forEach((analysis, index) => {
      const weight = 1 / (index + 1);
      emotionCounts[analysis.emotion] += weight * analysis.emotionConfidence;
    });
    
    // Find dominant emotion
    let dominantEmotion: VoiceEmotion = 'neutral';
    let highestScore = 0;
    
    for (const [emotion, score] of Object.entries(emotionCounts)) {
      if (score > highestScore) {
        highestScore = score;
        dominantEmotion = emotion as VoiceEmotion;
      }
    }
    
    return dominantEmotion;
  }, []);

  return {
    currentAnalysis,
    isAnalyzing,
    analyzeVoiceInput,
    analyzeFromText,
    getContextModifier,
    getVoicePromptEnhancement,
    recentAnalyses,
    getEmotionalTrend,
  };
};

export default useVoiceIntelligence;
