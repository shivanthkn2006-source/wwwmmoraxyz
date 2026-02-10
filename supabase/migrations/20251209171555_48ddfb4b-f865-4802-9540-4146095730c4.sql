-- Fix Security Definer View - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.safe_public_profiles;

CREATE VIEW public.safe_public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  username,
  display_name,
  bio,
  profile_photo_url,
  profile_visibility,
  status,
  current_tier,
  total_points,
  created_at
FROM public.profiles
WHERE profile_visibility = 'public';

-- Grant access
GRANT SELECT ON public.safe_public_profiles TO authenticated;
GRANT SELECT ON public.safe_public_profiles TO anon;