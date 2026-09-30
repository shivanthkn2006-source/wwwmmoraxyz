import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SessionRow {
  id: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  city: string | null;
  country: string | null;
  last_activity_at: string | null;
  started_at: string | null;
}

const AccountSessionsSection = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from('user_sessions')
      .select('id, browser, os, device_type, city, country, last_activity_at, started_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setSessions((data as SessionRow[]) ?? []));
  }, [user?.id]);

  if (!user) return null;
  const providers = (user.identities ?? []).map((i) => i.provider);
  const methods = [...new Set(providers)].map((p) => (p === 'email' ? 'Email & password' : p === 'google' ? 'Google' : p));

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    if (error) toast.error('Could not sign out other devices');
    else toast.success('Signed out of all other devices');
  };

  return (
    <section className="mx-4 my-6 rounded-2xl border border-border/50 p-4 text-foreground" data-account-sessions>
      <h2 className="text-base font-semibold mb-3">Account</h2>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="break-all">{user.email ?? '—'}</dd>
        <dt className="text-muted-foreground">Sign-in methods</dt>
        <dd>{methods.length ? methods.join(', ') : '—'}</dd>
        <dt className="text-muted-foreground">Member since</dt>
        <dd>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</dd>
      </dl>

      <h3 className="text-sm font-semibold mt-5 mb-2">Signed-in devices</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recorded devices yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="text-sm flex justify-between gap-3 border-b border-border/30 pb-2">
              <span>
                {[s.browser, s.os].filter(Boolean).join(' on ') || s.device_type || 'Device'}
                {(s.city || s.country) && (
                  <span className="text-muted-foreground"> · {[s.city, s.country].filter(Boolean).join(', ')}</span>
                )}
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {s.last_activity_at ? new Date(s.last_activity_at).toLocaleString() : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" size="sm" className="mt-4" onClick={signOutOthers} disabled={busy}>
        Sign out other devices
      </Button>
    </section>
  );
};

export default AccountSessionsSection;
