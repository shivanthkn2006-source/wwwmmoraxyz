CREATE TABLE IF NOT EXISTS public.zoe_search_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  scope_by_topic JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_search_prefs TO authenticated;
GRANT ALL ON public.zoe_search_prefs TO service_role;

ALTER TABLE public.zoe_search_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own search preferences" ON public.zoe_search_prefs;
CREATE POLICY "Users manage their own search preferences"
  ON public.zoe_search_prefs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);