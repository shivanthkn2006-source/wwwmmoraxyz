import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, MapPin, X, Loader2 } from 'lucide-react';
import type { BirthDetails } from '@/hooks/useBirthDetailsGate';

interface Props {
  initial: BirthDetails | null;
  onSave: (details: BirthDetails) => Promise<{ ok: boolean; error?: string }>;
  onSkip: () => void;
}

/**
 * Shown ONLY to members who have not filled birth date / time / place.
 * Saving stores it on their profile, which the existing sync trigger mirrors
 * into the alignment engine instantly. Nothing else on the platform changes.
 */
export const MoraZoeBirthDetailsPrompt: React.FC<Props> = ({ initial, onSave, onSkip }) => {
  const [date, setDate] = useState(initial?.birth_date ?? '');
  const [time, setTime] = useState(initial?.birth_time ?? '');
  const [place, setPlace] = useState(initial?.birth_place ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await onSave({ birth_date: date, birth_time: time, birth_place: place });
    if (!res.ok) setError(res.error ?? 'Could not save. Please try again.');
    setSaving(false);
  };

  const overlay = (
    <div className="fixed inset-0 z-[10030] flex items-center justify-center overflow-y-auto bg-background/95 px-5 py-10 backdrop-blur">
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <button
          type="button"
          onClick={onSkip}
          aria-label="Not now"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          One-time setup
        </div>

        <h2 className="text-xl font-semibold text-foreground">Unlock your daily alignment</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us when and where you were born and Zoe will prepare a personal reading for you every
          morning. You&apos;ll keep getting your daily motivation either way.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="mz-birth-date" className="text-xs font-medium text-foreground">Date of birth</label>
            <input
              id="mz-birth-date"
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label htmlFor="mz-birth-time" className="text-xs font-medium text-foreground">Time of birth</label>
            <input
              id="mz-birth-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Not sure? An approximate time still works.</p>
          </div>

          <div>
            <label htmlFor="mz-birth-place" className="text-xs font-medium text-foreground">Place of birth</label>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="mz-birth-place"
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="City, Country"
                required
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="flex w-full items-center gap-2 text-left text-xs font-medium text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Not sure of your birth time or place?
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${showHelp ? 'rotate-180' : ''}`}
            />
          </button>

          {showHelp && (
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Where to find your birth time</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>Your birth certificate — the time is usually printed next to the date.</li>
                  <li>Hospital discharge or record card, or the maternity register.</li>
                  <li>Ask a parent or an older relative who was there that day.</li>
                  <li>Still unsure? Use your best guess — morning 08:00, midday 12:00, evening 18:00.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">How to write your birth place</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>Use <strong>City, Country</strong> — for example “Chennai, India”.</li>
                  <li>Born in a small town? Use the nearest large city.</li>
                  <li>The place sets your time zone, so your card arrives at your real local morning.</li>
                </ul>
              </div>
              <p>
                Accuracy matters most for the time: even 30 minutes shifts the reading. You can update
                these details any time from your Zoe birth details page.
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default MoraZoeBirthDetailsPrompt;
