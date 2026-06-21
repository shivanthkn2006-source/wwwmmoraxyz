-- Fix RLS policies for comments and timeline members

-- First, let's ensure post_comments allows any authenticated user to comment
-- The existing policy checks user_id = auth.uid() which is correct, but let's make sure it's not too restrictive

-- For private_timeline_members, the issue is the recursive RLS with is_timeline_member function
-- Let's create a simpler approach: allow members to add others by checking membership directly in policy

-- Drop and recreate the private_timeline_members INSERT policy without the recursive function call
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON private_timeline_members;

-- New policy: Allow adding members if the adder is already a member (checked via direct subquery)
CREATE POLICY "Users can add members to timelines they belong to" 
ON private_timeline_members
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow adding yourself
  auth.uid() = user_id 
  OR 
  -- Allow adding others if you're a member of that timeline
  (
    auth.uid() = added_by_user_id 
    AND EXISTS (
      SELECT 1 FROM private_timeline_members pm
      WHERE pm.timeline_id = private_timeline_members.timeline_id
      AND pm.user_id = auth.uid()
    )
  )
);

-- For post_comments, let's verify the policy is correct
-- Drop and recreate to ensure it's working
DROP POLICY IF EXISTS "Users can create comments" ON post_comments;

CREATE POLICY "Users can create comments"
ON post_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure SELECT policy on private_timeline_members doesn't create issues
DROP POLICY IF EXISTS "Users can view timeline members" ON private_timeline_members;

CREATE POLICY "Users can view timeline members"
ON private_timeline_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM private_timeline_members pm
    WHERE pm.timeline_id = private_timeline_members.timeline_id
    AND pm.user_id = auth.uid()
  )
);