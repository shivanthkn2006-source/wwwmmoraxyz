-- 1. Points can only change through the server
CREATE OR REPLACE FUNCTION public.profiles_guard_immutable_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role'
     OR current_setting('app.points_award', true) = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  IF to_jsonb(OLD) ? 'tenant_id' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('tenant_id', to_jsonb(OLD)->'tenant_id'));
  END IF;
  -- Members may spend points but never raise them or change their tier.
  IF to_jsonb(OLD) ? 'total_points' AND COALESCE(NEW.total_points,0) > COALESCE(OLD.total_points,0) THEN
    NEW.total_points := OLD.total_points;
  END IF;
  IF to_jsonb(OLD) ? 'current_tier' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('current_tier', to_jsonb(OLD)->'current_tier'));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_challenge_reward(p_user_challenge_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.user_challenges; v_points int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  SELECT * INTO v_row FROM public.user_challenges WHERE id = p_user_challenge_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found'; END IF;
  IF v_row.reward_claimed THEN RETURN 0; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RAISE EXCEPTION 'challenge expired'; END IF;
  SELECT COALESCE(reward_points,0) INTO v_points FROM public.badge_challenges
   WHERE challenge_id::text = v_row.challenge_id::text OR id::text = v_row.challenge_id::text LIMIT 1;
  v_points := COALESCE(v_points,0);
  UPDATE public.user_challenges SET is_completed = true, completed_at = now(), reward_claimed = true WHERE id = v_row.id;
  PERFORM set_config('app.points_award', 'on', true);
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + v_points WHERE user_id = v_uid;
  PERFORM set_config('app.points_award', 'off', true);
  RETURN v_points;
END; $$;
REVOKE ALL ON FUNCTION public.claim_challenge_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_challenge_reward(uuid) TO authenticated;

-- 2. Private reads
DROP POLICY IF EXISTS "members can read dispatch runs" ON public.astro_dispatch_runs;
CREATE POLICY "Admin reads dispatch runs" ON public.astro_dispatch_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users can view brand deals" ON public.brand_deals;
CREATE POLICY "Members view current brand deals" ON public.brand_deals FOR SELECT TO authenticated
  USING ((valid_until IS NULL OR valid_until > now()) AND (valid_from IS NULL OR valid_from <= now())
         OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.friendships
  WHERE (user1_id = _a AND user2_id = _b) OR (user1_id = _b AND user2_id = _a)) $$;
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Signed-in members can read music listens" ON public.music_listens;
CREATE POLICY "Own or friends music listens" ON public.music_listens FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Members read music taste profiles" ON public.music_profiles;
CREATE POLICY "Own or friends music profiles" ON public.music_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Signed-in members can read music reactions" ON public.music_reactions;
CREATE POLICY "Own or friends music reactions" ON public.music_reactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;
CREATE POLICY "Own, friends or post-author likes" ON public.post_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id)
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id AND p.user_id = auth.uid()));