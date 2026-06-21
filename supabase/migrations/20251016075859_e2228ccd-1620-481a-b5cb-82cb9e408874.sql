-- Create post_tags table for tracking user tags in posts
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(post_id, tagged_user_id)
);

-- Enable RLS on post_tags
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_tags
CREATE POLICY "Users can view tags"
  ON public.post_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create tags"
  ON public.post_tags FOR INSERT
  WITH CHECK (auth.uid() = tagged_by_user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.post_tags FOR DELETE
  USING (auth.uid() = tagged_by_user_id);

-- Create notification trigger for post tags
CREATE OR REPLACE FUNCTION public.notify_post_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create notification if tagger is not the tagged user
  IF NEW.tagged_by_user_id != NEW.tagged_user_id THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id)
    VALUES (
      NEW.tagged_user_id,
      'post_tag',
      NEW.tagged_by_user_id,
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for post tag notifications
DROP TRIGGER IF EXISTS on_post_tag_created ON public.post_tags;
CREATE TRIGGER on_post_tag_created
  AFTER INSERT ON public.post_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_tag();

-- Create notification trigger for friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification when friend request is sent
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, from_user_id)
    VALUES (
      NEW.receiver_id,
      'friend_request',
      NEW.sender_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for friend request notifications
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friend_requests;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();