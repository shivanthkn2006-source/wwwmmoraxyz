CREATE OR REPLACE FUNCTION public.enqueue_zoe_search_entity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_owner_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity_type NOT IN (
    'post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node',
    'dhf_post', 'dhf_video', 'growth_card', 'astro_prediction', 'wisdom_goal',
    'direct_message', 'post_comment', 'visual_memory'
  ) THEN
    RAISE EXCEPTION 'Unsupported search entity type';
  END IF;

  INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id, status, attempts, available_at, last_error)
  VALUES (p_entity_type, p_entity_id, p_owner_id, 'pending', 0, now(), NULL)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL, owner_id = EXCLUDED.owner_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_zoe_search_entity(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_zoe_search_entity(TEXT, UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_visual_memory_for_zoe_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.key LIKE 'vision_%' AND NEW.user_id IS NOT NULL THEN
    PERFORM public.enqueue_zoe_search_entity('visual_memory', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_visual_memory_for_zoe_search ON public.zoe_infinity_memories;
CREATE TRIGGER queue_visual_memory_for_zoe_search
AFTER INSERT OR UPDATE ON public.zoe_infinity_memories
FOR EACH ROW EXECUTE FUNCTION public.queue_visual_memory_for_zoe_search();