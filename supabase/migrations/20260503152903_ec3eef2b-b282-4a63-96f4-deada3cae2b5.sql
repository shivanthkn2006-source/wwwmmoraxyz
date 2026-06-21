-- Fix infinite recursion on private_timeline_members SELECT policy
DROP POLICY IF EXISTS "Members see own timeline memberships" ON public.private_timeline_members;

CREATE POLICY "Members see own timeline memberships"
ON public.private_timeline_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_timeline_member(timeline_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.private_timelines pt
    WHERE pt.id = private_timeline_members.timeline_id
      AND pt.user_id = auth.uid()
  )
);