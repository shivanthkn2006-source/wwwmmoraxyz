-- Fix missing SET search_path on notification trigger functions
-- This prevents potential privilege escalation attacks through search_path manipulation

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_post_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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