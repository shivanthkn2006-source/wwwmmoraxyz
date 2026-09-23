CREATE OR REPLACE FUNCTION public.enqueue_zoe_search_entity(p_entity_type text, p_entity_id uuid, p_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Keep this list in step with zoe_search_index_queue_entity_type_check.
  -- It previously omitted important_date / post_attachment / life_fact, so the
  -- planner trigger raised on every insert, update and delete.
  IF p_entity_type NOT IN (
    'post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node',
    'dhf_post', 'dhf_video', 'growth_card', 'astro_prediction', 'wisdom_goal',
    'direct_message', 'post_comment', 'visual_memory',
    'important_date', 'post_attachment', 'life_fact'
  ) THEN
    RAISE EXCEPTION 'Unsupported search entity type: %', p_entity_type;
  END IF;

  INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id, status, attempts, available_at, last_error)
  VALUES (p_entity_type, p_entity_id, p_owner_id, 'pending', 0, now(), NULL)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL, owner_id = EXCLUDED.owner_id;
END;
$function$;