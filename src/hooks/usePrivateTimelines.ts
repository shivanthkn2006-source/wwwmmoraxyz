import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface PrivateTimeline {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  members: {
    user_id: string;
    display_name: string;
    username: string;
    profile_photo_url: string | null;
  }[];
}

export const usePrivateTimelines = () => {
  const { user } = useAuth();
  const [timelines, setTimelines] = useState<PrivateTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimelines = async () => {
    if (!user) return;

    try {
      const { data: timelineMembers, error: membersError } = await supabase
        .from('private_timeline_members')
        .select('timeline_id')
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      if (!timelineMembers || timelineMembers.length === 0) {
        setTimelines([]);
        setLoading(false);
        return;
      }

      const timelineIds = timelineMembers.map(m => m.timeline_id);

      const { data: timelinesData, error: timelinesError } = await supabase
        .from('private_timelines')
        .select('*')
        .in('id', timelineIds)
        .order('updated_at', { ascending: false });

      if (timelinesError) throw timelinesError;

      // Fetch members for each timeline
      const timelinesWithMembers = await Promise.all(
        (timelinesData || []).map(async (timeline) => {
          const { data: members } = await supabase
            .from('private_timeline_members')
            .select(`
              user_id,
              profiles:user_id (
                display_name,
                username,
                profile_photo_url
              )
            `)
            .eq('timeline_id', timeline.id);

          return {
            ...timeline,
            members: (members || []).map(m => ({
              user_id: m.user_id,
              ...(m.profiles as any)
            }))
          };
        })
      );

      setTimelines(timelinesWithMembers);
    } catch (error) {
      console.error('Error fetching private timelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTimeline = async (otherUserId: string) => {
    if (!user) return null;

    try {
      const { data: timeline, error: timelineError } = await supabase
        .from('private_timelines')
        .insert({ name: null, user_id: user.id })
        .select()
        .single();

      if (timelineError) throw timelineError;

      // Add creator as member first so RLS allows adding others
      const { error: creatorMemberError } = await supabase
        .from('private_timeline_members')
        .insert({
          timeline_id: timeline.id,
          user_id: user.id,
          added_by_user_id: user.id,
        });

      if (creatorMemberError) throw creatorMemberError;

      // Now safely add the other user as a member
      const added = await addMemberToTimeline(timeline.id, otherUserId);
      if (!added) throw new Error('Failed to add other user to timeline');

      await fetchTimelines();
      return timeline.id;
    } catch (error) {
      console.error('Error creating private timeline:', error);
      return null;
    }
  };

  const addMemberToTimeline = async (timelineId: string, userId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('private_timeline_members')
        .insert({ timeline_id: timelineId, user_id: userId, added_by_user_id: user.id });

      // Ignore duplicate key errors (user already in timeline)
      if (error && error.code !== '23505') throw error;

      await fetchTimelines();
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      return false;
    }
  };

  const removeMemberFromTimeline = async (timelineId: string, userId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('private_timeline_members')
        .delete()
        .eq('timeline_id', timelineId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchTimelines();
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  };

  const deleteTimeline = async (timelineId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('private_timelines')
        .delete()
        .eq('id', timelineId);

      if (error) throw error;

      await fetchTimelines();
      return true;
    } catch (error) {
      console.error('Error deleting timeline:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchTimelines();

    const channel = supabase
      .channel(`private_timelines_changes:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_timeline_members', filter: `user_id=eq.${user.id}` },
        () => {
          fetchTimelines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    timelines,
    loading,
    fetchTimelines,
    createTimeline,
    addMemberToTimeline,
    removeMemberFromTimeline,
    deleteTimeline
  };
};
