CREATE TABLE public.vr_player_look (
  user_id uuid PRIMARY KEY,
  skin text NOT NULL DEFAULT '#e1c3a4',
  hair_color text NOT NULL DEFAULT '#2b1d14',
  shirt text NOT NULL DEFAULT '#22305a',
  trousers text NOT NULL DEFAULT '#e4dfd3',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vr_player_look TO authenticated;
GRANT ALL ON public.vr_player_look TO service_role;
ALTER TABLE public.vr_player_look ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own look read" ON public.vr_player_look FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own look insert" ON public.vr_player_look FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own look update" ON public.vr_player_look FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);