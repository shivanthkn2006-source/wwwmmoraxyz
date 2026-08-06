CREATE TABLE public.zoe_metacognition_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  message_id TEXT,
  mode TEXT,
  deep_mode BOOLEAN NOT NULL DEFAULT false,
  reasoning_depth INTEGER,
  confidence_score NUMERIC,
  threshold NUMERIC,
  withheld BOOLEAN NOT NULL DEFAULT false,
  fast_pass BOOLEAN NOT NULL DEFAULT false,
  parse_ok BOOLEAN NOT NULL DEFAULT true,
  parse_error TEXT,
  uncertain_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  clarifying_question TEXT,
  monologue_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_excerpt TEXT,
  response_excerpt TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoe_metacognition_log TO authenticated;
GRANT ALL ON public.zoe_metacognition_log TO service_role;
ALTER TABLE public.zoe_metacognition_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own metacognition logs" ON public.zoe_metacognition_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages metacognition logs" ON public.zoe_metacognition_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_zoe_metacog_user_created ON public.zoe_metacognition_log (user_id, created_at DESC);

CREATE TABLE public.zoe_drift_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metacognition_log_id UUID REFERENCES public.zoe_metacognition_log(id) ON DELETE SET NULL,
  message_id TEXT,
  correction_type TEXT NOT NULL DEFAULT 'user_correction',
  original_response TEXT,
  corrected_response TEXT,
  clarifying_question TEXT,
  clarification_answer TEXT,
  reported_confidence NUMERIC,
  was_correct BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_drift_corrections TO authenticated;
GRANT ALL ON public.zoe_drift_corrections TO service_role;
ALTER TABLE public.zoe_drift_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own drift corrections" ON public.zoe_drift_corrections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages drift corrections" ON public.zoe_drift_corrections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_zoe_drift_user_created ON public.zoe_drift_corrections (user_id, created_at DESC);