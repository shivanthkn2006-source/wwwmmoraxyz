CREATE TABLE public.notification_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_run_id TEXT,
  correlation_id TEXT,
  channel TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  succeeded BOOLEAN NOT NULL DEFAULT false,
  transport TEXT,
  error TEXT,
  http_status INTEGER,
  duration_ms INTEGER,
  subject TEXT,
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_attempts TO authenticated;
GRANT ALL ON public.notification_attempts TO service_role;

ALTER TABLE public.notification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification attempts"
  ON public.notification_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages notification attempts"
  ON public.notification_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_notification_attempts_audit_run
  ON public.notification_attempts (audit_run_id, created_at DESC);

CREATE INDEX idx_notification_attempts_created
  ON public.notification_attempts (created_at DESC);

CREATE TRIGGER update_notification_attempts_updated_at
  BEFORE UPDATE ON public.notification_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();