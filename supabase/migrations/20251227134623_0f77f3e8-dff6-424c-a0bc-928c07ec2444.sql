-- Fix RLS policies for behavioral_events
DROP POLICY IF EXISTS "Users can insert own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can insert own behavioral events" 
ON public.behavioral_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can view own behavioral events" 
ON public.behavioral_events FOR SELECT 
USING (auth.uid() = user_id);

-- Fix RLS policies for zoe_settings
DROP POLICY IF EXISTS "Users can insert own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can insert own zoe settings" 
ON public.zoe_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can view own zoe settings" 
ON public.zoe_settings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can update own zoe settings" 
ON public.zoe_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix RLS policies for platform_health_logs
DROP POLICY IF EXISTS "Users can insert own health logs" ON public.platform_health_logs;
CREATE POLICY "Users can insert own health logs" 
ON public.platform_health_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own health logs" ON public.platform_health_logs;
CREATE POLICY "Users can view own health logs" 
ON public.platform_health_logs FOR SELECT 
USING (auth.uid() = user_id);