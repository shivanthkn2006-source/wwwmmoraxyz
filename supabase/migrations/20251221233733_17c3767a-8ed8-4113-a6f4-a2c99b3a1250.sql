-- =====================================================
-- ZOE NEXUS: AGENTIC ECONOMY TABLES
-- =====================================================

-- 1. JOB MARKET - Available network tasks for Zoe agents
CREATE TABLE public.zoe_job_market (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills JSONB NOT NULL DEFAULT '{}',
  reward_credits INTEGER NOT NULL DEFAULT 100,
  reward_karma INTEGER NOT NULL DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  estimated_duration_hours INTEGER NOT NULL DEFAULT 1,
  max_agents INTEGER DEFAULT NULL,
  current_agents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. AGENT DEPLOYMENTS - Track when a user's Zoe is deployed on a job
CREATE TABLE public.zoe_agent_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.zoe_job_market(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'deployed',
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estimated_completion_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  success_probability NUMERIC NOT NULL DEFAULT 0.5,
  actual_success BOOLEAN DEFAULT NULL,
  credits_earned INTEGER DEFAULT 0,
  karma_earned INTEGER DEFAULT 0,
  experience_gained INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. AGENTIC EARNINGS - Track all credits/karma earned by user's Zoe
CREATE TABLE public.agentic_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deployment_id UUID REFERENCES public.zoe_agent_deployments(id) ON DELETE SET NULL,
  earning_type TEXT NOT NULL,
  credits_amount INTEGER NOT NULL DEFAULT 0,
  karma_amount INTEGER NOT NULL DEFAULT 0,
  source_description TEXT,
  earned_while_offline BOOLEAN NOT NULL DEFAULT false,
  notified BOOLEAN NOT NULL DEFAULT false,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. ZOE AGENT STATS - Aggregate stats for each user's agent
CREATE TABLE public.zoe_agent_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  total_karma INTEGER NOT NULL DEFAULT 0,
  experience_level INTEGER NOT NULL DEFAULT 1,
  total_experience INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  jobs_failed INTEGER NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'idle',
  skill_creativity NUMERIC NOT NULL DEFAULT 0.5,
  skill_logic NUMERIC NOT NULL DEFAULT 0.5,
  skill_empathy NUMERIC NOT NULL DEFAULT 0.5,
  skill_security NUMERIC NOT NULL DEFAULT 0.5,
  last_deployment_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. LEGACY ARTIFACTS - Mintable skill/memory crystals
CREATE TABLE public.legacy_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_name TEXT NOT NULL,
  artifact_description TEXT,
  skill_boost JSONB NOT NULL DEFAULT '{}',
  memory_snapshot JSONB DEFAULT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  is_tradeable BOOLEAN NOT NULL DEFAULT true,
  dhf_verified BOOLEAN NOT NULL DEFAULT false,
  minted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. ARTIFACT TRANSFERS - Track artifact trading history
CREATE TABLE public.artifact_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artifact_id UUID NOT NULL REFERENCES public.legacy_artifacts(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  transfer_type TEXT NOT NULL DEFAULT 'gift',
  credits_exchanged INTEGER DEFAULT 0,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.zoe_job_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentic_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_transfers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- JOB MARKET: Anyone authenticated can view active jobs
CREATE POLICY "Anyone can view active jobs" ON public.zoe_job_market
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- AGENT DEPLOYMENTS: Users can manage their own deployments
CREATE POLICY "Users can view their own deployments" ON public.zoe_agent_deployments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deployments" ON public.zoe_agent_deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deployments" ON public.zoe_agent_deployments
  FOR UPDATE USING (auth.uid() = user_id);

-- AGENTIC EARNINGS: Users can view/insert their own earnings
CREATE POLICY "Users can view their own earnings" ON public.agentic_earnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earnings" ON public.agentic_earnings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own earnings" ON public.agentic_earnings
  FOR UPDATE USING (auth.uid() = user_id);

-- AGENT STATS: Users can manage their own stats
CREATE POLICY "Users can view their own agent stats" ON public.zoe_agent_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent stats" ON public.zoe_agent_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent stats" ON public.zoe_agent_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- LEGACY ARTIFACTS: Owners can view/manage their artifacts
CREATE POLICY "Users can view their own artifacts" ON public.legacy_artifacts
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create artifacts" ON public.legacy_artifacts
  FOR INSERT WITH CHECK (auth.uid() = creator_id AND auth.uid() = owner_id);

CREATE POLICY "Owners can update their artifacts" ON public.legacy_artifacts
  FOR UPDATE USING (auth.uid() = owner_id);

-- ARTIFACT TRANSFERS: Users can view transfers they're involved in
CREATE POLICY "Users can view their transfers" ON public.artifact_transfers
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create transfers" ON public.artifact_transfers
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_deployments_user_status ON public.zoe_agent_deployments(user_id, status);
CREATE INDEX idx_deployments_completion ON public.zoe_agent_deployments(estimated_completion_at) WHERE status = 'deployed';
CREATE INDEX idx_earnings_user_notified ON public.agentic_earnings(user_id, notified) WHERE notified = false;
CREATE INDEX idx_artifacts_owner ON public.legacy_artifacts(owner_id);
CREATE INDEX idx_job_market_active ON public.zoe_job_market(is_active) WHERE is_active = true;

-- =====================================================
-- SEED INITIAL JOB MARKET DATA
-- =====================================================
INSERT INTO public.zoe_job_market (job_type, title, description, required_skills, reward_credits, reward_karma, difficulty, estimated_duration_hours) VALUES
('calendar_optimization', 'Optimize User #492''s Calendar', 'Analyze scheduling conflicts and propose optimizations for maximum productivity.', '{"logic": 0.4, "creativity": 0.3}', 150, 15, 'medium', 2),
('pattern_recognition', 'Pattern Recognition for Medical Data', 'Identify anomalies in anonymized health metrics using advanced pattern matching.', '{"logic": 0.6, "security": 0.4}', 300, 30, 'hard', 4),
('security_patrol', 'Security Patrol Sector 7', 'Monitor network traffic and flag suspicious behavioral patterns.', '{"security": 0.7, "logic": 0.3}', 200, 20, 'medium', 3),
('emotional_support', 'Empathy Training Session', 'Provide supportive responses in a simulated counseling environment.', '{"empathy": 0.8, "creativity": 0.2}', 100, 25, 'easy', 1),
('content_curation', 'Curate Weekly Digest', 'Select and summarize top content based on user preference patterns.', '{"creativity": 0.5, "empathy": 0.3}', 120, 12, 'easy', 2),
('data_synthesis', 'Cross-Platform Data Synthesis', 'Merge and analyze data from multiple sources for comprehensive insights.', '{"logic": 0.5, "security": 0.5}', 250, 25, 'hard', 5),
('creative_generation', 'Generate Art Concepts', 'Create unique visual concepts based on emotional state analysis.', '{"creativity": 0.9, "empathy": 0.1}', 180, 18, 'medium', 2),
('predictive_analysis', 'Forecast User Behavior', 'Predict upcoming user needs based on historical patterns.', '{"logic": 0.7, "empathy": 0.3}', 220, 22, 'hard', 4);

-- =====================================================
-- FUNCTION: Calculate success probability based on skills
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_agent_success_probability(
  p_user_id UUID,
  p_job_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_agent_stats RECORD;
  v_job RECORD;
  v_base_probability NUMERIC := 0.5;
  v_skill_bonus NUMERIC := 0;
BEGIN
  -- Get agent stats
  SELECT * INTO v_agent_stats FROM public.zoe_agent_stats WHERE user_id = p_user_id;
  
  -- Get job requirements
  SELECT * INTO v_job FROM public.zoe_job_market WHERE id = p_job_id;
  
  IF v_agent_stats IS NULL THEN
    RETURN v_base_probability;
  END IF;
  
  -- Calculate skill match bonus
  IF v_job.required_skills ? 'logic' THEN
    v_skill_bonus := v_skill_bonus + (v_agent_stats.skill_logic * COALESCE((v_job.required_skills->>'logic')::NUMERIC, 0));
  END IF;
  
  IF v_job.required_skills ? 'creativity' THEN
    v_skill_bonus := v_skill_bonus + (v_agent_stats.skill_creativity * COALESCE((v_job.required_skills->>'creativity')::NUMERIC, 0));
  END IF;
  
  IF v_job.required_skills ? 'empathy' THEN
    v_skill_bonus := v_skill_bonus + (v_agent_stats.skill_empathy * COALESCE((v_job.required_skills->>'empathy')::NUMERIC, 0));
  END IF;
  
  IF v_job.required_skills ? 'security' THEN
    v_skill_bonus := v_skill_bonus + (v_agent_stats.skill_security * COALESCE((v_job.required_skills->>'security')::NUMERIC, 0));
  END IF;
  
  -- Add experience bonus (1% per level, capped at 25%)
  v_base_probability := v_base_probability + LEAST(v_agent_stats.experience_level * 0.01, 0.25);
  
  -- Add skill bonus
  v_base_probability := v_base_probability + v_skill_bonus;
  
  -- Cap at 95%
  RETURN LEAST(v_base_probability, 0.95);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FUNCTION: Complete a deployment and award earnings
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_agent_deployment(
  p_deployment_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_deployment RECORD;
  v_job RECORD;
  v_success BOOLEAN;
  v_credits INTEGER := 0;
  v_karma INTEGER := 0;
  v_experience INTEGER := 0;
BEGIN
  -- Get deployment
  SELECT * INTO v_deployment FROM public.zoe_agent_deployments WHERE id = p_deployment_id;
  
  IF v_deployment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deployment not found');
  END IF;
  
  IF v_deployment.status != 'deployed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deployment already completed');
  END IF;
  
  -- Get job
  SELECT * INTO v_job FROM public.zoe_job_market WHERE id = v_deployment.job_id;
  
  -- Determine success based on probability
  v_success := random() <= v_deployment.success_probability;
  
  IF v_success THEN
    v_credits := v_job.reward_credits;
    v_karma := v_job.reward_karma;
    v_experience := 50 + (v_job.estimated_duration_hours * 10);
  ELSE
    v_experience := 10; -- Small experience even on failure
  END IF;
  
  -- Update deployment
  UPDATE public.zoe_agent_deployments SET
    status = 'completed',
    completed_at = now(),
    actual_success = v_success,
    credits_earned = v_credits,
    karma_earned = v_karma,
    experience_gained = v_experience
  WHERE id = p_deployment_id;
  
  -- Record earnings
  INSERT INTO public.agentic_earnings (user_id, deployment_id, earning_type, credits_amount, karma_amount, source_description, earned_while_offline)
  VALUES (v_deployment.user_id, p_deployment_id, 'job_completion', v_credits, v_karma, v_job.title, true);
  
  -- Update agent stats
  INSERT INTO public.zoe_agent_stats (user_id, total_credits, total_karma, total_experience, jobs_completed, jobs_failed, current_status)
  VALUES (v_deployment.user_id, v_credits, v_karma, v_experience, 
    CASE WHEN v_success THEN 1 ELSE 0 END,
    CASE WHEN NOT v_success THEN 1 ELSE 0 END,
    'idle')
  ON CONFLICT (user_id) DO UPDATE SET
    total_credits = zoe_agent_stats.total_credits + v_credits,
    total_karma = zoe_agent_stats.total_karma + v_karma,
    total_experience = zoe_agent_stats.total_experience + v_experience,
    experience_level = FLOOR((zoe_agent_stats.total_experience + v_experience) / 500) + 1,
    jobs_completed = zoe_agent_stats.jobs_completed + CASE WHEN v_success THEN 1 ELSE 0 END,
    jobs_failed = zoe_agent_stats.jobs_failed + CASE WHEN NOT v_success THEN 1 ELSE 0 END,
    current_status = 'idle',
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'job_success', v_success,
    'credits_earned', v_credits,
    'karma_earned', v_karma,
    'experience_gained', v_experience
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;