DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['edge_cron_tokens','face_login_attempts','passkey_auth_challenges','zoe_search_index_queue','zoe_dream_foundry_logs','zoe_search_events','zoe_cache'] LOOP
    EXECUTE format('CREATE POLICY "Backend services only" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;