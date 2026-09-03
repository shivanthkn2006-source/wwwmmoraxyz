CREATE OR REPLACE FUNCTION public.enqueue_zoe_search_entity(p_entity_type text, p_entity_id uuid, p_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_entity_type NOT IN (
    'post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node',
    'dhf_post', 'dhf_video', 'growth_card', 'astro_prediction', 'wisdom_goal',
    'direct_message', 'post_comment'
  ) THEN
    RAISE EXCEPTION 'Unsupported search entity type';
  END IF;

  INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id, status, attempts, available_at, last_error)
  VALUES (p_entity_type, p_entity_id, p_owner_id, 'pending', 0, now(), NULL)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL, owner_id = EXCLUDED.owner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_direct_message_for_zoe_search()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = 'direct_message' AND entity_id = OLD.id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = 'direct_message' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF coalesce(NEW.content, '') <> '' THEN
    PERFORM public.enqueue_zoe_search_entity('direct_message', NEW.id, NEW.sender_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_post_comment_for_zoe_search()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = 'post_comment' AND entity_id = OLD.id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = 'post_comment' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF coalesce(NEW.content, '') <> '' THEN
    PERFORM public.enqueue_zoe_search_entity('post_comment', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.queue_direct_message_for_zoe_search() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_post_comment_for_zoe_search() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_messages_zoe_search ON public.messages;
CREATE TRIGGER trg_messages_zoe_search
AFTER INSERT OR UPDATE OF content OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.queue_direct_message_for_zoe_search();

DROP TRIGGER IF EXISTS trg_post_comments_zoe_search ON public.post_comments;
CREATE TRIGGER trg_post_comments_zoe_search
AFTER INSERT OR UPDATE OF content OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.queue_post_comment_for_zoe_search();