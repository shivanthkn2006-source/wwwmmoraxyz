CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

DO $mig$
DECLARE
  r record;
  v_ident text;
  v_full text;
  v_ret text;
  v_call text;
  v_body text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'accept_friend_request','append_merged_mind_entity','check_feature_limit',
        'get_exodus_quiz','get_leaderboard','has_role','increment_feature_usage',
        'is_root_admin','is_sovereign_admin','is_timeline_member','is_timeline_owner',
        'log_raa_diagnosis','mark_messages_delivered','notify_admins_of_failure',
        'recompute_intimacy_scores','record_dhf_lineage','score_exodus_quiz'
      )
  LOOP
    v_ident := pg_get_function_identity_arguments(r.oid);
    v_full  := pg_get_function_arguments(r.oid);
    v_ret   := pg_get_function_result(r.oid);

    SELECT COALESCE(string_agg(quote_ident(t.nm), ', ' ORDER BY t.ord), '')
      INTO v_call
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(
           COALESCE(p.proargnames, ARRAY[]::text[]),
           COALESCE(p.proargmodes, array_fill('i'::"char", ARRAY[COALESCE(array_length(p.proargnames,1),0)]))
         ) WITH ORDINALITY AS t(nm, md, ord)
    WHERE p.oid = r.oid
      AND t.md IN ('i','b','v');

    EXECUTE format('ALTER FUNCTION public.%I(%s) SET SCHEMA private', r.proname, v_ident);

    IF v_ret LIKE 'TABLE(%' OR v_ret LIKE 'SETOF %' THEN
      v_body := format('SELECT * FROM private.%I(%s)', r.proname, v_call);
    ELSE
      v_body := format('SELECT private.%I(%s)', r.proname, v_call);
    END IF;

    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql SECURITY INVOKER SET search_path = public, private AS $wrap$ %s $wrap$',
      r.proname, v_full, v_ret, v_body
    );

    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, v_ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, v_ident);
    EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC', r.proname, v_ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO authenticated, service_role', r.proname, v_ident);
  END LOOP;
END
$mig$;