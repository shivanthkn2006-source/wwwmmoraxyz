import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * Member-facing birth details editor.
 * Source of truth is `profiles`; a database trigger mirrors the values into the
 * alignment engine, so saving here is all that is needed for tomorrow's cards.
 */
const ZoeBirthDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('birth_date, birth_time, birth_place')
      .eq('user_id', user.id)
      .maybeSingle();
    setBirthDate(data?.birth_date ?? '');
    setBirthTime((data?.birth_time ?? '').slice(0, 5));
    setBirthPlace(data?.birth_place ?? '');
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!user?.id) return;
    if (!birthDate || !birthTime || !birthPlace.trim()) {
      setMessage('Please fill the date, time and place so the reading can be calculated.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        birth_date: birthDate,
        birth_time: `${birthTime.slice(0, 5)}:00`,
        birth_place: birthPlace.trim(),
      })
      .eq('user_id', user.id);
    setSaving(false);
    setMessage(error ? `Could not save: ${error.message}` : 'Saved. Your next daily card will use these details.');
    if (!error) void load();
  };

  const clear = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: null, birth_time: null, birth_place: null })
      .eq('user_id', user.id);
    setSaving(false);
    if (!error) {
      setBirthDate(''); setBirthTime(''); setBirthPlace('');
      setMessage('Removed. Daily alignment cards are paused; your daily motivation still arrives.');
    } else {
      setMessage(`Could not remove: ${error.message}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/zoe-astro" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Your birth details</h1>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <Info className="h-4 w-4" />
          <span className="font-medium">What these are used for</span>
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Date</strong> — sets your birth chart, the base of every daily reading.</li>
          <li><strong>Time</strong> — decides which part of the day each planet touches; even 30 minutes changes the reading.</li>
          <li><strong>Place</strong> — gives your time zone and sky position, so mornings land at your real local morning.</li>
        </ul>
        <div className="mt-3 flex items-start gap-2 text-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            These values stay private to your account. They are never shown in the feed, never shared with
            other members, and are only read by the engine that writes your own daily card.
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Date of birth</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Time of birth</span>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Place of birth (city, country)</span>
            <input
              type="text"
              value={birthPlace}
              placeholder="Chennai, India"
              onChange={(e) => setBirthPlace(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Save details
            </button>
            <button
              onClick={clear}
              disabled={saving || (!birthDate && !birthTime && !birthPlace)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Remove details
            </button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
};

export default ZoeBirthDetailsPage;
