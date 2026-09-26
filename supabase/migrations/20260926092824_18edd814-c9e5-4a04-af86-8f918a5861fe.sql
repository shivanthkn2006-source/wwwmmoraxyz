ALTER TABLE public.humor_drops
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'relatable',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'zoe',
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.humor_drops
  ADD CONSTRAINT humor_drops_category_check CHECK (category IN ('relatable','wordplay','workplace','absurd','family','observational')),
  ADD CONSTRAINT humor_drops_origin_check CHECK (origin IN ('zoe','member')),
  ADD CONSTRAINT humor_drops_author_check CHECK ((origin = 'zoe' AND author_id IS NULL) OR (origin = 'member' AND author_id IS NOT NULL));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.humor_drops TO authenticated;
GRANT ALL ON public.humor_drops TO service_role;

DROP POLICY IF EXISTS "Members can read humor drops" ON public.humor_drops;
CREATE POLICY "Members can read published humor drops"
ON public.humor_drops FOR SELECT TO authenticated
USING (is_published = true OR author_id = auth.uid());

CREATE POLICY "Members can submit own humor drops"
ON public.humor_drops FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND origin = 'member'
  AND is_published = true
  AND slot = 99
  AND drop_date = (scheduled_for AT TIME ZONE 'UTC')::date
);

CREATE POLICY "Members can update own humor drops"
ON public.humor_drops FOR UPDATE TO authenticated
USING (author_id = auth.uid() AND origin = 'member')
WITH CHECK (
  author_id = auth.uid()
  AND origin = 'member'
  AND slot = 99
  AND drop_date = (scheduled_for AT TIME ZONE 'UTC')::date
);

CREATE POLICY "Members can delete own humor drops"
ON public.humor_drops FOR DELETE TO authenticated
USING (author_id = auth.uid() AND origin = 'member');

CREATE OR REPLACE FUNCTION public.touch_humor_drop_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS humor_drops_touch_updated_at ON public.humor_drops;
CREATE TRIGGER humor_drops_touch_updated_at
BEFORE UPDATE ON public.humor_drops
FOR EACH ROW EXECUTE FUNCTION public.touch_humor_drop_updated_at();

CREATE INDEX IF NOT EXISTS humor_drops_feed_idx
  ON public.humor_drops (is_published, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS humor_drops_category_idx
  ON public.humor_drops (category, scheduled_for DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS humor_drops_author_idx
  ON public.humor_drops (author_id, scheduled_for DESC) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS humor_reactions_recent_idx
  ON public.humor_reactions (drop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS humor_comments_recent_idx
  ON public.humor_comments (drop_id, created_at DESC);