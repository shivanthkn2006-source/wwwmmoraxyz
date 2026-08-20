CREATE POLICY "service_role_manages_zoe_search_index_queue"
ON public.zoe_search_index_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_manages_zoe_search_events"
ON public.zoe_search_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);