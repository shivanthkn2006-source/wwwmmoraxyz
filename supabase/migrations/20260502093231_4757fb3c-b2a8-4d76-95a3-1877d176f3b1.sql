-- Safe DB-size reader for quota monitor (service-role only)
CREATE OR REPLACE FUNCTION public.pg_database_size_safe()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_database_size(current_database());
$$;

REVOKE ALL ON FUNCTION public.pg_database_size_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pg_database_size_safe() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pg_database_size_safe() TO service_role;