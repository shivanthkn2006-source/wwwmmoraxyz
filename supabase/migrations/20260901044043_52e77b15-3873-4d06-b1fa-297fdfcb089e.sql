CREATE TABLE public.platform_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  route text,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  zustand_state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.platform_error_logs TO authenticated;
GRANT ALL ON public.platform_error_logs TO service_role;

ALTER TABLE public.platform_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file their own error reports"
ON public.platform_error_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own error reports"
ON public.platform_error_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all error reports"
ON public.platform_error_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_platform_error_logs_created_at ON public.platform_error_logs (created_at DESC);