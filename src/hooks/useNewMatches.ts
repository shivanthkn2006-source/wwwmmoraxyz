import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const INTERESTS_CATEGORIES = {
  'Creative & Artistic': ['Drawing', 'Painting', 'Photography', 'Writing', 'Music', 'Crafts', 'Design'],
  'Intellectual & Academic': ['Reading', 'Science', 'History', 'Philosophy', 'Languages', 'Research', 'Debate'],
  'Tech & Digital': ['Coding', 'Gaming', 'AI/ML', 'Robotics', 'App Development', 'Cybersecurity', 'Web Design'],
  'Active & Physical': ['Sports', 'Fitness', 'Hiking', 'Dance', 'Yoga', 'Martial Arts', 'Running'],
  'Lifestyle & Social': ['Cooking', 'Travel', 'Fashion', 'Volunteering', 'Socializing', 'Movies', 'Podcasts']
};

export const useNewMatches = () => {
  const { user } = useAuth();
  const [newMatchesCount, setNewMatchesCount] = useState(0);

  const calculateMatches = async () => {
    if (!user) return;

    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('hobbies, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!myProfile?.hobbies || myProfile.hobbies.length === 0) {
        setNewMatchesCount(0);
        return;
      }

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const friendIds = friendships?.map(f =>
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      let profilesQuery = supabase
        .from('public_profiles')
        .select('user_id, hobbies:profiles!inner(hobbies)')
        .neq('user_id', user.id);

      if (friendIds.length > 0) {
        profilesQuery = profilesQuery.not('user_id', 'in', `(${friendIds.join(',')})`);
      }

      const { data: allProfiles } = await profilesQuery;

      if (!allProfiles) {
        setNewMatchesCount(0);
        return;
      }

      let totalMatches = 0;

      Object.entries(INTERESTS_CATEGORIES).forEach(([_, interests]) => {
        const myInterestsInCategory = myProfile.hobbies.filter((h: string) =>
          interests.includes(h)
        );

        allProfiles.forEach(profile => {
          const profileHobbies = (profile.hobbies as any)?.hobbies || [];
          const theirInterestsInCategory = profileHobbies.filter((h: string) =>
            interests.includes(h)
          );

          const commonInterests = myInterestsInCategory.filter((h: string) =>
            theirInterestsInCategory.includes(h)
          );

          if (commonInterests.length >= 3) {
            totalMatches++;
          }
        });
      });

      // Get seen matches from localStorage
      const seenKey = `seen_matches_${user.id}`;
      const seenCount = parseInt(localStorage.getItem(seenKey) || '0');

      // Calculate new matches
      const newMatches = Math.max(0, totalMatches - seenCount);
      setNewMatchesCount(newMatches);
    } catch (error) {
      console.error('Error calculating matches:', error);
      setNewMatchesCount(0);
    }
  };

  const markMatchesAsSeen = () => {
    if (!user) return;
    
    const seenKey = `seen_matches_${user.id}`;
    const currentCount = newMatchesCount + parseInt(localStorage.getItem(seenKey) || '0');
    localStorage.setItem(seenKey, currentCount.toString());
    setNewMatchesCount(0);
  };

  useEffect(() => {
    calculateMatches();
  }, [user]);

  return {
    newMatchesCount,
    markMatchesAsSeen,
    refreshMatches: calculateMatches
  };
};
