CREATE TABLE public.zoe_motivation_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  motivation_id uuid NOT NULL,
  vote smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, motivation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_motivation_votes TO authenticated;
GRANT ALL ON public.zoe_motivation_votes TO service_role;
ALTER TABLE public.zoe_motivation_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage their own motivation votes" ON public.zoe_motivation_votes
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND vote IN (-1, 1));