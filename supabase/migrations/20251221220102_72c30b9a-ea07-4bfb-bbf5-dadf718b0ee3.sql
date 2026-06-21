-- Fix 1: Add missing event_types to zoe_sovereign_memory constraint
ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;

ALTER TABLE public.zoe_sovereign_memory ADD CONSTRAINT zoe_sovereign_memory_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'chat_message'::text, 
  'voice_command'::text, 
  'omega_entry'::text, 
  'omega_exit'::text, 
  'omega_world_entry'::text, 
  'biological_decay'::text, 
  'raa_audit'::text, 
  'mind_merge'::text, 
  'mind_merge_failed'::text, 
  'relationship_migration'::text, 
  'veto_override'::text, 
  'error_masked_voice'::text, 
  'dhf_action'::text, 
  'ecn_state'::text, 
  'skill_upload'::text, 
  'external_sync'::text, 
  'dhf_external_sync'::text, 
  'proactive_suggestion'::text, 
  'session_summary'::text, 
  'integrity_decay'::text, 
  'vr_interaction'::text, 
  'bi_cameral_conflict'::text, 
  'bio_sync_restore'::text,
  'god_mode_scan'::text,
  'sentinel_night_watch'::text,
  'security_lockdown'::text,
  'biometric_auth'::text,
  'shadow_ai_detected'::text,
  'system_repair'::text,
  'sunday_protocol'::text
]));

-- Fix 2: Add missing unique constraint for daily_pulse_scores upsert
ALTER TABLE public.daily_pulse_scores DROP CONSTRAINT IF EXISTS daily_pulse_scores_user_date_unique;
ALTER TABLE public.daily_pulse_scores ADD CONSTRAINT daily_pulse_scores_user_date_unique UNIQUE (user_id, pulse_date);

-- Fix 3: Add missing unique constraint for sunday_protocol_evaluations upsert
ALTER TABLE public.sunday_protocol_evaluations DROP CONSTRAINT IF EXISTS sunday_protocol_user_week_unique;
ALTER TABLE public.sunday_protocol_evaluations ADD CONSTRAINT sunday_protocol_user_week_unique UNIQUE (user_id, week_start);

-- Fix 4: Create missing columns for sunday_protocol_evaluations
ALTER TABLE public.sunday_protocol_evaluations 
ADD COLUMN IF NOT EXISTS feedback_notes TEXT;

-- Fix 5: Service role policies (drop first then create)
DROP POLICY IF EXISTS "Service role can insert behavioral_events" ON public.behavioral_events;
CREATE POLICY "Service role can insert behavioral_events"
ON public.behavioral_events
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert zoe_settings" ON public.zoe_settings;
CREATE POLICY "Service role can insert zoe_settings"
ON public.zoe_settings
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert zoe_cdsp_analysis" ON public.zoe_cdsp_analysis;
CREATE POLICY "Service role can insert zoe_cdsp_analysis"
ON public.zoe_cdsp_analysis
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert platform_health_logs" ON public.platform_health_logs;
CREATE POLICY "Service role can insert platform_health_logs"
ON public.platform_health_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix 6: Add snapshot_date column for security_snapshots
ALTER TABLE public.security_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;

-- Fix 7: Create indexes for faster security queries
CREATE INDEX IF NOT EXISTS idx_shadow_ai_incidents_detected_at ON public.shadow_ai_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_night_watch_started_at ON public.sentinel_night_watch(cycle_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_auth_events_user_id ON public.biometric_auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_pulse_scores_user_date ON public.daily_pulse_scores(user_id, pulse_date DESC);

-- Fix 8: Enable RLS bypass for service role on security tables
ALTER TABLE public.shadow_ai_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_repair_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_night_watch FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_snapshots FORCE ROW LEVEL SECURITY;

-- Add service role bypass policies
DROP POLICY IF EXISTS "Service role full access shadow_ai_incidents" ON public.shadow_ai_incidents;
CREATE POLICY "Service role full access shadow_ai_incidents"
ON public.shadow_ai_incidents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access system_repair_logs" ON public.system_repair_logs;
CREATE POLICY "Service role full access system_repair_logs"
ON public.system_repair_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access sentinel_night_watch" ON public.sentinel_night_watch;
CREATE POLICY "Service role full access sentinel_night_watch"
ON public.sentinel_night_watch
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access security_snapshots" ON public.security_snapshots;
CREATE POLICY "Service role full access security_snapshots"
ON public.security_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);