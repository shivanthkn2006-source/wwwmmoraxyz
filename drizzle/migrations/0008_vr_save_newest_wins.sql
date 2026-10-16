CREATE OR REPLACE FUNCTION public.vr_save_games_keep_newest()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  old_at numeric := COALESCE((OLD.data->'save'->>'at')::numeric, 0);
  new_at numeric := COALESCE((NEW.data->'save'->>'at')::numeric, 0);
  old_p numeric := COALESCE((OLD.data->'pickups'->>'at')::numeric, 0);
  new_p numeric := COALESCE((NEW.data->'pickups'->>'at')::numeric, 0);
BEGIN
  IF OLD.data ? 'save' AND old_at > new_at THEN
    NEW.data := jsonb_set(NEW.data, '{save}', OLD.data->'save');
  END IF;
  IF OLD.data ? 'pickups' AND old_p > new_p AND new_p > 0 THEN
    NEW.data := jsonb_set(NEW.data, '{pickups}', OLD.data->'pickups');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vr_save_games_keep_newest ON public.vr_save_games;
CREATE TRIGGER vr_save_games_keep_newest BEFORE UPDATE ON public.vr_save_games
FOR EACH ROW EXECUTE FUNCTION public.vr_save_games_keep_newest();