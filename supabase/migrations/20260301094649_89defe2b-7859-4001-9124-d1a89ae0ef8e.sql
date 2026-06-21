
-- Re-enable RLS on private_timelines
ALTER TABLE public.private_timelines ENABLE ROW LEVEL SECURITY;

-- Allow members to view timelines they belong to (uses existing SECURITY DEFINER function)
CREATE POLICY "Members can view their timelines"
  ON public.private_timelines FOR SELECT
  USING (public.is_timeline_member(id, auth.uid()));

-- Allow authenticated users to create timelines
CREATE POLICY "Authenticated users can create timelines"
  ON public.private_timelines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow timeline creator to update
CREATE POLICY "Creator can update timeline"
  ON public.private_timelines FOR UPDATE
  USING (user_id = auth.uid());

-- Allow timeline creator to delete
CREATE POLICY "Creator can delete timeline"
  ON public.private_timelines FOR DELETE
  USING (user_id = auth.uid());
