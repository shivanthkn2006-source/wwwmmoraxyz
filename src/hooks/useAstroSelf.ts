/**
 * The signed-in member's astrology signal: sun sign, element, today's ruling
 * planet and whether it rules their sign. Never guesses — no birth date means
 * `sign` stays null and every surface shows the "add your birth date" state.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadAstroSelf, type AstroSelf } from '@/features/astro/astroAffinity';

export function useAstroSelf() {
  const [self, setSelf] = useState<AstroSelf | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSelf(await loadAstroSelf());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await loadAstroSelf();
      if (alive) {
        setSelf(next);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { self, loading, refresh };
}

export default useAstroSelf;
