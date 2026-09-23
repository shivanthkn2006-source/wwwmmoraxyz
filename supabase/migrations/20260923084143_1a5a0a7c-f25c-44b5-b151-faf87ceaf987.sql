ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS total_points integer,
  ADD COLUMN IF NOT EXISTS current_tier text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_profiles (
    user_id, username, display_name, profile_photo_url, bio, profile_visibility,
    city, hobbies, status, event_date, event_recurring, profession, field_of_study, location_enabled,
    total_points, current_tier, created_at
  ) VALUES (
    NEW.user_id, NEW.username, NEW.display_name, NEW.profile_photo_url, NEW.bio, NEW.profile_visibility,
    NEW.city, NEW.hobbies, NEW.status, NEW.event_date, NEW.event_recurring, NEW.profession, NEW.field_of_study, NEW.location_enabled,
    NEW.total_points, NEW.current_tier, NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    profile_photo_url = EXCLUDED.profile_photo_url,
    bio = EXCLUDED.bio,
    profile_visibility = EXCLUDED.profile_visibility,
    city = EXCLUDED.city,
    hobbies = EXCLUDED.hobbies,
    status = EXCLUDED.status,
    event_date = EXCLUDED.event_date,
    event_recurring = EXCLUDED.event_recurring,
    profession = EXCLUDED.profession,
    field_of_study = EXCLUDED.field_of_study,
    location_enabled = EXCLUDED.location_enabled,
    total_points = EXCLUDED.total_points,
    current_tier = EXCLUDED.current_tier,
    created_at = EXCLUDED.created_at;

  RETURN NEW;
END;
$function$;

UPDATE public.public_profiles pp
SET total_points = p.total_points,
    current_tier = p.current_tier,
    created_at = p.created_at
FROM public.profiles p
WHERE p.user_id = pp.user_id;

CREATE OR REPLACE VIEW public.safe_public_profiles
WITH (security_invoker = true) AS
  SELECT user_id,
         username,
         display_name,
         profile_photo_url,
         bio,
         status,
         profile_visibility,
         hobbies,
         total_points,
         current_tier,
         created_at,
         city,
         event_date,
         event_recurring,
         profession,
         field_of_study,
         location_enabled
  FROM public.public_profiles;

GRANT SELECT ON public.safe_public_profiles TO authenticated;
GRANT SELECT ON public.safe_public_profiles TO anon;