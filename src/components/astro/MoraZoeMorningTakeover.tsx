import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Moon, Clock, X, Compass } from 'lucide-react';
import type { AstroPredictionRecord } from './moraZoeTypes';

/** Turns technical aspect names into everyday language anyone can follow. */
const plainMood = (aspect: string, retrograde: boolean): string => {
  const key = (aspect || '').toLowerCase();
  const base =
    key.includes('trine') ? 'Things flow easily today'
    : key.includes('sextile') ? 'A small door opens if you act'
    : key.includes('square') ? 'A little friction — go steady'
    : key.includes('opposition') ? 'Balance two sides of your day'
    : key.includes('conjunction') ? 'Strong focus on one thing'
    : 'A gentle, steady day';
  return retrograde ? `${base} · double-check details` : base;
};

interface Props {
  prediction: AstroPredictionRecord;
  posterUrl?: string | null;
  secondsRemaining: number;
  onDismiss: () => void;
}

export const MoraZoeMorningTakeover: React.FC<Props> = ({ prediction, posterUrl, secondsRemaining, onDismiss }) => {
  const progressPercent = ((60 - secondsRemaining) / 60) * 100;
  const art = posterUrl ?? null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background">
      {art && (
        <img
          src={art}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />

      {/* Countdown bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Dawn cycle • {secondsRemaining}s</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss dawn alignment"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Card */}
      <div className="relative mx-auto w-full max-w-lg px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Moon className="h-3.5 w-3.5" />
          M&apos;Mora Zoe • Dawn Alignment
        </div>

        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {prediction.prediction_headline}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {prediction.prediction_body}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
          <Sparkles className="mx-auto mb-2 h-4 w-4 text-primary" />
          <p className="text-sm italic text-foreground">&ldquo;{prediction.motivational_quote}&rdquo;</p>
        </div>

        {prediction.transits_summary?.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Compass className="h-3.5 w-3.5" /> What today feels like
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {prediction.transits_summary.slice(0, 3).map((t, idx) => (
                <span
                  key={`${t.transit_planet}-${t.natal_planet}-${idx}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {plainMood(t.aspect, t.is_retrograde)}
                </span>
              ))}
            </div>
          </div>
        )}


        <p className="mt-8 text-[11px] text-muted-foreground">
          Auto-dismissing and saving to your daily alignment archive…
        </p>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default MoraZoeMorningTakeover;
