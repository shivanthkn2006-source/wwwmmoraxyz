-- Create saved_posts table
CREATE TABLE public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_posts
CREATE POLICY "Users can save posts"
  ON public.saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their saved posts"
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON public.saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create post_preferences table
CREATE TABLE public.post_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  preference TEXT NOT NULL CHECK (preference IN ('interested', 'not_interested')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_preferences
CREATE POLICY "Users can set preferences"
  ON public.post_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their preferences"
  ON public.post_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update preferences"
  ON public.post_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete preferences"
  ON public.post_preferences FOR DELETE
  USING (auth.uid() = user_id);