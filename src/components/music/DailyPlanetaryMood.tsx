/**
 * Today's planetary mood, shown on the member's music taste page.
 * Every value comes from the real Swiss Ephemeris calculation; when a value is
 * missing (for example incomplete birth details) it is simply not shown.
 */
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDailyPlanetaryMood } from '@/hooks/useDailyPlanetaryMood';

export default function DailyPlanetaryMoodPanel() {
  const { mood, loading, error, refresh } = useDailyPlanetaryMood();

  const rows: { label: string; value: string }[] = [];
  if (mood?.dayLord) rows.push({ label: 'Today', value: `${mood.dayLord.day} · ${mood.dayLord.planet}` });
  if (mood?.horaLord) rows.push({ label: 'This hour', value: mood.horaLord });
  if (mood?.moon) rows.push({ label: 'Moon', value: `${mood.moon.sign}${mood.moon.nakshatra ? ` · ${mood.moon.nakshatra}` : ''}` });
  if (mood?.dasha) rows.push({ label: 'Life period', value: `${mood.dasha.maha} – ${mood.dasha.antar}` });
  if (mood?.transit) rows.push({ label: 'Closest contact', value: `${mood.transit.transitBody} ${mood.transit.aspect} ${mood.transit.natalBody}` });
  if (mood?.timeOfDay) rows.push({ label: 'Right now', value: mood.timeOfDay });

  return (
    <section aria-label="Today’s planetary mood" className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="music-liquid-side-title">Today’s planetary mood</p>
        <Button variant="ghost" size="icon" aria-label="Recalculate today’s planetary mood" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {error && <p role="status" className="text-xs text-white/60">{error}</p>}
      {!error && loading && !mood && <p className="text-xs text-white/50">Calculating your positions…</p>}

      {rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs text-white/50">{row.label}</dt>
              <dd className="truncate">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {mood?.keywords.length ? (
        <div>
          <p className="mt-1 text-xs text-white/50">Driving your picks now</p>
          <p className="text-sm">{mood.keywords.join(' · ')}</p>
        </div>
      ) : null}

      {mood?.faithKeywords.length ? (
        <div>
          <p className="mt-1 text-xs text-white/50">From your faith</p>
          <p className="text-sm">{mood.faithKeywords.join(' · ')}</p>
        </div>
      ) : null}

      {mood && !mood.completeBirthData && (
        <p className="text-xs text-white/50">Add your birth time and place to include your life period and daily contacts.</p>
      )}
    </section>
  );
}
