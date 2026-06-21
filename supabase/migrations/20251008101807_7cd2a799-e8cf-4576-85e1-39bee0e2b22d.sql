-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Create restrictive policies for profile viewing
-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view profiles of their friends
CREATE POLICY "Users can view friends' profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (user1_id = auth.uid() AND user2_id = profiles.user_id) OR
      (user2_id = auth.uid() AND user1_id = profiles.user_id)
    )
  )
);