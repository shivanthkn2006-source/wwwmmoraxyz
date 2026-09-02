REVOKE ALL ON public.edge_rate_limits FROM anon, authenticated;
GRANT ALL ON public.edge_rate_limits TO service_role;
DROP POLICY IF EXISTS "edge rate limits service only" ON public.edge_rate_limits;
CREATE POLICY "edge rate limits service only" ON public.edge_rate_limits FOR SELECT TO authenticated USING (false);