CREATE POLICY "Root admin can view all user sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can view all online sessions"
ON public.online_sessions FOR SELECT TO authenticated
USING (private.is_root_admin(auth.uid()));

CREATE POLICY "Root admin can view all activity events"
ON public.user_activity_log FOR SELECT TO authenticated
USING (private.is_root_admin(auth.uid()));