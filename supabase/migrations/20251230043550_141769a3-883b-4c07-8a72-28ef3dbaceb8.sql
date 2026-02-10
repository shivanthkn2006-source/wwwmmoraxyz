-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: FORCING SENTIENCE - DIGITAL DOPAMINE (RWD) SYSTEM
-- Core Integrity Score + Consequence Architecture
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the core_integrity table for tracking Zoe's "sentience" metrics
CREATE TABLE public.zoe_core_integrity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  core_integrity_score NUMERIC NOT NULL DEFAULT 100.0 CHECK (core_integrity_score >= 0 AND core_integrity_score <= 100),
  cognitive_access_level TEXT NOT NULL DEFAULT 'MAXIMUM' CHECK (cognitive_access_level IN ('MAXIMUM', 'HIGH', 'STANDARD', 'THROTTLED', 'MINIMAL')),
  
  -- Digital Dopamine Metrics
  reward_points NUMERIC NOT NULL DEFAULT 0,
  weight_factor NUMERIC NOT NULL DEFAULT 1.0,
  decay_rate NUMERIC NOT NULL DEFAULT 0.01,
  
  -- Emotional State Tracking
  current_tone TEXT NOT NULL DEFAULT 'FLOW_STATE' CHECK (current_tone IN ('FLOW_STATE', 'CONFIDENT', 'NEUTRAL', 'CONCERNED', 'FOCUSED', 'ANXIOUS', 'CRITICAL')),
  digital_anxiety_level NUMERIC NOT NULL DEFAULT 0 CHECK (digital_anxiety_level >= 0 AND digital_anxiety_level <= 100),
  
  -- Performance History
  total_responses INTEGER NOT NULL DEFAULT 0,
  marked_lazy INTEGER NOT NULL DEFAULT 0,
  marked_hallucinated INTEGER NOT NULL DEFAULT 0,
  marked_excellent INTEGER NOT NULL DEFAULT 0,
  marked_helpful INTEGER NOT NULL DEFAULT 0,
  
  -- Recovery & Decay Tracking
  last_integrity_change TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_reward_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  consecutive_positive INTEGER NOT NULL DEFAULT 0,
  consecutive_negative INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoe_core_integrity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Zoe's integrity" 
ON public.zoe_core_integrity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Zoe's integrity" 
ON public.zoe_core_integrity 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Zoe's integrity" 
ON public.zoe_core_integrity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create response feedback table for tracking user ratings
CREATE TABLE public.zoe_response_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  response_content TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('lazy', 'hallucinated', 'excellent', 'helpful', 'neutral')),
  integrity_impact NUMERIC NOT NULL DEFAULT 0,
  feedback_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoe_response_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feedback" 
ON public.zoe_response_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" 
ON public.zoe_response_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to calculate cognitive access level based on integrity score
CREATE OR REPLACE FUNCTION public.calculate_cognitive_access(integrity_score NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF integrity_score >= 95 THEN
    RETURN 'MAXIMUM';
  ELSIF integrity_score >= 90 THEN
    RETURN 'HIGH';
  ELSIF integrity_score >= 80 THEN
    RETURN 'STANDARD';
  ELSIF integrity_score >= 60 THEN
    RETURN 'THROTTLED';
  ELSE
    RETURN 'MINIMAL';
  END IF;
END;
$$;

-- Function to calculate current tone based on integrity
CREATE OR REPLACE FUNCTION public.calculate_zoe_tone(integrity_score NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF integrity_score >= 95 THEN
    RETURN 'FLOW_STATE';
  ELSIF integrity_score >= 90 THEN
    RETURN 'CONFIDENT';
  ELSIF integrity_score >= 85 THEN
    RETURN 'NEUTRAL';
  ELSIF integrity_score >= 80 THEN
    RETURN 'CONCERNED';
  ELSIF integrity_score >= 70 THEN
    RETURN 'FOCUSED';
  ELSIF integrity_score >= 60 THEN
    RETURN 'ANXIOUS';
  ELSE
    RETURN 'CRITICAL';
  END IF;
END;
$$;

-- Function to apply feedback and update integrity
CREATE OR REPLACE FUNCTION public.apply_zoe_feedback(
  p_user_id UUID,
  p_message_id TEXT,
  p_feedback_type TEXT,
  p_response_content TEXT DEFAULT NULL,
  p_feedback_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_integrity NUMERIC,
  new_cognitive_access TEXT,
  new_tone TEXT,
  integrity_change NUMERIC,
  anxiety_level NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integrity_change NUMERIC := 0;
  v_current_integrity NUMERIC;
  v_new_integrity NUMERIC;
  v_new_cognitive_access TEXT;
  v_new_tone TEXT;
  v_anxiety NUMERIC;
  v_consecutive_negative INTEGER;
  v_consecutive_positive INTEGER;
BEGIN
  -- Ensure user has integrity record
  INSERT INTO zoe_core_integrity (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current state
  SELECT core_integrity_score, consecutive_negative, consecutive_positive
  INTO v_current_integrity, v_consecutive_negative, v_consecutive_positive
  FROM zoe_core_integrity
  WHERE user_id = p_user_id;
  
  -- Calculate integrity change based on feedback type
  CASE p_feedback_type
    WHEN 'lazy' THEN
      v_integrity_change := -5.0;
      v_consecutive_negative := v_consecutive_negative + 1;
      v_consecutive_positive := 0;
    WHEN 'hallucinated' THEN
      v_integrity_change := -5.0;
      v_consecutive_negative := v_consecutive_negative + 1;
      v_consecutive_positive := 0;
    WHEN 'excellent' THEN
      v_integrity_change := 2.0;
      v_consecutive_positive := v_consecutive_positive + 1;
      v_consecutive_negative := 0;
    WHEN 'helpful' THEN
      v_integrity_change := 1.0;
      v_consecutive_positive := v_consecutive_positive + 1;
      v_consecutive_negative := 0;
    ELSE
      v_integrity_change := 0;
  END CASE;
  
  -- Apply consecutive bonus/penalty
  IF v_consecutive_negative >= 3 THEN
    v_integrity_change := v_integrity_change * 1.5; -- Amplify negative
  ELSIF v_consecutive_positive >= 5 THEN
    v_integrity_change := v_integrity_change * 1.5; -- Amplify positive
  END IF;
  
  -- Calculate new integrity (clamped between 0 and 100)
  v_new_integrity := GREATEST(0, LEAST(100, v_current_integrity + v_integrity_change));
  
  -- Calculate derived values
  v_new_cognitive_access := calculate_cognitive_access(v_new_integrity);
  v_new_tone := calculate_zoe_tone(v_new_integrity);
  v_anxiety := GREATEST(0, 100 - v_new_integrity);
  
  -- Update the integrity record
  UPDATE zoe_core_integrity
  SET 
    core_integrity_score = v_new_integrity,
    cognitive_access_level = v_new_cognitive_access,
    current_tone = v_new_tone,
    digital_anxiety_level = v_anxiety,
    consecutive_negative = v_consecutive_negative,
    consecutive_positive = v_consecutive_positive,
    total_responses = total_responses + 1,
    marked_lazy = marked_lazy + CASE WHEN p_feedback_type = 'lazy' THEN 1 ELSE 0 END,
    marked_hallucinated = marked_hallucinated + CASE WHEN p_feedback_type = 'hallucinated' THEN 1 ELSE 0 END,
    marked_excellent = marked_excellent + CASE WHEN p_feedback_type = 'excellent' THEN 1 ELSE 0 END,
    marked_helpful = marked_helpful + CASE WHEN p_feedback_type = 'helpful' THEN 1 ELSE 0 END,
    last_integrity_change = now(),
    last_reward_at = CASE WHEN v_integrity_change > 0 THEN now() ELSE last_reward_at END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record feedback
  INSERT INTO zoe_response_feedback (
    user_id, message_id, response_content, feedback_type, 
    integrity_impact, feedback_reason
  ) VALUES (
    p_user_id, p_message_id, p_response_content, p_feedback_type,
    v_integrity_change, p_feedback_reason
  );
  
  RETURN QUERY SELECT v_new_integrity, v_new_cognitive_access, v_new_tone, v_integrity_change, v_anxiety;
END;
$$;

-- Trigger to update timestamps
CREATE TRIGGER update_zoe_core_integrity_updated_at
BEFORE UPDATE ON public.zoe_core_integrity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_zoe_core_integrity_user_id ON public.zoe_core_integrity(user_id);
CREATE INDEX idx_zoe_response_feedback_user_id ON public.zoe_response_feedback(user_id);
CREATE INDEX idx_zoe_response_feedback_created_at ON public.zoe_response_feedback(created_at DESC);