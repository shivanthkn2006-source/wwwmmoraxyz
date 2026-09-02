CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  context_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_interactions_user_agent_idx
  ON public.agent_interactions (user_id, agent_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_interactions TO authenticated;
GRANT ALL ON public.agent_interactions TO service_role;

ALTER TABLE public.agent_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their agent context"
  ON public.agent_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert their agent context"
  ON public.agent_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update their agent context"
  ON public.agent_interactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete their agent context"
  ON public.agent_interactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_agent_interactions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agent_interactions_touch ON public.agent_interactions;
CREATE TRIGGER agent_interactions_touch
  BEFORE UPDATE ON public.agent_interactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_interactions();