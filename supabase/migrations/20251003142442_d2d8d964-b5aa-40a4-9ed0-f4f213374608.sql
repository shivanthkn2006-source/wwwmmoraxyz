-- Create a public-safe view of profiles with only non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  profile_photo_url,
  bio
FROM profiles;

-- Allow anyone to view the public profiles view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Restrict full profiles table to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);