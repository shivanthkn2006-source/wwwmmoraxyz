CREATE TABLE IF NOT EXISTS public.zoe_feed_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'reflection',
  title text NOT NULL,
  body text NOT NULL,
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_post_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  cohort text,
  dismissed boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoe_feed_cards TO authenticated;
GRANT ALL ON public.zoe_feed_cards TO service_role;

ALTER TABLE public.zoe_feed_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own Zoe cards"
  ON public.zoe_feed_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members create their own Zoe cards"
  ON public.zoe_feed_cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update their own Zoe cards"
  ON public.zoe_feed_cards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete their own Zoe cards"
  ON public.zoe_feed_cards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS zoe_feed_cards_user_created_idx
  ON public.zoe_feed_cards (user_id, created_at DESC);

CREATE TRIGGER update_zoe_feed_cards_updated_at
  BEFORE UPDATE ON public.zoe_feed_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock down SECURITY DEFINER functions that the application never calls directly.
DO $$
DECLARE
  fn record;
  keep_auth text[] := ARRAY[
    'accept_friend_request','append_merged_mind_entity','apply_zoe_feedback',
    'bump_edge_rate_limit','calculate_agent_success_probability','calculate_phoenix_sync_score',
    'check_behavioral_shift','check_face_login_rate_limit','check_feature_limit',
    'check_user_activity_freshness','cleanup_expired_notifications','complete_agent_deployment',
    'cqrs_command_log_event','cqrs_query_zoe_state','detect_relationship_style',
    'get_daily_notification_count','get_leaderboard','get_upcoming_important_dates',
    'get_zoe_sovereign_state','get_zoe_stability_score','has_role','increment_feature_usage',
    'increment_macro_execution','increment_shortcut_execution','is_root_admin','is_sovereign_admin',
    'log_raa_diagnosis','mark_messages_delivered','migrate_relationship_to_zsmt',
    'recompute_intimacy_scores','record_dhf_lineage','should_show_hint','verify_astro_permissions',
    'zoe_hybrid_search','zoe_prefix_search',
    'is_timeline_member','is_timeline_owner','has_premium_access','get_user_tenant_id',
    'is_user_shadow_banned','sentinel_is_blocked','can_insert_session','validate_invite_code'
  ];
  keep_anon text[] := ARRAY['check_face_login_rate_limit','validate_invite_code','bump_edge_rate_limit'];
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF NOT (fn.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        fn.proname, pg_get_function_identity_arguments(fn.oid));
    END IF;
    IF NOT (fn.proname = ANY(keep_auth)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated, PUBLIC',
        fn.proname, pg_get_function_identity_arguments(fn.oid));
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
        fn.proname, pg_get_function_identity_arguments(fn.oid));
    END IF;
  END LOOP;
END $$;