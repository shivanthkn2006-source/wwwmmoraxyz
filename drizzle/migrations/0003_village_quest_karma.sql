CREATE OR REPLACE FUNCTION public.claim_vr_quest_reward(p_quest_id text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE amt integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  amt := CASE p_quest_id WHEN 'relic_hunter' THEN 50 WHEN 'memory_keeper' THEN 75 WHEN 'rare_eye' THEN 100 WHEN 'treasure_seeker' THEN 100
    WHEN 'village_map' THEN 50 WHEN 'church_medallion' THEN 100 WHEN 'lords_crest' THEN 150 ELSE 0 END;
  IF amt = 0 THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_quest_progress WHERE user_id = uid AND quest_id = p_quest_id AND completed_at IS NOT NULL) THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM karma_ledger WHERE user_id = uid AND reason = 'vr_quest_reward' AND ref = p_quest_id) THEN RETURN 0; END IF;
  RETURN karma_award_internal(uid, amt, 'vr_quest_reward', p_quest_id, 400);
END $function$;