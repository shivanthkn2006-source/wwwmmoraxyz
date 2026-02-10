-- Universal Timeline Content Management and Notifications System

-- Table for user timeline content (custom additions, edits)
CREATE TABLE IF NOT EXISTS public.timeline_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  threshold_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'note', 'annotation')),
  content_data JSONB NOT NULL,
  image_url TEXT,
  expertise_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (expertise_level IN ('beginner', 'intermediate', 'expert')),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for timeline activity notifications
CREATE TABLE IF NOT EXISTS public.timeline_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('content_added', 'content_edited', 'content_removed', 'threshold_explored', 'future_proposal_analyzed', 'content_shared')),
  threshold_id INTEGER,
  content_id UUID,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for timeline sharing
CREATE TABLE IF NOT EXISTS public.timeline_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.timeline_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('global', 'friends', 'private_timeline', 'huddle')),
  target_id UUID,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for user timeline progress and tutorial
CREATE TABLE IF NOT EXISTS public.timeline_user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tutorial_completed BOOLEAN DEFAULT false,
  thresholds_explored JSONB DEFAULT '[]'::jsonb,
  expertise_preference TEXT DEFAULT 'intermediate' CHECK (expertise_preference IN ('beginner', 'intermediate', 'expert')),
  first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timeline_content
CREATE POLICY "Users can view their own timeline content"
  ON public.timeline_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public timeline content"
  ON public.timeline_content FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own timeline content"
  ON public.timeline_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline content"
  ON public.timeline_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline content"
  ON public.timeline_content FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for timeline_activities
CREATE POLICY "Users can view their own timeline activities"
  ON public.timeline_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline activities"
  ON public.timeline_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for timeline_shares
CREATE POLICY "Users can view their shared timeline content"
  ON public.timeline_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create timeline shares"
  ON public.timeline_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for timeline_user_progress
CREATE POLICY "Users can view their own timeline progress"
  ON public.timeline_user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline progress"
  ON public.timeline_user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline progress"
  ON public.timeline_user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timeline_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for timeline_content
CREATE TRIGGER update_timeline_content_updated_at
  BEFORE UPDATE ON public.timeline_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timeline_content_updated_at();

-- Enable realtime for timeline tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_activities;