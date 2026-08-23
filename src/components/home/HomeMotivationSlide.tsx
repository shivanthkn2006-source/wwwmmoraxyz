import React from 'react';
import { Check, Quote, Sun } from 'lucide-react';
import type { ZoeMotivation } from '@/hooks/useZoeMotivation';

interface HomeMotivationSlideProps {
  motivation: ZoeMotivation;
  posterUrl?: string | null;
}

/** Persistent in-feed version of today's motivation. */
export default function HomeMotivationSlide({ motivation, posterUrl }: HomeMotivationSlideProps) {
  return (
    <article className="relative flex h-full min-h-full w-full shrink-0 snap-start snap-always items-end overflow-hidden bg-background text-foreground" data-daily-motivation>
      {posterUrl && (
        <img
          src={posterUrl}
          alt={`Daily motivation: ${motivation.headline}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/35 to-background/95" aria-hidden="true" />

      <div className="relative z-10 w-full px-5 pb-24 pt-28 sm:px-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <Sun className="h-4 w-4" aria-hidden="true" />
          Today&apos;s motivation
        </div>
        <h2 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">{motivation.headline}</h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/90">{motivation.body}</p>

        {motivation.action_step && (
          <div className="mt-6 flex max-w-xl items-start gap-3 border-l-2 border-primary pl-4">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">One thing to do today</p>
              <p className="mt-1 text-sm leading-relaxed">{motivation.action_step}</p>
            </div>
          </div>
        )}

        {motivation.quote && (
          <div className="mt-6 flex max-w-xl items-start gap-2 text-sm italic text-foreground/90">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>&ldquo;{motivation.quote}&rdquo;</p>
          </div>
        )}
      </div>
    </article>
  );
}