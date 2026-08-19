CREATE TABLE IF NOT EXISTS public.user_daily_ephemeral_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_duration_seconds INT NOT NULL DEFAULT 60,
  dismiss_type TEXT NOT NULL DEFAULT 'auto_timer',
  CONSTRAINT unique_daily_user_view UNIQUE (user_id, view_date)
);

GRANT SELECT, INSERT, UPDATE ON public.user_daily_ephemeral_views TO authenticated;
GRANT ALL ON public.user_daily_ephemeral_views TO service_role;

ALTER TABLE public.user_daily_ephemeral_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ephemeral records" ON public.user_daily_ephemeral_views;
CREATE POLICY "Users can view own ephemeral records"
ON public.user_daily_ephemeral_views FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ephemeral records" ON public.user_daily_ephemeral_views;
CREATE POLICY "Users can insert own ephemeral records"
ON public.user_daily_ephemeral_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ephemeral records" ON public.user_daily_ephemeral_views;
CREATE POLICY "Users can update own ephemeral records"
ON public.user_daily_ephemeral_views FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.verify_astro_permissions()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid UUID;
  profile_count INT;
  prediction_count INT;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED', 'message', 'No active authenticated session found.');
  END IF;

  SELECT COUNT(*) INTO profile_count FROM public.astro_profiles WHERE user_id = current_uid;
  SELECT COUNT(*) INTO prediction_count FROM public.astro_predictions WHERE user_id = current_uid;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', current_uid,
    'has_profile', (profile_count > 0),
    'predictions_available', prediction_count,
    'rls_status', 'PASSED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_astro_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_astro_permissions() TO authenticated;