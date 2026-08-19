import React from 'react';
import { createPortal } from 'react-dom';
import { Sun, X, Check, ArrowRight } from 'lucide-react';
import type { ZoeMotivation } from '@/hooks/useZoeMotivation';

interface Props {
  motivation: ZoeMotivation;
  posterUrl?: string | null;
  onDismiss: () => void;
}

/**
 * Full-screen everyday motivation card. Deliberately different from the
 * astrology takeover: plain life-coach language, one action step, and a
 * photographic lifestyle poster instead of celestial art.
 */
export const MoraZoeLoginGreeting: React.FC<Props> = ({ motivation, posterUrl, onDismiss }) => {
  const overlay = (
    <div className="fixed inset-0 z-[10040] flex items-center justify-center overflow-hidden bg-background">
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Readable scrim only — the photo itself stays fully visible. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/35 to-background/85" />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close today's motivation"
        className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative mx-auto w-full max-w-lg px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Sun className="h-3.5 w-3.5" />
          Today&apos;s motivation
        </div>

        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {motivation.headline}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {motivation.body}
        </p>

        {motivation.action_step && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-4 text-left backdrop-blur">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">One thing to do today</p>
              <p className="mt-1 text-sm text-foreground">{motivation.action_step}</p>
            </div>
          </div>
        )}

        {motivation.quote && (
          <p className="mt-6 text-sm italic text-foreground">&ldquo;{motivation.quote}&rdquo;</p>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Start my day <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default MoraZoeLoginGreeting;
