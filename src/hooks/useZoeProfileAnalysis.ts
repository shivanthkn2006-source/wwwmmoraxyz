/**
 * ZOE PROFILE ANALYSIS HOOK
 * Enables Zoe to analyze user profile data with permission
 * Uses cost-effective gemini-2.5-flash-lite for analysis
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ProfileAnalysis {
  discoveredInterests: string[];
  personalityInsights: string[];
  activityPatterns: string[];
  suggestions: string[];
  summary: string;
}

interface FullProfileData {
  display_name: string;
  username: string;
  bio?: string;
  profession?: string;
  field_of_study?: string;
  gender?: string;
  hobbies?: string[];
  city?: string;
  status?: string;
  birth_place?: string;
  job_title?: string;
  organization?: string;
  zoe_personality_tone?: string;
  zoe_conversation_style?: string;
  total_points?: number;
  current_tier?: string;
}

export const useZoeProfileAnalysis = () => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<ProfileAnalysis | null>(null);

  // Check if Zoe has permission to access profile data
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('zoe_data_access_enabled')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      const permitted = data?.zoe_data_access_enabled === true;
      setHasPermission(permitted);
      return permitted;
    } catch (error) {
      console.error('[ZoeAnalysis] Permission check failed:', error);
      return false;
    }
  }, [user?.id]);

  // Grant Zoe permission to access profile data
  const grantPermission = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ zoe_data_access_enabled: true })
        .eq('user_id', user.id);

      if (error) throw error;
      setHasPermission(true);
      toast.success('Zoe now has access to analyze your profile');
      return true;
    } catch (error) {
      console.error('[ZoeAnalysis] Grant permission failed:', error);
      toast.error('Failed to grant permission');
      return false;
    }
  }, [user?.id]);

  // Revoke Zoe's permission
  const revokePermission = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ zoe_data_access_enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;
      setHasPermission(false);
      toast.info('Zoe\'s profile access has been revoked');
      return true;
    } catch (error) {
      console.error('[ZoeAnalysis] Revoke permission failed:', error);
      return false;
    }
  }, [user?.id]);

  // Fetch full profile data
  const fetchProfileData = useCallback(async (): Promise<FullProfileData | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          display_name, username, bio, profession, field_of_study, gender,
          hobbies, city, status, birth_place, job_title, organization,
          zoe_personality_tone, zoe_conversation_style, total_points, current_tier
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as FullProfileData;
    } catch (error) {
      console.error('[ZoeAnalysis] Fetch profile failed:', error);
      return null;
    }
  }, [user?.id]);

  // Fetch user activity data (posts, behavioral events)
  const fetchActivityData = useCallback(async () => {
    if (!user?.id) return { posts: [], behaviors: [], emotions: [] };

    try {
      const [postsRes, behaviorsRes, emotionsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('behavioral_events')
          .select('event_type, event_category, sentiment_score, context_snippet')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('emotion_logs')
          .select('emotion, intensity, context')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      return {
        posts: postsRes.data || [],
        behaviors: behaviorsRes.data || [],
        emotions: emotionsRes.data || []
      };
    } catch (error) {
      console.error('[ZoeAnalysis] Fetch activity failed:', error);
      return { posts: [], behaviors: [], emotions: [] };
    }
  }, [user?.id]);

  // Analyze profile using AI (cost-effective model)
  const analyzeProfile = useCallback(async (): Promise<ProfileAnalysis | null> => {
    if (!user?.id) return null;

    const permitted = await checkPermission();
    if (!permitted) {
      toast.error('I need permission to analyze your profile. Say "Zoe access my profile" to grant access.');
      return null;
    }

    setIsAnalyzing(true);

    try {
      const [profile, activity] = await Promise.all([
        fetchProfileData(),
        fetchActivityData()
      ]);

      if (!profile) {
        throw new Error('Could not fetch profile data');
      }

      // Build context for AI analysis
      const analysisContext = {
        profile: {
          name: profile.display_name,
          bio: profile.bio,
          profession: profile.profession,
          fieldOfStudy: profile.field_of_study,
          hobbies: profile.hobbies,
          city: profile.city,
          organization: profile.organization,
          jobTitle: profile.job_title,
          birthPlace: profile.birth_place,
          personalityTone: profile.zoe_personality_tone
        },
        recentPosts: activity.posts.map(p => p.content).slice(0, 10),
        emotionalPatterns: activity.emotions.map(e => `${e.emotion} (${e.intensity}/10)`),
        behaviorSummary: activity.behaviors.slice(0, 20).map(b => b.event_category)
      };

      // Call AI for analysis using cost-effective model
      const { data, error } = await supabase.functions.invoke('zoe-profile-analyzer', {
        body: { 
          context: analysisContext,
          userId: user.id
        }
      });

      if (error) throw error;

      const analysis: ProfileAnalysis = {
        discoveredInterests: data?.interests || [],
        personalityInsights: data?.personality || [],
        activityPatterns: data?.patterns || [],
        suggestions: data?.suggestions || [],
        summary: data?.summary || 'Analysis complete'
      };

      // Save discovered interests to profile
      await supabase
        .from('profiles')
        .update({
          zoe_discovered_interests: analysis.discoveredInterests,
          zoe_last_profile_analysis: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Log to DHF
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'zoe_profile_analysis',
        event_category: 'ai_interaction',
        metadata: { analysis_type: 'full_profile', interests_found: analysis.discoveredInterests.length },
        dhf_logged: true
      });

      setLastAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('[ZoeAnalysis] Analysis failed:', error);
      toast.error('Profile analysis failed');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user?.id, checkPermission, fetchProfileData, fetchActivityData]);

  // Get a quick summary for voice response
  const getQuickInsights = useCallback(async (): Promise<string> => {
    const analysis = await analyzeProfile();
    if (!analysis) {
      return "I don't have permission to analyze your profile yet. Say 'Zoe access my profile' to enable this feature.";
    }

    const interests = analysis.discoveredInterests.slice(0, 5);
    const interestText = interests.length > 0 
      ? `Your main interests include ${interests.join(', ')}.`
      : '';

    const suggestion = analysis.suggestions[0] || '';

    return `${analysis.summary} ${interestText} ${suggestion}`.trim();
  }, [analyzeProfile]);

  return {
    isAnalyzing,
    hasPermission,
    lastAnalysis,
    checkPermission,
    grantPermission,
    revokePermission,
    analyzeProfile,
    getQuickInsights
  };
};
