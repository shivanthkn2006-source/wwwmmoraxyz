
-- Secure, one-way bridge: profile birth details -> astro engine profile.
CREATE OR REPLACE FUNCTION public.resolve_astro_place(p_place text)
RETURNS TABLE(tz text, lat double precision, lon double precision)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_place IS NULL THEN 'UTC'
      WHEN p_place ~* '(thiruvan|trivandr|kerala|kochi|cochin)' THEN 'Asia/Kolkata'
      WHEN p_place ~* '(india|delhi|mumbai|bangalore|bengaluru|chennai|hyderabad|kolkata|pune)' THEN 'Asia/Kolkata'
      WHEN p_place ~* '(dubai|abu dhabi|sharjah|uae|emirates)' THEN 'Asia/Dubai'
      WHEN p_place ~* '(london|united kingdom|england|uk)' THEN 'Europe/London'
      WHEN p_place ~* '(new york|nyc|boston|toronto)' THEN 'America/New_York'
      WHEN p_place ~* '(los angeles|san francisco|seattle)' THEN 'America/Los_Angeles'
      WHEN p_place ~* '(singapore)' THEN 'Asia/Singapore'
      WHEN p_place ~* '(sydney|melbourne|australia)' THEN 'Australia/Sydney'
      WHEN p_place ~* '(tokyo|japan)' THEN 'Asia/Tokyo'
      ELSE 'UTC'
    END,
    CASE
      WHEN p_place ~* '(thiruvan|trivandr|kerala)' THEN 8.5241
      WHEN p_place ~* '(dubai|sharjah|uae|emirates)' THEN 25.2048
      WHEN p_place ~* '(abu dhabi)' THEN 24.4539
      WHEN p_place ~* '(delhi)' THEN 28.6139
      WHEN p_place ~* '(mumbai)' THEN 19.0760
      WHEN p_place ~* '(bangalore|bengaluru)' THEN 12.9716
      WHEN p_place ~* '(chennai)' THEN 13.0827
      WHEN p_place ~* '(india)' THEN 20.5937
      WHEN p_place ~* '(london|united kingdom|england|uk)' THEN 51.5072
      WHEN p_place ~* '(new york|nyc)' THEN 40.7128
      WHEN p_place ~* '(los angeles)' THEN 34.0522
      WHEN p_place ~* '(singapore)' THEN 1.3521
      WHEN p_place ~* '(tokyo|japan)' THEN 35.6762
      WHEN p_place ~* '(sydney|australia)' THEN -33.8688
      ELSE 0
    END,
    CASE
      WHEN p_place ~* '(thiruvan|trivandr|kerala)' THEN 76.9366
      WHEN p_place ~* '(dubai|sharjah|uae|emirates)' THEN 55.2708
      WHEN p_place ~* '(abu dhabi)' THEN 54.3773
      WHEN p_place ~* '(delhi)' THEN 77.2090
      WHEN p_place ~* '(mumbai)' THEN 72.8777
      WHEN p_place ~* '(bangalore|bengaluru)' THEN 77.5946
      WHEN p_place ~* '(chennai)' THEN 80.2707
      WHEN p_place ~* '(india)' THEN 78.9629
      WHEN p_place ~* '(london|united kingdom|england|uk)' THEN -0.1276
      WHEN p_place ~* '(new york|nyc)' THEN -74.0060
      WHEN p_place ~* '(los angeles)' THEN -118.2437
      WHEN p_place ~* '(singapore)' THEN 103.8198
      WHEN p_place ~* '(tokyo|japan)' THEN 139.6503
      WHEN p_place ~* '(sydney|australia)' THEN 151.2093
      ELSE 0
    END;
$$;

CREATE OR REPLACE FUNCTION public.sync_astro_profile_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text; v_lat double precision; v_lon double precision;
BEGIN
  IF NEW.birth_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tz, lat, lon INTO v_tz, v_lat, v_lon FROM public.resolve_astro_place(NEW.birth_place);

  INSERT INTO public.astro_profiles AS ap (
    user_id, birth_date, birth_time, birth_timezone,
    birth_latitude, birth_longitude, display_timezone, is_enabled
  ) VALUES (
    NEW.user_id, NEW.birth_date, COALESCE(NEW.birth_time, '12:00:00'::time), v_tz,
    v_lat, v_lon, v_tz, true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    birth_date = EXCLUDED.birth_date,
    birth_time = EXCLUDED.birth_time,
    birth_timezone = EXCLUDED.birth_timezone,
    birth_latitude = EXCLUDED.birth_latitude,
    birth_longitude = EXCLUDED.birth_longitude,
    display_timezone = EXCLUDED.display_timezone,
    updated_at = now()
  WHERE ap.user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

-- one astro profile per user (idempotency + no cross-user mixing)
CREATE UNIQUE INDEX IF NOT EXISTS astro_profiles_user_id_key ON public.astro_profiles(user_id);

DROP TRIGGER IF EXISTS trg_sync_astro_profile ON public.profiles;
CREATE TRIGGER trg_sync_astro_profile
AFTER INSERT OR UPDATE OF birth_date, birth_time, birth_place ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_astro_profile_from_profile();

-- backfill existing members that already carry birth details
INSERT INTO public.astro_profiles (
  user_id, birth_date, birth_time, birth_timezone,
  birth_latitude, birth_longitude, display_timezone, is_enabled
)
SELECT p.user_id, p.birth_date, COALESCE(p.birth_time, '12:00:00'::time), r.tz,
       r.lat, r.lon, r.tz, true
FROM public.profiles p
CROSS JOIN LATERAL public.resolve_astro_place(p.birth_place) r
WHERE p.birth_date IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
