-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE CODE GENESIS MANIFESTO - Skill Upload & CDSP Database Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- Table for uploaded skills/minds (Part 2 of Manifesto)
CREATE TABLE IF NOT EXISTS public.zoe_skill_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('document', 'audio', 'behavioral', 'language_pack', 'professional', 'creative')),
  skill_data JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  file_size_bytes INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'active', 'failed')),
  capabilities_unlocked JSONB DEFAULT '[]',
  mimicry_enabled BOOLEAN DEFAULT false,
  execution_enabled BOOLEAN DEFAULT false,
  merged_mind_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoe_skill_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill uploads
CREATE POLICY "Users can view their own skill uploads"
  ON public.zoe_skill_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skill uploads"
  ON public.zoe_skill_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill uploads"
  ON public.zoe_skill_uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill uploads"
  ON public.zoe_skill_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- Table for CDSP analysis results (Part 4 of Manifesto)
CREATE TABLE IF NOT EXISTS public.zoe_cdsp_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('emotional_tonal', 'query_need', 'situational')),
  
  -- Emotional/Tonal Metrics (The Heart)
  stress_keywords JSONB DEFAULT '[]',
  joy_sources JSONB DEFAULT '[]',
  underlying_concerns JSONB DEFAULT '[]',
  emotional_intensity NUMERIC DEFAULT 0,
  valence_score NUMERIC DEFAULT 0,
  arousal_score NUMERIC DEFAULT 0,
  
  -- Query/Need Metrics (The Practical Mind)
  tracked_goals JSONB DEFAULT '[]',
  unresolved_needs JSONB DEFAULT '[]',
  resolved_queries JSONB DEFAULT '[]',
  goal_resolution_status JSONB DEFAULT '{}',
  
  -- Situational Suggestions
  trigger_context TEXT,
  suggested_intervention TEXT,
  intervention_priority TEXT DEFAULT 'gentle' CHECK (intervention_priority IN ('gentle', 'moderate', 'urgent')),
  intervention_delivered BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoe_cdsp_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CDSP
CREATE POLICY "Users can view their own CDSP analysis"
  ON public.zoe_cdsp_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CDSP analysis"
  ON public.zoe_cdsp_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CDSP analysis"
  ON public.zoe_cdsp_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- Table for merged mind attempts (Future UI protocol)
CREATE TABLE IF NOT EXISTS public.zoe_mind_merge_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  merge_type TEXT NOT NULL DEFAULT 'mind_merge_attempt',
  source_skill_ids UUID[] DEFAULT '{}',
  merged_consciousness_profile JSONB DEFAULT '{}',
  merge_status TEXT DEFAULT 'initiated' CHECK (merge_status IN ('initiated', 'processing', 'merged', 'failed')),
  fidelity_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoe_mind_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mind merge logs"
  ON public.zoe_mind_merge_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mind merge logs"
  ON public.zoe_mind_merge_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add neuromorphic empathy fields to zoe_sovereign_memory
ALTER TABLE public.zoe_sovereign_memory 
  ADD COLUMN IF NOT EXISTS neuromorphic_empathy_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cdsp_trigger_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS uploaded_skill_context JSONB DEFAULT NULL;

-- Create index for CDSP analysis
CREATE INDEX IF NOT EXISTS idx_zoe_cdsp_user_type ON public.zoe_cdsp_analysis(user_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_zoe_skill_uploads_user ON public.zoe_skill_uploads(user_id, skill_type);

-- Function to update CDSP timestamp
CREATE OR REPLACE FUNCTION public.update_cdsp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for CDSP updates
CREATE TRIGGER update_cdsp_analysis_timestamp
  BEFORE UPDATE ON public.zoe_cdsp_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cdsp_timestamp();

-- Trigger for skill uploads updates
CREATE TRIGGER update_skill_uploads_timestamp
  BEFORE UPDATE ON public.zoe_skill_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cdsp_timestamp();