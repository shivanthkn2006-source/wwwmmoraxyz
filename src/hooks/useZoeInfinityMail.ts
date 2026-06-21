/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE ZOE INFINITY MAIL HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Fetches and manages real mail data from zoe_infinity_mail table.
 * Provides real-time updates, CRUD operations, and notification queue.
 * 
 * FIX: Added notification queue polling and proper Date parsing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MailMessage, GatekeeperVerdict } from '@/components/zoe-infinity/mail/types';
import type { Json } from '@/integrations/supabase/types';

interface ZoeInfinityMailRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  preview: string;
  priority: string;
  category: string;
  relationship_label: string | null;
  relationship_type: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  read_at: string | null;
  metadata: Json | null;
}

interface NotificationQueueItem {
  id: string;
  mail_id: string;
  recipient_id: string;
  sender_name: string;
  sender_username: string;
  relationship_label: string;
  subject: string;
  priority: string;
  category: string;
  is_announced: boolean;
  created_at: string;
}

// Valid priority values
const VALID_PRIORITIES: readonly string[] = ['low', 'normal', 'high', 'urgent'] as const;
type ValidPriority = 'low' | 'normal' | 'high' | 'urgent';

// Convert database row to MailMessage type - FIX: Proper Date parsing
const toMailMessage = (row: ZoeInfinityMailRow): MailMessage => {
  const meta = typeof row.metadata === 'object' && row.metadata !== null ? row.metadata as Record<string, unknown> : {};
  
  // FIX: Ensure dates are properly parsed (could be string from DB)
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  
  // BUG FIX: Validate priority to prevent invalid enum values
  const rawPriority = row.priority?.toLowerCase() || 'normal';
  const priority: ValidPriority = VALID_PRIORITIES.includes(rawPriority) 
    ? (rawPriority as ValidPriority) 
    : 'normal';
  
  return {
    id: row.id,
    threadId: `thread-${row.id}`,
    senderEmail: `${meta.sender_username || 'user'}@infinity.zoe`,
    senderName: (meta.sender_display_name as string) || row.relationship_label || 'Unknown',
    senderVerified: true,
    subject: row.subject,
    preview: row.preview,
    body: row.body,
    timestamp: createdAt,
    receivedAt: createdAt,
    isRead: row.is_read,
    isStarred: row.is_starred,
    isArchived: row.is_archived,
    isDeleted: row.is_deleted,
    priority,
    labels: [row.category, row.relationship_type || 'contact'].filter(Boolean) as string[],
    gatekeeperVerdict: row.category as GatekeeperVerdict,
    gatekeeperSummary: `${row.category} message from ${row.relationship_label || 'contact'}`,
    gatekeeperConfidence: 0.95,
    spamScore: 0,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  };
};

export const useZoeInfinityMail = () => {
  const { user } = useAuth();
  const [inboxMessages, setInboxMessages] = useState<MailMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<MailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationQueueItem[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const notificationPollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch inbox messages
  const fetchInbox = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('zoe_infinity_mail')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('[ZoeInfinityMail] Fetch inbox error:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        console.log(`[ZoeInfinityMail] Loaded ${data.length} inbox messages`);
        setInboxMessages(data.map(toMailMessage));
      }
    } catch (err) {
      console.error('[ZoeInfinityMail] Error:', err);
    }
  }, [user]);

  // Fetch sent messages
  const fetchSent = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('zoe_infinity_mail')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('[ZoeInfinityMail] Fetch sent error:', fetchError);
        return;
      }

      if (data) {
        console.log(`[ZoeInfinityMail] Loaded ${data.length} sent messages`);
        setSentMessages(data.map(toMailMessage));
      }
    } catch (err) {
      console.error('[ZoeInfinityMail] Error:', err);
    }
  }, [user]);

  // FIX: Fetch pending notifications from queue
  const fetchPendingNotifications = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('zoe_mail_notification_queue')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('is_announced', false)
        .order('created_at', { ascending: true })
        .limit(10);

      if (fetchError) {
        console.error('[ZoeInfinityMail] Notification queue error:', fetchError);
        return [];
      }

      if (data && data.length > 0) {
        console.log(`[ZoeInfinityMail] ${data.length} pending notifications`);
        setPendingNotifications(data as NotificationQueueItem[]);
        return data as NotificationQueueItem[];
      }
      
      return [];
    } catch (err) {
      console.error('[ZoeInfinityMail] Error fetching notifications:', err);
      return [];
    }
  }, [user]);

  // FIX: Mark notification as announced
  const markNotificationAnnounced = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('zoe_mail_notification_queue')
        .update({ 
          is_announced: true, 
          announced_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      // Also update the mail's zoe_notified flag
      const notification = pendingNotifications.find(n => n.id === notificationId);
      if (notification) {
        await supabase
          .from('zoe_infinity_mail')
          .update({ 
            zoe_notified: true, 
            zoe_notified_at: new Date().toISOString() 
          })
          .eq('id', notification.mail_id);
      }

      setPendingNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log(`[ZoeInfinityMail] Notification ${notificationId} marked as announced`);
    } catch (err) {
      console.error('[ZoeInfinityMail] Error marking notification:', err);
    }
  }, [user, pendingNotifications]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('zoe_infinity_mail')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    setInboxMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isRead: true } : m
    ));
  }, [user]);

  // Star/Unstar message
  const toggleStar = useCallback(async (messageId: string) => {
    if (!user) return;

    const message = inboxMessages.find(m => m.id === messageId);
    if (!message) return;

    await supabase
      .from('zoe_infinity_mail')
      .update({ is_starred: !message.isStarred })
      .eq('id', messageId);

    setInboxMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
    ));
  }, [user, inboxMessages]);

  // Archive message
  const archiveMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('zoe_infinity_mail')
      .update({ is_archived: true })
      .eq('id', messageId);

    setInboxMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isArchived: true } : m
    ));
  }, [user]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('zoe_infinity_mail')
      .update({ is_deleted: true })
      .eq('id', messageId);

    setInboxMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isDeleted: true } : m
    ));
  }, [user]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    Promise.all([fetchInbox(), fetchSent(), fetchPendingNotifications()]).finally(() => {
      setIsLoading(false);
    });

    // Subscribe to new messages
    const channel = supabase
      .channel(`zoe_mail_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zoe_infinity_mail',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[ZoeInfinityMail] New message received:', payload.new);
          const newMessage = toMailMessage(payload.new as ZoeInfinityMailRow);
          setInboxMessages(prev => [newMessage, ...prev]);
          // Also fetch notifications to get the new one
          fetchPendingNotifications();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // FIX: Poll for pending notifications every 15 seconds
    notificationPollRef.current = setInterval(() => {
      fetchPendingNotifications();
    }, 15000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (notificationPollRef.current) {
        clearInterval(notificationPollRef.current);
      }
    };
  }, [user, fetchInbox, fetchSent, fetchPendingNotifications]);

  return {
    inboxMessages,
    sentMessages,
    isLoading,
    error,
    refetch: fetchInbox,
    markAsRead,
    toggleStar,
    archiveMessage,
    deleteMessage,
    // FIX: Expose notification queue functionality
    pendingNotifications,
    fetchPendingNotifications,
    markNotificationAnnounced,
  };
};

export default useZoeInfinityMail;
