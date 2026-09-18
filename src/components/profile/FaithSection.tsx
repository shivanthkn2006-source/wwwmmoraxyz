/**
 * Faith & daily planetary section on the member's own profile page.
 *
 * Additive: it reads and writes only the `religion` field of the member's music
 * taste row (the same row Music, Zoe and the recommendations already read), and
 * displays today's real Swiss Ephemeris planetary mood. Nothing else on the
 * profile page is changed, and no value is invented — a missing calculation is
 * simply not shown.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useDailyPlanetaryMood } from '@/hooks/useDailyPlanetaryMood';
import { faithKeywordsFor } from '@/features/music/musicFaith';
import {
  EMPTY_TASTE,
  MUSIC_RELIGIONS,
  fetchMyMusicProfile,
  saveMyMusicProfile,
  type MusicTasteProfile,
} from '@/features/music/musicProfile';

const label = (value: string) => (value ? value : 'Not set');

export default function FaithSection() {
  const { user } = useAuth();
  const [taste, setTaste] = useState<MusicTasteProfile>(EMPTY_TASTE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { mood, loading: moodLoading, error: moodError, refresh } = useDailyPlanetaryMood();

  useEffect(() => {
    let alive = true;
    if (!user) { setLoading(false); return () => { alive = false; }; }
    setLoading(true);
    fetchMyMusicProfile()
      .then((value) => { if (alive) setTaste(value); })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user]);

  const choose = useCallback(async (religion: string) => {
    const previous = taste;
    const next = { ...taste, religion };
    setTaste(next);
    setSaving(religion);
    try {
      await saveMyMusicProfile(next);
      toast.success(religion ? `Saved — devotional music for ${religion} is now included.` : 'Faith cleared.');
      refresh();
    } catch {
      setTaste(previous);
      toast.error('That could not be saved. Please try again.');
    } finally {
      setSaving(null);
    }
  }, [taste, refresh]);

  const keywords = useMemo(() => faithKeywordsFor(taste.religion), [taste.religion]);

  const rows: { label: string; value: string }[] = [];
  if (mood?.dayLord) rows.push({ label: 'Today', value: `${mood.dayLord.day} · ${mood.dayLord.planet}` });
  if (mood?.horaLord) rows.push({ label: 'This hour', value: mood.horaLord });
  if (mood?.moon) rows.push({ label: 'Moon', value: `${mood.moon.sign}${mood.moon.nakshatra ? ` · ${mood.moon.nakshatra}` : ''}` });
  if (mood?.dasha) rows.push({ label: 'Life period', value: `${mood.dasha.maha} – ${mood.dasha.antar}` });
  if (mood?.transit) rows.push({ label: 'Closest contact', value: `${mood.transit.transitBody} ${mood.transit.aspect} ${mood.transit.natalBody}` });

  if (!user) return null;

  return (
    <section aria-label="Faith and today's planetary mood" className="mx-4 my-4 rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Faith &amp; today&apos;s planetary mood
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Recalculate today's planetary mood"
          onClick={refresh}
          disabled={moodLoading}
        >
          {moodLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Your faith shapes the devotional songs Zoe suggests in search, on Home and in your recommendations.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose your faith">
        {MUSIC_RELIGIONS.map((religion) => {
          const active = (taste.religion || '') === religion;
          return (
            <Button
              key={religion || 'unset'}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              aria-pressed={active}
              disabled={loading || saving !== null}
              onClick={() => void choose(religion)}
              className="min-h-9 text-xs"
            >
              {saving === religion ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {label(religion)}
            </Button>
          );
        })}
      </div>

      {keywords.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Devotional words in use: <span className="text-foreground">{keywords.join(' · ')}</span>
        </p>
      )}

      {moodError && <p role="status" className="mt-3 text-xs text-muted-foreground">{moodError}</p>}

      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="truncate text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {mood?.keywords.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Driving your picks now: <span className="text-foreground">{mood.keywords.slice(0, 6).join(' · ')}</span>
        </p>
      ) : null}

      {mood && !mood.completeBirthData && (
        <p className="mt-2 text-xs text-muted-foreground">
          Add your birth time and place so your life period and daily contacts are included.
        </p>
      )}
    </section>
  );
}
