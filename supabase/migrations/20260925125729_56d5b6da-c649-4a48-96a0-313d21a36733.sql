
-- Owner-scoped replacements for open write rules
DROP POLICY IF EXISTS "Service role can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Service role can update page views" ON public.page_views;
CREATE POLICY "Members insert own page views" ON public.page_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own page views" ON public.page_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.user_activity_log;
CREATE POLICY "Members insert own activity logs" ON public.user_activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_insert_latency" ON public.latency_benchmarks;
CREATE POLICY "Members insert own latency" ON public.latency_benchmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_insert_evolution" ON public.zoe_evolution_log;
CREATE POLICY "Members insert own evolution" ON public.zoe_evolution_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_insert_self_corrections" ON public.zoe_self_corrections;
CREATE POLICY "Members insert own self corrections" ON public.zoe_self_corrections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access" ON public.zoe_sovereign_memory;
CREATE POLICY "Members manage own sovereign memory" ON public.zoe_sovereign_memory FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage shadow bans" ON public.shadow_ban_status;
CREATE POLICY "Admins manage shadow bans" ON public.shadow_ban_status FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Tables without owners: server-only writes
DROP POLICY IF EXISTS "Service role full access feature_flags" ON public.feature_flags;
CREATE POLICY "Service role full access feature_flags" ON public.feature_flags FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage adapters" ON public.zoe_adapter_registry;
CREATE POLICY "Admins manage adapters" ON public.zoe_adapter_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Service role can manage foundry logs" ON public.zoe_dream_foundry_logs;
CREATE POLICY "Service role can manage foundry logs" ON public.zoe_dream_foundry_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert notifications" ON public.zoe_mail_notification_queue;
CREATE POLICY "System can insert notifications" ON public.zoe_mail_notification_queue FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Signed-in users can add scenarios" ON public.zoe_synthetic_scenarios;
CREATE POLICY "Admins add scenarios" ON public.zoe_synthetic_scenarios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
