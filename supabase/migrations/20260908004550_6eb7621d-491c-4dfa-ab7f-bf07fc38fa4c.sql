CREATE OR REPLACE FUNCTION public.cohort_from_birth_date(bd date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN bd IS NULL THEN 'unspecified'
    WHEN EXTRACT(YEAR FROM bd) >= 1997 THEN 'genz'
    WHEN EXTRACT(YEAR FROM bd) >= 1981 THEN 'millennial'
    WHEN EXTRACT(YEAR FROM bd) >= 1965 THEN 'genx'
    WHEN EXTRACT(YEAR FROM bd) >= 1946 THEN 'boomer'
    ELSE 'unspecified'
  END
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_age_cohort()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.age_cohort := public.cohort_from_birth_date(COALESCE(NEW.birth_date, NEW.date_of_birth));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_age_cohort ON public.profiles;
CREATE TRIGGER trg_profiles_age_cohort
BEFORE INSERT OR UPDATE OF birth_date, date_of_birth ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_age_cohort();

UPDATE public.profiles
SET age_cohort = public.cohort_from_birth_date(COALESCE(birth_date, date_of_birth))
WHERE age_cohort IS DISTINCT FROM public.cohort_from_birth_date(COALESCE(birth_date, date_of_birth));

ALTER TABLE public.zoe_feed_cards
  ALTER COLUMN cohort SET DEFAULT 'unspecified';

UPDATE public.zoe_feed_cards SET cohort = 'unspecified' WHERE cohort IS NULL;