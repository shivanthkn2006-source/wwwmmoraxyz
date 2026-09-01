DROP POLICY IF EXISTS "Anyone can view verified brands" ON public.brand_accounts;
CREATE POLICY "Signed-in users can view verified brands"
  ON public.brand_accounts FOR SELECT TO authenticated
  USING (is_verified = true OR merchant_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users can view selfie pins" ON public.selfie_city_pins;
CREATE POLICY "Owners and admins view selfie pins"
  ON public.selfie_city_pins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users can view players" ON public.exodus_players;
CREATE POLICY "Owners and admins view players"
  ON public.exodus_players FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Members create attributed notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());