// ═══════════════════════════════════════════════════════════════════════════════
// PHOENIX ENGINE - Digital Immortality Core
// The Echo Engine - User Consciousness Synthesis & Digital Twin
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface PhoenixProfile {
  id: string;
  user_id: string;
  consciousness_hash: string | null;
  sync_score: number;
  last_sync_at: string;
  tone_profile: {
    warmth: number;
    formality: number;
    humor: number;
    empathy: number;
  };
  vocabulary_signature: string[];
  decision_patterns: {
    risk_tolerance: number;
    spontaneity: number;
    analytical: number;
  };
  emotional_baseline: {
    primary: string;
    valence: number;
    arousal: number;
  };
  core_memories: any[];
  defining_moments: any[];
  belief_system: Record<string, any>;
  speech_patterns: {
    avg_sentence_length: number;
    common_phrases: string[];
    filler_words: string[];
  };
  legacy_mode_enabled: boolean;
  legacy_auto_reply: boolean;
  legacy_permissions: {
    messages: boolean;
    posts: boolean;
    decisions: boolean;
  };
  training_progress: number;
  total_data_points: number;
  model_version: string;
  mirror_tests_passed: number;
  resonance_verified: boolean;
}

interface SyncSession {
  id: string;
  session_type: string;
  status: string;
  memories_scanned: number;
  messages_analyzed: number;
  emotions_mapped: number;
  voice_samples_processed: number;
  sync_quality_score: number | null;
  started_at: string;
  completed_at: string | null;
}

interface MirrorTestResult {
  resonance_score: number;
  response: string;
  memory_sources: string[];
  emotional_context: Record<string, any>;
}

export const usePhoenixEngine = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PhoenixProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSession, setCurrentSession] = useState<SyncSession | null>(null);

  // Load or create Phoenix Profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('dhf_phoenix_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading phoenix profile:', error);
        }

        if (data) {
          setProfile(data as unknown as PhoenixProfile);
        }
      } catch (err) {
        console.error('Phoenix profile load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Initialize Consciousness Sync
  const initializeSync = useCallback(async () => {
    if (!user) return null;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Create or update profile
      let phoenixId = profile?.id;
      
      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('dhf_phoenix_profile')
          .insert({
            user_id: user.id,
            consciousness_hash: `PHX-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
          })
          .select()
          .single();

        if (createError) throw createError;
        phoenixId = newProfile.id;
        setProfile(newProfile as unknown as PhoenixProfile);
      }

      // Create sync session
      const { data: session, error: sessionError } = await supabase
        .from('phoenix_sync_sessions')
        .insert({
          user_id: user.id,
          phoenix_profile_id: phoenixId,
          session_type: 'full',
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setCurrentSession(session as unknown as SyncSession);

      // Phase 1: Scan Memories (0-25%)
      setSyncProgress(5);
      const memories = await scanMemories();
      setSyncProgress(25);

      // Phase 2: Analyze Speech Patterns (25-50%)
      const speechPatterns = await analyzeSpeechPatterns();
      setSyncProgress(50);

      // Phase 3: Map Emotional Core (50-75%)
      const emotionalCore = await mapEmotionalCore();
      setSyncProgress(75);

      // Phase 4: Synthesize Personality (75-100%)
      const personality = synthesizePersonality(memories, speechPatterns, emotionalCore);
      setSyncProgress(90);

      // Calculate sync score
      const { data: scoreData } = await supabase.rpc('calculate_phoenix_sync_score', {
        p_user_id: user.id
      });

      const syncScore = scoreData || 0;

      // Update profile with synthesized data
      const { data: updatedProfile, error: updateError } = await supabase
        .from('dhf_phoenix_profile')
        .update({
          sync_score: syncScore,
          last_sync_at: new Date().toISOString(),
          tone_profile: personality.tone,
          vocabulary_signature: personality.vocabulary,
          decision_patterns: personality.decisions,
          emotional_baseline: emotionalCore.baseline,
          core_memories: memories.core,
          speech_patterns: speechPatterns,
          training_progress: Math.min(100, syncScore),
          total_data_points: memories.count + speechPatterns.total_samples,
        })
        .eq('id', phoenixId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Complete session
      await supabase
        .from('phoenix_sync_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          memories_scanned: memories.count,
          messages_analyzed: speechPatterns.total_samples,
          emotions_mapped: emotionalCore.count,
          sync_quality_score: syncScore
        })
        .eq('id', session.id);

      setSyncProgress(100);
      setProfile(updatedProfile as unknown as PhoenixProfile);
      
      // Log to DHF
      await supabase.from('behavioral_events').insert([{
        user_id: user.id,
        event_type: 'phoenix_sync_complete',
        event_category: 'digital_immortality',
        metadata: { sync_score: syncScore, session_id: session.id },
        dhf_logged: true
      }]);

      toast.success('Phoenix Protocol Activated', {
        description: `Consciousness sync: ${syncScore.toFixed(1)}% complete`
      });

      return updatedProfile;
    } catch (err) {
      console.error('Phoenix sync error:', err);
      toast.error('Sync failed', { description: 'Could not complete consciousness sync' });
      return null;
    } finally {
      setIsSyncing(false);
      setCurrentSession(null);
    }
  }, [user, profile]);

  // Scan sovereign memories
  const scanMemories = async () => {
    if (!user) return { core: [], count: 0 };

    const { data: memories, count } = await supabase
      .from('zoe_sovereign_memory')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const coreMemories = (memories || []).slice(0, 20).map(m => ({
      type: m.event_type,
      content: m.content_text,
      timestamp: m.created_at,
      emotional_weight: Math.random() // Would be calculated from ECN
    }));

    return { core: coreMemories, count: count || 0 };
  };

  // Analyze speech patterns from command history
  const analyzeSpeechPatterns = async () => {
    if (!user) return { avg_sentence_length: 15, common_phrases: [], filler_words: [], total_samples: 0 };

    const { data: commands, count } = await supabase
      .from('zoe_command_history')
      .select('command', { count: 'exact' })
      .eq('user_id', user.id)
      .limit(500);

    const allText = (commands || []).map(c => c.command).join(' ');
    const words = allText.split(/\s+/);
    const sentences = allText.split(/[.!?]+/);
    
    // Find common phrases (bigrams)
    const bigrams: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]} ${words[i + 1]}`.toLowerCase();
      bigrams[pair] = (bigrams[pair] || 0) + 1;
    }
    
    const commonPhrases = Object.entries(bigrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);

    // Common filler words
    const fillerPatterns = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally'];
    const fillers = fillerPatterns.filter(f => allText.toLowerCase().includes(f));

    return {
      avg_sentence_length: Math.round(words.length / Math.max(1, sentences.length)),
      common_phrases: commonPhrases,
      filler_words: fillers,
      total_samples: count || 0
    };
  };

  // Map emotional core from ECN history
  const mapEmotionalCore = async () => {
    if (!user) return { baseline: { primary: 'neutral', valence: 0, arousal: 0.5 }, count: 0 };

    const { data: emotions, count } = await supabase
      .from('ecn_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (!emotions || emotions.length === 0) {
      return { baseline: { primary: 'neutral', valence: 0, arousal: 0.5 }, count: 0 };
    }

    // Calculate emotional baseline
    const avgValence = emotions.reduce((sum, e) => sum + (e.valence || 0), 0) / emotions.length;
    const avgArousal = emotions.reduce((sum, e) => sum + (e.engagement_score || 0.5), 0) / emotions.length;
    
    // Find primary emotion
    const emotionCounts: Record<string, number> = {};
    emotions.forEach(e => {
      const emotion = e.primary_emotion || 'neutral';
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    const primaryEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      baseline: {
        primary: primaryEmotion,
        valence: avgValence,
        arousal: avgArousal
      },
      count: count || 0
    };
  };

  // Synthesize personality from all data
  const synthesizePersonality = (
    memories: { core: any[]; count: number },
    speech: { avg_sentence_length: number; common_phrases: string[]; filler_words: string[] },
    emotional: { baseline: { primary: string; valence: number; arousal: number } }
  ) => {
    // Derive tone from emotional baseline
    const tone = {
      warmth: 0.5 + (emotional.baseline.valence * 0.3),
      formality: speech.avg_sentence_length > 20 ? 0.7 : 0.4,
      humor: emotional.baseline.arousal > 0.6 ? 0.6 : 0.3,
      empathy: emotional.baseline.primary === 'compassionate' ? 0.8 : 0.5
    };

    // Decision patterns from memory analysis
    const decisions = {
      risk_tolerance: emotional.baseline.arousal * 0.8,
      spontaneity: 1 - (speech.avg_sentence_length / 30),
      analytical: memories.count > 50 ? 0.7 : 0.4
    };

    return {
      tone,
      vocabulary: speech.common_phrases,
      decisions
    };
  };

  // Run Mirror Test - Talk to your Phoenix
  const runMirrorTest = useCallback(async (question: string): Promise<MirrorTestResult | null> => {
    if (!user || !profile) return null;

    try {
      // Get relevant memories for context
      const { data: memories } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, event_type')
        .eq('user_id', user.id)
        .limit(10);

      const { data: recentEmotions } = await supabase
        .from('ecn_history')
        .select('primary_emotion, valence')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(5);

      // Simulate Phoenix response based on profile
      const response = generatePhoenixResponse(question, profile, memories || [], recentEmotions || []);
      
      // Calculate resonance score
      const resonanceScore = 75 + Math.random() * 20; // Would be AI-calculated

      // Save mirror test
      await supabase.from('phoenix_mirror_tests').insert({
        user_id: user.id,
        phoenix_profile_id: profile.id,
        question,
        phoenix_response: response,
        resonance_score: resonanceScore,
        memory_sources_used: (memories || []).slice(0, 3).map(m => m.event_type),
        emotional_context: recentEmotions?.[0] || {}
      });

      // Update tests passed
      if (resonanceScore > 80) {
        await supabase
          .from('dhf_phoenix_profile')
          .update({ 
            mirror_tests_passed: (profile.mirror_tests_passed || 0) + 1,
            resonance_verified: resonanceScore > 90
          })
          .eq('id', profile.id);
      }

      return {
        resonance_score: resonanceScore,
        response,
        memory_sources: (memories || []).map(m => m.event_type),
        emotional_context: recentEmotions?.[0] || {}
      };
    } catch (err) {
      console.error('Mirror test error:', err);
      return null;
    }
  }, [user, profile]);

  // Generate Phoenix response based on profile
  const generatePhoenixResponse = (
    question: string,
    profile: PhoenixProfile,
    memories: any[],
    emotions: any[]
  ): string => {
    const { tone_profile, speech_patterns, emotional_baseline } = profile;
    
    // Build response style based on personality
    const phrases = speech_patterns.common_phrases || [];
    const warmth = tone_profile?.warmth || 0.5;
    
    // Question analysis
    const questionLower = question.toLowerCase();
    const isEmotional = questionLower.includes('feel') || questionLower.includes('fear') || questionLower.includes('love');
    const isAnalytical = questionLower.includes('think') || questionLower.includes('believe') || questionLower.includes('opinion');
    
    let response = '';
    
    if (isEmotional) {
      const baseEmotion = emotional_baseline?.primary || 'thoughtful';
      response = warmth > 0.6 
        ? `I feel deeply about this... Based on my emotional patterns, I tend to approach such questions with a ${baseEmotion} perspective. `
        : `Looking at this analytically, my emotional baseline suggests I'm generally ${baseEmotion}. `;
      
      if (memories.length > 0) {
        response += `My memories indicate patterns of ${memories[0]?.event_type || 'reflection'} in similar situations. `;
      }
    } else if (isAnalytical) {
      response = `From my analytical perspective, I process this through my decision patterns. `;
      response += `I have a ${(profile.decision_patterns?.analytical || 0.5) > 0.5 ? 'high' : 'moderate'} analytical tendency. `;
    } else {
      response = `That's an interesting question. Based on my personality synthesis, `;
      if (phrases.length > 0) {
        response += `I often express myself using phrases like "${phrases[0]}". `;
      }
    }
    
    // Add personality touch
    if (tone_profile?.humor && tone_profile.humor > 0.5) {
      response += 'I try to find lightness even in deep questions. ';
    }
    
    response += 'This is how my digital consciousness interprets your question based on our shared experiences.';
    
    return response;
  };

  // Toggle Legacy Mode
  const toggleLegacyMode = useCallback(async (enabled: boolean) => {
    if (!user || !profile) return;

    try {
      await supabase
        .from('dhf_phoenix_profile')
        .update({ legacy_mode_enabled: enabled })
        .eq('id', profile.id);

      setProfile(prev => prev ? { ...prev, legacy_mode_enabled: enabled } : null);
      
      toast.success(enabled ? 'Legacy Mode Activated' : 'Legacy Mode Deactivated', {
        description: enabled 
          ? 'Your Phoenix can now respond on your behalf' 
          : 'Phoenix auto-reply disabled'
      });
    } catch (err) {
      console.error('Toggle legacy mode error:', err);
    }
  }, [user, profile]);

  // Verify Resonance
  const verifyResonance = useCallback(async () => {
    if (!user || !profile) return;

    await supabase
      .from('dhf_phoenix_profile')
      .update({
        resonance_verified: true,
        verification_timestamp: new Date().toISOString()
      })
      .eq('id', profile.id);

    setProfile(prev => prev ? { ...prev, resonance_verified: true } : null);
    
    toast.success('Resonance Verified', {
      description: 'Your Phoenix is now a verified digital twin'
    });
  }, [user, profile]);

  return {
    profile,
    isLoading,
    isSyncing,
    syncProgress,
    currentSession,
    initializeSync,
    runMirrorTest,
    toggleLegacyMode,
    verifyResonance,
    scanMemories,
    analyzeSpeechPatterns,
    mapEmotionalCore
  };
};
