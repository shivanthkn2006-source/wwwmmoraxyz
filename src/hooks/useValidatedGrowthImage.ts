/**
 * Content-to-image validation for Growth cards.
 *
 * Generates the illustration from the card data, then asks the
 * `growth-image-validate` edge function whether the picture actually matches
 * the card (right person / no stranger's face). A mismatch re-rolls the seed
 * (configurable retry count) and finally falls back to a guaranteed faceless
 * illustration, so the card can never keep showing a wrong face.
 *
 * Every verdict is cached (per image URL + strictness) so a card that has been
 * validated once never pays the latency or load again, and every outcome is
 * written to the structured validation log for the debug panel.
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
import {
  getCachedValidation,
  getValidationConfig,
  isValidationCoolingDown,
  logValidation,
  setCachedValidation,
  startValidationCooldown,
  validationCacheKey,
} from '@/lib/growthImageValidation';


interface Args {
  key: string;
  title: string;
  content: string;
  category: string;
  /** Disable network validation (tests, offline). */
  validate?: boolean;
}

export const useValidatedGrowthImage = ({ key, title, content, category, validate = true }: Args) => {
  const config = useMemo(() => getValidationConfig(), []);
  // attempt 0 .. retries are re-rolls; the final attempt is the faceless image.
  const lastAttempt = config.retries + 1;
  const [attempt, setAttempt] = useState(0);
  const checked = useRef<Set<string>>(new Set());

  const subject = useMemo(() => resolveGrowthImageSubject(title, content), [title, content]);

  const src = useMemo(() => {
    const facelessFallback = attempt >= lastAttempt;
    return getPollinationsUrl(buildGrowthImagePrompt(subject, category, { facelessFallback }), {
      width: 768,
      height: 432,
      model: 'flux',
      seed: growthImageSeed(`${key}-${title}`, attempt),
    });
  }, [subject, category, key, title, attempt, lastAttempt]);

  useEffect(() => {
    if (!validate || !config.enabled) return;
    if (attempt >= lastAttempt) return; // last resort image is trusted
    if (checked.current.has(src)) return;
    // Provider is down/quota-exhausted: skip the round trip entirely.
    if (isValidationCoolingDown()) return;
    checked.current.add(src);


    const cacheKey = validationCacheKey(src, config.strictness);
    const base = {
      cardKey: key,
      title,
      category,
      person: subject.person,
      attempt,
      imageUrl: src,
      strictness: config.strictness,
    };

    const cachedVerdict = getCachedValidation(cacheKey);
    if (cachedVerdict) {
      logValidation({
        ...base,
        outcome: cachedVerdict.match ? 'cached' : 'mismatch',
        reason: cachedVerdict.reason || 'cached verdict',
        cached: true,
      });
      if (!cachedVerdict.match) setAttempt((a) => Math.min(a + 1, lastAttempt));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('growth-image-validate', {
          body: {
            imageUrl: src,
            person: subject.person,
            subject: subject.subject,
            category,
            strictness: config.strictness,
          },
        });
        if (cancelled) return;
        if (error || !data) {
          logValidation({ ...base, outcome: 'error', reason: error?.message ?? 'no response', cached: false });
          return;
        }
        // Inconclusive (no vision provider / validator never saw the image) is
        // not a verdict: keep the current image and do not poison the cache.
        if (data.inconclusive) {
          startValidationCooldown();
          logValidation({ ...base, outcome: 'error', reason: data.reason ?? 'inconclusive', cached: false });
          return;
        }
        const match = data.match !== false;
        setCachedValidation(cacheKey, match, data.reason ?? '');

        logValidation({
          ...base,
          outcome: match ? 'match' : 'mismatch',
          reason: data.reason ?? '',
          cached: false,
        });

        if (!match) {
          setAttempt((a) => {
            const next = Math.min(a + 1, lastAttempt);
            if (next >= lastAttempt) {
              logValidation({ ...base, attempt: next, outcome: 'fallback', reason: 'faceless fallback', cached: false });
            }
            return next;
          });
        }
      } catch (e) {
        if (!cancelled) {
          logValidation({ ...base, outcome: 'error', reason: (e as Error)?.message ?? 'threw', cached: false });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [src, subject, category, validate, attempt, key, title, config, lastAttempt]);

  return { src, person: subject.person, validating: attempt > 0 && attempt < lastAttempt };
};
