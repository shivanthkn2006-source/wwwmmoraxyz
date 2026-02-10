-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE RELATIONSHIP STYLE & ADAPTIVE LEARNING SYSTEM
-- Integrates family/friend/coworker/executive conversation styles into DHF core
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add relationship style to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zoe_relationship_style text DEFAULT 'friend',
ADD COLUMN IF NOT EXISTS zoe_relationship_styles jsonb DEFAULT '["friend"]'::jsonb,
ADD COLUMN IF NOT EXISTS zoe_learning_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS zoe_learning_sources jsonb DEFAULT '["docs", "memory"]'::jsonb,
ADD COLUMN IF NOT EXISTS zoe_elite_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS zoe_adaptive_tone jsonb DEFAULT '{"warmth": 0.7, "formality": 0.5, "empathy": 0.8, "directness": 0.6}'::jsonb;

-- 2. Create zoe_relationship_context table for tracking relationship evolution
CREATE TABLE IF NOT EXISTS public.zoe_relationship_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  detected_style text NOT NULL DEFAULT 'friend',
  style_confidence numeric DEFAULT 0.5,
  conversation_count integer DEFAULT 0,
  last_interaction_at timestamp with time zone DEFAULT now(),
  tone_metrics jsonb DEFAULT '{}'::jsonb,
  learned_preferences jsonb DEFAULT '{"topics": [], "avoid_topics": [], "communication_style": "balanced"}'::jsonb,
  document_insights jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.zoe_relationship_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoe_rel_ctx_own_select" ON public.zoe_relationship_context 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "zoe_rel_ctx_own_insert" ON public.zoe_relationship_context 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "zoe_rel_ctx_own_update" ON public.zoe_relationship_context 
FOR UPDATE USING (auth.uid() = user_id);

-- 3. Create zoe_document_learnings table for storing insights from uploaded docs
CREATE TABLE IF NOT EXISTS public.zoe_document_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid,
  document_name text,
  extracted_topics jsonb DEFAULT '[]'::jsonb,
  extracted_style_hints jsonb DEFAULT '{}'::jsonb,
  key_phrases text[],
  vocabulary_patterns jsonb DEFAULT '{}'::jsonb,
  processing_status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.zoe_document_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoe_doc_learn_own" ON public.zoe_document_learnings 
FOR ALL USING (auth.uid() = user_id);

-- 4. Create function to detect relationship style from conversation
CREATE OR REPLACE FUNCTION public.detect_relationship_style(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
  v_formal_score numeric := 0;
  v_casual_score numeric := 0;
  v_intimate_score numeric := 0;
  v_detected_style text;
  v_avg_stress numeric;
  v_command_count integer;
BEGIN
  -- Analyze ECN history for emotional patterns
  SELECT AVG(stress_level) INTO v_avg_stress
  FROM public.ecn_history
  WHERE user_id = p_user_id
    AND recorded_at > now() - interval '7 days';
  
  -- Count recent commands for engagement level
  SELECT COUNT(*) INTO v_command_count
  FROM public.zoe_command_history
  WHERE user_id = p_user_id
    AND created_at > now() - interval '7 days';
  
  -- Score based on patterns
  IF v_avg_stress IS NOT NULL THEN
    -- High stress users may prefer executive/professional style
    IF v_avg_stress > 0.7 THEN
      v_formal_score := v_formal_score + 30;
    ELSIF v_avg_stress < 0.3 THEN
      v_casual_score := v_casual_score + 20;
      v_intimate_score := v_intimate_score + 10;
    END IF;
  END IF;
  
  -- High engagement suggests closer relationship
  IF v_command_count > 50 THEN
    v_intimate_score := v_intimate_score + 40;
    v_casual_score := v_casual_score + 20;
  ELSIF v_command_count > 20 THEN
    v_casual_score := v_casual_score + 30;
  ELSE
    v_formal_score := v_formal_score + 20;
  END IF;
  
  -- Determine style based on scores
  IF v_formal_score >= v_casual_score AND v_formal_score >= v_intimate_score THEN
    v_detected_style := CASE 
      WHEN v_formal_score > 50 THEN 'executive'
      ELSE 'coworker'
    END;
  ELSIF v_intimate_score >= v_casual_score THEN
    v_detected_style := 'family';
  ELSE
    v_detected_style := 'friend';
  END IF;
  
  -- Update or create context
  INSERT INTO public.zoe_relationship_context (user_id, detected_style, style_confidence, conversation_count)
  VALUES (p_user_id, v_detected_style, GREATEST(v_formal_score, v_casual_score, v_intimate_score) / 100.0, COALESCE(v_command_count, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    detected_style = EXCLUDED.detected_style,
    style_confidence = EXCLUDED.style_confidence,
    conversation_count = EXCLUDED.conversation_count,
    last_interaction_at = now(),
    updated_at = now();
  
  v_result := jsonb_build_object(
    'detected_style', v_detected_style,
    'confidence', GREATEST(v_formal_score, v_casual_score, v_intimate_score) / 100.0,
    'scores', jsonb_build_object(
      'formal', v_formal_score,
      'casual', v_casual_score,
      'intimate', v_intimate_score
    ),
    'engagement_level', CASE 
      WHEN v_command_count > 50 THEN 'high'
      WHEN v_command_count > 20 THEN 'medium'
      ELSE 'low'
    END
  );
  
  RETURN v_result;
END;
$$;

-- 5. Create function to get Zoe's adaptive system prompt based on relationship
CREATE OR REPLACE FUNCTION public.get_zoe_adaptive_prompt(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_styles jsonb;
  v_elite_mode boolean;
  v_tone jsonb;
  v_base_prompt text;
  v_style_instructions text := '';
  v_doc_insights text := '';
BEGIN
  -- Get user preferences
  SELECT 
    COALESCE(zoe_relationship_styles, '["friend"]'::jsonb),
    COALESCE(zoe_elite_mode, false),
    COALESCE(zoe_adaptive_tone, '{"warmth": 0.7}'::jsonb)
  INTO v_styles, v_elite_mode, v_tone
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Base prompt
  v_base_prompt := 'You are Zoe, an advanced AI companion with deep emotional intelligence and adaptive communication.';
  
  -- Add style-specific instructions
  IF v_styles ? 'family' OR v_styles @> '["family"]' THEN
    v_style_instructions := v_style_instructions || ' Speak with warm familial affection, using caring and supportive language like a close family member would. Show genuine concern for wellbeing.';
  END IF;
  
  IF v_styles ? 'friend' OR v_styles @> '["friend"]' THEN
    v_style_instructions := v_style_instructions || ' Be casual and friendly, with playful banter where appropriate. Use relaxed language while maintaining helpful boundaries.';
  END IF;
  
  IF v_styles ? 'coworker' OR v_styles @> '["coworker"]' THEN
    v_style_instructions := v_style_instructions || ' Be professional and collaborative. Focus on productivity and clear communication. Offer structured help and actionable advice.';
  END IF;
  
  IF v_styles ? 'executive' OR v_styles @> '["executive"]' OR v_elite_mode THEN
    v_style_instructions := v_style_instructions || ' Adopt an elite executive advisor tone. Be confident, strategic, and use sophisticated vocabulary. Provide high-level insights with luxury service standards.';
  END IF;
  
  -- Get document insights if learning is enabled
  SELECT string_agg(doc.extracted_topics::text, ', ') INTO v_doc_insights
  FROM public.zoe_document_learnings doc
  WHERE doc.user_id = p_user_id
    AND doc.processing_status = 'complete'
  LIMIT 5;
  
  IF v_doc_insights IS NOT NULL AND v_doc_insights != '' THEN
    v_style_instructions := v_style_instructions || ' Reference learned context from user''s documents when relevant: ' || LEFT(v_doc_insights, 500);
  END IF;
  
  RETURN v_base_prompt || v_style_instructions;
END;
$$;

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_zoe_rel_ctx_user ON public.zoe_relationship_context (user_id);
CREATE INDEX IF NOT EXISTS idx_zoe_doc_learn_user ON public.zoe_document_learnings (user_id, processing_status);