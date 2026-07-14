import { useState, useEffect } from 'react';
import { Bell, Check, X, Filter, UserPlus, Heart, MessageCircle, Star, UserCheck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { playNotificationSound } from '@/utils/notificationSounds';

interface Notification {
  id: string;
  type: string;
  from_user_id: string;
  read: boolean;
  created_at: string;
  post_id?: string;
  comment_id?: string;
  context_data?: any;
}

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const subscription = setupRealtimeSubscription();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const setupRealtimeSubscription = () => {
    return supabase
      .channel(`notifications-panel:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => fetchNotifications()
      )
      .subscribe();
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
      const unreadNotifs = data.filter(n => !n.read);
      setUnreadCount(unreadNotifs.length);
      
      // Play sound for each new unread notification
      if (unreadNotifs.length > 0 && isOpen) {
        // Get the most recent notification and play its type-specific sound
        const latestNotif = unreadNotifs[0];
        playNotificationSound(latestNotif.type);
      }
    }
  };


  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    fetchNotifications();
  };

  const dismissNotification = async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    fetchNotifications();
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.post_id) {
      navigate(`/profile?post=${notification.post_id}`);
    } else if (notification.type === 'friend_request') {
      navigate('/huddle');
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="w-4 h-4" />;
      case 'friend_request_accepted': return <UserCheck className="w-4 h-4" />;
      case 'post_like': return <Heart className="w-4 h-4" />;
      case 'post_comment': return <MessageCircle className="w-4 h-4" />;
      case 'comment_like': return <Heart className="w-4 h-4" />;
      case 'comment_reply': return <MessageCircle className="w-4 h-4" />;
      case 'tier_upgrade': return <Star className="w-4 h-4" />;
      case 'user_online': return <MapPin className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const contextData = notification.context_data;
    
    switch (notification.type) {
      case 'user_online':
        return `${contextData?.username || 'A user'} just came online${contextData?.city ? ` in ${contextData.city}` : ''}!`;
      case 'friend_request':
        return 'You have a new friend request';
      case 'friend_request_accepted':
        return 'Your friend request was accepted!';
      case 'post_like':
        return 'Someone liked your post';
      case 'post_comment':
        return 'Someone commented on your post';
      case 'comment_like':
        return 'Someone liked your comment';
      case 'comment_reply':
        return 'Someone replied to your comment';
      case 'tier_upgrade':
        return 'Congratulations! You reached a new tier!';
      default:
        return 'You have a new notification';
    }
  };

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterType);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
          <TabsList className="w-full grid grid-cols-5 rounded-none border-b">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="post_like" className="text-xs">Likes</TabsTrigger>
            <TabsTrigger value="post_comment" className="text-xs">Comments</TabsTrigger>
            <TabsTrigger value="friend_request" className="text-xs">Requests</TabsTrigger>
            <TabsTrigger value="user_online" className="text-xs">Online</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <div className="min-h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-accent cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
