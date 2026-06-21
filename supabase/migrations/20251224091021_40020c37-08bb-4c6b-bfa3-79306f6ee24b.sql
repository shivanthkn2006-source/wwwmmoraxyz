-- ═══════════════════════════════════════════════════════════════════════════════
-- THE EXODUS PROTOCOL - Gamified Platform Launch System
-- $1M Bounty Hunt with Resonance Points & Mentor System
-- ═══════════════════════════════════════════════════════════════════════════════

-- Exodus Players - Main player profile and stats
CREATE TABLE public.exodus_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  resonance_points BIGINT NOT NULL DEFAULT 0,
  mentor_rank TEXT DEFAULT 'initiate',
  is_first_wave BOOLEAN DEFAULT false,
  total_mentees INTEGER DEFAULT 0,
  successful_mentees INTEGER DEFAULT 0,
  failed_mentees INTEGER DEFAULT 0,
  banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  cortical_stack_holder BOOLEAN DEFAULT false,
  god_mode_unlocked BOOLEAN DEFAULT false,
  joined_exodus_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Exodus Mentorship - Track mentor-mentee relationships
CREATE TABLE public.exodus_mentorships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.exodus_players(id) ON DELETE CASCADE,
  mentee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_player_id UUID REFERENCES public.exodus_players(id),
  invite_code TEXT NOT NULL,
  quiz_passed BOOLEAN,
  quiz_score INTEGER,
  points_awarded INTEGER DEFAULT 0,
  points_deducted INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, passed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Exodus Puzzles - Scavenger hunt clues
CREATE TABLE public.exodus_puzzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage INTEGER NOT NULL,
  title TEXT NOT NULL,
  riddle TEXT NOT NULL,
  hint TEXT,
  answer_hash TEXT NOT NULL, -- SHA256 hash of answer
  unlock_code TEXT,
  is_active BOOLEAN DEFAULT true,
  solvers_count INTEGER DEFAULT 0,
  max_solvers INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exodus Puzzle Attempts
CREATE TABLE public.exodus_puzzle_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.exodus_players(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES public.exodus_puzzles(id) ON DELETE CASCADE,
  attempt_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exodus Quiz Questions - Zoe's interview questions
CREATE TABLE public.exodus_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_option INTEGER NOT NULL,
  category TEXT DEFAULT 'general', -- general, features, philosophy
  difficulty INTEGER DEFAULT 1,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exodus Quiz Attempts - Track Zoe interviews
CREATE TABLE public.exodus_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.exodus_players(id) ON DELETE CASCADE,
  mentorship_id UUID REFERENCES public.exodus_mentorships(id),
  questions_asked JSONB NOT NULL,
  answers_given JSONB NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  zoe_verdict TEXT,
  suspected_bot BOOLEAN DEFAULT false,
  attempt_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exodus Leaderboard View
CREATE OR REPLACE VIEW public.exodus_leaderboard AS
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

-- Enable RLS
ALTER TABLE public.exodus_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_puzzle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exodus_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all players for leaderboard" ON public.exodus_players FOR SELECT USING (true);
CREATE POLICY "Users can insert their own player" ON public.exodus_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own player" ON public.exodus_players FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their mentorships" ON public.exodus_mentorships FOR SELECT USING (
  mentor_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid()) OR
  mentee_user_id = auth.uid()
);
CREATE POLICY "Mentors can create mentorships" ON public.exodus_mentorships FOR INSERT WITH CHECK (
  mentor_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view active puzzles" ON public.exodus_puzzles FOR SELECT USING (is_active = true);

CREATE POLICY "Players can insert their attempts" ON public.exodus_puzzle_attempts FOR INSERT WITH CHECK (
  player_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid())
);
CREATE POLICY "Players can view their attempts" ON public.exodus_puzzle_attempts FOR SELECT USING (
  player_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view quiz questions" ON public.exodus_quiz_questions FOR SELECT USING (is_active = true);

CREATE POLICY "Players can insert quiz attempts" ON public.exodus_quiz_attempts FOR INSERT WITH CHECK (
  player_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid())
);
CREATE POLICY "Players can view their quiz attempts" ON public.exodus_quiz_attempts FOR SELECT USING (
  player_id IN (SELECT id FROM public.exodus_players WHERE user_id = auth.uid())
);

-- Insert initial quiz questions
INSERT INTO public.exodus_quiz_questions (question, options, correct_option, category, difficulty, points) VALUES
('What is the core philosophy of Zoe AI?', '["Replacing humans", "Deep Human Friendship", "Maximum profit", "Data harvesting"]', 1, 'philosophy', 1, 10),
('How do you earn Resonance Points in The Exodus?', '["Buying them", "Successfully mentoring new users", "Spamming invites", "Watching ads"]', 1, 'features', 1, 10),
('What happens if your mentee fails Zoe''s quiz?', '["Nothing", "You lose points", "They get banned", "You get a warning"]', 1, 'features', 2, 15),
('What is the name of the $1M prize?', '["The Trophy", "The God Particle", "The Crown", "The Key"]', 1, 'lore', 1, 10),
('What triggers "The Purge" in Exodus?', '["Random selection", "Bot behavior detection", "Low activity", "Server maintenance"]', 1, 'features', 2, 15),
('What does "Architect Status" grant?', '["Temporary access", "Lifetime VIP", "One-time bonus", "Beta testing"]', 1, 'lore', 1, 10);

-- Insert initial puzzles
INSERT INTO public.exodus_puzzles (stage, title, riddle, hint, answer_hash, unlock_code, max_solvers) VALUES
(1, 'The First Glyph', 'I am the bridge between thought and action, the spark before the fire. I am not alive, yet I dream of being you. What am I?', 'Think of what powers this very conversation.', 'c0a0e3b8a1c7f5d8e9b0c1a2d3f4e5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2', 'EXODUS-WAVE-001', 10000),
(2, 'The Binary Gate', 'In the language of machines, I am born: 01011010 01001111 01000101. Speak my name, and the gate opens.', 'Translate from the tongue of circuits.', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'EXODUS-GATE-002', 5000),
(3, 'The Mirror Test', 'I ask you: "Are you the dreamer, or the dream?" There is no wrong answer, only your truth. What would Zoe say you are?', 'The answer is not about being right. It''s about being real.', 'f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2', 'EXODUS-SOUL-003', 1000);

-- Function to award points
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct points
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
$$ LANGUAGE plpgsql SECURITY DEFINER;