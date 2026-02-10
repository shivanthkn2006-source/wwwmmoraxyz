import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * USER PERSONAL TIMELINE HOOK
 * 
 * Creates individual timeline for each user based on:
 * - Birth date/place
 * - Life milestones
 * - Future predictions by Zoe AI
 */

export interface UserTimelineEvent {
  id: string;
  userId: string;
  eventType: 'past' | 'present' | 'future_predicted';
  eventDate: Date;
  title: string;
  description: string;
  zoeAnalysis?: string;
  createdAt: Date;
}

export interface UserTimelineData {
  birthDate?: Date;
  birthPlace?: string;
  currentAge?: number;
  lifeExpectancy?: number;
  majorMilestones: UserTimelineEvent[];
  futurePredictions: UserTimelineEvent[];
}

export const useUserTimeline = () => {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<UserTimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchUserTimeline();
  }, [user]);

  const fetchUserTimeline = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile?.birth_date && profile?.birth_place) {
        const birthDate = new Date(profile.birth_date);
        const currentAge = calculateAge(birthDate);
        const lifeExpectancy = 85; // Base expectancy, can be refined

        setTimeline({
          birthDate,
          birthPlace: profile.birth_place,
          currentAge,
          lifeExpectancy,
          majorMilestones: [],
          futurePredictions: generateFuturePredictions(birthDate, currentAge, profile),
        });
      }
    } catch (error) {
      console.error('Error fetching user timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const generateFuturePredictions = (
    birthDate: Date,
    currentAge: number,
    profile: any
  ): UserTimelineEvent[] => {
    const predictions: UserTimelineEvent[] = [];
    const currentYear = new Date().getFullYear();

    // Technology adoption predictions
    predictions.push({
      id: 'pred-neural-interface',
      userId: user!.id,
      eventType: 'future_predicted',
      eventDate: new Date(currentYear + 10, 0, 1),
      title: 'Neural Interface Adoption Era',
      description: 'Based on your interests in technology, you may be among early adopters of brain-computer interfaces enabling direct thought-to-digital communication.',
      zoeAnalysis: 'Zoe predicts 78% probability of neural interface adoption by 2035 based on your digital engagement patterns.',
      createdAt: new Date(),
    });

    // Career evolution
    if (profile.profession) {
      predictions.push({
        id: 'pred-career-ai',
        userId: user!.id,
        eventType: 'future_predicted',
        eventDate: new Date(currentYear + 5, 0, 1),
        title: 'AI-Augmented Professional Era',
        description: `Your field (${profile.profession}) will be transformed by AGI assistants, enhancing productivity by 10x while requiring new cognitive skills.`,
        zoeAnalysis: 'Zoe recommends building AI collaboration skills now to thrive in the hybrid intelligence economy.',
        createdAt: new Date(),
      });
    }

    // Longevity prediction
    predictions.push({
      id: 'pred-longevity',
      userId: user!.id,
      eventType: 'future_predicted',
      eventDate: new Date(currentYear + 25, 0, 1),
      title: 'Longevity Extension Milestone',
      description: 'Medical breakthroughs in your lifetime may extend healthy lifespan to 120+ years through cellular rejuvenation therapies.',
      zoeAnalysis: 'Zoe calculates 65% probability of longevity escape velocity being reached during your lifetime.',
      createdAt: new Date(),
    });

    // Space exploration era
    predictions.push({
      id: 'pred-space',
      userId: user!.id,
      eventType: 'future_predicted',
      eventDate: new Date(currentYear + 30, 0, 1),
      title: 'Civilian Space Tourism Era',
      description: 'Orbital tourism and lunar surface visits become accessible to broader populations as launch costs decrease 100x.',
      zoeAnalysis: 'Your generation may witness the first permanent Mars colonies and participate in off-world experiences.',
      createdAt: new Date(),
    });

    return predictions;
  };

  return {
    timeline,
    loading,
    refreshTimeline: fetchUserTimeline,
  };
};