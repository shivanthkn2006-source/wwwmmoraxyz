
DO $do$
DECLARE
  fn record;
  new_def text;
  guard text;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, x.argname
    FROM (VALUES
      ('append_merged_mind_entity','p_user_id'),
      ('apply_zoe_feedback','p_user_id'),
      ('calculate_agent_success_probability','p_user_id'),
      ('calculate_phoenix_sync_score','p_user_id'),
      ('check_feature_limit','p_user_id'),
      ('check_user_activity_freshness','p_user_id'),
      ('cqrs_command_log_event','p_user_id'),
      ('cqrs_query_zoe_state','p_user_id'),
      ('detect_relationship_style','p_user_id'),
      ('get_zoe_sovereign_state','p_user_id'),
      ('get_zoe_stability_score','p_user_id'),
      ('increment_feature_usage','p_user_id'),
      ('log_raa_diagnosis','p_user_id'),
      ('mark_messages_delivered','p_user_id'),
      ('migrate_relationship_to_zsmt','p_user_id'),
      ('recompute_intimacy_scores','_user_id'),
      ('should_show_hint','p_user_id'),
      ('get_upcoming_important_dates','user_uuid')
    ) AS x(fname, argname)
    JOIN pg_proc p ON p.proname = x.fname
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE p.prosecdef AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  LOOP
    new_def := pg_get_functiondef(fn.oid);
    CONTINUE WHEN new_def LIKE '%mmora_caller_guard%';

    guard := format(
      E'\n  -- mmora_caller_guard\n  IF auth.uid() IS NOT NULL AND %I IS DISTINCT FROM auth.uid()'
      || E' AND NOT public.has_role(auth.uid(), ''admin''::app_role) THEN\n'
      || E'    RAISE EXCEPTION ''not authorized for another account'';\n  END IF;\n',
      fn.argname);

    new_def := regexp_replace(new_def, '(AS \$function\$.*?\mBEGIN\M)',
                              '\1' || replace(guard, '\', '\\'));

    IF new_def LIKE '%mmora_caller_guard%' THEN
      BEGIN
        EXECUTE new_def;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'guard skipped for %: %', fn.proname, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'guard pattern not matched for %', fn.proname;
    END IF;
  END LOOP;
END
$do$;

REVOKE ALL ON FUNCTION public.complete_agent_deployment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_behavioral_shift(uuid) FROM PUBLIC, anon, authenticated;
