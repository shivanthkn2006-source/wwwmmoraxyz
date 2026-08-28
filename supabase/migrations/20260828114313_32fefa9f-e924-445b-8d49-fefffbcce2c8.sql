-- 1. Saved growth cards
CREATE TABLE IF NOT EXISTS public.growth_saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.growth_feed_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT growth_saved_unique UNIQUE (user_id, item_id)
);

GRANT SELECT, INSERT, DELETE ON public.growth_saved_items TO authenticated;
GRANT ALL ON public.growth_saved_items TO service_role;

ALTER TABLE public.growth_saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_saved_owner_all" ON public.growth_saved_items;
CREATE POLICY "growth_saved_owner_all" ON public.growth_saved_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS growth_saved_user_idx
  ON public.growth_saved_items (user_id, created_at DESC);

-- 2. Multi-select content delivery styles
ALTER TABLE public.growth_preferences
  ADD COLUMN IF NOT EXISTS reflection_styles TEXT[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.growth_preferences
  SET reflection_styles = ARRAY[reflection_style]
  WHERE COALESCE(array_length(reflection_styles, 1), 0) = 0;

ALTER TABLE public.growth_preferences
  DROP CONSTRAINT IF EXISTS growth_prefs_styles_chk;
ALTER TABLE public.growth_preferences
  ADD CONSTRAINT growth_prefs_styles_chk CHECK (
    reflection_styles <@ ARRAY['actionable','philosophical','biographical','strategic']::text[]
    AND COALESCE(array_length(reflection_styles, 1), 0) <= 4
  );