-- SECURITY FIX: Restrict sensitive data access to owners only

-- 1. Drop and recreate dhf_learning_history policies (restrict to owner only)
DROP POLICY IF EXISTS "Users can view their own DHF learning history" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Users can insert their own DHF learning" ON public.dhf_learning_history;
DROP POLICY IF EXISTS "Users can update their own DHF learning" ON public.dhf_learning_history;

CREATE POLICY "Owner only - view DHF learning" ON public.dhf_learning_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner only - insert DHF learning" ON public.dhf_learning_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner only - update DHF learning" ON public.dhf_learning_history
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Drop and recreate zoe_sovereign_memory policies (restrict to owner only)
DROP POLICY IF EXISTS "Users can view their own sovereign memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can insert their own sovereign memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can update their own sovereign memory" ON public.zoe_sovereign_memory;
DROP POLICY IF EXISTS "Users can delete their own sovereign memory" ON public.zoe_sovereign_memory;

CREATE POLICY "Owner only - view sovereign memory" ON public.zoe_sovereign_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner only - insert sovereign memory" ON public.zoe_sovereign_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner only - update sovereign memory" ON public.zoe_sovereign_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owner only - delete sovereign memory" ON public.zoe_sovereign_memory
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Restrict feature_analytics to owner only
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.feature_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.feature_analytics;

CREATE POLICY "Owner only - view feature analytics" ON public.feature_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner only - insert feature analytics" ON public.feature_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Restrict feature_flags to service role only (not public)
DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;

-- Only allow service role to manage feature flags (no public access)
CREATE POLICY "Service role manages feature flags" ON public.feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Restrict behavioral_events to owner only
DROP POLICY IF EXISTS "Users can view own events" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.behavioral_events;

CREATE POLICY "Owner only - view behavioral events" ON public.behavioral_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner only - insert behavioral events" ON public.behavioral_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Restrict ecn_history to owner only
DROP POLICY IF EXISTS "Users can view their own ECN history" ON public.ecn_history;
DROP POLICY IF EXISTS "Users can insert their own ECN history" ON public.ecn_history;

CREATE POLICY "Owner only - view ECN history" ON public.ecn_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner only - insert ECN history" ON public.ecn_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);