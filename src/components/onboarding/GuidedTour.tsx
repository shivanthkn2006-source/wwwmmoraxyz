/**
 * GUIDED TOUR — the short walk a new member gets after joining.
 *
 * Four stops: Home, Mosaic, Zoe's cards, Astrology. It navigates for you and
 * explains each page in one plain sentence. Monochrome, bottom-LEFT only, so
 * the bottom-right call/dock zone is never covered. Nothing else on screen
 * changes; the tour can be skipped at any point and never returns once done.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export interface TourStop {
  path: string;
  title: string;
  body: string;
}

export const TOUR_STOPS: TourStop[] = [
  {
    path: '/home',
    title: 'Home',
    body: 'Everything from the people you follow, newest first. Write a post, add a photo, or just read.',
  },
  {
    path: '/mosaic',
    title: 'Mosaic',
    body: 'The same posts in a calmer grid, ordered by who you are actually closest to — not by who shouts loudest.',
  },
  {
    path: '/growth-insights',
    title: "Zoe's cards",
    body: 'Small daily cards Zoe picks for you. Tap one to hear it read aloud, or save it for later.',
  },
  {
    path: '/astrology',
    title: 'Astrology',
    body: 'Your sign, your day and what it means — worked out from a real sky chart for your birth date and place.',
  },
];

const STARTED_KEY = 'mmora_tour_pending';
const doneKey = (userId: string) => `mmora_tour_done_${userId}`;
const stepKey = (userId: string) => `mmora_tour_step_${userId}`;

/** Called from the join flow so the tour begins on the first signed-in page. */
export function markTourPending() {
  try {
    localStorage.setItem(STARTED_KEY, '1');
  } catch {
    /* storage disabled — the tour simply will not auto-start */
  }
}

export default function GuidedTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<number | null>(null);

  const wantsTour = useMemo(
    () => new URLSearchParams(location.search).get('tour') === '1',
    [location.search],
  );

  // Decide once per signed-in session whether the tour should run.
  useEffect(() => {
    if (!user || step !== null) return;
    let pending = false;
    let saved = 0;
    try {
      const done = localStorage.getItem(doneKey(user.id)) === '1';
      pending = !done && (wantsTour || localStorage.getItem(STARTED_KEY) === '1');
      saved = Number(localStorage.getItem(stepKey(user.id)) ?? '0');
    } catch {
      pending = wantsTour;
    }
    if (!pending) return;
    const start = Number.isFinite(saved) && saved > 0 && saved < TOUR_STOPS.length ? saved : 0;
    setStep(start);
    if (location.pathname !== TOUR_STOPS[start].path) navigate(TOUR_STOPS[start].path);
  }, [user, step, wantsTour, location.pathname, navigate]);

  const finish = useCallback(
    async (completed: boolean) => {
      setStep(null);
      if (!user) return;
      try {
        localStorage.setItem(doneKey(user.id), '1');
        localStorage.removeItem(STARTED_KEY);
        localStorage.removeItem(stepKey(user.id));
      } catch {
        /* ignore */
      }
      try {
        await supabase
          .from('onboarding_progress')
          .upsert(
            {
              user_id: user.id,
              current_step: TOUR_STOPS.length,
              completed,
              skipped: !completed,
              last_shown_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );
      } catch {
        /* the tour is still finished locally even if the record fails */
      }
    },
    [user],
  );

  const go = useCallback(
    (next: number) => {
      if (next >= TOUR_STOPS.length) {
        void finish(true);
        return;
      }
      setStep(next);
      if (user) {
        try {
          localStorage.setItem(stepKey(user.id), String(next));
        } catch {
          /* ignore */
        }
      }
      navigate(TOUR_STOPS[next].path);
    },
    [finish, navigate, user],
  );

  if (step === null || !user) return null;
  const stop = TOUR_STOPS[step];

  return (
    <div
      role="dialog"
      aria-label={`Getting started: ${stop.title}`}
      className="fixed bottom-24 left-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] border border-border bg-background/95 backdrop-blur p-4 space-y-3 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Step {step + 1} of {TOUR_STOPS.length}
        </span>
        <button
          type="button"
          onClick={() => void finish(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Skip
        </button>
      </div>

      <h2 className="text-sm uppercase tracking-widest">{stop.title}</h2>
      <p className="text-sm text-muted-foreground">{stop.body}</p>

      <div className="flex items-center gap-2 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="text-xs border border-border px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => go(step + 1)}
          className="text-xs border border-foreground bg-foreground text-background px-3 py-1.5 hover:opacity-80 transition-opacity"
        >
          {step === TOUR_STOPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
