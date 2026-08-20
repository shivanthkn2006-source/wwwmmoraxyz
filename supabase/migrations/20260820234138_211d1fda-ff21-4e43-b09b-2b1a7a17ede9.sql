CREATE OR REPLACE FUNCTION public.queue_post_for_zoe_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_type TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index
      WHERE entity_id = OLD.id AND entity_type IN ('post', 'loop_video', 'image', 'quote');
    DELETE FROM public.zoe_search_index_queue
      WHERE entity_id = OLD.id AND entity_type IN ('post', 'loop_video', 'image', 'quote');
    RETURN OLD;
  END IF;

  resolved_type := CASE
    WHEN NEW.media_type = 'video' THEN 'loop_video'
    WHEN NEW.media_type = 'image' THEN 'image'
    WHEN lower(coalesce(NEW.content, '')) LIKE 'quote:%' THEN 'quote'
    ELSE 'post'
  END;

  DELETE FROM public.zoe_universal_index
    WHERE entity_id = NEW.id
      AND entity_type IN ('post', 'loop_video', 'image', 'quote')
      AND entity_type <> resolved_type;
  DELETE FROM public.zoe_search_index_queue
    WHERE entity_id = NEW.id
      AND entity_type IN ('post', 'loop_video', 'image', 'quote')
      AND entity_type <> resolved_type;
  PERFORM public.enqueue_zoe_search_entity(resolved_type, NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_post_for_zoe_search() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_post_for_zoe_search() TO service_role;

CREATE OR REPLACE FUNCTION public.queue_zoe_chat_for_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = 'chat' AND entity_id = OLD.id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = 'chat' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.enqueue_zoe_search_entity('chat', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_zoe_chat_for_search() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_zoe_chat_for_search() TO service_role;
DROP TRIGGER IF EXISTS queue_zoe_chats_for_search ON public.zoe_infinity_messages;
CREATE TRIGGER queue_zoe_chats_for_search
AFTER INSERT OR UPDATE OF content, media_url, media_type, metadata OR DELETE
ON public.zoe_infinity_messages
FOR EACH ROW EXECUTE FUNCTION public.queue_zoe_chat_for_search();

CREATE OR REPLACE FUNCTION public.queue_mmora_memory_for_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = 'dhf_node' AND entity_id = OLD.id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = 'dhf_node' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.enqueue_zoe_search_entity('dhf_node', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_mmora_memory_for_search() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_mmora_memory_for_search() TO service_role;
DROP TRIGGER IF EXISTS queue_mmora_memories_for_search ON public.mmora_memories;
CREATE TRIGGER queue_mmora_memories_for_search
AFTER INSERT OR UPDATE OF content, type, emotion_tag OR DELETE
ON public.mmora_memories
FOR EACH ROW EXECUTE FUNCTION public.queue_mmora_memory_for_search();