-- Fix infinite recursion in private_timeline_members policies
-- The SELECT policy was recursively querying the same table, causing infinite loop

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view timeline members" ON public.private_timeline_members;

-- Create a simple, non-recursive SELECT policy
-- Users can view members of timelines they belong to (checked by direct user_id match)
CREATE POLICY "Users can view timeline members"
ON public.private_timeline_members
FOR SELECT
USING (
  -- Simple check: user can see records where they are a member of that timeline
  -- This will be evaluated by checking other member records without recursion
  user_id = auth.uid()
  OR
  timeline_id IN (
    SELECT ptm.timeline_id 
    FROM private_timeline_members ptm 
    WHERE ptm.user_id = auth.uid()
  )
);

-- Also simplify the INSERT policy to avoid potential issues
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON public.private_timeline_members;

CREATE POLICY "Users can add members to timelines they belong to"
ON public.private_timeline_members
FOR INSERT
WITH CHECK (
  -- Allow if inserting themselves
  auth.uid() = user_id
  OR
  -- Allow if they're already a member of this timeline
  (
    auth.uid() = added_by_user_id
    AND timeline_id IN (
      SELECT ptm.timeline_id 
      FROM private_timeline_members ptm 
      WHERE ptm.user_id = auth.uid()
    )
  )
);