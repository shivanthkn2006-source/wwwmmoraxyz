-- Create table for synthetic scenarios (Dream Foundry output)
CREATE TABLE public.zoe_synthetic_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  era TEXT,
  quality_score NUMERIC(3,2) DEFAULT 0,
  is_validated BOOLEAN DEFAULT false,
  logical_consistency NUMERIC(3,2),
  physics_compliance NUMERIC(3,2),
  psychology_compliance NUMERIC(3,2),
  embedding_stored BOOLEAN DEFAULT false,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Dream Foundry execution logs
CREATE TABLE public.zoe_dream_foundry_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  scenarios_generated INTEGER DEFAULT 0,
  scenarios_validated INTEGER DEFAULT 0,
  scenarios_stored INTEGER DEFAULT 0,
  total_processing_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_synthetic_scenarios_category ON public.zoe_synthetic_scenarios(category);
CREATE INDEX idx_synthetic_scenarios_quality ON public.zoe_synthetic_scenarios(quality_score DESC);
CREATE INDEX idx_synthetic_scenarios_validated ON public.zoe_synthetic_scenarios(is_validated);
CREATE INDEX idx_dream_foundry_logs_status ON public.zoe_dream_foundry_logs(status);

-- Enable RLS
ALTER TABLE public.zoe_synthetic_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_dream_foundry_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to validated scenarios (public knowledge base)
CREATE POLICY "Anyone can read validated scenarios"
ON public.zoe_synthetic_scenarios
FOR SELECT
USING (is_validated = true);

-- System can insert/update all scenarios (via service role)
CREATE POLICY "Service role can manage all scenarios"
ON public.zoe_synthetic_scenarios
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow system to manage foundry logs
CREATE POLICY "Service role can manage foundry logs"
ON public.zoe_dream_foundry_logs
FOR ALL
USING (true)
WITH CHECK (true);