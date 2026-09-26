import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Orbit, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { liveAccessToken } from '@/lib/edgeSession';

type Area = 'career' | 'money' | 'love' | 'family';
interface Period { maha: string; antar: string; start: string; end: string; areas: Partial<Record<Area, string>>; signal: string }
interface SkyShift { message: string; moon?: string }

const AREAS: Area[] = ['career', 'money', 'love', 'family'];
const nextMonthName = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleString(undefined, { month: 'long' });

/**
 * Home's first-glance forecast: today's life period across career, money,
 * love and family, plus today's sky-shift notice when a planet changed sign.
 * Zero-token (deterministic backend), cached per member per day.
 */
export default function HomeForecastCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = React.useState<Period | null>(null);
  const [hasBirth, setHasBirth] = React.useState<boolean | null>(null);
  const [shift, setShift] = React.useState<SkyShift | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const day = new Date().toISOString().slice(0, 10);
    const key = `mmora.homeForecast.${user.id}.${day}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try { const c = JSON.parse(cached); setPeriod(c.period); setHasBirth(c.hasBirth); } catch { /* refetch */ }
    }
    (async () => {
      if (!cached) {
        const token = await liveAccessToken();
        if (!token || !alive) return;
        const res = await supabase.functions.invoke('zoe-life-projection', { body: { action: 'timeline', months: 3 } }).catch(() => null);
        const d = res && !res.error ? res.data as { hasBirth?: boolean; periods?: Period[] } : null;
        if (!alive || !d) return;
        const now = day;
        const p = d.periods?.find((x) => x.start <= now && x.end >= now) ?? d.periods?.[0] ?? null;
        setPeriod(p); setHasBirth(!!d.hasBirth);
        sessionStorage.setItem(key, JSON.stringify({ period: p, hasBirth: !!d.hasBirth }));
      }
      const { data: n } = await supabase.from('notifications').select('context_data')
        .eq('user_id', user.id).eq('type', 'zoe_sky_shift').gte('created_at', `${day}T00:00:00Z`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      const ctx = n?.context_data as { message?: string; moon?: string } | null;
      if (alive && ctx?.message) setShift({ message: ctx.message, moon: ctx.moon });
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (hasBirth === null && !shift) return null;

  const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('mmora:zoe-open-with-context', { detail: { prompt } }));

  return (
    <article className="relative flex h-full min-h-full w-full shrink-0 snap-start snap-always items-center overflow-y-auto bg-background p-4 text-foreground" data-home-forecast>
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-border/40 bg-card/40 p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <Orbit className="h-4 w-4" aria-hidden="true" /> Zoe's forecast today
        </div>

        {shift && (
          <div className="mb-4 rounded-2xl bg-primary/10 p-3 text-sm" data-sky-shift>
            <div className="mb-1 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" aria-hidden="true" /> The sky changed today</div>
            <p className="text-foreground/90">{shift.message}</p>
          </div>
        )}

        {period ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Life period: {period.maha}–{period.antar} · until {period.end}</p>
            <ul className="space-y-2">
              {AREAS.map((a) => period.areas[a] && (
                <li key={a}>
                  <button type="button" onClick={() => ask(`What about my ${a} right now?`)} className="w-full rounded-xl bg-muted/30 p-3 text-left text-sm hover:bg-muted/50">
                    <span className="font-semibold capitalize">{a}: </span>{period.areas[a]}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : hasBirth === false ? (
          <button type="button" onClick={() => navigate('/life-projection')} className="w-full rounded-xl bg-muted/30 p-3 text-left text-sm">
            Add your birth date to see your career, money, love and family forecast.
          </button>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => ask(`What about ${nextMonthName()}?`)} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            What about {nextMonthName()}?
          </button>
          <button type="button" onClick={() => navigate('/life-projection')} className="rounded-full bg-muted/40 px-4 py-2 text-sm">
            My timeline
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Guidance for reflection, not a certainty or professional advice.</p>
      </div>
    </article>
  );
}
