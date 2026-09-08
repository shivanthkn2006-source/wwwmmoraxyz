/**
 * /astrology — the member-facing astrology page.
 *
 * Everything here is real: the sun sign comes from the birth date on the
 * member's own profile, the day-lord from the deterministic weekday table, and
 * the daily reading from the Swiss-Ephemeris-backed `astro_predictions` rows.
 * Nothing is invented — missing data shows an honest empty state.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAstroSelf } from '@/hooks/useAstroSelf';
import { useAgeCohort } from '@/hooks/useAgeCohort';
import { cohortStyle } from '@/features/intimacy/cohortStyle';
import { elementOf, RULER_OF } from '@/features/astro/zodiac';
import { getDailyArchetype } from '@/lib/dayLord';
import { localDateKey, deviceTimeZone } from '@/lib/astroSlot';

interface Reading {
  id: string;
  target_date: string;
  slot: string | null;
  prediction_headline: string | null;
  prediction_body: string | null;
  motivational_quote: string | null;
}

const AstrologyPage: React.FC = () => {
  const { self, loading, refresh } = useAstroSelf();
  const { cohort } = useAgeCohort();
  const style = cohortStyle(cohort);
  const lord = getDailyArchetype();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [birthInput, setBirthInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const { data } = await supabase
      .from('astro_predictions')
      .select('id, target_date, slot, prediction_headline, prediction_body, motivational_quote')
      .eq('user_id', auth.user.id)
      .order('target_date', { ascending: false })
      .limit(8);
    setReadings((data ?? []) as Reading[]);
  }, []);

  useEffect(() => { void loadReadings(); }, [loadReadings]);

  const saveBirthDate = async () => {
    if (!birthInput) return;
    setSaving(true);
    setNote(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { setNote('Please sign in first.'); setSaving(false); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: birthInput })
      .eq('user_id', auth.user.id);
    setNote(error ? `Could not save: ${error.message}` : 'Saved. Your sign and age group are set.');
    setSaving(false);
    if (!error) await refresh();
  };

  const today = localDateKey(new Date(), deviceTimeZone());
  const todays = readings.find((r) => r.target_date === today) ?? readings[0] ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-background px-4 py-6 text-foreground">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Astrology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Built from your birth date and today's real planetary hours. It also gently
          shapes the order of your Mosaic feed.
        </p>
      </header>

      {/* Today's ruling planet — deterministic, always available */}
      <section className="mb-4 rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{lord.dayName}</p>
        <h2 className="mt-1 text-lg font-semibold">Ruled by {lord.rulingPlanet}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lord.archetype} · {lord.dailyFocus}</p>
      </section>

      {/* Your sign */}
      <section className="mb-4 rounded-xl border border-border bg-card p-5">
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
        ) : self?.sign ? (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your sign</p>
            <h2 className={style.titleClass}>{self.sign} · {elementOf(self.sign)}</h2>
            <p className={`mt-1 text-muted-foreground ${style.bodyClass}`}>
              Ruled by {RULER_OF[self.sign]}.{' '}
              {self.dayLordMatch
                ? `Today is ${lord.rulingPlanet}'s day — your own ruler, so this is your strongest day of the week.`
                : `Today belongs to ${lord.rulingPlanet}, not your ruler — steady rather than surging.`}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Add your birth date</p>
            <p className={`mt-1 text-muted-foreground ${style.bodyClass}`}>
              Your sign, your age group and your daily reading all come from this one date.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                type="date"
                aria-label="Your birth date"
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                className="max-w-[200px]"
              />
              <Button onClick={() => void saveBirthDate()} disabled={saving || !birthInput}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
          </>
        )}
      </section>

      {/* Today's reading */}
      <section className="mb-4 rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Today's reading</p>
        {todays ? (
          <>
            <h2 className={`mt-1 ${style.titleClass}`}>{todays.prediction_headline}</h2>
            <p className={`mt-2 text-muted-foreground ${style.bodyClass}`}>{todays.prediction_body}</p>
            {todays.motivational_quote && (
              <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                {todays.motivational_quote}
              </p>
            )}
          </>
        ) : (
          <p className={`mt-1 text-muted-foreground ${style.bodyClass}`}>
            No reading yet for today. Once your birth details are in, Zoe writes one each morning.
          </p>
        )}
      </section>

      {readings.length > 1 && (
        <section className="mb-4 rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Earlier readings</p>
          <ul className="mt-2 space-y-3">
            {readings.slice(1, 6).map((r) => (
              <li key={r.id} className="border-b border-border pb-2 last:border-0">
                <p className="text-xs text-muted-foreground">{r.target_date}{r.slot ? ` · ${r.slot}` : ''}</p>
                <p className={style.bodyClass}>{r.prediction_headline}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Want the full alignment dashboard?{' '}
        <Link to="/zoe-astro" className="underline">Open Zoe's alignment view</Link>.
      </p>
    </main>
  );
};

export default AstrologyPage;
