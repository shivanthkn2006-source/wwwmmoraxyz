CREATE TABLE public.zoe_vision_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  summary text NOT NULL,
  attire text,
  mood text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.zoe_vision_journal TO authenticated;
GRANT ALL ON public.zoe_vision_journal TO service_role;
ALTER TABLE public.zoe_vision_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own vision journal" ON public.zoe_vision_journal FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members add own vision journal" ON public.zoe_vision_journal FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own vision journal" ON public.zoe_vision_journal FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX zoe_vision_journal_user_time ON public.zoe_vision_journal (user_id, created_at DESC);