-- Create function to notify on post like
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the liker is not the post author
  IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id)
    VALUES (
      (SELECT user_id FROM posts WHERE id = NEW.post_id),
      'post_like',
      NEW.user_id,
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post likes
DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;
CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

-- Create function to notify on comment
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if commenter is not the post author
  IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id)
    VALUES (
      (SELECT user_id FROM posts WHERE id = NEW.post_id),
      'post_comment',
      NEW.user_id,
      NEW.post_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post comments
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- Create function to notify on comment like
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if liker is not the comment author
  IF NEW.user_id != (SELECT user_id FROM post_comments WHERE id = NEW.comment_id) THEN
    INSERT INTO notifications (user_id, type, from_user_id, comment_id)
    VALUES (
      (SELECT user_id FROM post_comments WHERE id = NEW.comment_id),
      'comment_like',
      NEW.user_id,
      NEW.comment_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for comment likes
DROP TRIGGER IF EXISTS trigger_notify_comment_like ON comment_likes;
CREATE TRIGGER trigger_notify_comment_like
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();

-- Create function to notify on comment reply
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on replies (when parent_comment_id is not null)
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Only create notification if replier is not the parent comment author
    IF NEW.user_id != (SELECT user_id FROM post_comments WHERE id = NEW.parent_comment_id) THEN
      INSERT INTO notifications (user_id, type, from_user_id, comment_id)
      VALUES (
        (SELECT user_id FROM post_comments WHERE id = NEW.parent_comment_id),
        'comment_reply',
        NEW.user_id,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for comment replies
DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON post_comments;
CREATE TRIGGER trigger_notify_comment_reply
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply();