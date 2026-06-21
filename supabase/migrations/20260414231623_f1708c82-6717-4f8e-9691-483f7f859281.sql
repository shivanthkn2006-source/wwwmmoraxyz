
CREATE TABLE public.zoe_adaptive_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'general',
  pattern_key TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  usage_count INTEGER NOT NULL DEFAULT 1,
  source TEXT DEFAULT 'conversation',
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zoe_adaptive_learning_user ON public.zoe_adaptive_learning (user_id, pattern_type, updated_at DESC);
CREATE INDEX idx_zoe_adaptive_learning_key ON public.zoe_adaptive_learning (user_id, pattern_key);

ALTER TABLE public.zoe_adaptive_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning data"
  ON public.zoe_adaptive_learning FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning data"
  ON public.zoe_adaptive_learning FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning data"
  ON public.zoe_adaptive_learning FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning data"
  ON public.zoe_adaptive_learning FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_zoe_adaptive_learning_updated_at
  BEFORE UPDATE ON public.zoe_adaptive_learning
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
