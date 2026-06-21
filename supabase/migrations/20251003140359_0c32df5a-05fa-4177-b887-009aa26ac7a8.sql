-- Ensure all foreign keys to profiles are properly set up

-- Fix post_comments foreign key
ALTER TABLE post_comments
DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

ALTER TABLE post_comments
ADD CONSTRAINT post_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Fix friend_requests foreign keys
ALTER TABLE friend_requests
DROP CONSTRAINT IF EXISTS friend_requests_sender_id_fkey;

ALTER TABLE friend_requests
DROP CONSTRAINT IF EXISTS friend_requests_receiver_id_fkey;

ALTER TABLE friend_requests
ADD CONSTRAINT friend_requests_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE friend_requests
ADD CONSTRAINT friend_requests_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Ensure posts foreign key is correct
ALTER TABLE posts
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE posts
ADD CONSTRAINT posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Ensure messages foreign keys are correct
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE messages
ADD CONSTRAINT messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES profiles(user_id) ON DELETE CASCADE;