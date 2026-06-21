-- Fix RLS policies that broke feed and private timeline creation

-- Revert post_comments INSERT policy to simpler version
DROP POLICY IF EXISTS "Users can create comments" ON post_comments;

CREATE POLICY "Users can create comments"
ON post_comments
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Fix private_timeline_members INSERT policy to allow initial member addition
-- The issue was the policy checked for existing membership before allowing first member
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON private_timeline_members;

CREATE POLICY "Users can add members to timelines they belong to"
ON private_timeline_members
FOR INSERT
TO public
WITH CHECK (
  -- Allow if adding yourself (for initial timeline creation)
  auth.uid() = user_id
  OR
  -- Allow if you're adding someone else AND you're already a member
  (
    auth.uid() = added_by_user_id
    AND EXISTS (
      SELECT 1 
      FROM private_timeline_members existing
      WHERE existing.timeline_id = private_timeline_members.timeline_id
        AND existing.user_id = auth.uid()
    )
  )
);

-- Revert private_timeline_members SELECT policy to simpler version
DROP POLICY IF EXISTS "Users can view timeline members" ON private_timeline_members;

CREATE POLICY "Users can view timeline members"
ON private_timeline_members
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM private_timeline_members existing
    WHERE existing.timeline_id = private_timeline_members.timeline_id
      AND existing.user_id = auth.uid()
  )
);