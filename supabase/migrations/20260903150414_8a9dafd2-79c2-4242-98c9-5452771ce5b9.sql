REVOKE EXECUTE ON FUNCTION public.enqueue_zoe_search_entity(text, uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.queue_generic_for_zoe_search() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_zoe_search_entity(text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_generic_for_zoe_search() TO service_role;