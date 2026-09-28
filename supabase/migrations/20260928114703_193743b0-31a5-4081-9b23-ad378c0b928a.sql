CREATE TABLE public.zoe_life_reports (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  birth_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoe_life_reports TO authenticated;
GRANT ALL ON public.zoe_life_reports TO service_role;
ALTER TABLE public.zoe_life_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own life report readable" ON public.zoe_life_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER zoe_life_reports_updated_at BEFORE UPDATE ON public.zoe_life_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();