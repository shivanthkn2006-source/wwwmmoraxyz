import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Trash2, Check, X, AlertCircle, Bell, Heart, MessageCircle, UserPlus, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  from_user_id: string;
  post_id?: string;
  comment_id?: string;
  read: boolean;
  priority?: number;
  created_at: string;
  context_data?: any;
}

const NotificationHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [user, filterType, filterRead, dateRange]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (filterRead === 'read') {
      query = query.eq('read', true);
    } else if (filterRead === 'unread') {
      query = query.eq('read', false);
    }

    if (dateRange.from) {
      query = query.gte('created_at', dateRange.from.toISOString());
    }

    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    fetchNotifications();
    toast.success('Notification deleted');
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    fetchNotifications();
    toast.success('All notifications cleared');
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    fetchNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'friend_request_accepted': return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'post_like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'post_comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'comment_like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment_reply': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'tier_upgrade': return <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />;
      case 'user_online': return <MapPin className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return null;
    if (priority >= 9) return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    if (priority >= 7) return <Badge variant="default" className="text-xs">High</Badge>;
    if (priority >= 5) return <Badge variant="secondary" className="text-xs">Medium</Badge>;
    return <Badge variant="outline" className="text-xs">Low</Badge>;
  };

  const getNotificationText = (notif: Notification) => {
    switch (notif.type) {
      case 'friend_request': return 'Friend request received';
      case 'friend_request_accepted': return 'Friend request accepted';
      case 'post_like': return 'Someone liked your post';
      case 'post_comment': return 'Someone commented on your post';
      case 'comment_like': return 'Someone liked your comment';
      case 'comment_reply': return 'Someone replied to your comment';
      case 'tier_upgrade': return 'You reached a new tier!';
      case 'user_online': return notif.context_data?.message || 'User came online';
      default: return 'New notification';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery) {
      const text = getNotificationText(n).toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification History</h1>
            <p className="text-muted-foreground">View and manage all your notifications</p>
          </div>
          <Button variant="destructive" size="sm" onClick={clearAllNotifications}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="post_like">Post Likes</SelectItem>
                  <SelectItem value="post_comment">Post Comments</SelectItem>
                  <SelectItem value="comment_like">Comment Likes</SelectItem>
                  <SelectItem value="comment_reply">Comment Replies</SelectItem>
                  <SelectItem value="friend_request">Friend Requests</SelectItem>
                  <SelectItem value="user_online">Users Online</SelectItem>
                  <SelectItem value="tier_upgrade">Tier Upgrades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Badge variant="outline">{filteredNotifications.length} notifications</Badge>
            <Badge variant="secondary">{filteredNotifications.filter(n => !n.read).length} unread</Badge>
          </div>
        </Card>

        {/* Notifications List */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading notifications...</p>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No notifications found</p>
              </Card>
            ) : (
              filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={cn(
                    "p-4 transition-all hover:shadow-md",
                    !notif.read && "bg-accent/20 border-primary/30"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      !notif.read ? "bg-primary/20" : "bg-muted"
                    )}>
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("text-sm", !notif.read && "font-semibold")}>
                            {getNotificationText(notif)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notif.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notif.priority)}
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notif.id)}
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notif.id)}
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default NotificationHistoryPage;