import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Coins, Heart, Home, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageSeo from '@/components/seo/PageSeo';

type Area = 'career' | 'money' | 'love' | 'family';
interface Period { maha: string; antar: string; start: string; end: string; areas: Partial<Record<Area, string>>; signal: string }
interface Result { hasBirth: boolean; periods: Period[]; todayCard?: { headline?: string; short_summary?: string } | null; opening?: string; closing?: string }

const AREAS: Array<{ id: Area; label: string; Icon: typeof Heart }> = [
  { id: 'career', label: 'Career', Icon: Briefcase },
  { id: 'money', label: 'Money', Icon: Coins },
  { id: 'love', label: 'Love', Icon: Heart },
  { id: 'family', label: 'Family', Icon: Home },
];

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

export default function LifeProjectionPage() {
  const { user } = useAuth();
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState<Area | 'all'>('all');
  const [form, setForm] = useState({ date: '', time: '', place: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('zoe-life-projection', { body: { action: 'timeline', months: 24 } });
    if (error) setError('Could not load your timeline right now.');
    setRes(data ?? null);
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user?.id]);

  const save = async () => {
    if (!user || !form.date) return;
    setSaving(true); setError('');
    const { error } = await supabase.from('profiles').update({
      birth_date: form.date, date_of_birth: form.date,
      birth_time: form.time || null, birth_place: form.place || null,
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) { setError('Could not save your birth details.'); return; }
    await new Promise((r) => setTimeout(r, 800));
    load();
  };

  const periods = (res?.periods ?? []).filter((p) => area === 'all' || p.areas[area]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageSeo title="Life Projection — M'Mora" description="Your next two years in career, money, love and family, read from your birth chart by Zoe." />
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Your life projection</h1>
          <p className="text-sm text-muted-foreground">Zoe reads your next 24 months from your birth chart — guidance, not certainty.</p>
        </header>

        {loading ? <p className="text-sm text-muted-foreground">Reading your chart…</p> : !res?.hasBirth ? (
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3" data-birth-form>
            <p className="text-sm text-foreground">Add your birth details so Zoe can read your timeline.</p>
            <label className="block text-xs text-muted-foreground">Birth date<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="block text-xs text-muted-foreground">Birth time (roughly is fine)<Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
            <label className="block text-xs text-muted-foreground">Birth city<Input value={form.place} placeholder="e.g. Kochi" onChange={(e) => setForm({ ...form, place: e.target.value })} /></label>
            <Button onClick={save} disabled={!form.date || saving}>{saving ? 'Saving…' : 'Show my timeline'}</Button>
          </div>
        ) : (
          <>
            {res.todayCard?.headline && (
              <div className="rounded-2xl bg-primary/10 p-4">
                <p className="text-xs text-muted-foreground">Today's DHF card</p>
                <p className="text-sm font-medium text-foreground">{res.todayCard.headline}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{res.opening}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={area === 'all' ? 'default' : 'ghost'} onClick={() => setArea('all')}>All</Button>
              {AREAS.map(({ id, label, Icon }) => (
                <Button key={id} size="sm" variant={area === id ? 'default' : 'ghost'} onClick={() => setArea(id)}><Icon className="h-4 w-4 mr-1" />{label}</Button>
              ))}
            </div>
            <ol className="space-y-3" data-life-timeline>
              {periods.map((p) => (
                <li key={p.start} className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{fmt(p.start)} – {fmt(p.end)}</span>
                    <span className="text-xs text-muted-foreground">{p.maha}–{p.antar} · {p.signal} signal</span>
                  </div>
                  {AREAS.filter((a) => (area === 'all' || area === a.id) && p.areas[a.id]).map(({ id, label, Icon }) => (
                    <p key={id} className="text-sm text-foreground/90 flex gap-2"><Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span><b>{label}:</b> {p.areas[id]}</span></p>
                  ))}
                  {!Object.keys(p.areas).length && <p className="text-sm text-muted-foreground">A quieter stretch — good for steady routines.</p>}
                </li>
              ))}
              {!periods.length && <li className="text-sm text-muted-foreground">No strong signals for this area in the next 24 months.</li>}
            </ol>
            <p className="text-xs text-muted-foreground">{res.closing}</p>
            <Button asChild variant="outline"><Link to="/zoe"><MessageCircle className="h-4 w-4 mr-2" />Ask Zoe about a month or date</Link></Button>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
