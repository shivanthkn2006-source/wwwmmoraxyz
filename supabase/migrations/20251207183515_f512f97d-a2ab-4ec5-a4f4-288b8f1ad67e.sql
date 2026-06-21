-- Complete DHF Autonomy & Immersive Persona System Tables

-- 1. Self-Correction Entries
CREATE TABLE IF NOT EXISTS zoe_self_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_response_id TEXT,
  original_response TEXT NOT NULL,
  corrected_response TEXT NOT NULL,
  correction_reason TEXT NOT NULL,
  user_feedback_type TEXT NOT NULL,
  learning_applied BOOLEAN DEFAULT TRUE,
  ecn_state_at_correction JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Evolution Log
CREATE TABLE IF NOT EXISTS zoe_evolution_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  evolution_type TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_source TEXT,
  announced_to_user BOOLEAN DEFAULT FALSE,
  announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. DHF Stack Sessions
CREATE TABLE IF NOT EXISTS dhf_stack_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  paused_at TIMESTAMP WITH TIME ZONE,
  pause_reason TEXT,
  last_checkin_at TIMESTAMP WITH TIME ZONE,
  autonomy_actions_count INTEGER DEFAULT 0,
  user_confirmed_continue BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Paused Threads
CREATE TABLE IF NOT EXISTS zoe_paused_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_task TEXT NOT NULL,
  original_context JSONB NOT NULL,
  interruption_query TEXT,
  interrupted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resumed_at TIMESTAMP WITH TIME ZONE,
  resume_bridge_text TEXT,
  status TEXT DEFAULT 'paused',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. SFT Deployment Queue
CREATE TABLE IF NOT EXISTS sft_deployment_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  event_count BIGINT NOT NULL,
  data_quality_score NUMERIC DEFAULT 0.85,
  model_type TEXT DEFAULT 'gemini-2.5-flash',
  status TEXT DEFAULT 'queued',
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  deployed_at TIMESTAMP WITH TIME ZONE,
  deployment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Latency Benchmarks
CREATE TABLE IF NOT EXISTS latency_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  thinking_level TEXT NOT NULL,
  measured_latency_ms INTEGER NOT NULL,
  target_latency_ms INTEGER NOT NULL,
  sla_met BOOLEAN NOT NULL,
  optimization_applied TEXT[],
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE zoe_self_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoe_evolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhf_stack_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoe_paused_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sft_deployment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE latency_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_view_self_corrections" ON zoe_self_corrections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_insert_self_corrections" ON zoe_self_corrections FOR INSERT WITH CHECK (true);

CREATE POLICY "user_view_evolution" ON zoe_evolution_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_update_evolution" ON zoe_evolution_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "service_insert_evolution" ON zoe_evolution_log FOR INSERT WITH CHECK (true);

CREATE POLICY "user_view_dhf_sessions" ON dhf_stack_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_update_dhf_sessions" ON dhf_stack_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "service_manage_dhf_sessions" ON dhf_stack_sessions FOR ALL USING (true);

CREATE POLICY "user_view_paused_threads" ON zoe_paused_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_update_paused_threads" ON zoe_paused_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "service_manage_paused_threads" ON zoe_paused_threads FOR ALL USING (true);

CREATE POLICY "user_view_sft_queue" ON sft_deployment_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_manage_sft_queue" ON sft_deployment_queue FOR ALL USING (true);

CREATE POLICY "user_view_latency" ON latency_benchmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_insert_latency" ON latency_benchmarks FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_self_corrections_user ON zoe_self_corrections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_unannounced ON zoe_evolution_log(user_id) WHERE announced_to_user = FALSE;
CREATE INDEX IF NOT EXISTS idx_paused_active ON zoe_paused_threads(user_id) WHERE status = 'paused';
CREATE INDEX IF NOT EXISTS idx_latency_user ON latency_benchmarks(user_id, operation_type);