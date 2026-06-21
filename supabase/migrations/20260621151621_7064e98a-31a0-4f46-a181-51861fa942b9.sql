ALTER TABLE public.feed_diagnostics_log
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS rls_blocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_ready boolean,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.trial_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  trial_start timestamp with time zone NOT NULL DEFAULT now(),
  trial_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_access TO authenticated;
GRANT ALL ON public.trial_access TO service_role;

ALTER TABLE public.trial_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trial access" ON public.trial_access;
CREATE POLICY "Users can view own trial access"
  ON public.trial_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own trial access" ON public.trial_access;
CREATE POLICY "Users can create own trial access"
  ON public.trial_access
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trial access" ON public.trial_access;
CREATE POLICY "Users can update own trial access"
  ON public.trial_access
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trial access" ON public.trial_access;
CREATE POLICY "Users can delete own trial access"
  ON public.trial_access
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trial_access_user_active
  ON public.trial_access (user_id, is_active, trial_end DESC);

DROP TRIGGER IF EXISTS update_trial_access_updated_at ON public.trial_access;
CREATE TRIGGER update_trial_access_updated_at
  BEFORE UPDATE ON public.trial_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();