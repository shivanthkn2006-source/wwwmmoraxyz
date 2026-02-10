-- Fix the public_profiles view to be security invoker (not definer)
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  username,
  display_name,
  profile_photo_url,
  bio
FROM profiles;