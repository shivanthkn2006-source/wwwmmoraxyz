// Live sign-in / sign-out toasts for the sole admin, anywhere in the app.
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function AdminAuthEventsHost() {
  const isAdmin = useIsAdmin();
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel('admin-auth-events-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_auth_events' }, (p: any) => {
        const e = p.new || {};
        const who = e.display_name || 'A member';
        const where = [e.city, e.country].filter(Boolean).join(', ');
        toast(`${who} ${e.event === 'login' ? 'signed in' : 'signed out'}`, {
          description: [e.device_type, e.os, where, e.is_vpn ? 'VPN' : null].filter(Boolean).join(' · '),
          action: { label: 'Analytics', onClick: () => { window.location.href = '/admin/analytics'; } },
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [isAdmin]);
  return null;
}
