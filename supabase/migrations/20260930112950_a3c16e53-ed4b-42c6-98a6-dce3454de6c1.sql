CREATE TABLE public.karma_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX karma_ledger_once ON public.karma_ledger(user_id, reason, ref) WHERE ref IS NOT NULL;
CREATE INDEX karma_ledger_user_day ON public.karma_ledger(user_id, reason, created_at);
GRANT SELECT ON public.karma_ledger TO authenticated;
GRANT ALL ON public.karma_ledger TO service_role;
ALTER TABLE public.karma_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own karma ledger" ON public.karma_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.vr_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vr_catalog TO authenticated;
GRANT ALL ON public.vr_catalog TO service_role;
ALTER TABLE public.vr_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read VR catalog" ON public.vr_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage VR catalog" ON public.vr_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.vr_catalog(id,name,category,price) VALUES
 ('kfc_meal','KFC bucket meal','food',30),
 ('mcd_meal','McDonald''s meal','food',25),
 ('coffee','Cafe coffee','food',10),
 ('metro_ticket','Metro train ticket','transport',15),
 ('heritage_train','Scenic heritage train ride','transport',40),
 ('bus_ticket','City bus ticket','transport',8),
 ('fuel_full','Fuel pump - full tank','fuel',35),
 ('bike_rental','Motorcycle ride (1 day)','vehicle',60),
 ('car_rental','Car rental (1 day)','vehicle',90),
 ('f1_lap','F1 circuit laps','vehicle',120),
 ('theme_park','Theme park day pass','leisure',80),
 ('zoo_pass','Animal zoo pass','leisure',30),
 ('everest_climb','Mountain climbing expedition','adventure',150),
 ('cycling_trail','Cycling trail pass','adventure',20);

CREATE TABLE public.vr_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL REFERENCES public.vr_catalog(id),
  price integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vr_purchases TO authenticated;
GRANT ALL ON public.vr_purchases TO service_role;
ALTER TABLE public.vr_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own VR purchases" ON public.vr_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Internal: award karma with per-reason daily cap. Not callable by members.
CREATE OR REPLACE FUNCTION public.karma_award_internal(_uid uuid, _delta integer, _reason text, _ref text, _daily_cap integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today_sum integer; grant_amt integer; ins integer;
BEGIN
  IF _uid IS NULL OR _delta <= 0 THEN RETURN 0; END IF;
  SELECT COALESCE(sum(delta),0) INTO today_sum FROM karma_ledger
   WHERE user_id=_uid AND reason=_reason AND delta>0 AND created_at >= date_trunc('day', now());
  grant_amt := LEAST(_delta, GREATEST(_daily_cap - today_sum, 0));
  IF grant_amt <= 0 THEN RETURN 0; END IF;
  INSERT INTO karma_ledger(user_id,delta,reason,ref) VALUES (_uid,grant_amt,_reason,_ref) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS ins = ROW_COUNT;
  IF ins = 0 THEN RETURN 0; END IF;
  INSERT INTO exodus_players(user_id, player_name, resonance_points)
    SELECT _uid, COALESCE((SELECT NULLIF(display_name,'') FROM profiles WHERE id=_uid LIMIT 1),'Member'), grant_amt
    WHERE NOT EXISTS (SELECT 1 FROM exodus_players WHERE user_id=_uid);
  IF NOT FOUND THEN
    UPDATE exodus_players SET resonance_points = COALESCE(resonance_points,0) + grant_amt, last_activity_at = now() WHERE user_id=_uid;
  END IF;
  RETURN grant_amt;
END $$;
REVOKE ALL ON FUNCTION public.karma_award_internal(uuid,integer,text,text,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.karma_on_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  PERFORM karma_award_internal(NEW.user_id, 1, 'like_given', NEW.id::text, 50);
  SELECT user_id INTO author FROM posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    PERFORM karma_award_internal(author, 2, 'like_received', NEW.id::text, 200);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER karma_on_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.karma_on_like();

CREATE OR REPLACE FUNCTION public.karma_on_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  PERFORM karma_award_internal(NEW.user_id, 1, 'rating_given', NEW.id::text, 50);
  SELECT user_id INTO author FROM posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    PERFORM karma_award_internal(author, GREATEST(LEAST(COALESCE(NEW.rating,1)::int,5),1), 'rating_received', NEW.id::text, 250);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER karma_on_rating AFTER INSERT ON public.post_ratings FOR EACH ROW EXECUTE FUNCTION public.karma_on_rating();

CREATE OR REPLACE FUNCTION public.karma_on_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_id IS NOT NULL AND NEW.receiver_id IS NOT NULL AND NEW.sender_id <> NEW.receiver_id THEN
    PERFORM karma_award_internal(NEW.sender_id, 1, 'talking', NEW.id::text, 30);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER karma_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.karma_on_message();

-- Member-callable: earn capped karma for activity. Amounts & caps are fixed server-side.
CREATE OR REPLACE FUNCTION public.earn_activity_karma(p_kind text, p_units integer DEFAULT 1)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE per integer; cap integer; u integer := LEAST(GREATEST(COALESCE(p_units,1),1),60);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  CASE p_kind
    WHEN 'time_spent' THEN per:=1; cap:=60;   -- 1 per active minute
    WHEN 'feature_use' THEN per:=1; cap:=20;
    WHEN 'walking' THEN per:=2; cap:=40;
    WHEN 'running' THEN per:=3; cap:=60;
    WHEN 'cycling' THEN per:=3; cap:=60;
    WHEN 'workout' THEN per:=3; cap:=60;
    WHEN 'riding' THEN per:=2; cap:=40;
    WHEN 'vr_talk' THEN per:=1; cap:=30;
    ELSE RAISE EXCEPTION 'unknown activity';
  END CASE;
  RETURN karma_award_internal(auth.uid(), per*u, p_kind, NULL, cap);
END $$;
REVOKE ALL ON FUNCTION public.earn_activity_karma(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.earn_activity_karma(text,integer) TO authenticated;

-- Member-callable: spend karma on a VR item.
CREATE OR REPLACE FUNCTION public.spend_karma_vr(p_item text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cost integer; bal integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  SELECT price INTO cost FROM vr_catalog WHERE id=p_item AND active;
  IF cost IS NULL THEN RAISE EXCEPTION 'item not found'; END IF;
  SELECT resonance_points INTO bal FROM exodus_players WHERE user_id=uid AND COALESCE(banned,false)=false FOR UPDATE;
  IF COALESCE(bal,0) < cost THEN RAISE EXCEPTION 'not enough karma'; END IF;
  UPDATE exodus_players SET resonance_points = resonance_points - cost, last_activity_at=now() WHERE user_id=uid;
  INSERT INTO karma_ledger(user_id,delta,reason) VALUES (uid,-cost,'vr_'||p_item);
  INSERT INTO vr_purchases(user_id,item_id,price) VALUES (uid,p_item,cost);
  RETURN bal - cost;
END $$;
REVOKE ALL ON FUNCTION public.spend_karma_vr(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_karma_vr(text) TO authenticated;

-- Member-callable: give karma to a friend.
CREATE OR REPLACE FUNCTION public.gift_karma(p_to uuid, p_amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  IF p_to IS NULL OR p_to = uid OR p_amount IS NULL OR p_amount < 1 OR p_amount > 1000 THEN RAISE EXCEPTION 'invalid gift'; END IF;
  IF NOT are_friends(uid, p_to) THEN RAISE EXCEPTION 'can only gift friends'; END IF;
  SELECT resonance_points INTO bal FROM exodus_players WHERE user_id=uid AND COALESCE(banned,false)=false FOR UPDATE;
  IF COALESCE(bal,0) < p_amount THEN RAISE EXCEPTION 'not enough karma'; END IF;
  UPDATE exodus_players SET resonance_points = resonance_points - p_amount WHERE user_id=uid;
  INSERT INTO karma_ledger(user_id,delta,reason,ref) VALUES (uid,-p_amount,'gift_sent',p_to::text);
  INSERT INTO exodus_players(user_id, player_name, resonance_points)
    SELECT p_to, COALESCE((SELECT NULLIF(display_name,'') FROM profiles WHERE id=p_to LIMIT 1),'Member'), p_amount
    WHERE NOT EXISTS (SELECT 1 FROM exodus_players WHERE user_id=p_to);
  IF NOT FOUND THEN UPDATE exodus_players SET resonance_points = COALESCE(resonance_points,0)+p_amount WHERE user_id=p_to; END IF;
  INSERT INTO karma_ledger(user_id,delta,reason) VALUES (p_to,p_amount,'gift_received');
  RETURN bal - p_amount;
END $$;
REVOKE ALL ON FUNCTION public.gift_karma(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gift_karma(uuid,integer) TO authenticated;