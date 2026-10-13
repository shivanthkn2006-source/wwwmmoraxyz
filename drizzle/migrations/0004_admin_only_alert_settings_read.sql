DROP POLICY IF EXISTS "Members can read alert kinds" ON public.notification_kinds;
DROP POLICY IF EXISTS "Members read channel switches" ON public.notification_channel_settings;
CREATE POLICY "Admins read alert kinds" ON public.notification_kinds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read channel switches" ON public.notification_channel_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));