-- Fix infinite recursion in private_timeline_members policies by using helper function

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Users can view timeline members" ON public.private_timeline_members;

-- Recreate SELECT policy using security definer function to avoid recursion
CREATE POLICY "Users can view timeline members"
ON public.private_timeline_members
FOR SELECT
TO authenticated
USING (
  public.is_timeline_member(timeline_id, auth.uid())
);

-- Drop existing INSERT policy that self-references the table
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON public.private_timeline_members;

-- Recreate INSERT policy using helper function instead of direct self-reference
CREATE POLICY "Users can add members to timelines they belong to"
ON public.private_timeline_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow a user to add themselves when creating/joining a timeline
  auth.uid() = user_id
  OR
  -- Allow existing members to add others to the same timeline
  (auth.uid() = added_by_user_id AND public.is_timeline_member(timeline_id, auth.uid()))
);
