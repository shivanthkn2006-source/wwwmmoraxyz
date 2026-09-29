CREATE TABLE public.memory_tamper_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_owner uuid,
  attempted_by uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memory_tamper_log TO authenticated;
GRANT ALL ON public.memory_tamper_log TO service_role;
ALTER TABLE public.memory_tamper_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read tamper log" ON public.memory_tamper_log FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION private.guard_memory_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR caller IS NULL AND auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    INSERT INTO public.memory_tamper_log(table_name,row_owner,attempted_by,action) VALUES (TG_TABLE_NAME, OLD.user_id, caller, 'owner_change');
    RAISE EXCEPTION 'Memory ownership cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' AND (caller IS NULL OR NEW.user_id IS DISTINCT FROM caller) THEN
    INSERT INTO public.memory_tamper_log(table_name,row_owner,attempted_by,action) VALUES (TG_TABLE_NAME, NEW.user_id, caller, 'foreign_insert');
    RAISE EXCEPTION 'Memories can only be written by their owner' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cortical_stack_memories','dhf_consciousness_memory','dhf_soul_codex','dhf_phoenix_profile','dhf_relationship_matrix','dhf_learning_history','legacy_memories','mmora_memories','zoe_memory','zoe_contextual_memory','zoe_genesis_memory','zoe_relationship_memory','zoe_sovereign_memory','zoe_frequent_answers','zoe_voice_traits','zoe_vision_journal','zoe_life_reports','zoe_personalization','zoe_life_context']
  LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS guard_memory_owner ON public.%I', t);
      EXECUTE format('CREATE TRIGGER guard_memory_owner BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.guard_memory_owner()', t);
    END IF;
  END LOOP;
END $$;

CREATE TABLE public.account_recovery_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_recovery_codes TO authenticated;
GRANT ALL ON public.account_recovery_codes TO service_role;
ALTER TABLE public.account_recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see own recovery status" ON public.account_recovery_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);