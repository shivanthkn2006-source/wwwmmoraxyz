ALTER TABLE public.platform_error_logs
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bug',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_error_logs_status_check') THEN
    ALTER TABLE public.platform_error_logs
      ADD CONSTRAINT platform_error_logs_status_check
      CHECK (status IN ('open','triaged','in_progress','resolved','closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_error_logs_severity_check') THEN
    ALTER TABLE public.platform_error_logs
      ADD CONSTRAINT platform_error_logs_severity_check
      CHECK (severity IN ('low','normal','high','critical'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can update error reports" ON public.platform_error_logs;
CREATE POLICY "Admins can update error reports"
ON public.platform_error_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT UPDATE ON public.platform_error_logs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_platform_error_logs_user_created
  ON public.platform_error_logs (user_id, created_at DESC);