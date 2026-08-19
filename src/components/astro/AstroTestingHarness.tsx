import React, { useCallback, useEffect, useState } from 'react';
import { Play, CheckCircle2, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MoraZoeDailyCard } from './MoraZoeDailyCard';
import type { AstroSlot, DailyPrediction } from './types';
import { SLOT_LABEL } from './types';

const SLOTS: AstroSlot[] = ['morning', 'noon', 'evening', 'night'];

interface EngineState {
  shadow_mode: boolean;
  paused: boolean;
  pause_reason: string | null;
  last_run_at: string | null;
  last_run_summary: Record<string, unknown>;
}

/**
 * Hidden admin harness. Runs the engine in dry-run mode only — it never writes
 * predictions, never publishes, and never touches any other platform surface.
 */
export const AstroTestingHarness: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [results, setResults] = useState<DailyPrediction[]>([]);

  const [birthDate, setBirthDate] = useState('1990-06-15');
  const [birthTime, setBirthTime] = useState('08:30');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const [mood, setMood] = useState('Balanced');
  const [days, setDays] = useState(1);

  const loadState = useCallback(async () => {
    const { data, error: err } = await supabase.functions.invoke('astro-dispatch', {
      body: { action: 'status' },
    });
    if (err) { setError(err.message); return; }
    setState(data?.state ?? null);
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setStatusMsg('Calculating transits and synthesising guarded output…');

    const collected: DailyPrediction[] = [];
    try {
      for (let d = 0; d < days; d++) {
        for (const slot of SLOTS) {
          const at = new Date();
          at.setDate(at.getDate() + d);
          const { data, error: err } = await supabase.functions.invoke('astro-dispatch', {
            body: {
              action: 'preview',
              slot,
              birth_date: birthDate,
              birth_time: `${birthTime}:00`,
              birth_timezone: timezone,
              timezone,
              mood,
              intensity: 3,
              simulateNow: at.toISOString(),
            },
          });
          if (err) throw new Error(err.message);
          if (!data?.ok) throw new Error(data?.error ?? 'preview failed');

          collected.push({
            id: `${data.target_date}-${slot}`,
            target_date: data.target_date,
            slot,
            prediction_headline: data.content.headline,
            prediction_body: data.content.body,
            motivational_quote: data.content.quote,
            status: data.content.source === 'fallback' ? 'fallback' : 'published',
            transits_summary: data.transits ?? [],
          });
        }
      }
      setResults(collected);
      setStatusMsg(`Simulation completed — ${collected.length} slot(s), 0 writes to the database.`);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatusMsg('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4">
      <header>
        <h1 className="text-xl font-semibold">M'Mora Zoe • Preview & Validation Harness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sandboxed diagnostics: verify ephemeris math, prompt guardrails and card rendering
          without writing live data.
        </p>
      </header>

      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" aria-hidden /> Engine state
        </div>
        {state ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Shadow mode: <strong>{state.shadow_mode ? 'ON (nothing publishes)' : 'OFF (live)'}</strong></li>
            <li>Paused: <strong>{state.paused ? `yes — ${state.pause_reason}` : 'no'}</strong></li>
            <li>Last run: {state.last_run_at ?? 'never'}</li>
            <li className="break-all">Summary: {JSON.stringify(state.last_run_summary ?? {})}</li>
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Loading engine state…</p>
        )}
        <button
          onClick={loadState}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </button>
      </section>

      <section className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
        <label className="text-sm">
          Birth date
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Birth time
          <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Timezone (IANA)
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Mood mode
          <input value={mood} onChange={(e) => setMood(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Days to simulate
          <input type="number" min={1} max={7} value={days}
            onChange={(e) => setDays(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
      </section>

      <button
        onClick={runSimulation}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        Simulate dispatch slots
      </button>

      <section className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
        <div className="sm:col-span-3 text-sm font-medium">Publish for real (writes a live feed card)</div>
        <label className="text-sm">
          Slot
          <select value={publishSlot} onChange={(e) => setPublishSlot(e.target.value as AstroSlot)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Target date
          <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <div className="flex items-end">
          <button
            onClick={publishNow}
            disabled={publishing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
          >
            {publishing ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            Publish to my feed
          </button>
        </div>
      </section>


      {statusMsg && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> {statusMsg}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden /> {error}
        </p>
      )}

      {results.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Render output preview</h2>
          {results.map((r) => (
            <div key={r.id} className="space-y-1">
              <p className="text-xs text-muted-foreground">{SLOT_LABEL[r.slot]}</p>
              <MoraZoeDailyCard prediction={r} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default AstroTestingHarness;
