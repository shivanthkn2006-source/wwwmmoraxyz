CREATE TABLE public.platform_error_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'frontend',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_error_events_created_at ON public.platform_error_events (created_at DESC);
CREATE INDEX idx_platform_error_events_type ON public.platform_error_events (error_type);

GRANT ALL ON public.platform_error_events TO service_role;
GRANT SELECT ON public.platform_error_events TO authenticated;

ALTER TABLE public.platform_error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform error events"
  ON public.platform_error_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages platform error events"
  ON public.platform_error_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
