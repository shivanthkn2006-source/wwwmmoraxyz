-- Fix RLS policies for private_timeline_members to allow adding other users to timelines

-- Drop the restrictive ALL policy
DROP POLICY IF EXISTS "Users can manage their own private timeline memberships" ON public.private_timeline_members;

-- Keep the read policy
-- Policy "Users can read their own private timeline memberships" already exists

-- Allow users to add themselves to timelines
CREATE POLICY "Users can add themselves to timelines"
ON public.private_timeline_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to add others to timelines they're members of
CREATE POLICY "Timeline members can add others"
ON public.private_timeline_members
FOR INSERT
WITH CHECK (
  auth.uid() = added_by_user_id 
  AND (
    -- User is creating a new timeline (no existing members yet)
    NOT EXISTS (
      SELECT 1 FROM public.private_timeline_members ptm
      WHERE ptm.timeline_id = private_timeline_members.timeline_id
    )
    OR
    -- User is already a member of this timeline
    EXISTS (
      SELECT 1 FROM public.private_timeline_members ptm
      WHERE ptm.timeline_id = private_timeline_members.timeline_id
        AND ptm.user_id = auth.uid()
    )
  )
);

-- Allow users to remove themselves or others they added
CREATE POLICY "Users can remove timeline members"
ON public.private_timeline_members
FOR DELETE
USING (
  auth.uid() = user_id 
  OR auth.uid() = added_by_user_id
);

-- Allow users to update their own memberships
CREATE POLICY "Users can update their own memberships"
ON public.private_timeline_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);