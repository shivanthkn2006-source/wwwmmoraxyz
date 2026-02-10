-- ATLAS Sync Verification Authorization Table
-- Stores text-based authorizations for DHF autonomy data points
CREATE TABLE public.atlas_sync_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID,
  data_point_key TEXT NOT NULL,
  data_point_value JSONB NOT NULL,
  authorization_keyword TEXT NOT NULL,
  authorization_statement TEXT NOT NULL,
  sync_percentage INTEGER NOT NULL CHECK (sync_percentage >= 20 AND sync_percentage <= 100),
  verification_method TEXT NOT NULL CHECK (verification_method IN ('voice', 'text_fallback', 'text_primary')),
  compliance_policy_id TEXT NOT NULL DEFAULT 'POLICY-ID-004',
  ecn_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.atlas_sync_authorizations ENABLE ROW LEVEL SECURITY;

-- Users can only view their own authorizations
CREATE POLICY "Users can view their own authorizations"
ON public.atlas_sync_authorizations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own authorizations
CREATE POLICY "Users can create their own authorizations"
ON public.atlas_sync_authorizations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own authorizations
CREATE POLICY "Users can update their own authorizations"
ON public.atlas_sync_authorizations
FOR UPDATE
USING (auth.uid() = user_id);

-- Hexagonal Architecture Registry Table
-- Tracks active adapters for ports
CREATE TABLE public.zoe_adapter_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  port_name TEXT NOT NULL,
  adapter_name TEXT NOT NULL,
  adapter_version TEXT NOT NULL DEFAULT '1.0.0',
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'unavailable')),
  last_health_check TIMESTAMP WITH TIME ZONE,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(port_name, adapter_name)
);

-- Insert default adapters
INSERT INTO public.zoe_adapter_registry (port_name, adapter_name, adapter_version, configuration, priority) VALUES
('LLM_Inference_Port', 'Gemini_Adapter', '3.0.0', '{"model": "google/gemini-3-pro-preview", "fallbacks": ["google/gemini-2.5-pro", "google/gemini-2.5-flash"]}', 1),
('LLM_Inference_Port', 'Flash_Adapter', '2.5.0', '{"model": "google/gemini-2.5-flash", "fallbacks": ["google/gemini-2.5-flash-lite"]}', 2),
('TTS_Service_Port', 'Placeholder_TTS_Adapter', '1.0.0', '{"voice": "default", "placeholder": true}', 1),
('TTS_Service_Port', 'Exclusive_Voice_Adapter', '0.0.1', '{"voice": "calm_soothing", "status": "reserved_future"}', 99);

-- Index for fast lookups
CREATE INDEX idx_adapter_registry_port ON public.zoe_adapter_registry(port_name, is_active);
CREATE INDEX idx_atlas_sync_user ON public.atlas_sync_authorizations(user_id, is_active);

-- Enable realtime for ATLAS sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.atlas_sync_authorizations;