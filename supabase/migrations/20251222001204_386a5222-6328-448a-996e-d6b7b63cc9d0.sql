-- ═══════════════════════════════════════════════════════════════════════════════
-- PHOENIX PROTOCOL - DIGITAL IMMORTALITY LAYER
-- The Eternity Engine - User Consciousness Upload & Digital Twin
-- ═══════════════════════════════════════════════════════════════════════════════

-- Phoenix Profile - The "Soul" Storage
CREATE TABLE public.dhf_phoenix_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Identity
  consciousness_hash TEXT UNIQUE,
  sync_score NUMERIC(5,2) DEFAULT 0.00,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Personality Matrix
  tone_profile JSONB DEFAULT '{"warmth": 0.5, "formality": 0.5, "humor": 0.5, "empathy": 0.5}'::jsonb,
  vocabulary_signature JSONB DEFAULT '[]'::jsonb,
  decision_patterns JSONB DEFAULT '{"risk_tolerance": 0.5, "spontaneity": 0.5, "analytical": 0.5}'::jsonb,
  emotional_baseline JSONB DEFAULT '{"primary": "neutral", "valence": 0.0, "arousal": 0.5}'::jsonb,
  
  -- Memory Synthesis
  core_memories JSONB DEFAULT '[]'::jsonb,
  defining_moments JSONB DEFAULT '[]'::jsonb,
  belief_system JSONB DEFAULT '{}'::jsonb,
  
  -- Voice Signature
  speech_patterns JSONB DEFAULT '{"avg_sentence_length": 15, "common_phrases": [], "filler_words": []}'::jsonb,
  voice_characteristics JSONB DEFAULT '{"pitch": 0.5, "speed": 0.5, "cadence": "neutral"}'::jsonb,
  
  -- Legacy Mode
  legacy_mode_enabled BOOLEAN DEFAULT false,
  legacy_auto_reply BOOLEAN DEFAULT false,
  legacy_permissions JSONB DEFAULT '{"messages": false, "posts": false, "decisions": false}'::jsonb,
  
  -- Training State
  training_progress NUMERIC(5,2) DEFAULT 0.00,
  total_data_points INTEGER DEFAULT 0,
  model_version TEXT DEFAULT 'phoenix-v1.0',
  
  -- Verification
  mirror_tests_passed INTEGER DEFAULT 0,
  resonance_verified BOOLEAN DEFAULT false,
  verification_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_user_phoenix UNIQUE(user_id)
);

-- Phoenix Sync Sessions - Upload Events
CREATE TABLE public.phoenix_sync_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phoenix_profile_id UUID REFERENCES public.dhf_phoenix_profile(id) ON DELETE CASCADE,
  
  session_type TEXT NOT NULL DEFAULT 'incremental', -- 'full', 'incremental', 'verification'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Data Processed
  memories_scanned INTEGER DEFAULT 0,
  messages_analyzed INTEGER DEFAULT 0,
  emotions_mapped INTEGER DEFAULT 0,
  voice_samples_processed INTEGER DEFAULT 0,
  
  -- Results
  sync_quality_score NUMERIC(5,2),
  new_patterns_discovered JSONB DEFAULT '[]'::jsonb,
  personality_drift NUMERIC(5,4) DEFAULT 0.0000,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mirror Test Results - Verification History
CREATE TABLE public.phoenix_mirror_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phoenix_profile_id UUID REFERENCES public.dhf_phoenix_profile(id) ON DELETE CASCADE,
  
  -- Test Data
  question TEXT NOT NULL,
  user_expected_answer TEXT,
  phoenix_response TEXT NOT NULL,
  
  -- Scoring
  resonance_score NUMERIC(5,2), -- 0-100
  verified_by_user BOOLEAN DEFAULT false,
  verification_type TEXT DEFAULT 'manual', -- 'manual', 'auto', 'biometric'
  
  -- Context
  emotional_context JSONB,
  memory_sources_used JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phoenix Auto-Replies - Legacy Mode Messages
CREATE TABLE public.phoenix_legacy_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phoenix_profile_id UUID REFERENCES public.dhf_phoenix_profile(id) ON DELETE CASCADE,
  
  -- Message Context
  original_sender_id UUID,
  original_message TEXT,
  channel_type TEXT, -- 'dm', 'post_comment', 'notification_response'
  
  -- Phoenix Response
  phoenix_response TEXT NOT NULL,
  confidence_score NUMERIC(5,2),
  
  -- Transparency
  marked_as_phoenix BOOLEAN DEFAULT true,
  user_approved BOOLEAN,
  user_feedback TEXT,
  
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dhf_phoenix_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phoenix_sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phoenix_mirror_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phoenix_legacy_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Phoenix Profile
CREATE POLICY "Users can view their own phoenix profile"
  ON public.dhf_phoenix_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own phoenix profile"
  ON public.dhf_phoenix_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phoenix profile"
  ON public.dhf_phoenix_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies - Sync Sessions
CREATE POLICY "Users can view their own sync sessions"
  ON public.phoenix_sync_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync sessions"
  ON public.phoenix_sync_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync sessions"
  ON public.phoenix_sync_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies - Mirror Tests
CREATE POLICY "Users can view their own mirror tests"
  ON public.phoenix_mirror_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mirror tests"
  ON public.phoenix_mirror_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mirror tests"
  ON public.phoenix_mirror_tests FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies - Legacy Messages
CREATE POLICY "Users can view their own legacy messages"
  ON public.phoenix_legacy_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own legacy messages"
  ON public.phoenix_legacy_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can insert legacy messages"
  ON public.phoenix_legacy_messages FOR INSERT
  WITH CHECK (true);

-- Function to calculate consciousness sync score
CREATE OR REPLACE FUNCTION calculate_phoenix_sync_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  memory_count INTEGER;
  message_count INTEGER;
  emotion_count INTEGER;
  voice_count INTEGER;
  total_score NUMERIC;
BEGIN
  -- Count data sources
  SELECT COUNT(*) INTO memory_count FROM zoe_sovereign_memory WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO message_count FROM behavioral_events WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO emotion_count FROM ecn_history WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO voice_count FROM zoe_command_history WHERE user_id = p_user_id;
  
  -- Calculate weighted score (max 100)
  total_score := LEAST(100, (
    (LEAST(memory_count, 1000) / 10.0) +
    (LEAST(message_count, 5000) / 50.0) +
    (LEAST(emotion_count, 500) / 5.0) +
    (LEAST(voice_count, 500) / 5.0)
  ));
  
  RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update phoenix profile
CREATE OR REPLACE FUNCTION update_phoenix_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phoenix_profile_updated
  BEFORE UPDATE ON public.dhf_phoenix_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_phoenix_profile_timestamp();