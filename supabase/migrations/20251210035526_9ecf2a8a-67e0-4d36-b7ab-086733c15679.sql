-- Drop existing view and recreate with only safe fields
DROP VIEW IF EXISTS public.safe_public_profiles;

CREATE VIEW public.safe_public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  bio,
  profile_photo_url,
  profile_visibility,
  status,
  created_at
FROM public.profiles
WHERE profile_visibility = 'public';

COMMENT ON VIEW public.safe_public_profiles IS 'Safe public view exposing only non-sensitive profile fields for public queries.';

GRANT SELECT ON public.safe_public_profiles TO authenticated;
GRANT SELECT ON public.safe_public_profiles TO anon;