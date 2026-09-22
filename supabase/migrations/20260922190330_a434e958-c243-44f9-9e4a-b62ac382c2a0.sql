CREATE POLICY "Root admin can count all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can view all planner events"
ON public.important_dates
FOR SELECT
TO authenticated
USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can view all reminders"
ON public.reminders
FOR SELECT
TO authenticated
USING (private.is_root_admin(auth.uid()));