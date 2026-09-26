CREATE TABLE IF NOT EXISTS public.humor_views (
  drop_id uuid NOT NULL REFERENCES public.humor_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (drop_id, user_id)
);
GRANT SELECT, INSERT ON public.humor_views TO authenticated;
GRANT ALL ON public.humor_views TO service_role;
ALTER TABLE public.humor_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read view counts" ON public.humor_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members record own views" ON public.humor_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.humor_follows (
  user_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
GRANT SELECT, INSERT, DELETE ON public.humor_follows TO authenticated;
GRANT ALL ON public.humor_follows TO service_role;
ALTER TABLE public.humor_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own humor follows" ON public.humor_follows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);