-- brand_deals
DROP POLICY IF EXISTS "Anyone can view brand deals" ON public.brand_deals;
DROP POLICY IF EXISTS "Service role can manage deals" ON public.brand_deals;
CREATE POLICY "Signed-in users can view brand deals" ON public.brand_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages brand deals" ON public.brand_deals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- dhf_stack_sessions
DROP POLICY IF EXISTS "service_manage_dhf_sessions" ON public.dhf_stack_sessions;
CREATE POLICY "Service role manages dhf sessions" ON public.dhf_stack_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_insert_dhf_sessions" ON public.dhf_stack_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- sft_deployment_queue
DROP POLICY IF EXISTS "service_manage_sft_queue" ON public.sft_deployment_queue;
CREATE POLICY "Service role manages sft queue" ON public.sft_deployment_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_insert_sft_queue" ON public.sft_deployment_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_sft_queue" ON public.sft_deployment_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- zoe_paused_threads
DROP POLICY IF EXISTS "service_manage_paused_threads" ON public.zoe_paused_threads;
CREATE POLICY "Service role manages paused threads" ON public.zoe_paused_threads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_insert_paused_threads" ON public.zoe_paused_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- zoe_synthetic_scenarios
DROP POLICY IF EXISTS "Service role can manage all scenarios" ON public.zoe_synthetic_scenarios;
DROP POLICY IF EXISTS "Anyone can read validated scenarios" ON public.zoe_synthetic_scenarios;
CREATE POLICY "Service role manages scenarios" ON public.zoe_synthetic_scenarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Signed-in users can read scenarios" ON public.zoe_synthetic_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can add scenarios" ON public.zoe_synthetic_scenarios FOR INSERT TO authenticated WITH CHECK (true);

-- face_login_attempts
DROP POLICY IF EXISTS "Service role can insert face login attempts" ON public.face_login_attempts;
DROP POLICY IF EXISTS "Service role can read face login attempts" ON public.face_login_attempts;
CREATE POLICY "Service role manages face login attempts" ON public.face_login_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- notifications: block sender impersonation
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (from_user_id IS NULL OR from_user_id = auth.uid() OR user_id = auth.uid());

-- platform_health_logs: remove blanket insert
DROP POLICY IF EXISTS "Service can insert platform health logs" ON public.platform_health_logs;

-- security_audit_log
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Users insert their own audit logs" ON public.security_audit_log FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Service role manages audit logs" ON public.security_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- security_logs
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;
CREATE POLICY "Users insert their own security logs" ON public.security_logs FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Service role manages security logs" ON public.security_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- zoe_black_box_ledger: remove blanket insert (scoped policies remain)
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.zoe_black_box_ledger;