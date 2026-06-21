-- Create function to auto-seed behavioral events from user activity
CREATE OR REPLACE FUNCTION public.seed_behavioral_events_for_user(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events_created INTEGER := 0;
BEGIN
  -- Seed from posts
  INSERT INTO behavioral_events (user_id, event_type, event_category, context_snippet, metadata, sentiment_score)
  SELECT 
    p.user_id,
    'post_created',
    CASE 
      WHEN p.media_type = 'image' THEN 'visual_content'
      WHEN p.media_type = 'video' THEN 'video_content'
      ELSE 'content_creation' 
    END,
    LEFT(COALESCE(p.content, 'Media post'), 100),
    jsonb_build_object('post_id', p.id, 'media_type', p.media_type),
    0.7
  FROM posts p
  WHERE p.user_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM behavioral_events be 
    WHERE be.user_id = p.user_id 
    AND be.metadata->>'post_id' = p.id::text
  );
  
  GET DIAGNOSTICS v_events_created = ROW_COUNT;
  
  -- Seed from likes
  INSERT INTO behavioral_events (user_id, event_type, event_category, context_snippet, metadata, sentiment_score)
  SELECT 
    pl.user_id,
    'like_post',
    'social_engagement',
    'Liked a post',
    jsonb_build_object('post_id', pl.post_id),
    0.8
  FROM post_likes pl
  WHERE pl.user_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM behavioral_events be 
    WHERE be.user_id = pl.user_id 
    AND be.event_type = 'like_post'
    AND be.metadata->>'post_id' = pl.post_id::text
  );
  
  -- Seed from comments
  INSERT INTO behavioral_events (user_id, event_type, event_category, context_snippet, metadata, sentiment_score)
  SELECT 
    pc.user_id,
    'comment_created',
    'social_engagement',
    LEFT(pc.content, 100),
    jsonb_build_object('comment_id', pc.id, 'post_id', pc.post_id),
    0.75
  FROM post_comments pc
  WHERE pc.user_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM behavioral_events be 
    WHERE be.user_id = pc.user_id 
    AND be.metadata->>'comment_id' = pc.id::text
  );
  
  -- Update zoe_settings with new event count
  UPDATE zoe_settings
  SET 
    event_count = (SELECT COUNT(*) FROM behavioral_events WHERE user_id = p_user_id),
    sync_percentage = LEAST(100, (SELECT COUNT(*) FROM behavioral_events WHERE user_id = p_user_id)::NUMERIC * 0.5)::INTEGER,
    last_event_sync_at = NOW()
  WHERE user_id = p_user_id;
  
  -- If no zoe_settings exist, create one
  INSERT INTO zoe_settings (user_id, event_count, sync_percentage, last_event_sync_at)
  SELECT 
    p_user_id,
    (SELECT COUNT(*) FROM behavioral_events WHERE user_id = p_user_id),
    LEAST(100, (SELECT COUNT(*) FROM behavioral_events WHERE user_id = p_user_id)::NUMERIC * 0.5)::INTEGER,
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM zoe_settings WHERE user_id = p_user_id);
  
  RETURN v_events_created;
END;
$$;

-- Create trigger to auto-seed events when a user creates their first post
CREATE OR REPLACE FUNCTION public.trigger_seed_on_first_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is user's first activity
  IF TG_TABLE_NAME = 'posts' THEN
    IF (SELECT COUNT(*) FROM posts WHERE user_id = NEW.user_id) = 1 THEN
      PERFORM seed_behavioral_events_for_user(NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS seed_on_first_post ON posts;
CREATE TRIGGER seed_on_first_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_on_first_activity();