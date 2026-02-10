import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Users, AlertCircle, CheckCircle, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNewUserNotifications } from '@/hooks/useNewUserNotifications';

interface Notice {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  expires_at: string | null;
  read: boolean;
}

export const AdminNoticePanel = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    expiresInDays: '7',
  });
  
  // New user notifications integration
  const { newUserEvents, unreadCount: newUserUnreadCount, markAsRead: markNewUserAsRead, markAllAsRead: markAllNewUsersAsRead } = useNewUserNotifications();

  useEffect(() => {
    fetchNotices();
    const subscription = subscribeToNotices();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchNotices = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'admin_notice')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotices(data.map(n => {
        const contextData = n.context_data as any;
        return {
          id: n.id,
          title: contextData?.title || 'System Notice',
          message: contextData?.message || '',
          priority: contextData?.priority || 'medium',
          created_at: n.created_at,
          expires_at: n.expires_at,
          read: n.read || false,
        };
      }));
    }
  };

  const subscribeToNotices = () => {
    return supabase
      .channel('admin-notices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchNotices();
        }
      )
      .subscribe();
  };

  const sendNoticeToAllUsers = async () => {
    if (!newNotice.title.trim() || !newNotice.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const expiresAt = newNotice.expiresInDays
        ? new Date(Date.now() + parseInt(newNotice.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase.functions.invoke('admin-send-notice', {
        body: {
          title: newNotice.title,
          message: newNotice.message,
          priority: newNotice.priority,
          expiresAt,
        },
      });

      if (error) throw error;

      toast.success(data?.message || 'Notice sent successfully!');
      setShowCreateForm(false);
      setNewNotice({
        title: '',
        message: '',
        priority: 'medium',
        expiresInDays: '7',
      });
    } catch (error: any) {
      console.error('Error sending notice:', error);
      if (error.message?.includes('Forbidden')) {
        toast.error("You don't have admin permissions");
      } else {
        toast.error(error.message || 'Failed to send notice');
      }
    }
  };

  const getPriorityNumber = (priority: string): number => {
    const map: { [key: string]: number } = {
      low: 3,
      medium: 5,
      high: 7,
      urgent: 10,
    };
    return map[priority] || 5;
  };

  const getPriorityColor = (priority: string): string => {
    const colors: { [key: string]: string } = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    return colors[priority] || 'bg-gray-500';
  };

  const markAsRead = async (noticeId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', noticeId);

    if (!error) {
      setNotices(prev =>
        prev.map(n => (n.id === noticeId ? { ...n, read: true } : n))
      );
    }
  };

  const dismissNotice = async (noticeId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', noticeId);

    if (!error) {
      setNotices(prev => prev.filter(n => n.id !== noticeId));
      toast.success('Notice dismissed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Admin Notices</h2>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Send Notice to All'}
          </Button>
        </div>

        {showCreateForm && (
          <Card className="p-6 mb-6 bg-primary/5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Create New Notice
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Notice title..."
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Notice message..."
                  value={newNotice.message}
                  onChange={(e) => setNewNotice({ ...newNotice, message: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Expires In (Days)</label>
                  <Input
                    type="number"
                    placeholder="7"
                    value={newNotice.expiresInDays}
                    onChange={(e) => setNewNotice({ ...newNotice, expiresInDays: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={sendNoticeToAllUsers} className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Send to All Users
              </Button>
            </div>
          </Card>
        )}

        {/* New User Sign-ups Section */}
        {newUserEvents.length > 0 && (
          <Card className="p-4 mb-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-foreground">New User Sign-ups</h3>
                {newUserUnreadCount > 0 && (
                  <Badge variant="default" className="bg-green-500">{newUserUnreadCount} new</Badge>
                )}
              </div>
              {newUserUnreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllNewUsersAsRead}>Mark all read</Button>
              )}
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {newUserEvents.slice(0, 10).map((event) => (
                <div key={event.id} className={`flex items-center gap-2 p-2 rounded-md ${event.isNew ? 'bg-green-500/10' : 'bg-muted/30'}`}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 flex items-center justify-center text-xs text-white font-bold">
                    {event.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{event.username} • {event.eventType === 'signup' ? 'Joined' : 'Signed in'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(event.timestamp), 'h:mm a')}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {notices.length === 0 && newUserEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notices yet</p>
            </div>
          ) : notices.length === 0 ? null : (
            notices.map((notice) => (
              <Card
                key={notice.id}
                className={`p-4 ${!notice.read ? 'bg-accent/5 border-accent' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(notice.priority)} animate-pulse`} />
                    <h4 className="font-semibold text-foreground">{notice.title}</h4>
                    <Badge
                      variant={notice.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {notice.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotice(notice.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{notice.message}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(notice.created_at), 'MMM dd, yyyy HH:mm')}</span>
                  <div className="flex items-center gap-2">
                    {notice.expires_at && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Expires: {format(new Date(notice.expires_at), 'MMM dd')}
                      </span>
                    )}
                    {!notice.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notice.id)}
                        className="text-xs h-auto py-1"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};