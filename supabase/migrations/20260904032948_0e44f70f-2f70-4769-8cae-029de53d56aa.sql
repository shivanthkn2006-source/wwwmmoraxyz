CREATE TABLE IF NOT EXISTS public.zoe_biometric_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation text NOT NULL,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT 'deterministic-rules',
  sample_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zoe_biometric_recs_user_created_idx
  ON public.zoe_biometric_recommendations (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.zoe_biometric_recommendations TO authenticated;
GRANT ALL ON public.zoe_biometric_recommendations TO service_role;

ALTER TABLE public.zoe_biometric_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own biometric recommendations"
  ON public.zoe_biometric_recommendations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members insert their own biometric recommendations"
  ON public.zoe_biometric_recommendations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);