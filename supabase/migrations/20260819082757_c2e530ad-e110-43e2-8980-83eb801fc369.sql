
-- 1) Run history for the Zoe dispatch dashboard
CREATE TABLE IF NOT EXISTS public.astro_dispatch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine text NOT NULL DEFAULT 'astro-dispatch',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_count integer NOT NULL DEFAULT 0,
  error text
);
GRANT SELECT ON public.astro_dispatch_runs TO authenticated;
GRANT ALL ON public.astro_dispatch_runs TO service_role;
ALTER TABLE public.astro_dispatch_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members can read dispatch runs" ON public.astro_dispatch_runs;
CREATE POLICY "members can read dispatch runs" ON public.astro_dispatch_runs
  FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS astro_dispatch_runs_started_idx ON public.astro_dispatch_runs (started_at DESC);

-- 2) Guarantee every account owns a profile row, so both daily engines cover everyone
CREATE OR REPLACE FUNCTION public.ensure_profiles_for_all_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inserted integer;
BEGIN
  WITH missing AS (
    INSERT INTO public.profiles (user_id, display_name, username)
    SELECT u.id,
           COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''),
                    NULLIF(u.raw_user_meta_data->>'full_name',''),
                    split_part(COALESCE(u.email,'member'),'@',1)),
           lower(regexp_replace(split_part(COALESCE(u.email,'member'),'@',1),'[^a-zA-Z0-9_]','','g'))
             || '_' || substr(replace(u.id::text,'-',''),1,6)
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.id IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM missing;
  RETURN inserted;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profiles_for_all_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profiles_for_all_users() TO service_role;

SELECT public.ensure_profiles_for_all_users();
