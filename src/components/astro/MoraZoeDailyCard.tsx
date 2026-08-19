import React, { useEffect, useState } from 'react';
import { Sparkles, Moon, Compass, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DailyPrediction } from './types';
import { SLOT_LABEL } from './types';

interface Props {
  prediction: DailyPrediction;
  className?: string;
}

/** Signed poster URL resolver — the bucket is private by design. */
function usePosterUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    supabase.storage
      .from('astro-posters')
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => { if (active) setUrl(data?.signedUrl ?? null); })
      .catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [path]);
  return url;
}

export const MoraZoeDailyCard: React.FC<Props> = ({ prediction, className }) => {
  const posterUrl = usePosterUrl(prediction.poster_image_url);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${className ?? ''}`}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={`Celestial poster for ${prediction.prediction_headline}`}
          loading="lazy"
          className="h-56 w-full object-cover"
        />
      )}

      <header className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">M'Mora Zoe</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {SLOT_LABEL[prediction.slot] ?? 'Daily Alignment'} • {prediction.target_date}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {prediction.status === 'fallback' ? 'Evergreen' : 'Transit'}
        </span>
      </header>

      <div className="space-y-2 px-4 pb-3">
        <h4 className="text-lg font-semibold">{prediction.prediction_headline}</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">{prediction.prediction_body}</p>
      </div>

      <div className="mx-4 mb-3 flex gap-2 rounded-xl bg-muted/50 p-3">
        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm italic">{prediction.motivational_quote}</p>
      </div>

      {prediction.transits_summary?.length > 0 && (
        <footer className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Active celestial transits
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {prediction.transits_summary.slice(0, 3).map((t, i) => (
              <li
                key={`${t.transit_planet}-${t.natal_planet}-${i}`}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground"
              >
                {t.is_retrograde && <Moon className="h-3 w-3" aria-hidden />}
                {t.transit_planet} {t.aspect} natal {t.natal_planet}
                <span className="opacity-60">({t.exactness_deg}°)</span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
};

export default MoraZoeDailyCard;
