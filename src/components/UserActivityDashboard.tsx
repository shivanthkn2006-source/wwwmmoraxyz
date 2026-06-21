import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  Activity, 
  Clock, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Globe,
  Eye,
  MousePointer,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  ip_address: unknown;
  browser: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean | null;
  last_activity_at: string;
}

interface PageView {
  id: string;
  page_path: string;
  page_title: string;
  entered_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_details: any;
  page_path: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export const UserActivityDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalPageViews: 0,
    avgSessionDuration: 0,
    topPages: [] as { page: string; count: number }[],
    deviceBreakdown: [] as { device: string; count: number }[],
    browserBreakdown: [] as { browser: string; count: number }[],
    locationBreakdown: [] as { location: string; count: number }[],
  });

  useEffect(() => {
    if (user) {
      fetchActivityData();
    }
  }, [user]);

  const fetchActivityData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50);

      // Fetch page views
      const { data: pageViewsData } = await supabase
        .from('page_views')
        .select('*')
        .eq('user_id', user.id)
        .order('entered_at', { ascending: false })
        .limit(100);

      // Fetch activity log
      const { data: activityLogData } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (sessionsData) setSessions(sessionsData);
      if (pageViewsData) setPageViews(pageViewsData);
      if (activityLogData) setActivityLog(activityLogData);

      // Calculate statistics
      calculateStats(sessionsData || [], pageViewsData || []);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData: Session[], pageViewsData: PageView[]) => {
    const totalSessions = sessionsData.length;
    const activeSessions = sessionsData.filter(s => s.is_active).length;
    const totalPageViews = pageViewsData.length;

    // Calculate average session duration
    const completedSessions = sessionsData.filter(s => s.ended_at);
    const totalDuration = completedSessions.reduce((acc, s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.ended_at!).getTime();
      return acc + (end - start);
    }, 0);
    const avgSessionDuration = completedSessions.length > 0 
      ? Math.round(totalDuration / completedSessions.length / 1000 / 60) 
      : 0;

    // Top pages
    const pageMap = new Map<string, number>();
    pageViewsData.forEach(pv => {
      pageMap.set(pv.page_path, (pageMap.get(pv.page_path) || 0) + 1);
    });
    const topPages = Array.from(pageMap.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Device breakdown
    const deviceMap = new Map<string, number>();
    sessionsData.forEach(s => {
      deviceMap.set(s.device_type || 'Unknown', (deviceMap.get(s.device_type || 'Unknown') || 0) + 1);
    });
    const deviceBreakdown = Array.from(deviceMap.entries())
      .map(([device, count]) => ({ device, count }));

    // Browser breakdown
    const browserMap = new Map<string, number>();
    sessionsData.forEach(s => {
      browserMap.set(s.browser || 'Unknown', (browserMap.get(s.browser || 'Unknown') || 0) + 1);
    });
    const browserBreakdown = Array.from(browserMap.entries())
      .map(([browser, count]) => ({ browser, count }));

    // Location breakdown
    const locationMap = new Map<string, number>();
    sessionsData.forEach(s => {
      const location = s.city && s.country ? `${s.city}, ${s.country}` : s.country || 'Unknown';
      locationMap.set(location, (locationMap.get(location) || 0) + 1);
    });
    const locationBreakdown = Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .slice(0, 5);

    setStats({
      totalSessions,
      activeSessions,
      totalPageViews,
      avgSessionDuration,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      locationBreakdown,
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading activity data...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          User Activity Dashboard
        </h2>
        <Badge variant="secondary">{stats.totalSessions} Sessions</Badge>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
        </Card>

        <Card className="p-4 bg-accent/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Active Now</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.activeSessions}</p>
        </Card>

        <Card className="p-4 bg-secondary/5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-secondary" />
            <p className="text-xs text-muted-foreground">Page Views</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalPageViews}</p>
        </Card>

        <Card className="p-4 bg-muted/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Session</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.avgSessionDuration}m</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Device Types
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats.deviceBreakdown}
                dataKey="count"
                nameKey="device"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {stats.deviceBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Browser Breakdown */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Browsers
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.browserBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="browser" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" />
          Top Pages
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.topPages}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="page" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--secondary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="pageviews">Page Views</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {session.device_type === 'mobile' ? (
                      <Smartphone className="w-4 h-4 text-primary" />
                    ) : (
                      <Monitor className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-semibold text-sm">{session.browser} on {session.os}</span>
                  </div>
                  {session.is_active && (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{session.city || 'Unknown'}, {session.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    <span>IP: {String(session.ip_address) || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Started: {format(new Date(session.started_at), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  {session.ended_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Duration: {Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60)}m</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pageviews" className="space-y-4">
          <div className="space-y-3">
            {pageViews.map((pv) => (
              <Card key={pv.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-secondary" />
                    <span className="font-semibold text-sm">{pv.page_path}</span>
                  </div>
                  {pv.duration_seconds && (
                    <Badge variant="secondary">{Math.round(pv.duration_seconds / 60)}m {pv.duration_seconds % 60}s</Badge>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {pv.page_title && (
                    <p>Title: {pv.page_title}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Entered: {format(new Date(pv.entered_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                  </div>
                  {pv.exited_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Exited: {format(new Date(pv.exited_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-3">
            {activityLog.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-sm">{log.activity_type}</span>
                  </div>
                  <Badge variant="outline">{log.page_path}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                  </div>
                  {log.activity_details && (
                    <div className="mt-2 p-2 bg-muted/50 rounded">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(log.activity_details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
