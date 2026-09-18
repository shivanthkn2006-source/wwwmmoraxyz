// ═══════════════════════════════════════════════════════════════════════════════
// VR PLANETARY MOOD PANEL
// Shows today's real ruling planet, the current planetary hour, the Moon and the
// member's faith keywords inside the world, using the same hourly Swiss
// Ephemeris calculation as the profile page. Read-only and additive: no existing
// VR or astrology component is modified.
// ═══════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useDailyPlanetaryMood } from '@/hooks/useDailyPlanetaryMood';

const VRPlanetaryMoodPanel: React.FC = () => {
  const { mood, loading, error, refresh } = useDailyPlanetaryMood();

  const rows: { label: string; value: string }[] = [];
  if (mood?.dayLord) rows.push({ label: 'Today', value: `${mood.dayLord.day} · ${mood.dayLord.planet}` });
  if (mood?.horaLord) rows.push({ label: 'This hour', value: mood.horaLord });
  if (mood?.moon) rows.push({ label: 'Moon', value: `${mood.moon.sign}${mood.moon.nakshatra ? ` · ${mood.moon.nakshatra}` : ''}` });
  if (mood?.dasha) rows.push({ label: 'Period', value: `${mood.dasha.maha} – ${mood.dasha.antar}` });

  return (
    <div className="w-60 sm:w-72 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Today&apos;s planetary mood</p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Recalculate today's planetary mood"
          className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {error && <p role="status" className="mt-2 text-[11px] text-white/60">{error}</p>}
      {!error && loading && !mood && <p className="mt-2 text-[11px] text-white/50">Calculating your positions…</p>}

      {rows.length > 0 && (
        <dl className="mt-2 space-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-[10px] uppercase tracking-wide text-white/40">{row.label}</dt>
              <dd className="min-w-0 truncate text-[11px]">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {mood?.keywords.length ? (
        <p className="mt-2 text-[11px] text-white/60">
          <span className="text-white/40">Moods now: </span>{mood.keywords.slice(0, 6).join(' · ')}
        </p>
      ) : null}

      {mood?.faithKeywords.length ? (
        <p className="mt-1 text-[11px] text-white/60">
          <span className="text-white/40">Your faith: </span>{mood.faithKeywords.slice(0, 6).join(' · ')}
        </p>
      ) : null}

      {mood && !mood.completeBirthData && (
        <p className="mt-2 text-[10px] text-white/40">Add your birth time and place for your full life period.</p>
      )}
    </div>
  );
};

export default VRPlanetaryMoodPanel;
