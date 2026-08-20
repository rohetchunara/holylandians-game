/*
# HOLYLANDIANS Expansion: Groups, Marketplace, DMs, Feed, Quizzes

Adds tables for study groups, e-commerce marketplace, direct messaging,
global feed, and quiz system. All use anon+authenticated RLS (no Supabase auth).
*/

-- ===== STUDY GROUPS =====
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  password text,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_groups" ON groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== GROUP MEMBERS =====
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_group_members" ON group_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== GROUP CHAT =====
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  content text,
  media_url text,
  media_type text,
  reply_to uuid REFERENCES group_chat_messages(id) ON DELETE SET NULL,
  deleted_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_group_chat" ON group_chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_group_chat ON group_chat_messages (group_id, created_at);

-- ===== GROUP MEDIA VAULT =====
CREATE TABLE IF NOT EXISTS group_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'image',
  caption text,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE group_media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_group_media" ON group_media_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_group_media ON group_media_items (group_id, created_at);

-- ===== GROUP REWARDS =====
CREATE TABLE IF NOT EXISTS group_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  cost integer NOT NULL,
  icon text NOT NULL DEFAULT 'gift',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE group_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_group_rewards" ON group_rewards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== MARKETPLACE =====
CREATE TABLE IF NOT EXISTS marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  seller_name text NOT NULL,
  title text NOT NULL,
  description text,
  price integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'Good',
  category text NOT NULL DEFAULT 'Books',
  image_url text,
  status text NOT NULL DEFAULT 'available', -- available | sold | requested
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_marketplace" ON marketplace_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_marketplace ON marketplace_items (created_at);

-- ===== DIRECT MESSAGES =====
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  media_type text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_dms" ON direct_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_dms ON direct_messages (sender_id, recipient_id, created_at);

-- ===== FEED POSTS =====
CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_feed" ON feed_posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_feed ON feed_posts (created_at);

-- ===== QUIZZES =====
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_quizzes" ON quizzes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== QUIZ QUESTIONS =====
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL, -- 'a' | 'b' | 'c' | 'd'
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_quiz_questions" ON quiz_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== QUIZ ATTEMPTS =====
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud_quiz_attempts" ON quiz_attempts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===== SEED SAMPLE QUIZ =====
INSERT INTO quizzes (creator_name, title, description, category)
SELECT 'HOLYLANDIANS', 'General Knowledge Challenge', 'Test your trivia skills and earn points!', 'General'
WHERE NOT EXISTS (SELECT 1 FROM quizzes LIMIT 1);

INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
SELECT q.id, 'What is the capital of France?', 'London', 'Paris', 'Berlin', 'Madrid', 'b'
FROM quizzes q WHERE q.title = 'General Knowledge Challenge'
AND NOT EXISTS (SELECT 1 FROM quiz_questions LIMIT 1);

INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
SELECT q.id, 'Which planet is known as the Red Planet?', 'Venus', 'Jupiter', 'Mars', 'Saturn', 'c'
FROM quizzes q WHERE q.title = 'General Knowledge Challenge';

INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
SELECT q.id, 'What is 15 x 12?', '170', '180', '190', '200', 'b'
FROM quizzes q WHERE q.title = 'General Knowledge Challenge';

INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
SELECT q.id, 'Who wrote "Romeo and Juliet"?', 'Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain', 'b'
FROM quizzes q WHERE q.title = 'General Knowledge Challenge';

INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
SELECT q.id, 'What is the largest ocean on Earth?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 'd'
FROM quizzes q WHERE q.title = 'General Knowledge Challenge';
