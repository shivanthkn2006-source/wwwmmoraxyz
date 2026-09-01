CREATE OR REPLACE FUNCTION public.bump_edge_rate_limit(_bucket text, _window_start timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.edge_rate_limits (bucket, window_start, hits, updated_at)
  VALUES (_bucket, _window_start, 1, now())
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET hits = public.edge_rate_limits.hits + 1, updated_at = now()
  RETURNING hits INTO v;

  DELETE FROM public.edge_rate_limits WHERE window_start < now() - interval '1 day';
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_edge_rate_limit(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_edge_rate_limit(text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.bump_edge_rate_limit(text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_edge_rate_limit(text, timestamptz) TO service_role;