CREATE TABLE public.dhf_lineage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  session_id text,
  ip_hash text,
  user_agent text,
  route text,
  intent text,
  unhandled_intent boolean NOT NULL DEFAULT false,
  content_hash text NOT NULL,
  prev_hash text,
  chain_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dhf_lineage_ledger TO authenticated;
GRANT ALL ON public.dhf_lineage_ledger TO service_role;

ALTER TABLE public.dhf_lineage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lineage"
  ON public.dhf_lineage_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users append own lineage"
  ON public.dhf_lineage_ledger FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dhf_lineage_user_time ON public.dhf_lineage_ledger (user_id, created_at DESC);
CREATE INDEX idx_dhf_lineage_entity ON public.dhf_lineage_ledger (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.block_dhf_lineage_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'dhf_lineage_ledger is append-only';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.block_dhf_lineage_mutation() FROM PUBLIC;

CREATE TRIGGER dhf_lineage_append_only
  BEFORE UPDATE OR DELETE ON public.dhf_lineage_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_dhf_lineage_mutation();

CREATE OR REPLACE FUNCTION public.record_dhf_lineage(
  _entity_type text,
  _entity_id text,
  _action text,
  _content text,
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
SET search_path = public
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

  _content_hash := encode(digest(coalesce(_content, ''), 'sha256'), 'hex');
  _chain_hash := encode(
    digest(coalesce(_prev, '') || _content_hash || _entity_type || coalesce(_entity_id, '') || _action || coalesce(_session_id, ''), 'sha256'),
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

REVOKE EXECUTE ON FUNCTION public.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_dhf_lineage(text, text, text, text, text, text, text, text, text, boolean, jsonb) TO authenticated, service_role;