import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/** Offset in minutes (east of UTC positive) for an IANA zone right now. */
export function offsetMinutesFor(tz: string, at = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

const listZones = (): string[] => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
  } catch {
    return [Intl.DateTimeFormat().resolvedOptions().timeZone];
  }
};

export default function LocationSetupPage() {
  const navigate = useNavigate();
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const zones = useMemo(listZones, []);
  const [tz, setTz] = useState(detected);
  const [city, setCity] = useState('');
  const [now, setNow] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      const id = s.session?.user.id;
      if (!id) return;
      const { data } = await supabase.from('profiles').select('timezone, city').eq('user_id', id).maybeSingle();
      const row = data as { timezone?: string | null; city?: string | null } | null;
      if (row?.timezone) setTz(row.timezone);
      if (row?.city) setCity(row.city);
    })();
    return () => clearInterval(t);
  }, []);

  const localTime = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(now);
  const off = offsetMinutesFor(tz, now);
  const offLabel = `UTC${off >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}:${String(Math.abs(off) % 60).padStart(2, '0')}`;

  const save = async () => {
    setSaving(true);
    const { data: s } = await supabase.auth.getSession();
    const id = s.session?.user.id;
    if (!id) { setSaving(false); navigate('/auth'); return; }
    const { error } = await supabase.from('profiles').update({
      timezone: tz, utc_offset_minutes: off, timezone_confirmed_at: new Date().toISOString(),
      ...(city.trim() ? { city: city.trim().slice(0, 80) } : {}),
    } as never).eq('user_id', id);
    setSaving(false);
    if (error) { toast.error('Could not save your local time. Please try again.'); return; }
    toast.success('Local time saved');
    navigate('/home', { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Confirm your local time</h1>
          <p className="text-sm text-muted-foreground">Zoe times your morning insight and daily cards to where you really live.</p>
        </header>
        <div className="rounded-xl bg-muted/40 p-4 text-center">
          <div className="text-3xl font-semibold" data-testid="local-time-preview">{localTime}</div>
          <div className="text-xs text-muted-foreground mt-1">{tz} · {offLabel}</div>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Time zone</span>
          <select aria-label="Time zone" value={tz} onChange={(e) => setTz(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2">
            {zones.map((z) => <option key={z} value={z}>{z}{z === detected ? ' (this device)' : ''}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>City (optional)</span>
          <Input aria-label="City" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kolkata" />
        </label>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm and continue'}</Button>
          <Button variant="ghost" onClick={() => navigate('/home', { replace: true })}>Later</Button>
        </div>
      </section>
    </main>
  );
}
