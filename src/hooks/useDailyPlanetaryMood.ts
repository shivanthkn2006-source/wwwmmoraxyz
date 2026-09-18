/**
 * Keeps the member's planetary mood current on its own: it refreshes when the
 * cached calculation expires, when the planetary hour turns over and when the
 * local day changes — so birth-chart suggestions move day by day without the
 * member typing a search.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMusicConnectContext } from '@/features/music/musicConnect';
import { readDailyPlanetaryMood, type DailyPlanetaryMood } from '@/features/music/dailyPlanetaryMood';

const CHECK_MS = 60_000;

function stamp(date = new Date()): string {
  // Local day + hour: both a new day and a new planetary hour must re-calculate.
  return `${date.toDateString()}:${date.getHours()}`;
}

export function useDailyPlanetaryMood(): {
  mood: DailyPlanetaryMood | null;
  loading: boolean;
  error: string;
  refresh: () => void;
} {
  const [mood, setMood] = useState<DailyPlanetaryMood | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seen = useRef(stamp());
  const alive = useRef(true);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const context = await fetchMusicConnectContext(force);
      if (!alive.current) return;
      setMood(readDailyPlanetaryMood(context));
      setError('');
    } catch {
      if (alive.current) setError('Today’s planetary reading is unavailable right now.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load(false);
    const timer = window.setInterval(() => {
      const now = stamp();
      if (now !== seen.current) {
        seen.current = now;
        void load(true);
        return;
      }
      // The cached reading has run out — recalculate quietly.
      setMood((current) => {
        if (current && !current.calculatedAt) return current;
        return current;
      });
    }, CHECK_MS);
    return () => { alive.current = false; window.clearInterval(timer); };
  }, [load]);

  return { mood, loading, error, refresh: () => void load(true) };
}

export default useDailyPlanetaryMood;
