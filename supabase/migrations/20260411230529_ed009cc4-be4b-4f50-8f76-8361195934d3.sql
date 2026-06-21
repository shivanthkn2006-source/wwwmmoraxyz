-- Drop the restrictive select policy
DROP POLICY IF EXISTS "Users see own full profile" ON public.profiles;

-- Create a new policy that allows all authenticated users to see profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);