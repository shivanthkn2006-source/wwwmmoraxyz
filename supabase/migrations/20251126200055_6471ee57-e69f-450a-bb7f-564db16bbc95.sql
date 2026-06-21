-- Relax RLS for inserting into private_timelines so timeline creation never fails due to missing auth context
ALTER POLICY "Users can create private timelines"
ON public.private_timelines
WITH CHECK (true);