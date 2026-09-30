CREATE TABLE public.vr_world_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL DEFAULT 'global',
  event text NOT NULL CHECK (event IN ('broadcast','world_reset','summon_all','kick','setting')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vr_world_settings (
  room_id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vr_world_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vr_world_settings TO authenticated;
GRANT ALL ON public.vr_world_events, public.vr_world_settings TO service_role;
ALTER TABLE public.vr_world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vr_world_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see world events" ON public.vr_world_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admin sends world events" ON public.vr_world_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid());
CREATE POLICY "Members see world settings" ON public.vr_world_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admin creates world settings" ON public.vr_world_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Only admin changes world settings" ON public.vr_world_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vr_world_settings_touch BEFORE UPDATE ON public.vr_world_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.vr_world_events, public.vr_world_settings;

-- Avatars: bind writes to the owner's folder
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

-- Live security dashboard: admin-only snapshot
CREATE OR REPLACE FUNCTION public.admin_security_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'tables_total', (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    'tables_without_rls', (SELECT coalesce(jsonb_agg(tablename),'[]') FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity),
    'tables_rls_no_policy', (SELECT coalesce(jsonb_agg(t.tablename),'[]') FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename)),
    'open_read_policies', (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND qual='true'),
    'admins', (SELECT count(*) FROM public.user_roles WHERE role='admin'),
    'threats_24h', (SELECT count(*) FROM public.sentinel_threat_events WHERE created_at > now()-interval '24 hours'),
    'blocks_active', (SELECT count(*) FROM public.sentinel_blocks),
    'security_logs_24h', (SELECT count(*) FROM public.security_audit_log WHERE created_at > now()-interval '24 hours'),
    'vr_world_events_24h', (SELECT count(*) FROM public.vr_world_events WHERE created_at > now()-interval '24 hours'),
    'generated_at', now()
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_security_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_security_overview() TO authenticated;