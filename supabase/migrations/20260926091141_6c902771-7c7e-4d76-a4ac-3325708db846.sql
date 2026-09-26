ALTER TABLE public.humor_drops ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE public.humor_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.humor_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drop_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.humor_reactions TO authenticated;
GRANT ALL ON public.humor_reactions TO service_role;
ALTER TABLE public.humor_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reactions" ON public.humor_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "members add own reaction" ON public.humor_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members change own reaction" ON public.humor_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members remove own reaction" ON public.humor_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.humor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.humor_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX humor_comments_drop_idx ON public.humor_comments (drop_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.humor_comments TO authenticated;
GRANT ALL ON public.humor_comments TO service_role;
ALTER TABLE public.humor_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read comments" ON public.humor_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "members post own comment" ON public.humor_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members delete own comment" ON public.humor_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);