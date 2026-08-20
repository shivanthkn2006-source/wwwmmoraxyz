DO $$
DECLARE r record;
  keep_anon text[] := ARRAY[
    'has_role','is_root_admin','is_timeline_member','is_user_shadow_banned',
    'can_insert_session','has_premium_access','get_user_tenant_id',
    'validate_invite_code','check_face_login_rate_limit'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, t.typname AS rettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.rettype = 'trigger' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon, authenticated, public;',
                     r.proname, pg_get_function_identity_arguments(r.oid));
    ELSIF NOT (r.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon, public;',
                     r.proname, pg_get_function_identity_arguments(r.oid));
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;',
                     r.proname, pg_get_function_identity_arguments(r.oid));
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE m record;
BEGIN
  FOR m IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', m.matviewname);
  END LOOP;
END $$;