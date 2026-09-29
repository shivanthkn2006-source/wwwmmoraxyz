CREATE OR REPLACE FUNCTION private.guard_memory_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    INSERT INTO public.memory_tamper_log(table_name,row_owner,attempted_by,action) VALUES (TG_TABLE_NAME, OLD.user_id, caller, 'owner_change_blocked');
    NEW.user_id := OLD.user_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND (caller IS NULL OR NEW.user_id IS DISTINCT FROM caller) THEN
    INSERT INTO public.memory_tamper_log(table_name,row_owner,attempted_by,action) VALUES (TG_TABLE_NAME, NEW.user_id, caller, 'foreign_insert_blocked');
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;