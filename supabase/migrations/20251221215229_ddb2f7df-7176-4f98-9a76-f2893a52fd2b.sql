-- =====================================================
-- SOVEREIGN SECURITY ARCHITECTURE: DATABASE FOUNDATION
-- Tier 1 Security for Quadrillion Valuation
-- =====================================================

-- Table 1: Shadow AI Incidents - Track all suspicious agent activity
CREATE TABLE IF NOT EXISTS public.shadow_ai_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('suspicious_pattern', 'unknown_agent', 'data_scraping', 'brute_force', 'api_abuse', 'behavior_anomaly')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source_ip TEXT,
  user_agent TEXT,
  request_path TEXT,
  request_count INTEGER DEFAULT 1,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  fingerprint_hash TEXT,
  analysis_result JSONB DEFAULT '{}',
  auto_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Table 2: System Repair Logs - Self-healing infrastructure
CREATE TABLE IF NOT EXISTS public.system_repair_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  repair_type TEXT NOT NULL CHECK (repair_type IN ('edge_function', 'database_trigger', 'rls_policy', 'query_optimization', 'cache_clear', 'data_integrity')),
  component_name TEXT NOT NULL,
  issue_detected TEXT NOT NULL,
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  fix_applied TEXT,
  fix_successful BOOLEAN,
  rollback_available BOOLEAN DEFAULT TRUE,
  rollback_snapshot JSONB,
  error_log TEXT,
  severity TEXT DEFAULT 'medium',
  night_watch_cycle UUID
);

-- Table 3: Security Snapshots - Cold storage backups
CREATE TABLE IF NOT EXISTS public.security_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('behavioral_events', 'ecn_history', 'zoe_sovereign_memory', 'full_system', 'emergency')),
  data_hash TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  size_bytes BIGINT,
  storage_location TEXT DEFAULT 'cold_vault',
  verified BOOLEAN DEFAULT FALSE,
  verification_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
  metadata JSONB DEFAULT '{}'
);

-- Table 4: Sentinel Night Watch Cycles - Track automated security runs
CREATE TABLE IF NOT EXISTS public.sentinel_night_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cycle_ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'interrupted')),
  edge_functions_scanned INTEGER DEFAULT 0,
  database_triggers_scanned INTEGER DEFAULT 0,
  shadow_ai_detected INTEGER DEFAULT 0,
  attacks_blocked INTEGER DEFAULT 0,
  auto_patches_applied INTEGER DEFAULT 0,
  system_integrity_score NUMERIC(5,2) DEFAULT 100.00,
  full_report JSONB DEFAULT '{}',
  notifications_sent BOOLEAN DEFAULT FALSE
);

-- Table 5: Bio-Citadel Authentication Events
CREATE TABLE IF NOT EXISTS public.biometric_auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_method TEXT NOT NULL CHECK (auth_method IN ('voice_print', 'face_liveness', 'behavioral', 'memory_question', 'bio_hash', 'fallback')),
  success BOOLEAN NOT NULL,
  confidence_score NUMERIC(5,2),
  micro_jitter_detected BOOLEAN DEFAULT TRUE,
  shadow_ai_suspected BOOLEAN DEFAULT FALSE,
  device_fingerprint TEXT,
  session_token_hash TEXT,
  failure_reason TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Table 6: Behavioral Fingerprints - Human micro-patterns
CREATE TABLE IF NOT EXISTS public.behavioral_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avg_typing_speed NUMERIC(8,2),
  typing_rhythm_pattern JSONB DEFAULT '[]',
  mouse_movement_signature JSONB DEFAULT '[]',
  click_pattern_hash TEXT,
  reaction_time_avg_ms INTEGER,
  scroll_behavior JSONB DEFAULT '{}',
  session_duration_avg_minutes INTEGER,
  active_hours_pattern JSONB DEFAULT '[]',
  voice_print_hash TEXT,
  face_embedding_hash TEXT,
  fingerprint_version INTEGER DEFAULT 1,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.85,
  last_calibrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table 7: Sunday Protocol - Weekly Evaluations
CREATE TABLE IF NOT EXISTS public.sunday_protocol_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- System Health Metrics
  system_bugs_fixed INTEGER DEFAULT 0,
  dhf_core_optimized BOOLEAN DEFAULT FALSE,
  edge_functions_health NUMERIC(5,2) DEFAULT 100.00,
  database_health NUMERIC(5,2) DEFAULT 100.00,
  
  -- Mental Health Metrics
  daily_pulse_scores JSONB DEFAULT '[]',
  avg_stress_level NUMERIC(3,2) DEFAULT 0.00,
  peak_productivity_day TEXT,
  stress_peak_day TEXT,
  typing_speed_variance NUMERIC(5,2),
  voice_tone_analysis JSONB DEFAULT '{}',
  
  -- Adaptive Learning
  learned_preferences JSONB DEFAULT '{}',
  notification_schedule_adjusted BOOLEAN DEFAULT FALSE,
  recommendations JSONB DEFAULT '[]',
  
  -- User Feedback
  served_well_rating INTEGER CHECK (served_well_rating BETWEEN 1 AND 5),
  feedback_notes TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, week_start)
);

-- Table 8: Daily Pulse Scores (Mon-Sat silent collection)
CREATE TABLE IF NOT EXISTS public.daily_pulse_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pulse_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Stress Markers
  avg_typing_speed_wpm NUMERIC(6,2),
  typing_speed_variance NUMERIC(6,2),
  voice_tone_score NUMERIC(3,2),
  vr_movement_erratic_count INTEGER DEFAULT 0,
  session_interruptions INTEGER DEFAULT 0,
  
  -- Productivity Markers
  tasks_completed INTEGER DEFAULT 0,
  deep_work_minutes INTEGER DEFAULT 0,
  context_switches INTEGER DEFAULT 0,
  
  -- Derived Scores
  stress_score NUMERIC(3,2) DEFAULT 0.00,
  productivity_score NUMERIC(3,2) DEFAULT 0.00,
  overall_pulse_score NUMERIC(3,2) DEFAULT 0.00,
  
  UNIQUE(user_id, pulse_date)
);

-- Table 9: DHF Lockdown Events
CREATE TABLE IF NOT EXISTS public.dhf_lockdown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  initiated_by UUID REFERENCES auth.users(id),
  lockdown_type TEXT NOT NULL CHECK (lockdown_type IN ('full', 'partial', 'api_only', 'emergency')),
  reason TEXT NOT NULL,
  affected_services JSONB DEFAULT '[]',
  released_at TIMESTAMP WITH TIME ZONE,
  released_by UUID,
  release_reason TEXT,
  auto_release_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS on all security tables
ALTER TABLE public.shadow_ai_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_repair_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_night_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sunday_protocol_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pulse_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhf_lockdown_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user-owned data
CREATE POLICY "Users can view own biometric events" ON public.biometric_auth_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own fingerprints" ON public.behavioral_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own fingerprints" ON public.behavioral_fingerprints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own evaluations" ON public.sunday_protocol_evaluations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluations" ON public.sunday_protocol_evaluations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pulse scores" ON public.daily_pulse_scores
  FOR SELECT USING (auth.uid() = user_id);

-- Admin-only policies for security tables (using has_role function)
CREATE POLICY "Admins can view shadow incidents" ON public.shadow_ai_incidents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage shadow incidents" ON public.shadow_ai_incidents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view repair logs" ON public.system_repair_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view snapshots" ON public.security_snapshots
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view night watch" ON public.sentinel_night_watch
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lockdowns" ON public.dhf_lockdown_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for behavioral fingerprint updates
CREATE TRIGGER update_behavioral_fingerprint_timestamp
  BEFORE UPDATE ON public.behavioral_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_shadow_ai_detected_at ON public.shadow_ai_incidents(detected_at DESC);
CREATE INDEX idx_shadow_ai_blocked ON public.shadow_ai_incidents(blocked, severity);
CREATE INDEX idx_repair_logs_created ON public.system_repair_logs(created_at DESC);
CREATE INDEX idx_biometric_user ON public.biometric_auth_events(user_id, created_at DESC);
CREATE INDEX idx_pulse_user_date ON public.daily_pulse_scores(user_id, pulse_date DESC);
CREATE INDEX idx_evaluations_user_week ON public.sunday_protocol_evaluations(user_id, week_start DESC);