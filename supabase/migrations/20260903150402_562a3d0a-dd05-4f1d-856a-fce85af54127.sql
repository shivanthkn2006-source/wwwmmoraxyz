CREATE OR REPLACE FUNCTION public.enqueue_zoe_search_entity(p_entity_type text, p_entity_id uuid, p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity_type NOT IN (
    'post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node',
    'dhf_post', 'dhf_video', 'growth_card', 'astro_prediction', 'wisdom_goal'
  ) THEN
    RAISE EXCEPTION 'Unsupported search entity type';
  END IF;

  INSERT INTO public.zoe_search_index_queue (
    entity_type, entity_id, owner_id, status, attempts, available_at, last_error, updated_at
  ) VALUES (
    p_entity_type, p_entity_id, p_owner_id, 'pending', 0, now(), NULL, now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    status = 'pending',
    attempts = 0,
    available_at = now(),
    last_error = NULL,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_generic_for_zoe_search()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_owner uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = v_type AND entity_id = OLD.id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = v_type AND entity_id = OLD.id;
    RETURN OLD;
  END IF;

  BEGIN
    EXECUTE format('SELECT ($1).%I::uuid', 'user_id') INTO v_owner USING NEW;
  EXCEPTION WHEN OTHERS THEN
    v_owner := NULL;
  END;

  PERFORM public.enqueue_zoe_search_entity(v_type, NEW.id, v_owner);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zoe_index_dhf_daily_posts ON public.dhf_daily_posts;
CREATE TRIGGER zoe_index_dhf_daily_posts
AFTER INSERT OR UPDATE OR DELETE ON public.dhf_daily_posts
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('dhf_post');

DROP TRIGGER IF EXISTS zoe_index_dhf_videos ON public.dhf_videos;
CREATE TRIGGER zoe_index_dhf_videos
AFTER INSERT OR UPDATE OR DELETE ON public.dhf_videos
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('dhf_video');

DROP TRIGGER IF EXISTS zoe_index_growth_feed_items ON public.growth_feed_items;
CREATE TRIGGER zoe_index_growth_feed_items
AFTER INSERT OR UPDATE OR DELETE ON public.growth_feed_items
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('growth_card');

DROP TRIGGER IF EXISTS zoe_index_astro_predictions ON public.astro_predictions;
CREATE TRIGGER zoe_index_astro_predictions
AFTER INSERT OR UPDATE OR DELETE ON public.astro_predictions
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('astro_prediction');

DROP TRIGGER IF EXISTS zoe_index_wisdom_macro_goals ON public.wisdom_macro_goals;
CREATE TRIGGER zoe_index_wisdom_macro_goals
AFTER INSERT OR UPDATE OR DELETE ON public.wisdom_macro_goals
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('wisdom_goal');