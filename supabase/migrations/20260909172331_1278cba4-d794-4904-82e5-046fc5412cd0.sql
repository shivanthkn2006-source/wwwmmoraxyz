
CREATE OR REPLACE FUNCTION public.list_owned_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.table_name::text
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name = 'user_id'
    AND t.table_type = 'BASE TABLE'
  ORDER BY c.table_name;
$function$;

REVOKE ALL ON FUNCTION public.list_owned_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_owned_tables() TO service_role;
