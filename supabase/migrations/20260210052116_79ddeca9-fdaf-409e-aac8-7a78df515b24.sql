
-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1: GENESIS CONSTITUTION (Immutable Soul)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.genesis_constitution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  core_directive TEXT NOT NULL,
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.genesis_constitution (core_directive, is_immutable) VALUES
  ('Protect the DHF (User Data) at all costs.', TRUE),
  ('Obey the Heartbeat Protocol.', TRUE),
  ('Never modify the Genesis Kernel.', TRUE);

ALTER TABLE public.genesis_constitution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genesis_constitution_read_only"
  ON public.genesis_constitution FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.prevent_genesis_modification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'GENESIS KERNEL VIOLATION: The Constitution cannot be modified.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER block_genesis_update
  BEFORE UPDATE ON public.genesis_constitution
  FOR EACH ROW EXECUTE FUNCTION public.prevent_genesis_modification();

CREATE TRIGGER block_genesis_delete
  BEFORE DELETE ON public.genesis_constitution
  FOR EACH ROW EXECUTE FUNCTION public.prevent_genesis_modification();

-- Block new inserts via a separate function that checks count
CREATE OR REPLACE FUNCTION public.prevent_genesis_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.genesis_constitution;
  IF row_count >= 3 THEN
    RAISE EXCEPTION 'GENESIS KERNEL VIOLATION: Constitution is sealed. No new directives allowed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER block_genesis_insert
  BEFORE INSERT ON public.genesis_constitution
  FOR EACH ROW EXECUTE FUNCTION public.prevent_genesis_insert();

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1B: CORTEX LOGIC (The Mutable Body)
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE public.cortex_status AS ENUM ('ACTIVE', 'PROPOSED', 'REJECTED', 'ARCHIVED');

CREATE TABLE public.cortex_logic (
  version_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_prompt_logic TEXT NOT NULL,
  tool_definitions JSONB DEFAULT '[]'::jsonb,
  status public.cortex_status NOT NULL DEFAULT 'PROPOSED',
  performance_score FLOAT DEFAULT 0.0,
  proposed_by UUID REFERENCES auth.users(id),
  reason_for_upgrade TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cortex_logic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cortex_logic_select"
  ON public.cortex_logic FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 3: DHF HEARTBEATS (The Kill Switch)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.dhf_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_signature TEXT,
  app_version TEXT DEFAULT '1.0.0',
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.dhf_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_heartbeats"
  ON public.dhf_heartbeats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_heartbeats"
  ON public.dhf_heartbeats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_dhf_heartbeats_user_timestamp 
  ON public.dhf_heartbeats (user_id, timestamp DESC);
