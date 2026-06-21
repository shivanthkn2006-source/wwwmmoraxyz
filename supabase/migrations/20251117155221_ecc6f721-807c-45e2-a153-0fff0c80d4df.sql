-- Create tutorial progress table
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tutorial progress"
  ON public.tutorial_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutorial progress"
  ON public.tutorial_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutorial progress"
  ON public.tutorial_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_tutorial_progress_user_id ON public.tutorial_progress(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_tutorial_progress_updated_at
  BEFORE UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();