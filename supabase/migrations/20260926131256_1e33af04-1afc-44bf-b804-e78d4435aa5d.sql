CREATE TABLE public.home_load_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  device text,
  browser text,
  viewport text,
  connection text,
  interactive_ms integer,
  marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_count integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT ON public.home_load_reports TO authenticated;
GRANT ALL ON public.home_load_reports TO service_role;
ALTER TABLE public.home_load_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members add own load reports" ON public.home_load_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members read own, admin reads all" ON public.home_load_reports FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX home_load_reports_created_idx ON public.home_load_reports (created_at DESC);