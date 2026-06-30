import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

interface Notification {
  id: string;
  type: string;
  from_user_id: string;
  post_id?: string;
  comment_id?: string;
  read: boolean;
  created_at: string;
  priority?: number;
  suggestion_type?: string;
  context_data?: {
    shared_interests?: string[];
    location_match?: boolean;
    activity_suggestion?: string;
    conversation_starter?: string;
  };
  from_user?: {
    display_name: string;
    profile_photo_url?: string;
    status?: string;
    event_date?: string;
    event_recurring?: boolean;
    city?: string;
    hobbies?: string[];
  };
}

interface NotificationMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationMenu: React.FC<NotificationMenuProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchNotifications();
      markAsRead();
    }
  }, [open, user]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel(`notifications-changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) {
      console.log('[NotificationMenu] No user, skipping fetch');
      return;
    }

    try {
      console.log('[NotificationMenu] Fetching notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[NotificationMenu] Error fetching notifications:', error);
        return;
      }

      console.log('[NotificationMenu] Fetched notifications:', data?.length || 0, data);

      if (!data || data.length === 0) {
        console.log('[NotificationMenu] No notifications found');
        setNotifications([]);
        return;
      }

      const fromUserIds = Array.from(
        new Set(
          data
            .map((n) => n.from_user_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      console.log('[NotificationMenu] Fetching profiles for:', fromUserIds);

      let profilesById: Record<string, any> = {};

      if (fromUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, profile_photo_url, status, event_date, event_recurring, city, hobbies')
          .in('user_id', fromUserIds);

        if (profilesError) {
          console.error('[NotificationMenu] Error fetching notification profiles:', profilesError);
        } else if (profilesData) {
          console.log('[NotificationMenu] Fetched profiles:', profilesData.length);
          profilesById = Object.fromEntries(
            profilesData.map((profile) => [profile.user_id, profile])
          );
        }
      }

      const enrichedNotifications = data.map((notif: any) => ({
        ...notif,
        from_user: profilesById[notif.from_user_id] || undefined,
      }));

      console.log('[NotificationMenu] Setting enriched notifications:', enrichedNotifications.length);
      setNotifications(enrichedNotifications as any);
    } catch (err) {
      console.error('[NotificationMenu] Unexpected error fetching notifications:', err);
    }
  };

  const markAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  };

  const getNotificationText = (notif: Notification) => {
    // Smart notification with context
    if (notif.suggestion_type === 'interest_match' && notif.context_data) {
      const { shared_interests, location_match, activity_suggestion, conversation_starter } = notif.context_data;
      
      if (activity_suggestion) {
        return `💡 ${activity_suggestion}`;
      }
      
      if (shared_interests && shared_interests.length > 0) {
        const interests = shared_interests.slice(0, 2).join(' & ');
        const location = location_match ? ` and is nearby` : '';
        return `is online${location}. You both love ${interests}! ${conversation_starter || ''}`;
      }
    }

    // Badge and challenge notifications
    if (notif.type === 'friend_badge_earned' && notif.context_data) {
      const { badge_icon, badge_name } = notif.context_data as any;
      return `earned ${badge_icon} ${badge_name}!`;
    }

    if (notif.type === 'friend_challenge_completed') {
      return `completed a challenge! 🏆`;
    }

    switch (notif.type) {
      case 'interest_match':
        return 'has interests matching yours';
      case 'post_like':
        return 'liked your post';
      case 'post_comment':
        return 'commented on your post';
      case 'comment_like':
        return 'liked your comment';
      case 'comment_reply':
        return 'replied to your comment';
      case 'post_tag':
        return 'tagged you in a post';
      case 'friend_request':
        return 'sent you a friend request';
      case 'tier_upgrade':
        return 'You reached a new tier! 🎉';
      default:
        return 'interacted with your content';
    }
  };

  const getNotificationIcon = (type: string) => {
    // Shared blue + yellow palette via --menu-* tokens (see index.css)
    const accent = 'text-[hsl(var(--menu-accent))]';
    const accentFill = 'text-[hsl(var(--menu-accent))] fill-[hsl(var(--menu-accent))]';
    const highlight = 'text-[hsl(var(--menu-highlight))]';
    const highlightFill = 'text-[hsl(var(--menu-highlight))] fill-[hsl(var(--menu-highlight))]';
    switch (type) {
      case 'post_like':
      case 'comment_like':
        return <Heart className={`w-4 h-4 ${highlightFill}`} />;
      case 'post_comment':
      case 'comment_reply':
        return <MessageCircle className={`w-4 h-4 ${accent}`} />;
      case 'post_tag':
        return <MessageCircle className={`w-4 h-4 ${highlight}`} />;
      case 'friend_request':
        return <Heart className={`w-4 h-4 ${accent}`} />;
      case 'tier_upgrade':
        return <Award className={`w-4 h-4 ${highlightFill}`} />;
      case 'friend_badge_earned':
      case 'friend_challenge_completed':
        return <Award className={`w-4 h-4 ${accentFill}`} />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.suggestion_type === 'interest_match') {
      // Navigate to chat with friend for interest match suggestions
      navigate(`/chat?userId=${notif.from_user_id}`);
      onOpenChange(false);
    } else if (notif.post_id) {
      navigate(`/?post=${notif.post_id}`);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notifications yet</p>
          ) : (
            notifications.map((notif) => {
              const hasEvent = useEventGlow(notif.from_user?.event_date, notif.from_user?.event_recurring);
              const glowClass = getAvatarGlowClass(hasEvent, notif.from_user?.status);
              const isSmartNotification = notif.suggestion_type === 'interest_match';
              const isPriority = notif.priority && notif.priority >= 8;
              
              return (
                <Card
                  key={notif.id}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    !notif.read ? 'bg-accent/20' : ''
                  } ${isPriority ? 'border-primary/50 border-2' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className={`w-10 h-10 ${glowClass}`}>
                        <AvatarImage src={notif.from_user?.profile_photo_url} />
                        <AvatarFallback>
                          {notif.from_user?.display_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {notif.from_user?.status && (
                        <StatusIconBadge 
                          status={notif.from_user.status} 
                          size="sm"
                        />
                      )}
                      {getNotificationIcon(notif.type) && (
                        <div className="absolute -top-1 -right-1">
                          {getNotificationIcon(notif.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{notif.from_user?.display_name}</span>{' '}
                            <span className="text-muted-foreground">
                              {getNotificationText(notif)}
                            </span>
                          </p>
                          {isSmartNotification && notif.context_data?.shared_interests && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {notif.context_data.shared_interests.slice(0, 3).map((interest) => (
                                <span
                                  key={interest}
                                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationMenu;
