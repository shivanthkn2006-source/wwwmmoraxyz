CREATE TABLE public.dhf_reading_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);
GRANT SELECT, INSERT, DELETE ON public.dhf_reading_plans TO authenticated;
GRANT ALL ON public.dhf_reading_plans TO service_role;
ALTER TABLE public.dhf_reading_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own reading plans" ON public.dhf_reading_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members add own reading plans" ON public.dhf_reading_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members remove own reading plans" ON public.dhf_reading_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);