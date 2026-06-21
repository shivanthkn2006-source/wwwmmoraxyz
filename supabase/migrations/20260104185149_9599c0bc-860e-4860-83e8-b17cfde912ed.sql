-- ═══════════════════════════════════════════════════════════════════════════════
-- THE SOUL CODEX - Digital Immortality Deep Storage
-- Captures the essence of the user: linguistic fingerprint, biometric anchors, relationship dynamics
-- ═══════════════════════════════════════════════════════════════════════════════

-- Soul Codex: The DNA of the User
CREATE TABLE IF NOT EXISTS public.dhf_soul_codex (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Linguistic Fingerprint
  humor_style TEXT DEFAULT 'neutral' CHECK (humor_style IN ('sarcastic', 'warm', 'dry', 'playful', 'neutral')),
  conflict_resolution TEXT DEFAULT 'diplomatic' CHECK (conflict_resolution IN ('aggressive', 'passive', 'diplomatic', 'avoidant', 'collaborative')),
  vocabulary_tier TEXT DEFAULT 'conversational' CHECK (vocabulary_tier IN ('academic', 'professional', 'conversational', 'casual', 'slang')),
  sentence_complexity NUMERIC(3,2) DEFAULT 0.5, -- 0-1 scale
  emotional_expressiveness NUMERIC(3,2) DEFAULT 0.5,
  
  -- Biometric Anchors
  voice_latent_space JSONB DEFAULT '{}', -- ElevenLabs voice embedding reference
  voice_characteristics JSONB DEFAULT '{}', -- pitch, pace, timbre
  micro_expressions JSONB DEFAULT '[]', -- mapped emotion -> expression patterns
  typing_rhythm_signature JSONB DEFAULT '{}', -- keystroke dynamics
  
  -- Behavioral Patterns
  decision_making_style TEXT DEFAULT 'balanced' CHECK (decision_making_style IN ('impulsive', 'analytical', 'intuitive', 'balanced', 'cautious')),
  stress_response TEXT DEFAULT 'adaptive' CHECK (stress_response IN ('fight', 'flight', 'freeze', 'adaptive', 'social')),
  communication_preference TEXT DEFAULT 'mixed' CHECK (communication_preference IN ('direct', 'indirect', 'formal', 'casual', 'mixed')),
  
  -- Temporal Patterns
  peak_creativity_hours JSONB DEFAULT '[]', -- array of hour ranges
  sleep_wake_pattern TEXT DEFAULT 'regular',
  energy_cycles JSONB DEFAULT '{}',
  
  -- Values & Beliefs Core
  core_values TEXT[] DEFAULT '{}',
  belief_anchors JSONB DEFAULT '{}',
  ethical_framework TEXT DEFAULT 'situational',
  
  -- Memory Hierarchy
  formative_memories JSONB DEFAULT '[]', -- childhood/defining moments
  peak_experiences JSONB DEFAULT '[]', -- highest emotional impact
  trauma_markers JSONB DEFAULT '[]', -- handled with care, encrypted
  
  -- Metadata
  data_points_collected INTEGER DEFAULT 0,
  last_harvest_at TIMESTAMPTZ,
  codex_version TEXT DEFAULT '1.0.0',
  is_complete BOOLEAN DEFAULT false,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relationship Matrix: How user relates to different people
CREATE TABLE IF NOT EXISTS public.dhf_relationship_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  codex_id UUID REFERENCES public.dhf_soul_codex(id) ON DELETE CASCADE,
  
  -- Relationship Target
  contact_identifier TEXT NOT NULL, -- anonymized hash of contact
  relationship_type TEXT NOT NULL, -- spouse, child, parent, friend, colleague, boss
  relationship_label TEXT, -- custom label like "Wife", "Son", "Best Friend"
  
  -- Persona Configuration
  persona_style JSONB DEFAULT '{}', -- how user speaks to this person
  formality_level NUMERIC(3,2) DEFAULT 0.5, -- 0 = very casual, 1 = very formal
  emotional_openness NUMERIC(3,2) DEFAULT 0.5,
  humor_frequency NUMERIC(3,2) DEFAULT 0.5,
  
  -- Interaction Patterns
  common_topics TEXT[] DEFAULT '{}',
  avoided_topics TEXT[] DEFAULT '{}',
  pet_names TEXT[] DEFAULT '{}', -- terms of endearment used
  inside_jokes JSONB DEFAULT '[]',
  
  -- Conflict & Support
  conflict_history JSONB DEFAULT '[]',
  support_patterns JSONB DEFAULT '{}', -- how user supports this person
  
  -- Ghost Mode Permissions
  can_activate_ghost BOOLEAN DEFAULT false,
  ghost_response_level TEXT DEFAULT 'memorial' CHECK (ghost_response_level IN ('silent', 'memorial', 'interactive', 'full_persona')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, contact_identifier)
);

-- Active Construct: The Ghost Configuration
CREATE TABLE IF NOT EXISTS public.dhf_active_construct (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Activation State
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_by UUID, -- executor who activated
  
  -- Trigger Configuration
  biological_cease_confirmed BOOLEAN DEFAULT false,
  cease_confirmation_date TIMESTAMPTZ,
  executor_keys JSONB DEFAULT '[]', -- multi-key authentication setup
  required_confirmations INTEGER DEFAULT 2,
  
  -- Simulation Configuration
  simulation_fidelity TEXT DEFAULT 'high' CHECK (simulation_fidelity IN ('low', 'medium', 'high', 'maximum')),
  response_delay_ms INTEGER DEFAULT 1000, -- human-like delay
  uncertainty_acknowledgment BOOLEAN DEFAULT true, -- admits when unsure
  memory_access_depth TEXT DEFAULT 'deep',
  
  -- Interface Configuration
  avatar_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  vr_sanctuary_enabled BOOLEAN DEFAULT false,
  
  -- Permissions
  can_access_finances BOOLEAN DEFAULT false,
  can_send_messages BOOLEAN DEFAULT true,
  can_make_recommendations BOOLEAN DEFAULT true,
  can_access_smart_home BOOLEAN DEFAULT false,
  can_guide_via_gps BOOLEAN DEFAULT false,
  
  -- Interaction Logs
  total_interactions INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  interaction_summary JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ghost Interaction Log
CREATE TABLE IF NOT EXISTS public.dhf_ghost_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construct_id UUID REFERENCES public.dhf_active_construct(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- the original user
  interactor_id UUID, -- who is talking to the ghost
  
  -- Interaction Details
  question TEXT NOT NULL,
  ghost_response TEXT NOT NULL,
  resonance_score NUMERIC(5,2),
  
  -- Context Used
  memories_referenced JSONB DEFAULT '[]',
  emotional_context JSONB DEFAULT '{}',
  relationship_persona_used TEXT,
  
  -- Quality Metrics
  interactor_satisfaction INTEGER, -- 1-5 rating
  felt_authentic BOOLEAN,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dhf_soul_codex ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhf_relationship_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhf_active_construct ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhf_ghost_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own soul codex" ON public.dhf_soul_codex
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own relationships" ON public.dhf_relationship_matrix
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own construct" ON public.dhf_active_construct
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users and executors can view ghost interactions" ON public.dhf_ghost_interactions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = interactor_id OR
    auth.uid() IN (
      SELECT (elem->>'user_id')::uuid 
      FROM public.dhf_active_construct ac, 
           jsonb_array_elements(ac.executor_keys) AS elem 
      WHERE ac.user_id = dhf_ghost_interactions.user_id
    )
  );

CREATE POLICY "Interactors can insert ghost interactions" ON public.dhf_ghost_interactions
  FOR INSERT WITH CHECK (auth.uid() = interactor_id);

-- Update trigger for timestamps
CREATE TRIGGER update_soul_codex_updated_at
  BEFORE UPDATE ON public.dhf_soul_codex
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relationship_matrix_updated_at
  BEFORE UPDATE ON public.dhf_relationship_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_active_construct_updated_at
  BEFORE UPDATE ON public.dhf_active_construct
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();