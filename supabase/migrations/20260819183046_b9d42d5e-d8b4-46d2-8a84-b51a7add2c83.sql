-- Image generation telemetry on both card engines
ALTER TABLE public.zoe_daily_motivations
  ADD COLUMN IF NOT EXISTS image_provider text,
  ADD COLUMN IF NOT EXISTS image_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS image_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_retries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_cost_usd numeric(10,5) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_attempt_log jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.astro_predictions
  ADD COLUMN IF NOT EXISTS image_prompt text,
  ADD COLUMN IF NOT EXISTS image_provider text,
  ADD COLUMN IF NOT EXISTS image_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS image_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_retries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_cost_usd numeric(10,5) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_attempt_log jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Open-rate tracking for the two full-screen card surfaces
CREATE TABLE IF NOT EXISTS public.astro_card_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface text NOT NULL CHECK (surface IN ('morning_takeover','login_greeting')),
  card_id uuid,
  target_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  opened_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  dwell_ms integer,
  read_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, surface, target_date)
);

GRANT SELECT, INSERT, UPDATE ON public.astro_card_impressions TO authenticated;
GRANT ALL ON public.astro_card_impressions TO service_role;

ALTER TABLE public.astro_card_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own impressions read" ON public.astro_card_impressions;
CREATE POLICY "own impressions read" ON public.astro_card_impressions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own impressions insert" ON public.astro_card_impressions;
CREATE POLICY "own impressions insert" ON public.astro_card_impressions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own impressions update" ON public.astro_card_impressions;
CREATE POLICY "own impressions update" ON public.astro_card_impressions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS astro_card_impressions_user_idx
  ON public.astro_card_impressions (user_id, surface, target_date DESC);