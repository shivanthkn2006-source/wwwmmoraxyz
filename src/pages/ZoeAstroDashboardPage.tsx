import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, Sparkles, Compass, HeartPulse, Filter, Wand2, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MoraZoeDailyCard } from '@/components/astro/MoraZoeDailyCard';
import type { DailyPrediction, TransitSummary } from '@/components/astro/types';
import { SLOT_LABEL } from '@/components/astro/types';

interface MoodLog {
  id: string;
  mood_mode: string;
  intensity: number;
  notes: string | null;
  logged_at: string;
}

const ASPECTS = ['all', 'conjunction', 'sextile', 'square', 'trine', 'opposition', 'retrograde'] as const;
type AspectFilter = (typeof ASPECTS)[number];

function matchesAspect(transits: TransitSummary[] | null | undefined, filter: AspectFilter) {
  if (filter === 'all') return true;
  const list = transits ?? [];
  if (filter === 'retrograde') return list.some((t) => t.is_retrograde);
  return list.some((t) => (t.aspect ?? '').toLowerCase() === filter);
}

/** Member-facing M'Mora Zoe alignment dashboard. Owner-scoped by RLS. */
const ZoeAstroDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [moods, setMoods] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectFilter>('all');
  const [generating, setGenerating] = useState(false);

  // Birth details (source of truth: profiles → trigger syncs the alignment engine)
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  // Mood entry
  const [moodMode, setMoodMode] = useState('Balanced');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [predRes, moodRes, profRes] = await Promise.all([
        supabase
          .from('astro_predictions')
          .select('id, target_date, slot, prediction_headline, prediction_body, motivational_quote, poster_image_url, status, transits_summary')
          .eq('user_id', user.id)
          .order('target_date', { ascending: false })
          .limit(30),
        supabase
          .from('astro_mood_logs')
          .select('id, mood_mode, intensity, notes, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('birth_date, birth_time, birth_place')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setPredictions((predRes.data ?? []) as unknown as DailyPrediction[]);
      setMoods((moodRes.data ?? []) as unknown as MoodLog[]);
      const p = profRes.data as { birth_date?: string; birth_time?: string; birth_place?: string } | null;
      setBirthDate(p?.birth_date ?? '');
      setBirthTime((p?.birth_time ?? '').slice(0, 5));
      setBirthPlace(p?.birth_place ?? '');
    } catch (err) {
      console.error('[ZoeAstro] load failed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  /** On-demand run of both engines for today, for this member only. */
  const generateNow = async () => {
    if (!user?.id) return;
    setGenerating(true);
    setMessage(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const [astro, motivation] = await Promise.all([
        supabase.functions.invoke('astro-dispatch', {
          body: { action: 'run', userId: user.id, force: true },
        }),
        supabase.functions.invoke('zoe-motivation', {
          body: { action: 'regenerate', force: true, timezone },
        }),
      ]);
      const notes: string[] = [];
      notes.push(astro.error ? `Alignment: ${astro.error.message}` : 'Alignment card refreshed.');
      notes.push(motivation.error ? `Motivation: ${motivation.error.message}` : 'Motivation card refreshed.');
      setMessage(notes.join(' '));
      await load();
    } catch (err) {
      setMessage(`Generation failed: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const saveBirthDetails = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        birth_date: birthDate || null,
        birth_time: birthTime ? `${birthTime}:00` : null,
        birth_place: birthPlace || null,
      })
      .eq('user_id', user.id);
    setSaving(false);
    setMessage(error ? `Could not save: ${error.message}` : 'Birth details saved — alignments refresh from the next slot.');
  };

  const logMood = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('astro_mood_logs').insert({
      user_id: user.id,
      mood_mode: moodMode,
      intensity,
      notes: notes || null,
    });
    setSaving(false);
    if (error) { setMessage(`Could not log mood: ${error.message}`); return; }
    setNotes('');
    setMessage('Mood logged.');
    load();
  };

  const filtered = useMemo(
    () => predictions.filter((p) => matchesAspect(p.transits_summary, aspect)),
    [predictions, aspect],
  );
  const today = new Date().toISOString().slice(0, 10);
  const todays = filtered.filter((p) => p.target_date === today);
  const earlier = filtered.filter((p) => p.target_date !== today);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-24">
        <header className="flex items-center gap-3">
          <Link to="/home" aria-label="Back to feed" className="rounded-lg border border-border p-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">M'Mora Zoe • Alignment Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your predictions, transits, moods and birth details.</p>
          </div>
          <button onClick={load} className="ml-auto rounded-lg border border-border p-2" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </header>

        {message && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{message}</p>}

        {/* Manual generation */}
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
          <div className="mr-auto">
            <h2 className="text-sm font-medium">Generate my daily card</h2>
            <p className="text-xs text-muted-foreground">
              Runs the alignment and motivation engines for today, right now.
            </p>
          </div>
          <Link to="/zoe-astro/log" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm">
            <ScrollText className="h-4 w-4" aria-hidden /> Generation log
          </Link>
          <button onClick={generateNow} disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            <Wand2 className={`h-4 w-4 ${generating ? 'animate-pulse' : ''}`} aria-hidden />
            {generating ? 'Generating…' : 'Generate my daily card'}
          </button>
        </section>



        {/* Birth details */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Birth details
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Date of birth
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Time of birth
              <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Place of birth
              <input value={birthPlace} placeholder="e.g. Trivandrum, India"
                onChange={(e) => setBirthPlace(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={saveBirthDetails} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            <Save className="h-4 w-4" aria-hidden /> Save birth details
          </button>
        </section>

        {/* Mood */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <HeartPulse className="h-4 w-4 text-primary" aria-hidden /> Mood log
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Mood
              <input value={moodMode} onChange={(e) => setMoodMode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Intensity ({intensity}/5)
              <input type="range" min={1} max={5} value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))} className="mt-3 w-full" />
            </label>
            <label className="text-sm">
              Note (optional)
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={logMood} disabled={saving}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60">
            Log mood
          </button>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {moods.map((m) => (
              <li key={m.id}>
                {new Date(m.logged_at).toLocaleString()} — {m.mood_mode} ({m.intensity}/5)
                {m.notes ? ` · ${m.notes}` : ''}
              </li>
            ))}
            {moods.length === 0 && <li>No mood entries yet.</li>}
          </ul>
        </section>

        {/* Transit filter */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-primary" aria-hidden /> Filter by transit
          </h2>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button key={a} onClick={() => setAspect(a)}
                className={`rounded-full border px-3 py-1 text-xs capitalize ${aspect === a ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                {a}
              </button>
            ))}
          </div>
        </section>

        {/* Today */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Today</h2>
          {todays.length === 0 && <p className="text-sm text-muted-foreground">No alignment matches this filter for today.</p>}
          {todays.map((p) => (
            <div key={p.id} className="space-y-1">
              <p className="text-xs text-muted-foreground">{SLOT_LABEL[p.slot] ?? p.slot}</p>
              <MoraZoeDailyCard prediction={p} />
            </div>
          ))}
        </section>

        {/* Transits detail */}
        {todays[0]?.transits_summary?.length ? (
          <section className="rounded-xl border border-border p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Compass className="h-4 w-4 text-primary" aria-hidden /> Today's transits
            </h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {todays[0].transits_summary.map((t, i) => (
                <li key={`${t.transit_planet}-${i}`}>
                  {t.transit_planet}{t.is_retrograde ? ' (R)' : ''} {t.aspect} natal {t.natal_planet} · {t.exactness_deg}°
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* History */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Earlier alignments</h2>
          {earlier.length === 0 && <p className="text-sm text-muted-foreground">Nothing earlier yet.</p>}
          {earlier.map((p) => (
            <div key={p.id} className="space-y-1">
              <p className="text-xs text-muted-foreground">{p.target_date} • {SLOT_LABEL[p.slot] ?? p.slot}</p>
              <MoraZoeDailyCard prediction={p} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default ZoeAstroDashboardPage;
