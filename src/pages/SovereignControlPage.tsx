// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN CONTROL - Admin Dashboard for Fortress Protocol
// Real-time monitoring, kill switch, and session management
// Only accessible by ROOT_ADMINS
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useDevMode } from '@/components/security/DevModeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Skull, 
  Radio, 
  Eye,
  Ban,
  RefreshCw,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OnlineUser {
  id: string;
  user_id: string;
  status: string;
  last_heartbeat: string;
  flagged: boolean;
  flag_reason: string | null;
  device_info: any;
  profile?: {
    username: string;
    profile_photo_url: string;
  };
}

interface SecurityBreach {
  id: string;
  user_id: string;
  breach_type: string;
  severity: string;
  details: string;
  created_at: string;
  action_taken: string;
}

export default function SovereignControlPage() {
  const { user } = useAuth();
  const { isAdmin } = useDevMode();
  const navigate = useNavigate();
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [breaches, setBreaches] = useState<SecurityBreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/');
      toast.error('Access Denied', {
        description: 'Sovereign Control requires admin privileges.',
      });
    }
  }, [isAdmin, loading, navigate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);

    try {
      // Fetch online sessions
      const { data: sessions } = await supabase
        .from('online_sessions')
        .select('*')
        .order('last_heartbeat', { ascending: false });

      // Fetch profiles for online users
      if (sessions && sessions.length > 0) {
        const userIds = sessions.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, profile_photo_url')
          .in('user_id', userIds);

        const enrichedSessions = sessions.map(session => ({
          ...session,
          profile: profiles?.find(p => p.user_id === session.user_id),
        }));

        setOnlineUsers(enrichedSessions);
      } else {
        setOnlineUsers([]);
      }

      // Fetch recent breaches
      const { data: breachData } = await supabase
        .from('security_breaches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setBreaches(breachData || []);
    } catch (err) {
      console.error('[SovereignControl] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for online_sessions
    const channel = supabase
      .channel('sovereign-control')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_sessions' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_breaches' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Kill switch - ban user and terminate session
  const banUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to BAN & WIPE ${username || userId}?`)) return;

    try {
      // Update session to terminated
      await supabase
        .from('online_sessions')
        .update({ status: 'terminated', flagged: true, flag_reason: 'Admin ban' })
        .eq('user_id', userId);

      // Revoke all invite codes
      await supabase
        .from('invite_codes')
        .update({ 
          is_active: false, 
          revoked_reason: 'Admin ban via Sovereign Control',
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id
        })
        .eq('used_by', userId);

      // Log the action
      await supabase.from('security_breaches').insert({
        user_id: userId,
        breach_type: 'admin_ban',
        severity: 'critical',
        details: `Banned by admin ${user?.id}`,
        action_taken: 'session_terminated_invite_revoked',
      });

      toast.success('User Expelled', {
        description: `${username || userId} has been banned and their access revoked.`,
      });

      fetchData();
    } catch (err) {
      toast.error('Failed to ban user');
      console.error(err);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string, flagged: boolean) => {
    if (flagged) return 'bg-red-500';
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'terminated': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">CRITICAL</Badge>;
      case 'high': return <Badge className="bg-orange-500">HIGH</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">MEDIUM</Badge>;
      default: return <Badge variant="secondary">LOW</Badge>;
    }
  };

  // Time ago helper
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skull className="w-24 h-24 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive">ACCESS DENIED</h1>
          <p className="text-muted-foreground">Sovereign Control requires admin privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Sovereign Control</h1>
            <p className="text-muted-foreground">Fortress Protocol Admin Dashboard</p>
          </div>
        </div>
        <Button onClick={fetchData} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Users className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{onlineUsers.filter(u => u.status === 'active').length}</p>
              <p className="text-muted-foreground text-sm">Online Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Eye className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{onlineUsers.filter(u => u.status === 'idle').length}</p>
              <p className="text-muted-foreground text-sm">Idle</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{onlineUsers.filter(u => u.flagged).length}</p>
              <p className="text-muted-foreground text-sm">Flagged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Activity className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{breaches.length}</p>
              <p className="text-muted-foreground text-sm">Total Breaches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Entities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-500 animate-pulse" />
              Active Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {onlineUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active sessions</p>
              ) : (
                onlineUsers.map(session => (
                  <div 
                    key={session.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      session.flagged ? 'border-red-500 bg-red-500/10' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status, session.flagged)}`} />
                      <div>
                        <p className="font-medium">
                          {session.profile?.username || session.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.status.toUpperCase()} • {timeAgo(session.last_heartbeat)}
                        </p>
                        {session.flag_reason && (
                          <p className="text-xs text-red-400">{session.flag_reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => banUser(session.user_id, session.profile?.username || '')}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Ban & Wipe
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Breaches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Security Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {breaches.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No breaches recorded</p>
              ) : (
                breaches.map(breach => (
                  <div 
                    key={breach.id} 
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{breach.breach_type}</span>
                      {getSeverityBadge(breach.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">{breach.details}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(breach.created_at)}
                      </span>
                      <span className="text-xs text-primary">{breach.action_taken}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
