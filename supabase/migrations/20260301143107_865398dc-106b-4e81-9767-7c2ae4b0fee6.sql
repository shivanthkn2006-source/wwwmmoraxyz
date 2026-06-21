
-- ═══════════════════════════════════════════════════════════════
-- FIX: Change dangerous public-role permissive policies to service_role
-- These policies currently allow ANY unauthenticated user to write/manage data
-- ═══════════════════════════════════════════════════════════════

-- 1. brand_deals: ALL for public → service_role
DROP POLICY IF EXISTS "Service role can manage deals" ON public.brand_deals;
CREATE POLICY "Service role can manage deals"
ON public.brand_deals FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 2. dhf_stack_sessions: ALL for public → service_role
DROP POLICY IF EXISTS "service_manage_dhf_sessions" ON public.dhf_stack_sessions;
CREATE POLICY "Service role manage dhf_sessions"
ON public.dhf_stack_sessions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 3. face_login_attempts: INSERT for public → service_role
DROP POLICY IF EXISTS "Service role can insert face login attempts" ON public.face_login_attempts;
CREATE POLICY "Service role can insert face login attempts"
ON public.face_login_attempts FOR INSERT TO service_role
WITH CHECK (true);

-- 4. feature_flags: ALL for public → service_role
DROP POLICY IF EXISTS "Service role full access feature_flags" ON public.feature_flags;
CREATE POLICY "Service role full access feature_flags"
ON public.feature_flags FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 5. latency_benchmarks: INSERT for public → service_role
DROP POLICY IF EXISTS "service_insert_latency" ON public.latency_benchmarks;
CREATE POLICY "Service role insert latency"
ON public.latency_benchmarks FOR INSERT TO service_role
WITH CHECK (true);

-- 6. page_views: INSERT/UPDATE for public → service_role
DROP POLICY IF EXISTS "Service role can insert page views" ON public.page_views;
CREATE POLICY "Service role can insert page views"
ON public.page_views FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update page views" ON public.page_views;
CREATE POLICY "Service role can update page views"
ON public.page_views FOR UPDATE TO service_role
USING (true);

-- 7. platform_health_logs: INSERT for public → service_role (keep existing service_role one, drop public one)
DROP POLICY IF EXISTS "Service can insert platform health logs" ON public.platform_health_logs;

-- 8. security_audit_log: INSERT for public → service_role
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log FOR INSERT TO service_role
WITH CHECK (true);

-- 9. sft_deployment_queue: ALL for public → service_role
DROP POLICY IF EXISTS "service_manage_sft_queue" ON public.sft_deployment_queue;
CREATE POLICY "Service role manage sft_queue"
ON public.sft_deployment_queue FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 10. user_activity_log: INSERT for public → service_role
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.user_activity_log;
CREATE POLICY "Service role can insert activity logs"
ON public.user_activity_log FOR INSERT TO service_role
WITH CHECK (true);

-- 11. zoe_dream_foundry_logs: ALL for public → service_role
DROP POLICY IF EXISTS "Service role can manage foundry logs" ON public.zoe_dream_foundry_logs;
CREATE POLICY "Service role can manage foundry logs"
ON public.zoe_dream_foundry_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 12. zoe_evolution_log: INSERT for public → service_role
DROP POLICY IF EXISTS "service_insert_evolution" ON public.zoe_evolution_log;
CREATE POLICY "Service role insert evolution"
ON public.zoe_evolution_log FOR INSERT TO service_role
WITH CHECK (true);

-- 13. zoe_mail_notification_queue: INSERT for public → service_role
DROP POLICY IF EXISTS "System can insert notifications" ON public.zoe_mail_notification_queue;
CREATE POLICY "Service role can insert notifications"
ON public.zoe_mail_notification_queue FOR INSERT TO service_role
WITH CHECK (true);

-- 14. zoe_paused_threads: ALL for public → service_role
DROP POLICY IF EXISTS "service_manage_paused_threads" ON public.zoe_paused_threads;
CREATE POLICY "Service role manage paused_threads"
ON public.zoe_paused_threads FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 15. zoe_self_corrections: INSERT for public → service_role
DROP POLICY IF EXISTS "service_insert_self_corrections" ON public.zoe_self_corrections;
CREATE POLICY "Service role insert self_corrections"
ON public.zoe_self_corrections FOR INSERT TO service_role
WITH CHECK (true);

-- 16. shadow_ban_status: ALL for authenticated → restrict to admin only
DROP POLICY IF EXISTS "System can manage shadow bans" ON public.shadow_ban_status;
CREATE POLICY "Admins can manage shadow bans"
ON public.shadow_ban_status FOR ALL TO authenticated
USING (public.is_root_admin(auth.uid()))
WITH CHECK (public.is_root_admin(auth.uid()));

-- 17. zoe_adapter_registry: ALL for authenticated → restrict to admin only
DROP POLICY IF EXISTS "System can manage adapters" ON public.zoe_adapter_registry;
CREATE POLICY "Admins can manage adapters"
ON public.zoe_adapter_registry FOR ALL TO authenticated
USING (public.is_root_admin(auth.uid()))
WITH CHECK (public.is_root_admin(auth.uid()));

-- 18. security_logs: INSERT for authenticated with true → restrict to own user
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;
CREATE POLICY "Users can insert own security logs"
ON public.security_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also add service_role insert for edge functions
CREATE POLICY "Service role can insert security logs"
ON public.security_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 19. Add authenticated SELECT for feature_flags (read-only for users)
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);
