// Live admin alerts (sign-in/out, sign-ups, new visitors, crashes) anywhere in the app; every alert opens /admin/@moksh50.
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const ADMIN_PAGE = '/admin/@moksh50';
const open = () => { if (window.location.pathname !== ADMIN_PAGE) window.location.href = ADMIN_PAGE; };
const alert = (title: string, description: string) =>
  toast(title, { description, duration: 8000, action: { label: 'Open', onClick: open }, onAutoClose: undefined, className: 'cursor-pointer' });

export default function AdminAuthEventsHost() {
  const isAdmin = useIsAdmin();
  useEffect(() => {
    if (!isAdmin) return;
    const seenVisitors = new Set<string>();
    const ch = supabase
      .channel('admin-auth-events-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_auth_events' }, (p: any) => {
        const e = p.new || {};
        const where = [e.city, e.country].filter(Boolean).join(', ');
        alert(`${e.display_name || 'A member'} ${e.event === 'login' ? 'signed in' : 'signed out'}`,
          [e.device_type, e.os, where, e.is_vpn ? 'VPN' : null].filter(Boolean).join(' · '));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_events' }, (p: any) => {
        const e = p.new || {};
        if (e.kind === 'signup') alert('New member signed up', e.device_type || '');
        else if (e.kind === 'error') alert('A page crashed', `${e.path || ''} — ${e.name || ''}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_visits' }, (p: any) => {
        const v = p.new || {};
        if (!v.visitor_id || seenVisitors.has(v.visitor_id)) return;
        seenVisitors.add(v.visitor_id);
        alert(v.user_id ? 'Member online' : 'Guest online',
          [v.path, v.device_type, [v.city, v.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [isAdmin]);
  return null;
}
