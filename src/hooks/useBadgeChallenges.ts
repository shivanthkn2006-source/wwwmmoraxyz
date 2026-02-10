import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  challenge_id: string;
  name: string;
  description: string;
  badge_id: string;
  difficulty: string;
  time_limit_hours: number;
  reward_points: number;
  required_actions: any;
  icon: string | null;
  is_active: boolean;
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  user_id: string;
  started_at: string;
  expires_at: string;
  progress: any;
  is_completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
}

export const useBadgeChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<(UserChallenge & Challenge)[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = useCallback(async () => {
    if (!user) return;

    try {
      // Load available challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('badge_challenges')
        .select('*')
        .eq('is_active', true);

      if (challengesError) throw challengesError;

      // Load user's active challenges
      const { data: userChallenges, error: userChallengesError } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gt('expires_at', new Date().toISOString());

      if (userChallengesError) throw userChallengesError;

      // Combine data
      const activeChallengesData = (userChallenges || []).map(uc => {
        const challenge = challenges?.find(c => c.challenge_id === uc.challenge_id);
        return { ...uc, ...challenge } as UserChallenge & Challenge;
      });

      // Filter out challenges user already has active
      const activeChallengeIds = new Set(userChallenges?.map(uc => uc.challenge_id) || []);
      const available = challenges?.filter(c => !activeChallengeIds.has(c.challenge_id)) || [];

      setAvailableChallenges(available);
      setActiveChallenges(activeChallengesData);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const startChallenge = useCallback(async (challengeId: string) => {
    if (!user) return;

    try {
      const challenge = availableChallenges.find(c => c.challenge_id === challengeId);
      if (!challenge) return;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + challenge.time_limit_hours);

      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          expires_at: expiresAt.toISOString(),
          progress: {},
        });

      if (error) throw error;

      toast({
        title: '🎯 Challenge Started!',
        description: `You have ${challenge.time_limit_hours} hours to complete: ${challenge.name}`,
      });

      await loadChallenges();
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to start challenge',
        variant: 'destructive',
      });
    }
  }, [user, availableChallenges, loadChallenges, toast]);

  const updateChallengeProgress = useCallback(async (userChallengeId: string, progress: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_challenges')
        .update({ progress })
        .eq('id', userChallengeId);

      if (error) throw error;

      await loadChallenges();
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  }, [user, loadChallenges]);

  const completeChallenge = useCallback(async (userChallengeId: string) => {
    if (!user) return;

    try {
      const challenge = activeChallenges.find(c => c.id === userChallengeId);
      if (!challenge) return;

      // Mark challenge as completed
      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          reward_claimed: true,
        })
        .eq('id', userChallengeId);

      if (updateError) throw updateError;

      // Update user points
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      const newPoints = (profile?.total_points || 0) + challenge.reward_points;

      await supabase
        .from('profiles')
        .update({ total_points: newPoints })
        .eq('user_id', user.id);

      toast({
        title: '🎉 Challenge Completed!',
        description: `You earned ${challenge.reward_points} points!`,
      });

      await loadChallenges();
    } catch (error) {
      console.error('Error completing challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete challenge',
        variant: 'destructive',
      });
    }
  }, [user, activeChallenges, loadChallenges, toast]);

  useEffect(() => {
    if (user) {
      loadChallenges();
    }
  }, [user, loadChallenges]);

  return {
    availableChallenges,
    activeChallenges,
    loading,
    startChallenge,
    updateChallengeProgress,
    completeChallenge,
    reload: loadChallenges,
  };
};
