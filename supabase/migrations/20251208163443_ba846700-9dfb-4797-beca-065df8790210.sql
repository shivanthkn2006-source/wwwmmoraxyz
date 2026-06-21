-- Create zoe_veto_log table for tracking VETO interventions
CREATE TABLE public.zoe_veto_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  original_action TEXT NOT NULL,
  veto_reason TEXT NOT NULL,
  intervention_type TEXT NOT NULL DEFAULT 'soft',
  latency_ms INTEGER,
  user_override BOOLEAN DEFAULT false,
  ecn_state_at_veto JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id UUID
);

-- Enable RLS
ALTER TABLE public.zoe_veto_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own veto logs"
  ON public.zoe_veto_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own veto logs"
  ON public.zoe_veto_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add dhf_autonomy_tolerance column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dhf_autonomy_tolerance NUMERIC DEFAULT 0.5;

-- Add index for performance
CREATE INDEX idx_zoe_veto_log_user_id ON public.zoe_veto_log(user_id);
CREATE INDEX idx_zoe_veto_log_created_at ON public.zoe_veto_log(created_at DESC);