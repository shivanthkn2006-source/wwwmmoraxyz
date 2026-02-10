-- Create post_ratings table
CREATE TABLE public.post_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_ratings
CREATE POLICY "Users can rate posts"
  ON public.post_ratings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their ratings"
  ON public.post_ratings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view ratings"
  ON public.post_ratings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add points and tier columns to profiles
ALTER TABLE public.profiles
ADD COLUMN total_points INTEGER DEFAULT 0,
ADD COLUMN current_tier TEXT DEFAULT NULL;

-- Create index for better performance
CREATE INDEX idx_post_ratings_post_id ON public.post_ratings(post_id);
CREATE INDEX idx_post_ratings_user_id ON public.post_ratings(user_id);

-- Function to calculate user points from ratings
CREATE OR REPLACE FUNCTION public.calculate_user_points(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_stars INTEGER;
BEGIN
  -- Sum all stars received on user's posts (each star = 5 points)
  SELECT COALESCE(SUM(pr.rating), 0)
  INTO total_stars
  FROM post_ratings pr
  JOIN posts p ON pr.post_id = p.id
  WHERE p.user_id = user_uuid;
  
  RETURN total_stars * 5;
END;
$$;

-- Function to determine tier based on points
CREATE OR REPLACE FUNCTION public.get_tier_from_points(points INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 35000 THEN
    RETURN 'Diamond';
  ELSIF points >= 20000 THEN
    RETURN 'Platinum';
  ELSIF points >= 10000 THEN
    RETURN 'Gold';
  ELSIF points >= 5000 THEN
    RETURN 'Silver';
  ELSIF points >= 2500 THEN
    RETURN 'Bronze';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Function to update user points and tier
CREATE OR REPLACE FUNCTION public.update_user_points_and_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  new_points INTEGER;
  old_tier TEXT;
  new_tier TEXT;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  -- Calculate new points
  new_points := calculate_user_points(post_owner_id);
  
  -- Get old tier
  SELECT current_tier INTO old_tier
  FROM profiles
  WHERE user_id = post_owner_id;
  
  -- Calculate new tier
  new_tier := get_tier_from_points(new_points);
  
  -- Update profile
  UPDATE profiles
  SET total_points = new_points,
      current_tier = new_tier
  WHERE user_id = post_owner_id;
  
  -- If tier changed and new tier is not null, create notification
  IF new_tier IS NOT NULL AND (old_tier IS NULL OR old_tier != new_tier) THEN
    INSERT INTO notifications (user_id, type, from_user_id)
    VALUES (post_owner_id, 'tier_upgrade', post_owner_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update points when rating is added/updated/deleted
CREATE TRIGGER update_points_on_rating_change
AFTER INSERT OR UPDATE OR DELETE ON public.post_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points_and_tier();

-- Add trigger to update updated_at
CREATE TRIGGER update_post_ratings_updated_at
BEFORE UPDATE ON public.post_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();