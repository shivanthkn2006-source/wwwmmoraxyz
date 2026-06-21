-- Fix security definer view
DROP VIEW IF EXISTS public.exodus_leaderboard;

CREATE VIEW public.exodus_leaderboard WITH (security_invoker = true) AS
SELECT 
  ep.id,
  ep.user_id,
  ep.player_name,
  ep.resonance_points,
  ep.mentor_rank,
  ep.is_first_wave,
  ep.total_mentees,
  ep.successful_mentees,
  ep.cortical_stack_holder,
  ep.god_mode_unlocked,
  ep.joined_exodus_at,
  RANK() OVER (ORDER BY ep.resonance_points DESC) as global_rank,
  CASE 
    WHEN ep.resonance_points >= 1000000 THEN 'ARCHITECT'
    WHEN ep.resonance_points >= 500000 THEN 'ORACLE'
    WHEN ep.resonance_points >= 100000 THEN 'SHEPHERD'
    WHEN ep.resonance_points >= 10000 THEN 'GUIDE'
    WHEN ep.resonance_points >= 1000 THEN 'BELIEVER'
    ELSE 'INITIATE'
  END as tier
FROM public.exodus_players ep
WHERE ep.banned = false
ORDER BY ep.resonance_points DESC;

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.award_resonance_points(
  p_player_id UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'mentorship'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.exodus_players
  SET 
    resonance_points = resonance_points + p_points,
    updated_at = now()
  WHERE id = p_player_id AND banned = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.deduct_resonance_points(
  p_player_id UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'mentee_failed'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.exodus_players
  SET 
    resonance_points = GREATEST(0, resonance_points - p_points),
    failed_mentees = failed_mentees + 1,
    updated_at = now()
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;