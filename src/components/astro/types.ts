/**
 * M'Mora Zoe daily alignment — sandboxed types.
 * Nothing here is imported by existing platform surfaces.
 */

export type AstroSlot = 'morning' | 'noon' | 'evening' | 'night';

export interface TransitSummary {
  transit_planet: string;
  natal_planet: string;
  aspect: string;
  exactness_deg: number;
  is_retrograde: boolean;
}

export interface DailyPrediction {
  id: string;
  target_date: string;
  slot: AstroSlot;
  prediction_headline: string;
  prediction_body: string;
  motivational_quote: string;
  poster_image_url?: string | null;
  status?: 'published' | 'shadow' | 'fallback' | 'failed';
  transits_summary: TransitSummary[];
}

export interface AstroProfile {
  birth_date: string;
  birth_time: string;
  birth_timezone: string;
  birth_latitude: number;
  birth_longitude: number;
  display_timezone: string;
  is_enabled: boolean;
}

export const SLOT_LABEL: Record<AstroSlot, string> = {
  morning: 'Early Morning Alignment',
  noon: 'Midday Recalibration',
  evening: 'Evening Reflection',
  night: 'Goodnight Motivation',
};
