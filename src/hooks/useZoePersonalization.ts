import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface PersonalizationData {
  interests_weights: Record<string, number>;
  content_preferences: Record<string, any>;
  communication_style: string;
  response_length_preference: string;
  predicted_interests: string[];
  predicted_behaviors: Record<string, any>;
  next_likely_actions: string[];
  business_mode_enabled: boolean;
  automation_preferences: Record<string, any>;
}

interface BehaviorData {
  daily_usage_patterns: Record<string, number>;
  peak_usage_hours: number[];
  average_session_duration: number;
  voice_command_frequency: number;
  text_interaction_frequency: number;
  preferred_interaction_mode: string;
  post_types_created: Record<string, number>;
  content_creation_times: string[];
  interests_engagement: Record<string, number>;
  common_locations: string[];
  network_type_usage: Record<string, number>;
  huddle_usage_patterns?: HuddleUsagePatterns;
}

interface HuddleUsagePatterns {
  visited_locations: Record<string, number>;
  filtered_interests: Record<string, number>;
  interacted_friends: Record<string, number>;
  peak_huddle_hours: number[];
  preferred_view_mode: string;
  average_filter_changes_per_session: number;
  location_search_frequency: number;
  friend_search_frequency: number;
}

export const useZoePersonalization = () => {
  const { user } = useAuth();
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [behavior, setBehavior] = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPersonalizationData();
      loadBehaviorData();
    }
  }, [user]);

  const loadPersonalizationData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_personalization')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPersonalization(data as any);
      } else {
        // Initialize personalization for new user
        const { data: newData, error: insertError } = await supabase
          .from('zoe_personalization')
          .insert({
            user_id: user.id,
            communication_style: 'balanced',
            response_length_preference: 'medium'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPersonalization(newData as any);
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBehaviorData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_user_behavior')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBehavior(data as any);
      } else {
        // Initialize behavior tracking for new user
        const { data: newData, error: insertError } = await supabase
          .from('zoe_user_behavior')
          .insert({
            user_id: user.id,
            preferred_interaction_mode: 'text'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setBehavior(newData as any);
      }
    } catch (error) {
      console.error('Error loading behavior data:', error);
    }
  };

  const updatePersonalization = async (updates: Partial<PersonalizationData>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_personalization')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPersonalization(data as any);
    } catch (error) {
      console.error('Error updating personalization:', error);
    }
  };

  const trackInteraction = async (interactionType: string, metadata?: any) => {
    if (!user || !behavior) return;

    try {
      const updatedPatterns = {
        ...(behavior.daily_usage_patterns || {}),
        [interactionType]: ((behavior.daily_usage_patterns as any)?.[interactionType] || 0) + 1
      };

      await (supabase as any)
        .from('zoe_user_behavior')
        .update({
          daily_usage_patterns: updatedPatterns,
          [interactionType === 'voice' ? 'voice_command_frequency' : 'text_interaction_frequency']:
            (behavior[interactionType === 'voice' ? 'voice_command_frequency' : 'text_interaction_frequency'] || 0) + 1
        })
        .eq('user_id', user.id);

      // Reload behavior data
      loadBehaviorData();
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const trackHuddleInteraction = async (eventType: string, data?: any) => {
    if (!user || !behavior) return;

    try {
      const currentHour = new Date().getHours();
      const huddlePatterns = behavior.huddle_usage_patterns || {
        visited_locations: {},
        filtered_interests: {},
        interacted_friends: {},
        peak_huddle_hours: [],
        preferred_view_mode: 'map',
        average_filter_changes_per_session: 0,
        location_search_frequency: 0,
        friend_search_frequency: 0
      };

      switch (eventType) {
        case 'location_filter':
          if (data?.location) {
            huddlePatterns.visited_locations[data.location] = 
              (huddlePatterns.visited_locations[data.location] || 0) + 1;
            huddlePatterns.location_search_frequency += 1;
          }
          break;
        case 'interest_filter':
          if (data?.interests) {
            data.interests.forEach((interest: string) => {
              huddlePatterns.filtered_interests[interest] = 
                (huddlePatterns.filtered_interests[interest] || 0) + 1;
            });
          }
          break;
        case 'friend_interaction':
          if (data?.friendId) {
            huddlePatterns.interacted_friends[data.friendId] = 
              (huddlePatterns.interacted_friends[data.friendId] || 0) + 1;
            huddlePatterns.friend_search_frequency += 1;
          }
          break;
        case 'view_mode_change':
          if (data?.viewMode) {
            huddlePatterns.preferred_view_mode = data.viewMode;
          }
          break;
      }

      // Track peak hours
      if (!huddlePatterns.peak_huddle_hours.includes(currentHour)) {
        huddlePatterns.peak_huddle_hours.push(currentHour);
      }

      await supabase
        .from('zoe_user_behavior')
        .update({
          huddle_usage_patterns: huddlePatterns as any
        })
        .eq('user_id', user.id);

      // Reload behavior data
      loadBehaviorData();
    } catch (error) {
      console.error('Error tracking Huddle interaction:', error);
    }
  };

  const getPredictedActions = () => {
    if (!behavior || !personalization) return [];

    const currentHour = new Date().getHours();
    const predictions: string[] = [];

    // Predict based on peak usage hours
    if (behavior.peak_usage_hours.includes(currentHour)) {
      predictions.push('User is likely to be active now');
    }

    // Predict based on interaction preferences
    if (behavior.preferred_interaction_mode === 'voice') {
      predictions.push('User prefers voice commands');
    }

    // Predict based on interests
    if (personalization.predicted_interests.length > 0) {
      predictions.push(`Interested in: ${personalization.predicted_interests.slice(0, 3).join(', ')}`);
    }

    return predictions;
  };

  const getPersonalizedSuggestions = () => {
    if (!behavior || !personalization) return [];

    const suggestions: string[] = [];

    // Suggest based on engagement patterns
    const topInterests = Object.entries(behavior.interests_engagement || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([interest]) => interest);

    if (topInterests.length > 0) {
      suggestions.push(`Explore more about: ${topInterests.join(', ')}`);
    }

    // Suggest based on location patterns
    if (behavior.common_locations.length > 0) {
      suggestions.push(`Discover people near ${behavior.common_locations[0]}`);
    }

    // Suggest based on time patterns
    const currentHour = new Date().getHours();
    if (behavior.peak_usage_hours.includes(currentHour)) {
      suggestions.push('This is your peak activity time - great time to connect!');
    }

    return suggestions;
  };

  const getHuddlePersonalizedSuggestions = () => {
    if (!behavior?.huddle_usage_patterns) return [];

    const suggestions: string[] = [];
    const huddle = behavior.huddle_usage_patterns;

    // Suggest top visited locations
    const topLocations = Object.entries(huddle.visited_locations || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([location]) => location);

    if (topLocations.length > 0) {
      suggestions.push(`You frequently explore ${topLocations[0]}. Check out new people there!`);
    }

    // Suggest based on filtered interests
    const topFilteredInterests = Object.entries(huddle.filtered_interests || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([interest]) => interest);

    if (topFilteredInterests.length > 0) {
      suggestions.push(`Discover more people interested in ${topFilteredInterests.join(', ')}`);
    }

    // Suggest based on time patterns
    const currentHour = new Date().getHours();
    if (huddle.peak_huddle_hours?.includes(currentHour)) {
      suggestions.push('This is your prime Huddle time! Perfect for exploring.');
    }

    // Suggest based on friend interaction patterns
    const topFriends = Object.entries(huddle.interacted_friends || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topFriends.length > 0) {
      suggestions.push('Connect with friends you frequently interact with');
    }

    // Suggest view mode
    if (huddle.preferred_view_mode) {
      suggestions.push(`Switch to ${huddle.preferred_view_mode === 'map' ? 'grid' : 'map'} view for a different perspective`);
    }

    return suggestions;
  };

  return {
    personalization,
    behavior,
    loading,
    updatePersonalization,
    trackInteraction,
    trackHuddleInteraction,
    getPredictedActions,
    getPersonalizedSuggestions,
    getHuddlePersonalizedSuggestions,
    loadBehaviorData,
    loadPersonalizationData
  };
};
