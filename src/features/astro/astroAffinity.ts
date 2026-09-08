/**
 * Astrology → feed signal.
 *
 * Turns the member's real birth date and the other members' real birth dates
 * into a small, capped ranking boost. It never invents a birth date and never
 * outranks closeness: the boost is bounded to +1 in a score where closeness
 * alone reaches +2 and recency +3.
 */
import { supabase } from '@/integrations/supabase/client';
import { sunSignFromBirthDate, signAffinity, isDayLordMatch, type ZodiacSign } from './zodiac';
import { getDailyArchetype } from '@/lib/dayLord';

export interface AstroSelf {
  userId: string;
  birthDate: string | null;
  sign: ZodiacSign | null;
  rulingPlanet: string;
  dayLordMatch: boolean;
}

const pickBirthDate = (row: Record<string, unknown> | null | undefined): string | null =>
  (row?.birth_date as string | null) ?? (row?.date_of_birth as string | null) ?? null;

export async function loadAstroSelf(): Promise<AstroSelf | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from('profiles')
    .select('birth_date, date_of_birth')
    .eq('user_id', uid)
    .maybeSingle();
  const birthDate = pickBirthDate(data as never);
  const sign = sunSignFromBirthDate(birthDate);
  const lord = getDailyArchetype();
  return {
    userId: uid,
    birthDate,
    sign,
    rulingPlanet: lord.rulingPlanet,
    dayLordMatch: isDayLordMatch(sign, lord.rulingPlanet),
  };
}

/**
 * authorId → boost (0…1). Empty map when the member has no birth date, so the
 * feed order is untouched for anyone who hasn't shared one.
 */
export async function buildAstroBoost(authorIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = Array.from(new Set(authorIds.filter(Boolean)));
  if (ids.length === 0) return out;

  const self = await loadAstroSelf();
  if (!self?.sign) return out;

  const { data } = await supabase
    .from('profiles')
    .select('user_id, birth_date, date_of_birth')
    .in('user_id', ids);

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const sign = sunSignFromBirthDate(pickBirthDate(row));
    if (!sign) continue;
    // Element affinity (0…1) plus a small same-ruler nudge on their day.
    const base = signAffinity(self.sign, sign);
    const dayBonus = isDayLordMatch(sign, self.rulingPlanet) ? 0.15 : 0;
    out.set(row.user_id as string, Math.min(1, base * 0.85 + dayBonus));
  }
  return out;
}
