CREATE OR REPLACE FUNCTION public.list_member_tables()
RETURNS TABLE(table_name text, member_column text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IN (
      'user_id', 'sender_id', 'receiver_id', 'recipient_id', 'requester_id',
      'owner_id', 'created_by', 'actor_id', 'from_user_id', 'to_user_id',
      'user1_id', 'user2_id'
    )
  ORDER BY c.table_name, c.column_name;
$function$;

REVOKE ALL ON FUNCTION public.list_member_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_member_tables() FROM anon;
REVOKE ALL ON FUNCTION public.list_member_tables() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_member_tables() TO service_role;