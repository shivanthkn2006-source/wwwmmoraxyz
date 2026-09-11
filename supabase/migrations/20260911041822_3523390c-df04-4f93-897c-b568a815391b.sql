-- Fix the hashing lookup in the private implementation
ALTER FUNCTION private.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb)
  SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION private.record_dhf_lineage(
  _entity_type text,
  _entity_id text DEFAULT NULL,
  _action text DEFAULT 'view',
  _content text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _ip_hash text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _route text DEFAULT NULL,
  _intent text DEFAULT NULL,
  _unhandled_intent boolean DEFAULT false,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _prev text;
  _content_hash text;
  _chain_hash text;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT chain_hash INTO _prev
  FROM public.dhf_lineage_ledger
  WHERE user_id = _uid
  ORDER BY created_at DESC
  LIMIT 1;

  _content_hash := encode(extensions.digest(coalesce(_content, ''), 'sha256'), 'hex');
  _chain_hash := encode(
    extensions.digest(coalesce(_prev, '') || _content_hash || _entity_type || coalesce(_entity_id, '') || _action || coalesce(_session_id, ''), 'sha256'),
    'hex'
  );

  INSERT INTO public.dhf_lineage_ledger (
    user_id, entity_type, entity_id, action, session_id, ip_hash, user_agent,
    route, intent, unhandled_intent, content_hash, prev_hash, chain_hash, metadata
  ) VALUES (
    _uid, _entity_type, _entity_id, _action, _session_id, _ip_hash, _user_agent,
    _route, _intent, coalesce(_unhandled_intent, false), _content_hash, _prev, _chain_hash,
    coalesce(_metadata, '{}'::jsonb)
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

-- Restore the public entry point as a plain (non-privileged) wrapper
DROP FUNCTION IF EXISTS public.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb);

CREATE FUNCTION public.record_dhf_lineage(
  _entity_type text,
  _entity_id text DEFAULT NULL,
  _action text DEFAULT 'view',
  _content text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _ip_hash text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _route text DEFAULT NULL,
  _intent text DEFAULT NULL,
  _unhandled_intent boolean DEFAULT false,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.record_dhf_lineage(
    _entity_type, _entity_id, _action, _content, _session_id, _ip_hash, _user_agent,
    _route, _intent, _unhandled_intent, _metadata
  );
$$;

REVOKE EXECUTE ON FUNCTION public.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb) TO authenticated, service_role;