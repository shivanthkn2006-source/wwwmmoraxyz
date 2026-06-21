-- Create private_timelines table
CREATE TABLE public.private_timelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create private_timeline_members table (many-to-many)
CREATE TABLE public.private_timeline_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID NOT NULL REFERENCES public.private_timelines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by_user_id UUID NOT NULL,
  UNIQUE(timeline_id, user_id)
);

-- Add private_timeline_id to posts table
ALTER TABLE public.posts
ADD COLUMN private_timeline_id UUID REFERENCES public.private_timelines(id) ON DELETE SET NULL;

-- Add image_url to post_comments table for comment images
ALTER TABLE public.post_comments
ADD COLUMN image_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.private_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_timeline_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_timelines
CREATE POLICY "Users can view their private timelines"
  ON public.private_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.private_timeline_members
      WHERE timeline_id = private_timelines.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create private timelines"
  ON public.private_timelines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Timeline members can update timeline"
  ON public.private_timelines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.private_timeline_members
      WHERE timeline_id = private_timelines.id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for private_timeline_members
CREATE POLICY "Users can view members of their timelines"
  ON public.private_timeline_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.private_timeline_members ptm
      WHERE ptm.timeline_id = private_timeline_members.timeline_id
      AND ptm.user_id = auth.uid()
    )
  );

CREATE POLICY "Timeline members can add new members"
  ON public.private_timeline_members FOR INSERT
  WITH CHECK (
    auth.uid() = added_by_user_id
    AND EXISTS (
      SELECT 1 FROM public.private_timeline_members
      WHERE timeline_id = private_timeline_members.timeline_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Timeline members can remove members"
  ON public.private_timeline_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.private_timeline_members ptm
      WHERE ptm.timeline_id = private_timeline_members.timeline_id
      AND ptm.user_id = auth.uid()
    )
  );

-- Update posts RLS to include private timeline posts
CREATE POLICY "Users can view private timeline posts"
  ON public.posts FOR SELECT
  USING (
    private_timeline_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.private_timeline_members
      WHERE timeline_id = posts.private_timeline_id
      AND user_id = auth.uid()
    )
  );

-- Add trigger to update private_timelines updated_at
CREATE TRIGGER update_private_timelines_updated_at
  BEFORE UPDATE ON public.private_timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_posts_private_timeline_id ON public.posts(private_timeline_id);
CREATE INDEX idx_private_timeline_members_timeline_id ON public.private_timeline_members(timeline_id);
CREATE INDEX idx_private_timeline_members_user_id ON public.private_timeline_members(user_id);