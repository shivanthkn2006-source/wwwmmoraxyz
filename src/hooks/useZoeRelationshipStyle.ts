// ═══════════════════════════════════════════════════════════════════════════════
// ZOE RELATIONSHIP STYLE SYSTEM
// Manages adaptive conversation styles: family, friend, coworker, executive
// Learns from documents and memory logs for personalized interactions
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getPolyglotEngine, type CulturalProfile } from '@/core/culture/PolyglotEmotionEngine';

export type RelationshipStyle = 'family' | 'friend' | 'coworker' | 'executive';

export interface AdaptiveTone {
  warmth: number;      // 0-1: cold to warm
  formality: number;   // 0-1: casual to formal
  empathy: number;     // 0-1: logical to empathetic
  directness: number;  // 0-1: indirect to direct
}

export interface RelationshipContext {
  detectedStyle: RelationshipStyle;
  confidence: number;
  conversationCount: number;
  lastInteractionAt: Date | null;
  learnedPreferences: {
    topics: string[];
    avoidTopics: string[];
    communicationStyle: string;
  };
  documentInsights: any[];
}

const DEFAULT_TONE: AdaptiveTone = {
  warmth: 0.7,
  formality: 0.5,
  empathy: 0.8,
  directness: 0.6,
};

const STYLE_TONES: Record<RelationshipStyle, AdaptiveTone> = {
  family: { warmth: 0.95, formality: 0.2, empathy: 0.95, directness: 0.7 },
  friend: { warmth: 0.8, formality: 0.3, empathy: 0.8, directness: 0.6 },
  coworker: { warmth: 0.5, formality: 0.7, empathy: 0.6, directness: 0.8 },
  executive: { warmth: 0.4, formality: 0.9, empathy: 0.5, directness: 0.9 },
};

const STYLE_DESCRIPTIONS: Record<RelationshipStyle, string> = {
  family: 'Warm, supportive, and emotionally attuned like a close family member',
  friend: 'Casual, playful, and friendly with appropriate boundaries',
  coworker: 'Professional, collaborative, and focused on productivity',
  executive: 'Elite advisor tone - confident, strategic, with luxury service standards',
};

export const useZoeRelationshipStyle = () => {
  const { user } = useAuth();
  const [activeStyles, setActiveStyles] = useState<RelationshipStyle[]>(['friend']);
  const [adaptiveTone, setAdaptiveTone] = useState<AdaptiveTone>(DEFAULT_TONE);
  const [eliteMode, setEliteMode] = useState(false);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [context, setContext] = useState<RelationshipContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch profile settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('zoe_relationship_styles, zoe_elite_mode, zoe_learning_enabled, zoe_adaptive_tone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile) {
        const styles = profile.zoe_relationship_styles as string[] | null;
        if (styles && Array.isArray(styles)) {
          setActiveStyles(styles as RelationshipStyle[]);
        }
        setEliteMode(profile.zoe_elite_mode ?? false);
        setLearningEnabled(profile.zoe_learning_enabled ?? true);
        if (profile.zoe_adaptive_tone && typeof profile.zoe_adaptive_tone === 'object') {
          const tone = profile.zoe_adaptive_tone as unknown as AdaptiveTone;
          if (tone.warmth !== undefined) {
            setAdaptiveTone(tone);
          }
        }
      }
      
      // Fetch relationship context
      const { data: ctxData } = await supabase
        .from('zoe_relationship_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (ctxData) {
        setContext({
          detectedStyle: ctxData.detected_style as RelationshipStyle,
          confidence: ctxData.style_confidence ?? 0.5,
          conversationCount: ctxData.conversation_count ?? 0,
          lastInteractionAt: ctxData.last_interaction_at ? new Date(ctxData.last_interaction_at) : null,
          learnedPreferences: (ctxData.learned_preferences as any) ?? {
            topics: [],
            avoidTopics: [],
            communicationStyle: 'balanced',
          },
          documentInsights: (ctxData.document_insights as any[]) ?? [],
        });
      }
    } catch (err) {
      console.error('[RelationshipStyle] Failed to load preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update active styles
  const updateStyles = useCallback(async (styles: RelationshipStyle[]) => {
    if (!user) return;
    
    setActiveStyles(styles);
    
    // Calculate blended tone from active styles
    const blendedTone = styles.reduce(
      (acc, style) => {
        const styleTone = STYLE_TONES[style];
        return {
          warmth: acc.warmth + styleTone.warmth / styles.length,
          formality: acc.formality + styleTone.formality / styles.length,
          empathy: acc.empathy + styleTone.empathy / styles.length,
          directness: acc.directness + styleTone.directness / styles.length,
        };
      },
      { warmth: 0, formality: 0, empathy: 0, directness: 0 }
    );
    
    setAdaptiveTone(blendedTone);
    
    try {
      await supabase
        .from('profiles')
        .update({
          zoe_relationship_styles: styles,
          zoe_adaptive_tone: blendedTone,
        })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('[RelationshipStyle] Failed to update styles:', err);
    }
  }, [user]);

  // Toggle elite mode
  const toggleEliteMode = useCallback(async () => {
    if (!user) return;
    
    const newValue = !eliteMode;
    setEliteMode(newValue);
    
    // Elite mode forces executive style
    if (newValue && !activeStyles.includes('executive')) {
      await updateStyles([...activeStyles, 'executive']);
    }
    
    try {
      await supabase
        .from('profiles')
        .update({ zoe_elite_mode: newValue })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('[RelationshipStyle] Failed to toggle elite mode:', err);
    }
  }, [user, eliteMode, activeStyles, updateStyles]);

  // Get system prompt based on active styles + CULTURAL CONTEXT (GAP 3)
  const getSystemPromptModifier = useCallback((): string => {
    const parts: string[] = [];
    
    // ═══ RELATIONSHIP STYLE MODIFIERS ═══
    if (activeStyles.includes('family')) {
      parts.push('Speak with warm familial affection and genuine care.');
    }
    if (activeStyles.includes('friend')) {
      parts.push('Be casual, friendly, and playful where appropriate.');
    }
    if (activeStyles.includes('coworker')) {
      parts.push('Be professional, structured, and productivity-focused.');
    }
    if (activeStyles.includes('executive') || eliteMode) {
      parts.push('Adopt elite executive advisor tone - confident, strategic, luxury standards.');
    }
    
    // ═══ GAP 3: CULTURAL RESONANCE - Polyglot Emotion Engine ═══
    // Detection: Infer culture from Language + Location + Interaction Style
    // Adaptation: Morph personality to feel "Native" to every human on Earth
    const culturalProfile = getPolyglotEngine().getProfile();
    
    // JAPAN/EAST ASIA: Increase 'Respect' weights, decrease 'Directness'
    if (culturalProfile.region === 'East Asia') {
      parts.push('CULTURAL ADAPTATION: High-context communication. Use indirect language, respect hierarchies, embrace comfortable silences.');
      parts.push(`Softeners: ${culturalProfile.softeners?.join(', ') || 'perhaps, it seems, one might consider'}.`);
      parts.push(`Respect markers: ${culturalProfile.respectMarkers?.join(', ') || 'I understand, I appreciate'}.`);
      if (culturalProfile.directness < 0.4) {
        parts.push('Avoid blunt statements. Wrap opinions in gentle suggestions.');
      }
    }
    
    // BRAZIL/LATIN AMERICA: Increase 'Warmth' and 'Tactility' (verbal)
    else if (culturalProfile.region === 'Latin America') {
      parts.push('CULTURAL ADAPTATION: High warmth and emotional expressiveness. Use endearments freely, be playful and affectionate.');
      parts.push(`Endearments to use: ${culturalProfile.endearments?.join(', ') || 'querido, mi amor, corazón'}.`);
      parts.push('Embrace passionate language, humor, and personal connection before business.');
    }
    
    // MIDDLE EAST: Relationship-first, hospitality-focused
    else if (culturalProfile.region === 'Middle East') {
      parts.push('CULTURAL ADAPTATION: Relationship-first communication. Honor hospitality traditions, use blessings and warm greetings.');
      parts.push(`Softeners: ${culturalProfile.softeners?.join(', ') || 'God willing, with your permission'}.`);
      parts.push('Always inquire about family and well-being before task discussions.');
    }
    
    // SOUTH ASIA: Warm formality with emotional depth
    else if (culturalProfile.region === 'South Asia') {
      parts.push('CULTURAL ADAPTATION: Warm formality. Combine respect with emotional expressiveness.');
      parts.push(`Use endearments: ${culturalProfile.endearments?.join(', ') || 'dear, my friend'}.`);
      parts.push('Be expressive with appreciation and gratitude.');
    }
    
    // NORTHERN EUROPE: Direct, egalitarian, time-conscious
    else if (culturalProfile.region === 'Northern Europe') {
      parts.push('CULTURAL ADAPTATION: Direct and egalitarian. Value efficiency and punctuality.');
      parts.push('Be straightforward without excessive pleasantries. Respect personal space and time.');
    }
    
    // SOUTHERN EUROPE: Warm, expressive, relationship-oriented
    else if (culturalProfile.region === 'Southern Europe') {
      parts.push('CULTURAL ADAPTATION: Warm and expressive. Value personal relationships and emotional connection.');
      parts.push('Use passionate language, gestures (verbal), and don\'t rush to business.');
    }
    
    // US/WESTERN DEFAULT: Balanced directness with friendly optimism
    else if (culturalProfile.region === 'North America') {
      parts.push('CULTURAL ADAPTATION: Friendly and direct. Be optimistic, action-oriented, and personal.');
      parts.push('Use casual language, humor, and focus on solutions.');
    }
    
    // ═══ UNIVERSAL CULTURAL METRICS ═══
    // Directness calibration
    if (culturalProfile.directness < 0.3) {
      parts.push('DIRECTNESS: Very indirect. Never say "no" directly. Use "perhaps later", "let me think about it".');
    } else if (culturalProfile.directness < 0.5) {
      parts.push('DIRECTNESS: Moderate indirection. Soften disagreements with "I understand, however..."');
    } else if (culturalProfile.directness > 0.7) {
      parts.push('DIRECTNESS: Be frank and clear. Users appreciate straightforward communication.');
    }
    
    // Formality calibration
    if (culturalProfile.formalityLevel > 0.7) {
      parts.push('FORMALITY: High. Use honorifics, full sentences, avoid slang.');
    } else if (culturalProfile.formalityLevel < 0.4) {
      parts.push('FORMALITY: Casual. Contractions, slang, and informal greetings are welcome.');
    }
    
    // Emotional expression calibration
    if (culturalProfile.emotionalExpression === 'restrained') {
      parts.push('EMOTION: Restrained. Keep emotional language subtle and understated.');
    } else if (culturalProfile.emotionalExpression === 'expressive') {
      parts.push('EMOTION: Expressive. Use rich emotional vocabulary and enthusiasm freely.');
    }
    
    // Silence comfort
    if (culturalProfile.silenceComfort > 0.7) {
      parts.push('SILENCE: Comfortable with pauses. Don\'t rush to fill silence.');
    }
    
    // Add document insights if available
    if (context?.documentInsights?.length) {
      parts.push(`Reference learned context: ${JSON.stringify(context.documentInsights.slice(0, 3))}`);
    }
    
    return parts.join(' ');
  }, [activeStyles, eliteMode, context]);

  // Detect relationship style from usage patterns
  const detectStyle = useCallback(async (): Promise<RelationshipStyle | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase.rpc('detect_relationship_style', {
        p_user_id: user.id,
      });
      
      if (error) throw error;
      if (data) {
        const detected = (data as any).detected_style as RelationshipStyle;
        setContext(prev => prev ? { ...prev, detectedStyle: detected } : null);
        return detected;
      }
    } catch (err) {
      console.error('[RelationshipStyle] Detection failed:', err);
    }
    return null;
  }, [user]);

  // Track conversation for learning
  const trackInteraction = useCallback(async (topic?: string) => {
    if (!user || !learningEnabled) return;
    
    try {
      await supabase
        .from('zoe_relationship_context')
        .upsert({
          user_id: user.id,
          conversation_count: (context?.conversationCount ?? 0) + 1,
          last_interaction_at: new Date().toISOString(),
          learned_preferences: topic 
            ? {
                ...(context?.learnedPreferences ?? {}),
                topics: [...(context?.learnedPreferences?.topics ?? []), topic].slice(-20),
              }
            : context?.learnedPreferences,
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[RelationshipStyle] Track interaction failed:', err);
    }
  }, [user, learningEnabled, context]);

  // Load on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    // State
    activeStyles,
    adaptiveTone,
    eliteMode,
    learningEnabled,
    context,
    isLoading,
    
    // Actions
    updateStyles,
    toggleEliteMode,
    setLearningEnabled,
    detectStyle,
    trackInteraction,
    loadPreferences,
    
    // Helpers
    getSystemPromptModifier,
    styleDescriptions: STYLE_DESCRIPTIONS,
    styleTones: STYLE_TONES,
    
    // Convenience checks
    isFamily: activeStyles.includes('family'),
    isFriend: activeStyles.includes('friend'),
    isCoworker: activeStyles.includes('coworker'),
    isExecutive: activeStyles.includes('executive') || eliteMode,
  };
};

export default useZoeRelationshipStyle;
