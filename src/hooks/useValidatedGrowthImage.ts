/**
 * Content-to-image validation for Growth cards.
 *
 * Generates the illustration from the card data, then asks the
 * `growth-image-validate` edge function whether the picture actually matches
 * the card (right person / no stranger's face). A mismatch re-rolls the seed
 * once and finally falls back to a guaranteed faceless illustration, so the
 * card can never keep showing a wrong face or a wrong name pairing.
 *
 * Failures are silent: if validation is unavailable the current image stays.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPollinationsUrl } from '@/services/pollinationsService';
import {
  buildGrowthImagePrompt,
  growthImageSeed,
  resolveGrowthImageSubject,
} from '@/lib/growthCardImageSubject';

const MAX_ATTEMPTS = 3; // attempt 0 + one re-roll + faceless fallback

interface Args {
  key: string;
  title: string;
  content: string;
  category: string;
  /** Disable network validation (tests, offline). */
  validate?: boolean;
}

export const useValidatedGrowthImage = ({ key, title, content, category, validate = true }: Args) => {
  const [attempt, setAttempt] = useState(0);
  const checked = useRef<Set<string>>(new Set());

  const subject = useMemo(() => resolveGrowthImageSubject(title, content), [title, content]);

  const src = useMemo(() => {
    const facelessFallback = attempt >= MAX_ATTEMPTS - 1;
    return getPollinationsUrl(buildGrowthImagePrompt(subject, category, { facelessFallback }), {
      width: 768,
      height: 432,
      model: 'flux',
      seed: growthImageSeed(`${key}-${title}`, attempt),
    });
  }, [subject, category, key, title, attempt]);

  useEffect(() => {
    if (!validate) return;
    if (attempt >= MAX_ATTEMPTS - 1) return; // last resort image is trusted
    if (checked.current.has(src)) return;
    checked.current.add(src);

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('growth-image-validate', {
          body: { imageUrl: src, person: subject.person, subject: subject.subject, category },
        });
        if (cancelled || error || !data) return;
        if (data.match === false) setAttempt((a) => Math.min(a + 1, MAX_ATTEMPTS - 1));
      } catch {
        /* validation is best-effort */
      }
    })();

    return () => { cancelled = true; };
  }, [src, subject, category, validate, attempt]);

  return { src, person: subject.person, validating: attempt > 0 && attempt < MAX_ATTEMPTS - 1 };
};
