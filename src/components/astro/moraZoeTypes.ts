/**
 * M'Mora Zoe global overlay layer — isolated types.
 * Not imported by any existing platform surface.
 */

export interface PlanetaryTransit {
  transit_planet: string;
  natal_planet: string;
  aspect: string;
  exactness_deg: number;
  is_retrograde: boolean;
}

export interface AstroPredictionRecord {
  id: string;
  user_id: string;
  target_date: string;
  slot?: string;
  idempotency_key?: string;
  transits_summary: PlanetaryTransit[];
  prediction_headline: string;
  prediction_body: string;
  motivational_quote: string;
  poster_image_url?: string | null;
  status: string;
  created_at: string;
}

export interface DiagnosticResult {
  passed: boolean;
  user_id?: string;
  has_profile: boolean;
  predictions_available: number;
  rls_error?: string;
  checked_at: string;
}
