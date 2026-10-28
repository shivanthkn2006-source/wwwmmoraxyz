-- PENDING / UNAPPLIED. Do not apply until Marc approves budget values.
-- Atomic reserve-before-inference ledger. Amounts are USD (provider billing currency);
-- local-currency views (INR, SGD, ...) are display-only.

CREATE TABLE public.ai_budget_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  reserved_usd numeric(12,6) NOT NULL CHECK (reserved_usd >= 0),
  actual_usd numeric(12,6),
  state text NOT NULL DEFAULT 'held' CHECK (state IN ('held','settled','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_budget_reservations_member_day ON public.ai_budget_reservations (member_id, day);
CREATE INDEX ai_budget_reservations_day ON public.ai_budget_reservations (day);

GRANT ALL ON public.ai_budget_reservations TO service_role;
ALTER TABLE public.ai_budget_reservations ENABLE ROW LEVEL SECURITY;
-- No member/anon policies: server-only ledger.

-- Serialises all reservations for the day with one advisory lock, so concurrent
-- requests cannot both pass the remaining-budget check.
CREATE OR REPLACE FUNCTION public.reserve_ai_budget(p_member text, p_usd numeric, p_member_limit numeric, p_platform_limit numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'utc')::date; m numeric; p numeric; rid uuid;
BEGIN
  IF p_usd IS NULL OR p_usd < 0 OR p_member_limit IS NULL OR p_platform_limit IS NULL THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ai_budget:' || d::text));
  SELECT coalesce(sum(CASE WHEN state='settled' THEN actual_usd ELSE reserved_usd END),0) INTO p
    FROM ai_budget_reservations WHERE day = d AND state <> 'released';
  SELECT coalesce(sum(CASE WHEN state='settled' THEN actual_usd ELSE reserved_usd END),0) INTO m
    FROM ai_budget_reservations WHERE day = d AND member_id = p_member AND state <> 'released';
  IF m + p_usd > p_member_limit OR p + p_usd > p_platform_limit THEN RETURN NULL; END IF;
  INSERT INTO ai_budget_reservations (member_id, day, reserved_usd) VALUES (p_member, d, p_usd) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.settle_ai_budget(p_id uuid, p_actual numeric)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ai_budget_reservations SET state='settled', actual_usd = least(greatest(p_actual,0), reserved_usd), updated_at=now()
   WHERE id = p_id AND state = 'held' RETURNING true;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_budget(p_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ai_budget_reservations SET state='released', updated_at=now()
   WHERE id = p_id AND state = 'held' RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_budget(text,numeric,numeric,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_ai_budget(uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_budget(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_budget(text,numeric,numeric,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_ai_budget(uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_budget(uuid) TO service_role;
