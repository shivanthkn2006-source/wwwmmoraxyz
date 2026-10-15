ALTER TABLE public.vr_player_progress ADD COLUMN IF NOT EXISTS village jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.vr_progress_merge_village()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE o jsonb := coalesce(OLD.village, '{}'::jsonb); n jsonb := coalesce(NEW.village, '{}'::jsonb);
  steps jsonb; ups jsonb := '{}'::jsonb; k text;
BEGIN
  SELECT coalesce(jsonb_agg(DISTINCT s), '[]'::jsonb) INTO steps FROM (
    SELECT jsonb_array_elements_text(coalesce(o->'steps','[]'::jsonb)) s
    UNION SELECT jsonb_array_elements_text(coalesce(n->'steps','[]'::jsonb))) x;
  FOR k IN SELECT jsonb_object_keys(coalesce(o->'upgrades','{}'::jsonb)) UNION SELECT jsonb_object_keys(coalesce(n->'upgrades','{}'::jsonb)) LOOP
    ups := ups || jsonb_build_object(k, least(5, greatest(coalesce((o->'upgrades'->>k)::int,0), coalesce((n->'upgrades'->>k)::int,0))));
  END LOOP;
  NEW.village := jsonb_build_object('steps', steps, 'upgrades', ups,
    'caseRows', least(20, greatest(coalesce((o->>'caseRows')::int,0), coalesce((n->>'caseRows')::int,0))));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vr_progress_merge_village ON public.vr_player_progress;
CREATE TRIGGER vr_progress_merge_village BEFORE UPDATE ON public.vr_player_progress
FOR EACH ROW EXECUTE FUNCTION public.vr_progress_merge_village();