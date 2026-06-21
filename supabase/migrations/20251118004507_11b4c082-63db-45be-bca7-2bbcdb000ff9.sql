-- Create challenge seasons table
CREATE TABLE IF NOT EXISTS public.challenge_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  season_type text DEFAULT 'weekly',
  theme text,
  bonus_multiplier numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create badge collections table
CREATE TABLE IF NOT EXISTS public.badge_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id text UNIQUE NOT NULL,
  collection_name text NOT NULL,
  description text,
  badge_ids jsonb NOT NULL DEFAULT '[]',
  bonus_badge_id text,
  bonus_points integer DEFAULT 0,
  theme text,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user collections progress table
CREATE TABLE IF NOT EXISTS public.user_collection_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collection_id text NOT NULL,
  earned_badge_ids jsonb DEFAULT '[]',
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  bonus_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create seasonal challenges table (links challenges to seasons)
CREATE TABLE IF NOT EXISTS public.seasonal_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.challenge_seasons(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  is_exclusive boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenge_seasons
CREATE POLICY "Anyone can view active seasons"
  ON public.challenge_seasons
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for badge_collections
CREATE POLICY "Anyone can view badge collections"
  ON public.badge_collections
  FOR SELECT
  USING (true);

-- RLS Policies for user_collection_progress
CREATE POLICY "Users can view their own collection progress"
  ON public.user_collection_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collection progress"
  ON public.user_collection_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection progress"
  ON public.user_collection_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for seasonal_challenges
CREATE POLICY "Anyone can view seasonal challenges"
  ON public.seasonal_challenges
  FOR SELECT
  USING (true);

-- Enable realtime for user_badges and user_challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_challenges;

-- Insert sample badge collections
INSERT INTO public.badge_collections (collection_id, collection_name, description, badge_ids, bonus_badge_id, bonus_points, theme, icon)
VALUES 
  ('social_master', 'Social Master Collection', 'Master all social features', '["first_friend", "social_butterfly", "influencer"]', 'social_legend', 500, 'Social', '👥'),
  ('voice_expert', 'Voice Expert Collection', 'Become a voice command expert', '["voice_novice", "voice_master", "voice_wizard"]', 'voice_legend', 500, 'Voice', '🎤'),
  ('content_creator', 'Content Creator Collection', 'Excel at content creation', '["first_post", "content_king", "viral_sensation"]', 'content_legend', 500, 'Content', '✍️'),
  ('explorer', 'Explorer Collection', 'Discover all features', '["curious_mind", "feature_hunter", "platform_expert"]', 'master_explorer', 1000, 'Discovery', '🔍');

-- Insert sample challenge season
INSERT INTO public.challenge_seasons (season_name, description, start_date, end_date, season_type, theme, bonus_multiplier)
VALUES 
  ('Winter Challenge 2025', 'Special winter-themed challenges with bonus rewards', NOW(), NOW() + INTERVAL '30 days', 'monthly', 'Winter', 1.5);

-- Create function to check collection completion
CREATE OR REPLACE FUNCTION public.check_collection_completion()
RETURNS TRIGGER AS $$
DECLARE
  collection_record RECORD;
  user_badge_ids text[];
BEGIN
  -- Get all badge IDs the user has earned
  SELECT array_agg(badge_id) INTO user_badge_ids
  FROM public.user_badges
  WHERE user_id = NEW.user_id;

  -- Check each collection
  FOR collection_record IN 
    SELECT * FROM public.badge_collections
  LOOP
    -- Check if user has all badges in this collection
    IF collection_record.badge_ids <@ to_jsonb(user_badge_ids) THEN
      -- Insert or update collection progress
      INSERT INTO public.user_collection_progress (user_id, collection_id, earned_badge_ids, is_completed, completed_at)
      VALUES (NEW.user_id, collection_record.collection_id, collection_record.badge_ids, true, NOW())
      ON CONFLICT (user_id, collection_id) 
      DO UPDATE SET 
        is_completed = true,
        completed_at = NOW(),
        earned_badge_ids = collection_record.badge_ids;

      -- Award bonus badge if not already claimed
      IF collection_record.bonus_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id, badge_name, badge_description, badge_icon)
        SELECT 
          NEW.user_id,
          collection_record.bonus_badge_id,
          'Bonus: ' || collection_record.collection_name,
          'Completed the ' || collection_record.collection_name,
          collection_record.icon
        ON CONFLICT DO NOTHING;
      END IF;

      -- Award bonus points
      IF collection_record.bonus_points > 0 THEN
        UPDATE public.profiles
        SET total_points = COALESCE(total_points, 0) + collection_record.bonus_points
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for collection completion
DROP TRIGGER IF EXISTS trigger_check_collection_completion ON public.user_badges;
CREATE TRIGGER trigger_check_collection_completion
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.check_collection_completion();

-- Create function to notify friends about badge earned
CREATE OR REPLACE FUNCTION public.notify_friends_badge_earned()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all friends
  INSERT INTO public.notifications (user_id, type, from_user_id, context_data)
  SELECT 
    CASE 
      WHEN f.user1_id = NEW.user_id THEN f.user2_id
      ELSE f.user1_id
    END as friend_id,
    'friend_badge_earned',
    NEW.user_id,
    jsonb_build_object(
      'badge_id', NEW.badge_id,
      'badge_name', NEW.badge_name,
      'badge_icon', NEW.badge_icon
    )
  FROM public.friendships f
  WHERE f.user1_id = NEW.user_id OR f.user2_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend badge notifications
DROP TRIGGER IF EXISTS trigger_notify_friends_badge ON public.user_badges;
CREATE TRIGGER trigger_notify_friends_badge
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friends_badge_earned();

-- Create function to notify friends about challenge completion
CREATE OR REPLACE FUNCTION public.notify_friends_challenge_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    -- Insert notifications for all friends
    INSERT INTO public.notifications (user_id, type, from_user_id, context_data)
    SELECT 
      CASE 
        WHEN f.user1_id = NEW.user_id THEN f.user2_id
        ELSE f.user1_id
      END as friend_id,
      'friend_challenge_completed',
      NEW.user_id,
      jsonb_build_object(
        'challenge_id', NEW.challenge_id
      )
    FROM public.friendships f
    WHERE f.user1_id = NEW.user_id OR f.user2_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend challenge notifications
DROP TRIGGER IF EXISTS trigger_notify_friends_challenge ON public.user_challenges;
CREATE TRIGGER trigger_notify_friends_challenge
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friends_challenge_completed();

-- Add unique constraint to user_collection_progress
ALTER TABLE public.user_collection_progress 
ADD CONSTRAINT user_collection_progress_user_collection_unique 
UNIQUE (user_id, collection_id);