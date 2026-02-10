-- Drop the overly permissive policy on public_profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public_profiles;

-- Create a more secure policy that requires authentication
CREATE POLICY "Authenticated users can view public profiles"
ON public_profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);