import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  read: boolean;
  delivered: boolean;
  deleted_by: string[];
  reply_to_message_id: string | null;
  reactions: Record<string, string[]>;
  is_pinned: boolean;
  is_forwarded: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  sender_profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
  };
}

export interface ChatUser {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
  last_message?: Message;
  unread_count?: number;
}

export const useRealTimeChat = () => {
  const { user } = useAuth();
  const channelNameRef = useRef(`messages_changes:${Math.random().toString(36).slice(2, 8)}`);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch friends who can chat
  const fetchChatUsers = useCallback(async () => {
    if (!user) return;

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching chat users:', error);
      setLoading(false);
      return;
    }

    if (!friendships || friendships.length === 0) {
      setChatUsers([]);
      setLoading(false);
      return;
    }

    const friendIds = friendships.map(f => 
      f.user1_id === user.id ? f.user2_id : f.user1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, status, event_date, event_recurring')
      .in('user_id', friendIds);

    if (!profiles) {
      setChatUsers([]);
      setLoading(false);
      return;
    }

    const friends: ChatUser[] = [];

    for (const profile of profiles) {
      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('sender_id', profile.user_id)
        .eq('receiver_id', user.id)
        .eq('read', false);

      friends.push({
        user_id: profile.user_id,
        display_name: profile.display_name,
        username: profile.username,
        profile_photo_url: profile.profile_photo_url,
        status: (profile as any).status,
        event_date: (profile as any).event_date,
        event_recurring: (profile as any).event_recurring,
        last_message: lastMessage ? {
          ...lastMessage,
          deleted_by: (lastMessage.deleted_by as string[]) || [],
          reactions: (lastMessage.reactions as Record<string, string[]>) || {},
          delivered: lastMessage.delivered ?? false,
          is_pinned: lastMessage.is_pinned ?? false,
          is_forwarded: lastMessage.is_forwarded ?? false,
          is_edited: lastMessage.is_edited ?? false,
          edited_at: lastMessage.edited_at ?? null,
        } as Message : undefined,
        unread_count: unreadCount || 0,
      });
    }

    setChatUsers(friends);
    setLoading(false);
  }, [user]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatUserId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatUserId}),and(sender_id.eq.${chatUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Filter out messages deleted by current user and cast types
    const filteredData = (data || [])
      .filter(msg => !(msg.deleted_by as string[] || []).includes(user.id))
      .map(msg => ({
        ...msg,
        deleted_by: (msg.deleted_by as string[]) || [],
        reactions: (msg.reactions as Record<string, string[]>) || {},
        delivered: msg.delivered ?? false,
        is_pinned: msg.is_pinned ?? false,
        is_forwarded: msg.is_forwarded ?? false,
        is_edited: msg.is_edited ?? false,
        edited_at: msg.edited_at ?? null,
      } as Message));

    setMessages(prev => ({
      ...prev,
      [chatUserId]: filteredData
    }));

    // Mark messages as delivered
    await supabase.rpc('mark_messages_delivered', {
      p_user_id: user.id,
      p_sender_id: chatUserId
    });
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    replyToId?: string
  ) => {
    if (!user) return false;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        read: false,
        delivered: false,
        reply_to_message_id: replyToId || null
      });

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  }, [user]);

  // Delete message for current user
  const deleteForMe = useCallback(async (messageId: string) => {
    if (!user) return false;

    const { data: message } = await supabase
      .from('messages')
      .select('deleted_by')
      .eq('id', messageId)
      .maybeSingle();

    const deletedBy = message?.deleted_by || [];
    if (!deletedBy.includes(user.id)) {
      deletedBy.push(user.id);
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_by: deletedBy })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
  }, [user]);

  // Delete message for everyone (only sender can do this)
  const deleteForEveryone = useCallback(async (messageId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error deleting message for everyone:', error);
      return false;
    }

    return true;
  }, [user]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return false;

    const { data: message } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .maybeSingle();

    const reactions = (message?.reactions as Record<string, string[]>) || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    // Toggle reaction - remove if already added, add if not
    if (reactions[emoji].includes(user.id)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== user.id);
      // Remove emoji key if no users have this reaction
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(user.id);
    }

    const { error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId);

    if (error) {
      console.error('Error adding reaction:', error);
      return false;
    }

    return true;
  }, [user]);

  // Toggle pin message
  const togglePinMessage = useCallback(async (messageId: string, isPinned: boolean) => {
    if (!user) return false;

    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: isPinned })
      .eq('id', messageId);

    if (error) {
      console.error('Error toggling pin:', error);
      return false;
    }

    return true;
  }, [user]);

  // Edit message (only within 50 minutes)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user) return false;

    // Check if message exists and belongs to user
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError || !message || message.sender_id !== user.id) {
      return false;
    }

    // Check if within 50 minutes
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (diffMinutes > 50) {
      return false;
    }

    const { error } = await supabase
      .from('messages')
      .update({ 
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error editing message:', error);
      return false;
    }

    return true;
  }, [user]);

  // Bulk delete for me
  const bulkDeleteForMe = useCallback(async (messageIds: string[]) => {
    if (!user) return false;

    for (const messageId of messageIds) {
      const { data: message } = await supabase
        .from('messages')
        .select('deleted_by')
        .eq('id', messageId)
        .maybeSingle();

      const deletedBy = message?.deleted_by || [];
      if (!deletedBy.includes(user.id)) {
        deletedBy.push(user.id);
      }

      await supabase
        .from('messages')
        .update({ deleted_by: deletedBy })
        .eq('id', messageId);
    }

    return true;
  }, [user]);

  // Bulk delete for everyone
  const bulkDeleteForEveryone = useCallback(async (messageIds: string[]) => {
    if (!user) return false;

    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error bulk deleting messages:', error);
      return false;
    }

    return true;
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(async (senderId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const newMessage = {
            ...payload.new,
            deleted_by: (payload.new.deleted_by as string[]) || [],
            reactions: (payload.new.reactions as Record<string, string[]>) || {},
            delivered: payload.new.delivered ?? false,
            is_pinned: payload.new.is_pinned ?? false,
            is_forwarded: payload.new.is_forwarded ?? false,
            is_edited: payload.new.is_edited ?? false,
            edited_at: payload.new.edited_at ?? null,
          } as Message;
          
          setMessages(prev => {
            const chatId = newMessage.sender_id;
            return {
              ...prev,
              [chatId]: [...(prev[chatId] || []), newMessage]
            };
          });
          fetchChatUsers(); // Refresh to update last message and unread count
          
          // Trigger voice notification for new message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', newMessage.sender_id)
            .maybeSingle();
          
          const senderName = senderProfile?.display_name || 'Someone';
          const event = new CustomEvent('lisa-response', {
            detail: { 
              text: `New message from ${senderName}`,
              priority: 8 // High priority for messages
            }
          });
          window.dispatchEvent(event);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = {
            ...payload.new,
            deleted_by: (payload.new.deleted_by as string[]) || [],
            reactions: (payload.new.reactions as Record<string, string[]>) || {},
            delivered: payload.new.delivered ?? false,
            is_pinned: payload.new.is_pinned ?? false,
            is_forwarded: payload.new.is_forwarded ?? false,
            is_edited: payload.new.is_edited ?? false,
            edited_at: payload.new.edited_at ?? null,
          } as Message;
          
          setMessages(prev => {
            const chatId = newMessage.receiver_id;
            return {
              ...prev,
              [chatId]: [...(prev[chatId] || []), newMessage]
            };
          });
          fetchChatUsers(); // Refresh to update last message
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = {
            ...payload.new,
            deleted_by: (payload.new.deleted_by as string[]) || [],
            reactions: (payload.new.reactions as Record<string, string[]>) || {},
            delivered: payload.new.delivered ?? false,
            is_pinned: payload.new.is_pinned ?? false,
            is_forwarded: payload.new.is_forwarded ?? false,
            is_edited: payload.new.is_edited ?? false,
            edited_at: payload.new.edited_at ?? null,
          } as Message;
          
          // Only update if message is relevant to current user
          const isRelevant = updatedMessage.sender_id === user.id || updatedMessage.receiver_id === user.id;
          if (!isRelevant) return;
          
          // Check if message should be hidden for current user
          if (updatedMessage.deleted_by.includes(user.id)) {
            // Remove from UI if deleted by current user
            setMessages(prev => {
              const newMessages = { ...prev };
              Object.keys(newMessages).forEach(chatId => {
                newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== updatedMessage.id);
              });
              return newMessages;
            });
            return;
          }
          
          setMessages(prev => {
            const newMessages = { ...prev };
            // Update message in all relevant chats
            Object.keys(newMessages).forEach(chatId => {
              const messageExists = newMessages[chatId].some(msg => msg.id === updatedMessage.id);
              if (messageExists) {
                newMessages[chatId] = newMessages[chatId].map(msg =>
                  msg.id === updatedMessage.id ? updatedMessage : msg
                );
              }
            });
            return newMessages;
          });
          fetchChatUsers(); // Refresh for status updates like read/delivered
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages(prev => {
            const newMessages = { ...prev };
            Object.keys(newMessages).forEach(chatId => {
              newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== deletedId);
            });
            return newMessages;
          });
          fetchChatUsers(); // Refresh to update last message
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChatUsers]);

  useEffect(() => {
    fetchChatUsers();
  }, [fetchChatUsers]);

  return {
    chatUsers,
    messages,
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    deleteForMe,
    deleteForEveryone,
    addReaction,
    togglePinMessage,
    editMessage,
    bulkDeleteForMe,
    bulkDeleteForEveryone,
  };
};
