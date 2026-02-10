-- Fix RLS policies for tables with 401 errors

-- 1. zoe_settings - Add INSERT policy for authenticated users
DROP POLICY IF EXISTS "Users can insert their own settings" ON zoe_settings;
CREATE POLICY "Users can insert their own settings"
ON zoe_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON zoe_settings;
CREATE POLICY "Users can update their own settings"
ON zoe_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own settings" ON zoe_settings;
CREATE POLICY "Users can view their own settings"
ON zoe_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. behavioral_events - Add INSERT policy
DROP POLICY IF EXISTS "Users can insert their own events" ON behavioral_events;
CREATE POLICY "Users can insert their own events"
ON behavioral_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own events" ON behavioral_events;
CREATE POLICY "Users can view their own events"
ON behavioral_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. platform_health_logs - Add INSERT policy
DROP POLICY IF EXISTS "Users can insert their own health logs" ON platform_health_logs;
CREATE POLICY "Users can insert their own health logs"
ON platform_health_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own health logs" ON platform_health_logs;
CREATE POLICY "Users can view their own health logs"
ON platform_health_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. zoe_cdsp_analysis - Add INSERT policy
DROP POLICY IF EXISTS "Users can insert their own analysis" ON zoe_cdsp_analysis;
CREATE POLICY "Users can insert their own analysis"
ON zoe_cdsp_analysis
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own analysis" ON zoe_cdsp_analysis;
CREATE POLICY "Users can view their own analysis"
ON zoe_cdsp_analysis
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix ecn_history stress_level type (integer vs float mismatch)
-- Change stress_level from integer to numeric to accept decimals
ALTER TABLE ecn_history ALTER COLUMN stress_level TYPE numeric USING stress_level::numeric;