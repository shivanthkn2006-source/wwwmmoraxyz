-- ============================================================
-- 1. BIRTH DATE REPAIR
-- profiles carries BOTH `birth_date` (read by the DHF/astro engines)
-- and `date_of_birth` (written by conversational onboarding).
-- The two never synced, so onboarded users had an invisible DOB and
-- every personalised path silently degraded to generic content.
-- ============================================================

-- Backfill in both directions; neither column wins over real data.
UPDATE public.profiles
SET birth_date = date_of_birth
WHERE birth_date IS NULL AND date_of_birth IS NOT NULL;

UPDATE public.profiles
SET date_of_birth = birth_date
WHERE date_of_birth IS NULL AND birth_date IS NOT NULL;

-- Keep them identical from now on, so no future code path can write
-- into a column the engines do not read.
CREATE OR REPLACE FUNCTION public.sync_profile_birth_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.birth_date    := COALESCE(NEW.birth_date, NEW.date_of_birth);
    NEW.date_of_birth := COALESCE(NEW.date_of_birth, NEW.birth_date);
    RETURN NEW;
  END IF;

  -- On UPDATE, whichever column actually changed is the source of truth.
  IF NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    NEW.date_of_birth := NEW.birth_date;
  ELSIF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    NEW.birth_date := NEW.date_of_birth;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_birth_date ON public.profiles;
CREATE TRIGGER trg_sync_profile_birth_date
  BEFORE INSERT OR UPDATE OF birth_date, date_of_birth ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_birth_date();

-- ============================================================
-- 2. ANTI-REPETITION LEDGER
-- Growth cards repeated Benjamin Franklin in ~70% of biographical
-- cards because the prompt carried no identity and no history.
-- This ledger lets the generator exclude what a user already saw.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.growth_used_figures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  figure_slug text NOT NULL,
  figure_name text NOT NULL,
  local_date  date NOT NULL,
  slot        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One figure per user per day per slot; makes dispatch retries idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS growth_used_figures_unique
  ON public.growth_used_figures (user_id, local_date, slot);

CREATE INDEX IF NOT EXISTS growth_used_figures_recent
  ON public.growth_used_figures (user_id, created_at DESC);

GRANT SELECT ON public.growth_used_figures TO authenticated;
GRANT ALL    ON public.growth_used_figures TO service_role;

ALTER TABLE public.growth_used_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own figure history"
  ON public.growth_used_figures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages figure history"
  ON public.growth_used_figures FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);