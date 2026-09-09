
-- 1. INVITE CODES ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can consume invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Validate single invite code only" ON public.invite_codes;

CREATE POLICY "Members can view the invite code they used"
ON public.invite_codes FOR SELECT TO authenticated
USING (used_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

REVOKE INSERT, UPDATE, DELETE ON public.invite_codes FROM anon;
REVOKE SELECT ON public.invite_codes FROM anon;

-- 2. NOTIFICATIONS -----------------------------------------------------------
DROP POLICY IF EXISTS "Members create attributed notifications" ON public.notifications;

CREATE POLICY "Members create notifications only for themselves"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (from_user_id = auth.uid() AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_admins_of_failure(
  p_type text,
  p_title text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_recent integer;
  v_inserted integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- rate limit: max 5 system alerts per caller per hour
  SELECT count(*) INTO v_recent
  FROM public.notifications
  WHERE from_user_id = v_caller
    AND type = 'system_alert'
    AND created_at > now() - interval '1 hour';

  IF v_recent >= 5 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, from_user_id, type, context_data)
  SELECT ur.user_id,
         v_caller,
         'system_alert',
         jsonb_build_object(
           'alert_type', left(coalesce(p_type, 'unknown'), 80),
           'title', left(coalesce(p_title, ''), 200),
           'context', coalesce(p_context, '{}'::jsonb),
           'reported_by', v_caller
         )
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_admins_of_failure(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_admins_of_failure(text, text, jsonb) TO authenticated;

-- 3. QUIZ ANSWERS ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.exodus_quiz_questions;
DROP POLICY IF EXISTS "exodus_quiz_authenticated" ON public.exodus_quiz_questions;

CREATE POLICY "Admins can view quiz questions"
ON public.exodus_quiz_questions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.exodus_quiz_questions FROM anon;

CREATE OR REPLACE FUNCTION public.get_exodus_quiz(p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, question text, options jsonb, points integer, difficulty text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT q.id, q.question, q.options, q.points, q.difficulty
  FROM public.exodus_quiz_questions q
  WHERE q.is_active = true AND auth.uid() IS NOT NULL
  ORDER BY q.created_at
  LIMIT greatest(1, least(coalesce(p_limit, 5), 50));
$function$;

CREATE OR REPLACE FUNCTION public.score_exodus_quiz(p_answers jsonb)
RETURNS TABLE(total_points integer, correct_count integer, question_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_points integer := 0;
  v_correct integer := 0;
  v_count integer := 0;
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  FOR r IN
    SELECT q.id, q.correct_option, q.points,
           (p_answers ->> q.id::text) AS given
    FROM public.exodus_quiz_questions q
    WHERE q.is_active = true
      AND p_answers ? q.id::text
  LOOP
    v_count := v_count + 1;
    IF r.given IS NOT NULL AND r.given::int = r.correct_option THEN
      v_correct := v_correct + 1;
      v_points := v_points + coalesce(r.points, 0);
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_points, v_correct, v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_exodus_quiz(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.score_exodus_quiz(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exodus_quiz(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.score_exodus_quiz(jsonb) TO authenticated;

-- 4. FOLLOWER GRAPH ----------------------------------------------------------
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.user_follows;

CREATE POLICY "Signed-in members can view follows"
ON public.user_follows FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

REVOKE SELECT ON public.user_follows FROM anon;

-- 5. PRIVILEGED HELPERS: caller-identity guards ------------------------------
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

    new_def := regexp_replace(new_def, '(AS \$function\$.*?\m)BEGIN\M', '\1BEGIN' || replace(guard, '\', '\\'), 'n');

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

-- 6. Internal-only helpers must not be callable by members -------------------
REVOKE ALL ON FUNCTION public.check_behavioral_shift(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_daily_notification_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_root_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_face_login_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_notifications() FROM PUBLIC, anon, authenticated;
