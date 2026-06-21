import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
    status?: string;
    event_date?: string;
    event_recurring?: boolean;
  };
}

export const useFriendRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceivedRequests = async () => {
    if (!user) return;

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching received requests:', error);
      return;
    }

    if (!requests || requests.length === 0) {
      setReceivedRequests([]);
      return;
    }

    // Fetch sender profiles separately
    const senderIds = requests.map(req => req.sender_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, status, event_date, event_recurring')
      .in('user_id', senderIds);

    // Merge profiles with requests
    const formatted = requests.map(req => ({
      ...req,
      sender_profile: profiles?.find(p => p.user_id === req.sender_id)
    }));

    setReceivedRequests(formatted as any);
  };

  const fetchSentRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching sent requests:', error);
      return;
    }

    setSentRequests(data || []);
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return false;

    // Check if already friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship) {
      toast({
        title: "Already friends",
        description: "You are already friends with this user",
        variant: "destructive",
      });
      return false;
    }

    // Check if pending request already exists
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);

    if (existing && existing.length > 0) {
      toast({
        title: "Request already exists",
        description: "A pending friend request already exists between you and this user",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

    if (error) {
      console.error('Error sending friend request:', error);
      // Show detailed error message for debugging
      toast({
        title: "Error sending friend request",
        description: error.message || "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    // Dispatch friendship update event for sync
    window.dispatchEvent(new CustomEvent('friendship-updated', {
      detail: { type: 'request_sent', receiverId, timestamp: Date.now() }
    }));

    toast({
      title: "Friend request sent",
      description: "Your friend request has been sent successfully",
    });

    fetchSentRequests();
    return true;
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      // Dispatch friendship update event for sync
      window.dispatchEvent(new CustomEvent('friendship-updated', {
        detail: { type: 'request_accepted', requestId, timestamp: Date.now() }
      }));

      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });

      fetchReceivedRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      // Show detailed error for debugging
      toast({
        title: "Error accepting friend request",
        description: error.message || "Failed to accept friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      // Show detailed error for debugging
      toast({
        title: "Error rejecting friend request",
        description: error.message || "Failed to reject friend request. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Dispatch friendship update event for sync
    window.dispatchEvent(new CustomEvent('friendship-updated', {
      detail: { type: 'request_rejected', requestId, timestamp: Date.now() }
    }));

    toast({
      title: "Friend request rejected",
      description: "The friend request has been rejected",
    });

    fetchReceivedRequests();
  };

  useEffect(() => {
    if (user) {
      fetchReceivedRequests();
      fetchSentRequests();
      setLoading(false);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friend_requests_changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchReceivedRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    receivedRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  };
};
