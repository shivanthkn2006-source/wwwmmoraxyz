/**
 * Resolves the signed-in member's generational cohort from their stored
 * profile. Prefers the explicit `age_cohort` column, falls back to whichever
 * birth-date column the profile carries. Never guesses.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveAuthUid } from '@/lib/safeTelemetry';
import { cohortFromBirthDate, type AgeCohort } from '@/features/intimacy/generationalTone';

export function useAgeCohort(): { cohort: AgeCohort; loading: boolean } {
  const [cohort, setCohort] = useState<AgeCohort>('unspecified');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await resolveAuthUid();
        if (!uid) return;
        const { data } = await supabase
          .from('profiles')
          .select('age_cohort, birth_date, date_of_birth')
          .eq('user_id', uid)
          .maybeSingle();
        if (cancelled || !data) return;
        const row = data as { age_cohort?: string | null; birth_date?: string | null; date_of_birth?: string | null };
        const stored = row.age_cohort as AgeCohort | null | undefined;
        if (stored && stored !== 'unspecified') {
          setCohort(stored);
        } else {
          setCohort(cohortFromBirthDate(row.birth_date ?? row.date_of_birth ?? null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { cohort, loading };
}
