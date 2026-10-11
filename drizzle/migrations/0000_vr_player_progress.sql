CREATE TABLE public.vr_player_progress (
  user_id uuid PRIMARY KEY,
  level integer NOT NULL DEFAULT 1,
  gear text[] NOT NULL DEFAULT '{}',
  equipped text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vr_player_progress TO authenticated;
GRANT ALL ON public.vr_player_progress TO service_role;
ALTER TABLE public.vr_player_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress read" ON public.vr_player_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own progress insert" ON public.vr_player_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress update" ON public.vr_player_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);