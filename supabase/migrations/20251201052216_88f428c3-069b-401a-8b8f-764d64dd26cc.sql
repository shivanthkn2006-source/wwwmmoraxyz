-- Zoe Agentic AI Intelligence Framework - Database Schema
-- Phase 1: Core Intelligence Tables

-- ==========================================
-- 1. CONTEXTUAL MEMORY SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_contextual_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation History
  conversation_topics JSONB DEFAULT '[]'::jsonb,
  key_decisions JSONB DEFAULT '{}'::jsonb,
  unresolved_topics JSONB DEFAULT '[]'::jsonb,
  successful_interactions JSONB DEFAULT '[]'::jsonb,
  failed_interactions JSONB DEFAULT '[]'::jsonb,
  
  -- Decision Memory
  past_choices JSONB DEFAULT '[]'::jsonb,
  preference_conflicts JSONB DEFAULT '[]'::jsonb,
  evolving_preferences JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_contextual_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own contextual memory"
  ON public.zoe_contextual_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contextual memory"
  ON public.zoe_contextual_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contextual memory"
  ON public.zoe_contextual_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. GOAL TRACKING ENGINE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_goal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Goal Details
  goal_description TEXT NOT NULL,
  goal_category TEXT, -- social, creative, professional, personal
  goal_status TEXT DEFAULT 'active', -- active, completed, paused, abandoned
  
  -- Timeline
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Progress Tracking
  progress_milestones JSONB DEFAULT '[]'::jsonb,
  current_progress_percentage INTEGER DEFAULT 0,
  
  -- Zoe's Involvement
  zoe_interventions JSONB DEFAULT '[]'::jsonb,
  zoe_suggestions_accepted INTEGER DEFAULT 0,
  zoe_suggestions_rejected INTEGER DEFAULT 0,
  
  -- Metadata
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  tags TEXT[],
  notes TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.zoe_goal_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
  ON public.zoe_goal_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.zoe_goal_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.zoe_goal_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.zoe_goal_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 3. EMOTIONAL INTELLIGENCE TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_emotional_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Emotional Patterns
  emotional_patterns JSONB DEFAULT '{
    "morning_mood": "neutral",
    "evening_mood": "neutral",
    "stress_triggers": [],
    "joy_triggers": []
  }'::jsonb,
  
  -- Sentiment Tracking
  sentiment_history JSONB DEFAULT '[]'::jsonb,
  current_sentiment DECIMAL(3,2) DEFAULT 0.5, -- -1.0 to 1.0
  
  -- Emotional Vocabulary
  detected_emotions JSONB DEFAULT '[]'::jsonb,
  
  -- Adaptive Response Configuration
  adaptive_response_style JSONB DEFAULT '{
    "when_stressed": "concise_and_practical",
    "when_excited": "enthusiastic_and_expansive",
    "when_reflective": "deep_and_thoughtful"
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_emotional_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own emotional intelligence data"
  ON public.zoe_emotional_intelligence FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotional intelligence data"
  ON public.zoe_emotional_intelligence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotional intelligence data"
  ON public.zoe_emotional_intelligence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. FEEDBACK & LEARNING LOOP
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_feedback_loop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Suggestion Tracking
  suggestion_id UUID DEFAULT gen_random_uuid(),
  suggestion_text TEXT NOT NULL,
  suggestion_type TEXT, -- social, content, productivity, creative
  
  -- User Response
  user_action TEXT, -- accepted, ignored, rejected, deferred
  outcome_quality DECIMAL(3,2), -- 0.0 to 1.0 if accepted
  user_explicit_feedback TEXT,
  
  -- Context
  context_when_suggested JSONB DEFAULT '{}'::jsonb,
  learned_patterns JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  suggested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Metadata
  feature_context TEXT, -- huddle, posts, zoe_architect, etc.
  device_type TEXT,
  time_of_day INTEGER -- hour 0-23
);

-- Enable RLS
ALTER TABLE public.zoe_feedback_loop ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feedback data"
  ON public.zoe_feedback_loop FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback data"
  ON public.zoe_feedback_loop FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback data"
  ON public.zoe_feedback_loop FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. PREDICTIVE INTENT MODELING
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_intent_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Intent Sequences
  intent_sequences JSONB DEFAULT '[]'::jsonb,
  
  -- Time-Based Patterns
  time_based_intents JSONB DEFAULT '{}'::jsonb,
  
  -- Context-Triggered Intents
  context_triggered_intents JSONB DEFAULT '{}'::jsonb,
  
  -- Current Prediction
  next_likely_action TEXT,
  prediction_confidence DECIMAL(3,2),
  prediction_reasoning TEXT,
  
  -- Accuracy Tracking
  predictions_made INTEGER DEFAULT 0,
  predictions_correct INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(3,2) DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_intent_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own intent predictions"
  ON public.zoe_intent_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own intent predictions"
  ON public.zoe_intent_predictions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intent predictions"
  ON public.zoe_intent_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 6. ENVIRONMENTAL CONTEXT AWARENESS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_environmental_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Location Contexts
  location_contexts JSONB DEFAULT '{}'::jsonb,
  current_location_context TEXT,
  
  -- Device Usage
  device_usage JSONB DEFAULT '{}'::jsonb,
  current_device TEXT,
  
  -- Network Conditions
  network_conditions_adaptation JSONB DEFAULT '{
    "slow_connection": {"auto_reduce_media_quality": true, "prioritize_text": true},
    "fast_connection": {"auto_enable_hd": true, "preload_content": true}
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_environmental_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own environmental context"
  ON public.zoe_environmental_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own environmental context"
  ON public.zoe_environmental_context FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own environmental context"
  ON public.zoe_environmental_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 7. WORKFLOW & PRODUCTIVITY INTELLIGENCE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_workflow_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Workflow Patterns
  workflow_patterns JSONB DEFAULT '[]'::jsonb,
  
  -- Productivity Metrics
  productivity_metrics JSONB DEFAULT '{
    "peak_productivity_hours": [],
    "distraction_triggers": [],
    "focus_mode_effectiveness": 0.0,
    "task_completion_rate": 0.0
  }'::jsonb,
  
  -- Automation Opportunities
  automation_opportunities JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_workflow_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own workflow intelligence"
  ON public.zoe_workflow_intelligence FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow intelligence"
  ON public.zoe_workflow_intelligence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow intelligence"
  ON public.zoe_workflow_intelligence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 8. CROSS-PLATFORM BEHAVIORAL SYNTHESIS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_behavioral_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feature Correlation Matrix
  feature_correlation_matrix JSONB DEFAULT '{}'::jsonb,
  
  -- User Archetypes
  user_archetypes TEXT[] DEFAULT ARRAY['balanced_user'],
  dominant_archetype TEXT DEFAULT 'balanced_user',
  archetype_evolution JSONB DEFAULT '[]'::jsonb,
  
  -- Holistic Profile
  holistic_user_profile JSONB DEFAULT '{
    "personality_dimensions": {
      "introvert_extrovert": 0.5,
      "spontaneous_planned": 0.5,
      "visual_textual": 0.5,
      "social_solo": 0.5
    }
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_behavioral_synthesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own behavioral synthesis"
  ON public.zoe_behavioral_synthesis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavioral synthesis"
  ON public.zoe_behavioral_synthesis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavioral synthesis"
  ON public.zoe_behavioral_synthesis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 9. ZOE PERFORMANCE METRICS (SYSTEM TABLE)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoe_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Performance Tracking
  suggestion_acceptance_rate DECIMAL(3,2) DEFAULT 0.0,
  command_success_rate DECIMAL(3,2) DEFAULT 0.0,
  proactive_help_appreciated_rate DECIMAL(3,2) DEFAULT 0.0,
  response_time_satisfaction DECIMAL(3,2) DEFAULT 0.0,
  
  -- Learning Progress
  total_interactions INTEGER DEFAULT 0,
  successful_predictions INTEGER DEFAULT 0,
  failed_predictions INTEGER DEFAULT 0,
  
  -- User Satisfaction
  user_explicit_feedback JSONB DEFAULT '{}'::jsonb,
  overall_satisfaction_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoe_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own performance metrics"
  ON public.zoe_performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance metrics"
  ON public.zoe_performance_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics"
  ON public.zoe_performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_zoe_contextual_memory_user ON public.zoe_contextual_memory(user_id);
CREATE INDEX idx_zoe_goal_tracking_user ON public.zoe_goal_tracking(user_id);
CREATE INDEX idx_zoe_goal_tracking_status ON public.zoe_goal_tracking(goal_status);
CREATE INDEX idx_zoe_emotional_intelligence_user ON public.zoe_emotional_intelligence(user_id);
CREATE INDEX idx_zoe_feedback_loop_user ON public.zoe_feedback_loop(user_id);
CREATE INDEX idx_zoe_feedback_loop_type ON public.zoe_feedback_loop(suggestion_type);
CREATE INDEX idx_zoe_intent_predictions_user ON public.zoe_intent_predictions(user_id);
CREATE INDEX idx_zoe_environmental_context_user ON public.zoe_environmental_context(user_id);
CREATE INDEX idx_zoe_workflow_intelligence_user ON public.zoe_workflow_intelligence(user_id);
CREATE INDEX idx_zoe_behavioral_synthesis_user ON public.zoe_behavioral_synthesis(user_id);
CREATE INDEX idx_zoe_performance_metrics_user ON public.zoe_performance_metrics(user_id);

-- ==========================================
-- TRIGGER FUNCTION FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_zoe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_zoe_contextual_memory_updated_at
  BEFORE UPDATE ON public.zoe_contextual_memory
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_goal_tracking_updated_at
  BEFORE UPDATE ON public.zoe_goal_tracking
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_emotional_intelligence_updated_at
  BEFORE UPDATE ON public.zoe_emotional_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_intent_predictions_updated_at
  BEFORE UPDATE ON public.zoe_intent_predictions
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_environmental_context_updated_at
  BEFORE UPDATE ON public.zoe_environmental_context
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_workflow_intelligence_updated_at
  BEFORE UPDATE ON public.zoe_workflow_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_behavioral_synthesis_updated_at
  BEFORE UPDATE ON public.zoe_behavioral_synthesis
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();

CREATE TRIGGER update_zoe_performance_metrics_updated_at
  BEFORE UPDATE ON public.zoe_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_zoe_updated_at();