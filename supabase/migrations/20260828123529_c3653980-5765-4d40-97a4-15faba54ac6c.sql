CREATE TABLE IF NOT EXISTS public.growth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.growth_audit_log TO authenticated;
GRANT ALL ON public.growth_audit_log TO service_role;

ALTER TABLE public.growth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_audit_select_own"
  ON public.growth_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "growth_audit_insert_self"
  ON public.growth_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS growth_audit_log_created_idx ON public.growth_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS growth_audit_log_user_idx ON public.growth_audit_log (user_id, created_at DESC);