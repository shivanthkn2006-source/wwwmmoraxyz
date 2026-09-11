ALTER TABLE public.zoe_search_index_queue
  DROP CONSTRAINT IF EXISTS zoe_search_index_queue_entity_type_check;

ALTER TABLE public.zoe_search_index_queue
  ADD CONSTRAINT zoe_search_index_queue_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'post','loop_video','image','quote','profile','chat','dhf_node','dhf_post',
    'dhf_video','growth_card','astro_prediction','wisdom_goal','direct_message',
    'post_comment','visual_memory','important_date','post_attachment','life_fact'
  ]));

DROP TRIGGER IF EXISTS zoe_index_important_dates ON public.important_dates;
CREATE TRIGGER zoe_index_important_dates
AFTER INSERT OR UPDATE OR DELETE ON public.important_dates
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('important_date');

DROP TRIGGER IF EXISTS zoe_index_post_attachments ON public.post_attachments;
CREATE TRIGGER zoe_index_post_attachments
AFTER INSERT OR UPDATE OR DELETE ON public.post_attachments
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('post_attachment');

DROP TRIGGER IF EXISTS zoe_index_life_context ON public.zoe_life_context;
CREATE TRIGGER zoe_index_life_context
AFTER INSERT OR UPDATE OR DELETE ON public.zoe_life_context
FOR EACH ROW EXECUTE FUNCTION public.queue_generic_for_zoe_search('life_fact');

INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id)
SELECT 'important_date', id, user_id FROM public.important_dates ON CONFLICT DO NOTHING;

INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id)
SELECT 'post_attachment', id, user_id FROM public.post_attachments ON CONFLICT DO NOTHING;

INSERT INTO public.zoe_search_index_queue (entity_type, entity_id, owner_id)
SELECT 'life_fact', id, user_id FROM public.zoe_life_context ON CONFLICT DO NOTHING;