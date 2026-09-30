DROP POLICY IF EXISTS "members read comments" ON public.humor_comments;
CREATE POLICY "members read comments on visible jokes" ON public.humor_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.humor_drops d WHERE d.id = humor_comments.drop_id AND (d.is_published = true OR d.author_id = auth.uid())));

DROP POLICY IF EXISTS "members read reactions" ON public.humor_reactions;
CREATE POLICY "members read reactions on visible jokes" ON public.humor_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.humor_drops d WHERE d.id = humor_reactions.drop_id AND (d.is_published = true OR d.author_id = auth.uid())));

DROP POLICY IF EXISTS "Members read view counts" ON public.humor_views;
CREATE POLICY "members read views on visible jokes" ON public.humor_views FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.humor_drops d WHERE d.id = humor_views.drop_id AND (d.is_published = true OR d.author_id = auth.uid())));

DROP POLICY IF EXISTS "Members see world settings" ON public.vr_world_settings;
CREATE POLICY "Only admin reads world settings" ON public.vr_world_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Members see world events" ON public.vr_world_events;
CREATE POLICY "Members see recent world events" ON public.vr_world_events FOR SELECT TO authenticated
USING (created_at > now() - interval '1 day' OR public.has_role(auth.uid(), 'admin'::app_role));