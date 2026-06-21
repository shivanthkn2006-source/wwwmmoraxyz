-- Create badges table for gamification
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  feature_category TEXT,
  UNIQUE(user_id, badge_id)
);

-- Create achievements progress table
CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create content creation history table for Lisa AI
CREATE TABLE IF NOT EXISTS public.lisa_content_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'short_text', 'long_text', 'image'
  prompt TEXT NOT NULL,
  generated_content TEXT,
  tone TEXT, -- 'casual', 'professional', 'friendly', 'urgent', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  feedback_rating INTEGER, -- 1-5 stars
  used_in_app BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lisa_content_creations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view their own achievement progress"
  ON public.achievement_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievement progress"
  ON public.achievement_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress"
  ON public.achievement_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for lisa_content_creations
CREATE POLICY "Users can view their own content creations"
  ON public.lisa_content_creations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content creations"
  ON public.lisa_content_creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content creations"
  ON public.lisa_content_creations FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user_id ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lisa_content_creations_user_id ON public.lisa_content_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_lisa_content_creations_content_type ON public.lisa_content_creations(content_type);