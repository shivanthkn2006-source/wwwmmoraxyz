// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEXUS CONTROL - Sovereign Admin Dashboard
// Hidden admin route for platform control and invite generation
// Only accessible to Root Admins (moksh50, Justmkbhd)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Shield, Users, Key, AlertTriangle, Check, Trash2 } from 'lucide-react';

// Use centralized ROOT_ADMINS from securityConfig
import { isRootAdmin } from '@/components/security/securityConfig';
// Use current origin for invite links (works in dev and production)
const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : 'https://zoe-infinity.app';

interface InviteCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  max_uses: number;
  current_uses: number;
  used_by: string | null;
}

interface PlatformStats {
  totalUsers: number;
  activeInvites: number;
  usedInvites: number;
  securityEvents: number;
}

const ZoeNexusControlPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeInvites: 0,
    usedInvites: 0,
    securityEvents: 0
  });
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(1);
  const [newInviteExpiry, setNewInviteExpiry] = useState('');

  // Verify admin access
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        if (!profile || !isRootAdmin(profile.username)) {
          console.log('[NexusControl] Access denied - not an admin');
          toast.error('Access Denied', { description: 'This area is restricted to Root Admins' });
          navigate('/home');
          return;
        }

        setIsAdmin(true);
        fetchData();
      } catch (e) {
        console.error('[NexusControl] Error:', e);
        navigate('/home');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, navigate]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fetch invite codes
      const { data: codes } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codes) {
        setInviteCodes(codes as InviteCode[]);
      }

      // Fetch stats
      const [
        { count: totalUsers },
        { count: securityEvents }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('behavioral_events').select('*', { count: 'exact', head: true })
          .eq('event_category', 'security_violation')
      ]);

      const activeInvites = codes?.filter(c => c.is_active).length || 0;
      const usedInvites = codes?.filter(c => c.used_by !== null).length || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeInvites,
        usedInvites,
        securityEvents: securityEvents || 0
      });
    } catch (e) {
      console.error('[NexusControl] Failed to fetch data:', e);
    }
  }, []);

  // Generate new invite code
  const generateInvite = useCallback(async () => {
    if (!user) return;

    // Generate cryptographic code
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const code = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

    try {
      const { error } = await supabase.from('invite_codes').insert({
        code,
        is_active: true,
        created_by: user.id,
        max_uses: newInviteMaxUses,
        expires_at: newInviteExpiry || null
      });

      if (error) throw error;

      toast.success('Invite Generated', { description: 'New quantum key created' });
      fetchData();
    } catch (e) {
      console.error('[NexusControl] Failed to generate invite:', e);
      toast.error('Failed to generate invite');
    }
  }, [user, newInviteMaxUses, newInviteExpiry, fetchData]);

  // Copy invite link
  const copyInviteLink = useCallback((code: string) => {
    const link = `${getBaseUrl()}?invite_token=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link Copied', { description: 'Invite link copied to clipboard' });
  }, []);

  // Deactivate invite
  const deactivateInvite = useCallback(async (id: string) => {
    try {
      await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', id);

      toast.success('Invite Deactivated');
      fetchData();
    } catch (e) {
      toast.error('Failed to deactivate invite');
    }
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">
          ESTABLISHING SOVEREIGN CONNECTION...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background text-foreground p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              ZOE NEXUS CONTROL
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              SOVEREIGN ADMIN DASHBOARD // CLASSIFIED
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-mono text-sm">ROOT ACCESS</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs">TOTAL USERS</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Key className="w-4 h-4" />
                <span className="text-xs">ACTIVE INVITES</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.activeInvites}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-accent/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Check className="w-4 h-4" />
                <span className="text-xs">USED INVITES</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.usedInvites}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">SECURITY EVENTS</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.securityEvents}</div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Generator */}
        <Card className="bg-card/50 border-primary/30 mb-8">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Key className="w-5 h-5" />
              QUANTUM INVITE GENERATOR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">MAX USES</label>
                <Input
                  type="number"
                  min={1}
                  value={newInviteMaxUses}
                  onChange={(e) => setNewInviteMaxUses(parseInt(e.target.value) || 1)}
                  className="w-24 bg-card/50 border-primary/30 text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-xs text-muted-foreground mb-1">EXPIRES AT (optional)</label>
                <Input
                  type="datetime-local"
                  value={newInviteExpiry}
                  onChange={(e) => setNewInviteExpiry(e.target.value)}
                  className="bg-card/50 border-primary/30 text-foreground"
                />
              </div>
              
              <Button
                onClick={generateInvite}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                GENERATE INVITE
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes List */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-foreground">INVITE CODES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inviteCodes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No invite codes generated yet
                </div>
              ) : (
                inviteCodes.map((invite) => (
                  <div 
                    key={invite.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      invite.is_active 
                        ? 'bg-emerald-900/10 border-emerald-500/30' 
                        : 'bg-muted/50 border-border opacity-50'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-sm text-foreground mb-1">
                        {invite.code.substring(0, 8)}...{invite.code.substring(invite.code.length - 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Uses: {invite.current_uses}/{invite.max_uses} | 
                        Created: {new Date(invite.created_at).toLocaleDateString()}
                        {invite.expires_at && ` | Expires: ${new Date(invite.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {invite.is_active && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyInviteLink(invite.code)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deactivateInvite(invite.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <span className={`px-2 py-1 text-xs rounded ${
                        invite.is_active 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {invite.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
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
};

export default ZoeNexusControlPage;
