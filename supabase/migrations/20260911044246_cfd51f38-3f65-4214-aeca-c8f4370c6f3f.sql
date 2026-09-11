CREATE TABLE public.zoe_asset_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('3d','image','video','document')),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','unavailable')),
  progress integer NOT NULL DEFAULT 0,
  detail text,
  provider text,
  provider_job_id text,
  result_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_asset_jobs TO authenticated;
GRANT ALL ON public.zoe_asset_jobs TO service_role;

ALTER TABLE public.zoe_asset_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own asset jobs"
  ON public.zoe_asset_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members create their own asset jobs"
  ON public.zoe_asset_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update their own asset jobs"
  ON public.zoe_asset_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete their own asset jobs"
  ON public.zoe_asset_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_zoe_asset_jobs_user_created ON public.zoe_asset_jobs (user_id, created_at DESC);

CREATE TRIGGER update_zoe_asset_jobs_updated_at
  BEFORE UPDATE ON public.zoe_asset_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();