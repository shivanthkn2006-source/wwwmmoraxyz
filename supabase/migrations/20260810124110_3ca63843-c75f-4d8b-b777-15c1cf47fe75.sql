ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zoe_identity_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS zoe_identity_dhf_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zoe_identity_locked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.zoe_identity_vault_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  source TEXT,
  outcome TEXT NOT NULL,
  reason_code TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zoe_identity_vault_log TO authenticated;
GRANT ALL ON public.zoe_identity_vault_log TO service_role;

ALTER TABLE public.zoe_identity_vault_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own identity vault log" ON public.zoe_identity_vault_log;
CREATE POLICY "Users read own identity vault log"
ON public.zoe_identity_vault_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_zoe_identity_vault_log_user_created
  ON public.zoe_identity_vault_log (user_id, created_at DESC);