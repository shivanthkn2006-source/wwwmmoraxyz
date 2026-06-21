-- ═══════════════════════════════════════════════════════════════════════════════
-- ZERO-FRICTION ADAPTIVE LEARNING SYSTEM DATABASE SCHEMA
-- Unified Event Sourcing Architecture for DHF and ECN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add new columns to zoe_settings for SFT readiness tracking
ALTER TABLE public.zoe_settings
ADD COLUMN IF NOT EXISTS finetuning_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS event_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_event_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS adaptive_learning_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sync_percentage INTEGER DEFAULT 0;

-- Create behavioral_events table for unified event streaming
CREATE TABLE IF NOT EXISTS public.behavioral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- ai_interaction, social_activity, navigation, content_creation, etc.
  event_category TEXT NOT NULL, -- chat, voice, post, comment, notification, feature_usage
  context_snippet TEXT, -- max 50 chars for cost efficiency
  metadata JSONB DEFAULT '{}',
  ecn_processed BOOLEAN DEFAULT FALSE,
  dhf_logged BOOLEAN DEFAULT FALSE,
  sentiment_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT
);

-- Create ECN analysis queue for batch processing
CREATE TABLE IF NOT EXISTS public.ecn_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  events_batch JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  model_used TEXT DEFAULT 'gemini-2.5-flash-lite',
  analysis_result JSONB,
  processing_cost_estimate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create VETO feedback table for training tolerance model
CREATE TABLE IF NOT EXISTS public.veto_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  veto_intervention_id UUID,
  helped_or_hindered TEXT, -- 'helped', 'hindered', 'neutral'
  timing_rating INTEGER CHECK (timing_rating >= 1 AND timing_rating <= 5),
  context_snippet TEXT,
  feedback_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sentiment tapbacks table for immediate AI response feedback
CREATE TABLE IF NOT EXISTS public.zoe_response_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  response_id TEXT,
  message_id UUID,
  sentiment TEXT NOT NULL, -- 'helpful', 'confused', 'perfect'
  response_snippet TEXT,
  feature_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add profile enrichment columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS enrichment_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enrichment_source TEXT,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP WITH TIME ZONE;

-- Add columns to zoe_personalization for enterprise bias
ALTER TABLE public.zoe_personalization
ADD COLUMN IF NOT EXISTS enterprise_context_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS role_based_suggestions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS organization_patterns JSONB DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecn_analysis_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veto_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_response_sentiment ENABLE ROW LEVEL SECURITY;

-- RLS policies for behavioral_events
CREATE POLICY "Users can insert their own events"
ON public.behavioral_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
ON public.behavioral_events FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for ecn_analysis_queue
CREATE POLICY "Service role manages ECN queue"
ON public.ecn_analysis_queue FOR ALL
USING (true);

CREATE POLICY "Users can view their own analysis"
ON public.ecn_analysis_queue FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for veto_feedback
CREATE POLICY "Users can insert veto feedback"
ON public.veto_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own veto feedback"
ON public.veto_feedback FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for zoe_response_sentiment
CREATE POLICY "Users can insert sentiment"
ON public.zoe_response_sentiment FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sentiment"
ON public.zoe_response_sentiment FOR SELECT
USING (auth.uid() = user_id);

-- Create function to update event counts and check SFT readiness
CREATE OR REPLACE FUNCTION public.update_event_count_and_sft_status()
RETURNS TRIGGER AS $$
DECLARE
  current_count BIGINT;
BEGIN
  -- Get current event count for user
  SELECT COUNT(*) INTO current_count
  FROM public.behavioral_events
  WHERE user_id = NEW.user_id;
  
  -- Update zoe_settings with new count
  UPDATE public.zoe_settings
  SET 
    event_count = current_count,
    last_event_sync_at = NOW(),
    finetuning_ready = CASE WHEN current_count >= 10000 THEN TRUE ELSE finetuning_ready END,
    sync_percentage = LEAST(100, (current_count::NUMERIC / 100)::INTEGER)
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for event count updates
DROP TRIGGER IF EXISTS update_event_count_trigger ON public.behavioral_events;
CREATE TRIGGER update_event_count_trigger
AFTER INSERT ON public.behavioral_events
FOR EACH ROW
EXECUTE FUNCTION public.update_event_count_and_sft_status();

-- Create function to get user activity freshness
CREATE OR REPLACE FUNCTION public.check_user_activity_freshness(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
  v_recent_posts INTEGER;
  v_recent_events INTEGER;
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_requires_context BOOLEAN;
BEGIN
  -- Count recent posts
  SELECT COUNT(*) INTO v_recent_posts
  FROM public.posts
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Count recent behavioral events
  SELECT COUNT(*) INTO v_recent_events
  FROM public.behavioral_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Get last activity timestamp
  SELECT MAX(created_at) INTO v_last_activity
  FROM public.behavioral_events
  WHERE user_id = p_user_id;
  
  -- Determine if context refresh is needed
  v_requires_context := (v_recent_posts = 0 AND v_recent_events < 50);
  
  RETURN jsonb_build_object(
    'recent_posts', v_recent_posts,
    'recent_events', v_recent_events,
    'last_activity', v_last_activity,
    'requires_context_refresh', v_requires_context,
    'days_checked', p_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for behavioral events
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavioral_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_response_sentiment;