ALTER TABLE public.platform_error_logs
  ADD COLUMN IF NOT EXISTS autofix_state text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS autofix_summary text,
  ADD COLUMN IF NOT EXISTS autofix_suggestion text,
  ADD COLUMN IF NOT EXISTS autofix_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.platform_error_logs
    ADD CONSTRAINT platform_error_logs_autofix_state_check
    CHECK (autofix_state = ANY (ARRAY['pending','queued','analyzing','proposed','failed','applied']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.bug_report_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.platform_error_logs(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bug_report_audit_log TO authenticated;
GRANT ALL ON public.bug_report_audit_log TO service_role;

ALTER TABLE public.bug_report_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read bug report audit log" ON public.bug_report_audit_log;
CREATE POLICY "Admins can read bug report audit log"
  ON public.bug_report_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Reporters can read their own audit trail" ON public.bug_report_audit_log;
CREATE POLICY "Reporters can read their own audit trail"
  ON public.bug_report_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.platform_error_logs l
    WHERE l.id = bug_report_audit_log.report_id AND l.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_bug_report_audit_report ON public.bug_report_audit_log(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_error_logs_autofix ON public.platform_error_logs(autofix_state, created_at DESC);

ALTER TABLE public.platform_error_logs REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_error_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;