-- 1. Sovereign identity
CREATE OR REPLACE FUNCTION public.sovereign_admin_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT '43f3a0d9-c2ec-4166-9c18-c81bc9e0a7b0'::uuid $$;

CREATE OR REPLACE FUNCTION public.is_sovereign_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT check_user_id IS NOT NULL
     AND check_user_id = public.sovereign_admin_id()
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = check_user_id AND role::text = 'admin'
     );
$$;

-- root admin now means sovereign only
CREATE OR REPLACE FUNCTION public.is_root_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT public.is_sovereign_admin(check_user_id) $$;

-- 2. Ensure sovereign holds admin, and strip any other admin rows
INSERT INTO public.user_roles (user_id, role)
SELECT public.sovereign_admin_id(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = public.sovereign_admin_id() AND role::text = 'admin'
);

DELETE FROM public.user_roles
WHERE role::text = 'admin'
  AND user_id <> public.sovereign_admin_id();

-- 3. Hard guard: only sovereign may hold admin; sovereign admin is undeletable
CREATE OR REPLACE FUNCTION public.enforce_sovereign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.role::text = 'admin' AND NEW.user_id <> public.sovereign_admin_id() THEN
      RAISE EXCEPTION 'admin role is reserved for the sovereign administrator';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role::text = 'admin' AND OLD.user_id = public.sovereign_admin_id() THEN
      RAISE EXCEPTION 'sovereign administrator role cannot be revoked';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sovereign_admin_trg ON public.user_roles;
CREATE TRIGGER enforce_sovereign_admin_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_sovereign_admin();

-- 4. Black-box access log (append only)
CREATE TABLE IF NOT EXISTS public.sovereign_vault_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  verdict text NOT NULL CHECK (verdict IN ('granted','denied','revoked','challenge')),
  reason text,
  tunnel_active boolean NOT NULL DEFAULT false,
  tunnel_fingerprint text,
  device_fingerprint text,
  user_agent text,
  ip_address text,
  route text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sovereign_vault_access_log TO authenticated;
GRANT ALL ON public.sovereign_vault_access_log TO service_role;
ALTER TABLE public.sovereign_vault_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sovereign reads vault log" ON public.sovereign_vault_access_log;
CREATE POLICY "sovereign reads vault log" ON public.sovereign_vault_access_log
FOR SELECT TO authenticated
USING (public.is_sovereign_admin(auth.uid()));

DROP POLICY IF EXISTS "authenticated append vault log" ON public.sovereign_vault_access_log;
CREATE POLICY "authenticated append vault log" ON public.sovereign_vault_access_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.block_vault_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'sovereign vault access log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS block_vault_log_mutation_trg ON public.sovereign_vault_access_log;
CREATE TRIGGER block_vault_log_mutation_trg
BEFORE UPDATE OR DELETE ON public.sovereign_vault_access_log
FOR EACH ROW EXECUTE FUNCTION public.block_vault_log_mutation();

CREATE INDEX IF NOT EXISTS sovereign_vault_access_log_created_idx
  ON public.sovereign_vault_access_log (created_at DESC);

-- 5. Encrypted tunnel (VPN) sessions
CREATE TABLE IF NOT EXISTS public.sovereign_vault_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tunnel_fingerprint text NOT NULL,
  device_fingerprint text,
  user_agent text,
  cipher text NOT NULL DEFAULT 'AES-256-GCM',
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sovereign_vault_sessions TO authenticated;
GRANT ALL ON public.sovereign_vault_sessions TO service_role;
ALTER TABLE public.sovereign_vault_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sovereign manages own tunnel sessions" ON public.sovereign_vault_sessions;
CREATE POLICY "sovereign manages own tunnel sessions" ON public.sovereign_vault_sessions
FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.is_sovereign_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_sovereign_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_sovereign_vault_sessions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_sovereign_vault_sessions_trg ON public.sovereign_vault_sessions;
CREATE TRIGGER touch_sovereign_vault_sessions_trg
BEFORE UPDATE ON public.sovereign_vault_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_sovereign_vault_sessions();

CREATE INDEX IF NOT EXISTS sovereign_vault_sessions_user_idx
  ON public.sovereign_vault_sessions (user_id, created_at DESC);