CREATE TABLE IF NOT EXISTS public.feed_diagnostics_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  status TEXT NOT NULL,
  message TEXT,
  error_code TEXT,
  duration_ms INTEGER,
  row_count INTEGER,
  rls_blocked BOOLEAN DEFAULT false,
  auth_ready BOOLEAN,
  user_agent TEXT,
  route TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_diag_user_created ON public.feed_diagnostics_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_diag_status_created ON public.feed_diagnostics_log(status, created_at DESC);

ALTER TABLE public.feed_diagnostics_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own feed diag"
  ON public.feed_diagnostics_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users read their own feed diag"
  ON public.feed_diagnostics_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Root admins read all feed diag"
  ON public.feed_diagnostics_log FOR SELECT
  USING (public.is_root_admin(auth.uid()));