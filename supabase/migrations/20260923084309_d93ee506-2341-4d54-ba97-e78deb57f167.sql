DROP VIEW IF EXISTS public.safe_public_profiles;

CREATE VIEW public.safe_public_profiles
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