-- Add foreign keys to connect posts and profiles properly
ALTER TABLE posts 
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;