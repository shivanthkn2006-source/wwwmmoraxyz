/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE MAIL NOTIFICATIONS HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Listens for new mail in real-time and triggers Zoe voice announcements.
 * Integrates with relationship system for personalized announcements.
 * 
 * Example: "You have a new email from your son about dinner plans"
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface MailNotification {
  id: string;
  mail_id: string;
  sender_name: string;
  sender_username: string;
  relationship_label: string | null;
  subject: string;
  priority: string;
  category: string;
  is_announced: boolean;
  created_at: string;
}

interface UseZoeMailNotificationsOptions {
  enabled?: boolean;
  onNewMail?: (notification: MailNotification) => void;
  onAnnouncement?: (message: string) => void;
}

export const useZoeMailNotifications = (options: UseZoeMailNotificationsOptions = {}) => {
  const { user } = useAuth();
  const { enabled = true, onNewMail, onAnnouncement } = options;
  const [pendingNotifications, setPendingNotifications] = useState<MailNotification[]>([]);
  const [lastAnnounced, setLastAnnounced] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isProcessingRef = useRef(false);

  // Generate natural announcement text
  const generateAnnouncementText = useCallback((notification: MailNotification): string => {
    const { sender_name, relationship_label, subject, priority, category } = notification;
    
    // Use relationship label if available, otherwise use name
    const senderIdentity = relationship_label || sender_name;
    
    // Build natural announcement
    let announcement = '';
    
    // Priority prefix
    if (priority === 'urgent') {
      announcement += 'Urgent! ';
    } else if (priority === 'high') {
      announcement += 'Important: ';
    }
    
    // Main announcement with relationship context
    if (relationship_label) {
      // Personalized: "You have a new email from your son"
      const relationshipPhrases: Record<string, string> = {
        'father': 'your father',
        'mother': 'your mother',
        'son': 'your son',
        'daughter': 'your daughter',
        'child': 'your child',
        'parent': 'your parent',
        'friend': `your friend ${sender_name}`,
        'spouse': 'your spouse',
        'sibling': 'your sibling',
      };
      const senderPhrase = relationshipPhrases[relationship_label.toLowerCase()] || relationship_label;
      announcement += `You have a new email from ${senderPhrase}`;
    } else {
      announcement += `You have a new email from ${sender_name}`;
    }
    
    // Add subject context
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('dinner') || subjectLower.includes('lunch') || subjectLower.includes('food')) {
      announcement += ' about meal plans.';
    } else if (subjectLower.includes('meeting') || subjectLower.includes('call')) {
      announcement += ' regarding a meeting.';
    } else if (subjectLower.includes('photo') || subjectLower.includes('picture')) {
      announcement += ' with photos to share.';
    } else if (subjectLower.includes('birthday') || subjectLower.includes('congratulations')) {
      announcement += ' with warm wishes!';
    } else if (subjectLower.includes('project') || subjectLower.includes('work')) {
      announcement += ' about work.';
    } else if (subjectLower.includes('weekend') || subjectLower.includes('plans')) {
      announcement += ' about plans.';
    } else {
      announcement += ` about: ${subject.substring(0, 50)}.`;
    }
    
    // Add call-to-action
    announcement += ' Would you like me to read it?';
    
    return announcement;
  }, []);

  // Process and announce pending notifications
  const processNotification = useCallback(async (notification: MailNotification) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const announcement = generateAnnouncementText(notification);
      console.log('[ZoeMailNotif] Announcing:', announcement);
      
      // Trigger callbacks
      onAnnouncement?.(announcement);
      onNewMail?.(notification);
      
      setLastAnnounced(notification.id);
      
      // Mark as announced in DB
      await supabase
        .from('zoe_mail_notification_queue')
        .update({ 
          is_announced: true, 
          announced_at: new Date().toISOString() 
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('[ZoeMailNotif] Announcement error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [generateAnnouncementText, onAnnouncement, onNewMail]);

  // Fetch pending notifications on mount
  const fetchPendingNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('zoe_mail_notification_queue')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('is_announced', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[ZoeMailNotif] Fetch error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`[ZoeMailNotif] Found ${data.length} pending notifications`);
      setPendingNotifications(data as MailNotification[]);
    }
  }, [user]);

  // BUG FIX: Store stable reference to fetchPendingNotifications
  // to prevent re-subscriptions when user object reference changes
  const fetchPendingNotificationsRef = useRef(fetchPendingNotifications);
  useEffect(() => {
    fetchPendingNotificationsRef.current = fetchPendingNotifications;
  }, [fetchPendingNotifications]);
  
  // Subscribe to real-time updates
  // BUG FIX: Only depend on user.id (string) not user object to prevent unnecessary re-subs
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !enabled) return;

    console.log('[ZoeMailNotif] Setting up real-time subscription');
    
    // Fetch any pending notifications first
    fetchPendingNotificationsRef.current();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`mail_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zoe_mail_notification_queue',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[ZoeMailNotif] New notification received:', payload.new);
          const notification = payload.new as MailNotification;
          setPendingNotifications(prev => [notification, ...prev]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.log('[ZoeMailNotif] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, enabled]);

  // Get next pending notification for Zoe to announce
  const getNextAnnouncement = useCallback((): MailNotification | null => {
    const unannounced = pendingNotifications.filter(n => !n.is_announced && n.id !== lastAnnounced);
    return unannounced[0] || null;
  }, [pendingNotifications, lastAnnounced]);

  // Announce the next pending notification
  const announceNext = useCallback(async () => {
    const next = getNextAnnouncement();
    if (next) {
      await processNotification(next);
      return true;
    }
    return false;
  }, [getNextAnnouncement, processNotification]);

  // Check if there are pending announcements
  const hasPendingAnnouncements = pendingNotifications.some(n => !n.is_announced && n.id !== lastAnnounced);

  return {
    pendingNotifications,
    hasPendingAnnouncements,
    getNextAnnouncement,
    announceNext,
    processNotification,
    generateAnnouncementText,
    refetch: fetchPendingNotifications,
  };
};

export default useZoeMailNotifications;
