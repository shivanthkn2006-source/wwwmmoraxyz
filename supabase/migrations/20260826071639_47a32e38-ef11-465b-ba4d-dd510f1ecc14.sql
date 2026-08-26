CREATE TABLE IF NOT EXISTS public.astro_audit_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_run_id text NOT NULL UNIQUE,
  correlation_id text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  members_count integer NOT NULL DEFAULT 0,
  missing_morning integer NOT NULL DEFAULT 0,
  members_with_gaps integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS astro_audit_runs_created_idx ON public.astro_audit_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS astro_audit_runs_correlation_idx ON public.astro_audit_runs (correlation_id);

GRANT SELECT ON public.astro_audit_runs TO authenticated;
GRANT ALL ON public.astro_audit_runs TO service_role;

ALTER TABLE public.astro_audit_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit runs" ON public.astro_audit_runs;
CREATE POLICY "Admins can read audit runs"
ON public.astro_audit_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));