// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB USER MESSAGING - Send content to any platform user through Zoe Orb
// Supports text, images, voice notes, video, and live video sharing
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  profile_photo_url: string | null;
  status: string | null;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  read: boolean;
  delivered: boolean;
}

interface UseZoeOrbUserMessagingReturn {
  // Mode
  messagingMode: 'zoe' | 'user';
  setMessagingMode: (mode: 'zoe' | 'user') => void;
  
  // Selected user
  selectedUser: UserProfile | null;
  setSelectedUser: (user: UserProfile | null) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: UserProfile[];
  isSearching: boolean;
  searchUsers: (query: string) => Promise<void>;
  
  // Messages
  directMessages: DirectMessage[];
  loadDirectMessages: (userId: string) => Promise<void>;
  sendDirectMessage: (content: string, mediaUrl?: string, mediaType?: string) => Promise<boolean>;
  isSending: boolean;
  
  // Recent contacts
  recentContacts: UserProfile[];
  loadRecentContacts: () => Promise<void>;
}

export const useZoeOrbUserMessaging = (): UseZoeOrbUserMessagingReturn => {
  const { user } = useAuth();
  const [messagingMode, setMessagingMode] = useState<'zoe' | 'user'>('zoe');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [recentContacts, setRecentContacts] = useState<UserProfile[]>([]);

  // Search for users by username or display name
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use safe_public_profiles view to bypass RLS restrictions
      const { data, error } = await supabase
        .from('safe_public_profiles')
        .select('user_id, username, display_name, profile_photo_url, status')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('user_id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('[ZoeOrbMessaging] Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Load recent contacts (users we've messaged before)
  const loadRecentContacts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get unique users from recent messages
      const { data: recentSent, error: sentError } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: recentReceived, error: receivedError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (sentError || receivedError) throw sentError || receivedError;

      // Combine unique user IDs
      const userIds = new Set<string>();
      recentSent?.forEach(m => userIds.add(m.receiver_id));
      recentReceived?.forEach(m => userIds.add(m.sender_id));

      if (userIds.size === 0) {
        setRecentContacts([]);
        return;
      }

      // Fetch profiles using safe_public_profiles view
      const { data: profiles, error: profileError } = await supabase
        .from('safe_public_profiles')
        .select('user_id, username, display_name, profile_photo_url, status')
        .in('user_id', Array.from(userIds))
        .limit(10);

      if (profileError) throw profileError;
      setRecentContacts(profiles || []);
    } catch (err) {
      console.error('[ZoeOrbMessaging] Load recent contacts error:', err);
    }
  }, [user?.id]);

  // Load direct messages with a specific user
  const loadDirectMessages = useCallback(async (userId: string) => {
    if (!user?.id || !userId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setDirectMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', userId)
        .eq('read', false);
    } catch (err) {
      console.error('[ZoeOrbMessaging] Load messages error:', err);
    }
  }, [user?.id]);

  // Send a direct message to selected user
  const sendDirectMessage = useCallback(async (
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<boolean> => {
    if (!user?.id || !selectedUser?.user_id) {
      toast.error('No recipient selected');
      return false;
    }

    if (!content.trim() && !mediaUrl) {
      return false;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.user_id,
          content: content.trim() || null,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          read: false,
          delivered: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local messages
      if (data) {
        setDirectMessages(prev => [...prev, data]);
      }

      toast.success(`Message sent to ${selectedUser.display_name}`);
      return true;
    } catch (err) {
      console.error('[ZoeOrbMessaging] Send error:', err);
      toast.error('Failed to send message');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [user?.id, selectedUser]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!user?.id || !selectedUser?.user_id) return;

    const channel = supabase
      .channel(`dm-${user.id}-${selectedUser.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          if (newMessage.sender_id === selectedUser.user_id) {
            setDirectMessages(prev => [...prev, newMessage]);
            // Mark as read immediately since user is viewing
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedUser?.user_id]);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser?.user_id) {
      loadDirectMessages(selectedUser.user_id);
    } else {
      setDirectMessages([]);
    }
  }, [selectedUser?.user_id, loadDirectMessages]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  return {
    messagingMode,
    setMessagingMode,
    selectedUser,
    setSelectedUser,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchUsers,
    directMessages,
    loadDirectMessages,
    sendDirectMessage,
    isSending,
    recentContacts,
    loadRecentContacts,
  };
};
