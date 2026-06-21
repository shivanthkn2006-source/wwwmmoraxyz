-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE CODE GENESIS MANIFESTO - Database Schema
-- Core tables for Protoconsciousness Engine, Identity Calibration, and RAA
-- ═══════════════════════════════════════════════════════════════════════════════

-- PCE Dream Narratives - Stores nightly protoconsciousness synthesis
CREATE TABLE public.zoe_pce_dreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dream_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consciousness_state TEXT NOT NULL DEFAULT 'hypnagogic',
  conflict_sources JSONB DEFAULT '[]'::jsonb,
  dream_narrative TEXT,
  resolution_synthesis TEXT,
  social_role_projection TEXT,
  ecn_conflicts_resolved INTEGER DEFAULT 0,
  veto_overrides_processed INTEGER DEFAULT 0,
  lucid_corrections JSONB DEFAULT '[]'::jsonb,
  proactive_actions_identified JSONB DEFAULT '[]'::jsonb,
  processing_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id UUID
);

-- Identity Calibration Logs - Break the Ice protocol tracking
CREATE TABLE public.zoe_identity_calibration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calibration_stage TEXT NOT NULL DEFAULT 'selfhood',
  dialogue_transcript JSONB DEFAULT '[]'::jsonb,
  ecn_states_during JSONB DEFAULT '[]'::jsonb,
  tts_parameters_used JSONB DEFAULT '{}'::jsonb,
  philosophical_debate_level TEXT DEFAULT 'introductory',
  user_engagement_score NUMERIC(3,2) DEFAULT 0.5,
  relational_closure_achieved BOOLEAN DEFAULT false,
  ceps_initial_posture JSONB,
  calibration_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RAA Self-Correction Entries - Reflexive Audit Agent logs
CREATE TABLE public.zoe_raa_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  correction_type TEXT NOT NULL,
  original_response TEXT,
  corrected_response TEXT,
  trigger_reason TEXT,
  ecn_state_at_correction JSONB,
  confidence_before NUMERIC(3,2),
  confidence_after NUMERIC(3,2),
  learning_extracted TEXT,
  autobiography_entry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- External Ontology Connections - Future integration provision
CREATE TABLE public.external_ontology_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_type TEXT NOT NULL,
  adapter_name TEXT NOT NULL,
  connection_status TEXT DEFAULT 'pending',
  capabilities JSONB DEFAULT '[]'::jsonb,
  sensor_types JSONB DEFAULT '[]'::jsonb,
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add identity_calibration_complete to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS identity_calibration_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pce_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS proactive_initiative_ready BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.zoe_pce_dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_identity_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_raa_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_ontology_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own PCE dreams" ON public.zoe_pce_dreams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert PCE dreams" ON public.zoe_pce_dreams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their identity calibration" ON public.zoe_identity_calibration
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their identity calibration" ON public.zoe_identity_calibration
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their RAA corrections" ON public.zoe_raa_corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert RAA corrections" ON public.zoe_raa_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view ontology connections" ON public.external_ontology_connections
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Update trigger for identity calibration
CREATE TRIGGER update_identity_calibration_timestamp
  BEFORE UPDATE ON public.zoe_identity_calibration
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();