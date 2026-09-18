/**
 * Reads the real planetary context Zoe already calculates (Swiss Ephemeris in
 * the music-connect-context function) into a plain, displayable daily mood.
 * Nothing is invented here: any value the calculation did not provide is left
 * out, so the tracker never shows a made-up planet or period.
 */
import type { MusicConnectContext } from '@/features/music/musicConnect';
import { faithKeywordsFor } from '@/features/music/musicFaith';

export interface DailyPlanetaryMood {
  /** Ruling planet of the current hour — changes through the day. */
  horaLord: string | null;
  /** Planet ruling today, with the weekday name. */
  dayLord: { day: string; planet: string; focus: string } | null;
  moon: { sign: string; nakshatra: string; pada: number | null } | null;
  dasha: { maha: string; antar: string } | null;
  transit: { transitBody: string; aspect: string; natalBody: string; orb: number } | null;
  timeOfDay: string | null;
  engine: string | null;
  completeBirthData: boolean;
  calculatedAt: string | null;
  /** Keywords now driving suggestions, in strength order. */
  keywords: string[];
  faithKeywords: string[];
  religion: string | null;
}

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const obj = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export function readDailyPlanetaryMood(context: MusicConnectContext): DailyPlanetaryMood {
  const planetary = context.planetary ?? {};
  const hora = obj(planetary.hora);
  const dayLord = obj(planetary.dayLord);
  const moon = obj(planetary.currentMoon);
  const dasha = obj(planetary.dasha);
  const transit = obj(planetary.tightestTransit);
  const religion = str(planetary.religion) ?? str((context.taste as { religion?: unknown }).religion);
  const serverFaith = Array.isArray(planetary.faithKeywords)
    ? (planetary.faithKeywords as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

  return {
    horaLord: hora ? str(hora.lord) : null,
    dayLord: dayLord && str(dayLord.planet)
      ? { day: str(dayLord.day) ?? '', planet: str(dayLord.planet) as string, focus: str(dayLord.focus) ?? '' }
      : null,
    moon: moon && str(moon.sign)
      ? { sign: str(moon.sign) as string, nakshatra: str(moon.nakshatra) ?? '', pada: num(moon.pada) }
      : null,
    dasha: dasha && str(dasha.maha) && str(dasha.antar)
      ? { maha: str(dasha.maha) as string, antar: str(dasha.antar) as string }
      : null,
    transit: transit && str(transit.transitBody)
      ? {
          transitBody: str(transit.transitBody) as string,
          aspect: str(transit.aspect) ?? '',
          natalBody: str(transit.natalBody) ?? '',
          orb: num(transit.orb) ?? 0,
        }
      : null,
    timeOfDay: str(planetary.timeOfDay),
    engine: str(planetary.engine),
    completeBirthData: planetary.completeBirthData === true,
    calculatedAt: str(planetary.calculatedAt),
    keywords: context.suggestions.slice(0, 10),
    faithKeywords: serverFaith.length ? serverFaith : faithKeywordsFor(religion),
    religion,
  };
}

/** A short human line describing the mood driving today's picks. */
export function describeDailyPlanetaryMood(mood: DailyPlanetaryMood): string {
  const parts: string[] = [];
  if (mood.horaLord) parts.push(`${mood.horaLord} hour`);
  if (mood.dayLord) parts.push(`${mood.dayLord.day} ruled by ${mood.dayLord.planet}`);
  if (mood.moon) parts.push(`Moon in ${mood.moon.sign}${mood.moon.nakshatra ? ` (${mood.moon.nakshatra})` : ''}`);
  if (mood.dasha) parts.push(`${mood.dasha.maha}–${mood.dasha.antar} period`);
  return parts.join(' · ');
}
