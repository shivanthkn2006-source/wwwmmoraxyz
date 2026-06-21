/**
 * AMBIENT UI/UX HOOK - 2035 Futuristic Adaptive Design
 * Dynamically adapts platform visual presentation based on ECN emotional state
 * Implements emotional theming, proactive personalization, and universal responsiveness
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ECN emotion to theme mapping
interface EmotionTheme {
  primaryHue: number;
  saturation: number;
  warmth: number;
  intensity: number;
  glowColor: string;
  accentColor: string;
  ambientGradient: string;
}

const EMOTION_THEMES: Record<string, EmotionTheme> = {
  // Positive - Warm, bright themes
  joy: { primaryHue: 45, saturation: 80, warmth: 0.9, intensity: 0.8, glowColor: 'rgba(255, 215, 0, 0.3)', accentColor: 'hsl(45, 100%, 60%)', ambientGradient: 'linear-gradient(135deg, hsl(45 80% 10%), hsl(30 60% 8%))' },
  love: { primaryHue: 330, saturation: 70, warmth: 0.85, intensity: 0.7, glowColor: 'rgba(255, 105, 180, 0.25)', accentColor: 'hsl(330, 81%, 60%)', ambientGradient: 'linear-gradient(135deg, hsl(330 50% 10%), hsl(300 40% 8%))' },
  excitement: { primaryHue: 30, saturation: 90, warmth: 0.95, intensity: 0.9, glowColor: 'rgba(255, 140, 0, 0.35)', accentColor: 'hsl(30, 100%, 55%)', ambientGradient: 'linear-gradient(135deg, hsl(30 70% 12%), hsl(15 60% 8%))' },
  gratitude: { primaryHue: 150, saturation: 60, warmth: 0.7, intensity: 0.6, glowColor: 'rgba(152, 251, 152, 0.2)', accentColor: 'hsl(150, 90%, 45%)', ambientGradient: 'linear-gradient(135deg, hsl(150 40% 10%), hsl(130 30% 8%))' },
  optimism: { primaryHue: 55, saturation: 75, warmth: 0.8, intensity: 0.7, glowColor: 'rgba(255, 235, 59, 0.25)', accentColor: 'hsl(55, 100%, 55%)', ambientGradient: 'linear-gradient(135deg, hsl(55 60% 10%), hsl(45 50% 8%))' },
  
  // Calm - Cool, soothing themes
  calm: { primaryHue: 200, saturation: 50, warmth: 0.5, intensity: 0.4, glowColor: 'rgba(135, 206, 235, 0.2)', accentColor: 'hsl(200, 70%, 55%)', ambientGradient: 'linear-gradient(135deg, hsl(200 40% 8%), hsl(210 30% 6%))' },
  relief: { primaryHue: 175, saturation: 45, warmth: 0.55, intensity: 0.45, glowColor: 'rgba(152, 216, 200, 0.2)', accentColor: 'hsl(175, 60%, 50%)', ambientGradient: 'linear-gradient(135deg, hsl(175 35% 8%), hsl(180 25% 6%))' },
  neutral: { primaryHue: 220, saturation: 30, warmth: 0.5, intensity: 0.35, glowColor: 'rgba(100, 149, 237, 0.15)', accentColor: 'hsl(220, 50%, 55%)', ambientGradient: 'linear-gradient(135deg, hsl(220 30% 8%), hsl(230 20% 6%))' },
  
  // Focused - Electric, alert themes
  curiosity: { primaryHue: 185, saturation: 85, warmth: 0.6, intensity: 0.75, glowColor: 'rgba(0, 206, 209, 0.3)', accentColor: 'hsl(185, 100%, 45%)', ambientGradient: 'linear-gradient(135deg, hsl(185 60% 10%), hsl(195 50% 8%))' },
  realization: { primaryHue: 190, saturation: 80, warmth: 0.65, intensity: 0.8, glowColor: 'rgba(0, 206, 209, 0.35)', accentColor: 'hsl(190, 100%, 50%)', ambientGradient: 'linear-gradient(135deg, hsl(190 55% 10%), hsl(200 45% 8%))' },
  
  // Negative - Cooler, muted themes (not alarming)
  anxiety: { primaryHue: 220, saturation: 40, warmth: 0.4, intensity: 0.5, glowColor: 'rgba(100, 149, 237, 0.2)', accentColor: 'hsl(220, 60%, 50%)', ambientGradient: 'linear-gradient(135deg, hsl(220 35% 8%), hsl(230 30% 6%))' },
  sadness: { primaryHue: 220, saturation: 35, warmth: 0.35, intensity: 0.4, glowColor: 'rgba(70, 130, 180, 0.15)', accentColor: 'hsl(220, 50%, 50%)', ambientGradient: 'linear-gradient(135deg, hsl(220 30% 7%), hsl(230 25% 5%))' },
  frustration: { primaryHue: 15, saturation: 50, warmth: 0.6, intensity: 0.55, glowColor: 'rgba(205, 92, 92, 0.2)', accentColor: 'hsl(15, 60%, 55%)', ambientGradient: 'linear-gradient(135deg, hsl(15 40% 8%), hsl(20 35% 6%))' },
  anger: { primaryHue: 0, saturation: 40, warmth: 0.5, intensity: 0.4, glowColor: 'rgba(220, 20, 60, 0.15)', accentColor: 'hsl(0, 50%, 45%)', ambientGradient: 'linear-gradient(135deg, hsl(0 30% 8%), hsl(350 25% 6%))' },
  disgust: { primaryHue: 80, saturation: 25, warmth: 0.3, intensity: 0.3, glowColor: 'rgba(107, 142, 35, 0.15)', accentColor: 'hsl(80, 40%, 40%)', ambientGradient: 'linear-gradient(135deg, hsl(80 20% 7%), hsl(90 15% 5%))' },
};

interface AmbientState {
  currentEmotion: string;
  theme: EmotionTheme;
  transitionProgress: number;
  isTransitioning: boolean;
  contextSuggestions: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface LocationContext {
  city?: string;
  timezone?: string;
  localTime?: Date;
}

export const useAmbientUI = () => {
  const { user } = useAuth();
  
  const [state, setState] = useState<AmbientState>({
    currentEmotion: 'neutral',
    theme: EMOTION_THEMES.neutral,
    transitionProgress: 1,
    isTransitioning: false,
    contextSuggestions: [],
    timeOfDay: 'afternoon'
  });

  const [locationContext, setLocationContext] = useState<LocationContext>({});

  // Determine time of day
  const getTimeOfDay = useCallback((): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }, []);

  // Get contextual suggestions based on time and activity
  const getContextSuggestions = useCallback((emotion: string, timeOfDay: string): string[] => {
    const suggestions: string[] = [];
    
    if (timeOfDay === 'morning') {
      suggestions.push('Start your day with a quick timeline check');
      if (emotion === 'calm' || emotion === 'neutral') {
        suggestions.push('Perfect time to set your daily intentions');
      }
    }
    
    if (timeOfDay === 'evening') {
      suggestions.push('Wind down with Dream AI synthesis');
      if (['anxiety', 'frustration'].includes(emotion)) {
        suggestions.push('Take a moment to reflect on positive moments');
      }
    }

    if (['joy', 'excitement', 'optimism'].includes(emotion)) {
      suggestions.push('Share your positive energy with a post');
    }

    if (['sadness', 'anxiety'].includes(emotion)) {
      suggestions.push('Zoe is here to listen whenever you need');
    }

    return suggestions.slice(0, 3);
  }, []);

  // Apply ambient CSS variables
  const applyAmbientTheme = useCallback((theme: EmotionTheme) => {
    const root = document.documentElement;
    
    // Apply ambient variables
    root.style.setProperty('--ambient-glow', theme.glowColor);
    root.style.setProperty('--ambient-accent', theme.accentColor);
    root.style.setProperty('--ambient-gradient', theme.ambientGradient);
    root.style.setProperty('--ambient-warmth', theme.warmth.toString());
    root.style.setProperty('--ambient-intensity', theme.intensity.toString());
    
    // Apply subtle background shift
    root.style.setProperty('--ambient-hue-shift', `${theme.primaryHue}deg`);
    root.style.setProperty('--ambient-saturation', `${theme.saturation}%`);
  }, []);

  // Transition to new emotion theme
  const transitionToEmotion = useCallback((newEmotion: string) => {
    const newTheme = EMOTION_THEMES[newEmotion] || EMOTION_THEMES.neutral;
    
    setState(prev => ({
      ...prev,
      isTransitioning: true,
      currentEmotion: newEmotion,
      theme: newTheme,
      transitionProgress: 0
    }));

    // Smooth transition over 2 seconds
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        clearInterval(interval);
        setState(prev => ({ ...prev, isTransitioning: false, transitionProgress: 1 }));
      } else {
        setState(prev => ({ ...prev, transitionProgress: progress }));
      }
    }, 100);

    applyAmbientTheme(newTheme);
  }, [applyAmbientTheme]);

  // Fetch ECN state and apply theme
  useEffect(() => {
    if (!user?.id) return;

    const fetchECNState = async () => {
      const { data } = await supabase
        .from('ecn_history')
        .select('primary_emotion')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.primary_emotion && data.primary_emotion !== state.currentEmotion) {
        transitionToEmotion(data.primary_emotion);
      }
    };

    // Initial fetch
    fetchECNState();

    // Set up realtime subscription
    const channel = supabase
      .channel('ecn-ambient')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ecn_history',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const emotion = (payload.new as any).primary_emotion;
        if (emotion && emotion !== state.currentEmotion) {
          transitionToEmotion(emotion);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, state.currentEmotion, transitionToEmotion]);

  // Update time of day and suggestions
  useEffect(() => {
    const updateContext = () => {
      const timeOfDay = getTimeOfDay();
      const suggestions = getContextSuggestions(state.currentEmotion, timeOfDay);
      
      setState(prev => ({
        ...prev,
        timeOfDay,
        contextSuggestions: suggestions
      }));
    };

    updateContext();
    const interval = setInterval(updateContext, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [state.currentEmotion, getTimeOfDay, getContextSuggestions]);

  // Get CSS class for ambient effect
  const ambientClass = useMemo(() => {
    const warmthClass = state.theme.warmth > 0.7 ? 'ambient-warm' : 
                       state.theme.warmth < 0.4 ? 'ambient-cool' : 'ambient-neutral';
    const intensityClass = state.theme.intensity > 0.7 ? 'ambient-intense' : 
                          state.theme.intensity < 0.4 ? 'ambient-subtle' : 'ambient-moderate';
    
    return `${warmthClass} ${intensityClass} ${state.isTransitioning ? 'ambient-transitioning' : ''}`;
  }, [state.theme, state.isTransitioning]);

  return {
    ...state,
    ambientClass,
    locationContext,
    setLocationContext,
    transitionToEmotion,
    themes: EMOTION_THEMES
  };
};

export default useAmbientUI;
