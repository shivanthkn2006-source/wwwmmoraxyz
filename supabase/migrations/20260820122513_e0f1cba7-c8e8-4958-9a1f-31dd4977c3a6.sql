-- 1. zoe_black_box_ledger: remove "user_id IS NULL" read carve-out
DROP POLICY IF EXISTS "black_box_read_own" ON public.zoe_black_box_ledger;
DROP POLICY IF EXISTS "zoe_black_box_select_own" ON public.zoe_black_box_ledger;
CREATE POLICY "black_box_read_own" ON public.zoe_black_box_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. selfie_city_pins: require authentication for reads
DROP POLICY IF EXISTS "Anyone can view selfie pins" ON public.selfie_city_pins;
DROP POLICY IF EXISTS "Users can view all pins" ON public.selfie_city_pins;
CREATE POLICY "Signed-in users can view selfie pins" ON public.selfie_city_pins
  FOR SELECT TO authenticated
  USING (true);

-- 3. zoe_sovereign_memory: remove placeholder-uuid carve-out
DROP POLICY IF EXISTS "sovereign_memory_read_own" ON public.zoe_sovereign_memory;
CREATE POLICY "sovereign_memory_read_own" ON public.zoe_sovereign_memory
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. exodus_players: leaderboard read requires authentication
DROP POLICY IF EXISTS "Users can view all players for leaderboard" ON public.exodus_players;
CREATE POLICY "Signed-in users can view players" ON public.exodus_players
  FOR SELECT TO authenticated
  USING (true);
