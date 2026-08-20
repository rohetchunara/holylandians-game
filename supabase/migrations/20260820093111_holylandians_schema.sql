/*
# HOLYLANDIANS Community Lounge Schema

## Overview
Full schema for the HOLYLANDIANS community lounge app — a password-gated social
lounge with live chat, media vault, profiles, rewards, admin moderation, and two
mini-games (Sky Battle multiplayer dogfight + The Traitor social deduction).

## Authentication Model
This app uses a CUSTOM identity flow: a password gate ("lado") followed by a
profile setup wizard. There is NO Supabase email/password auth. Every browser
talks to the database with the anon key, so ALL policies use
`TO anon, authenticated` and the data is intentionally public/shared within the
lounge community. Admin privileges (message deletion, user bans) are tracked via
the `is_admin` flag on `profiles` and enforced in the application layer.

## New Tables
1. `profiles` — community members (display name, avatar, theme color, points, admin/ban flags)
2. `chat_messages` — real-time chat with optional media + quote/reply
3. `media_items` — media vault gallery entries
4. `rewards` — redeemable community perks (catalog)
5. `reward_redemptions` — points redemption history per member
6. `game_scores` — per-game high scores
7. `sky_battle_state` — live multiplayer dogfight presence/state
8. `traitor_games` — social deduction game rooms
9. `traitor_players` — players in a traitor game (role, alive, votes)

## Security
- RLS enabled on every table.
- All policies `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the lounge is intentionally a shared, public-within-community space
  accessed via the anon key (no Supabase auth session).
- Storage bucket `holylandians-media` created as public for chat/gallery uploads.

## Important Notes
1. The first profile to register can be flagged `is_admin = true` manually in the
   DB, or the app may designate the first registered user as admin automatically.
2. `sky_battle_state` rows are ephemeral; a cleanup function or TTL is recommended
   for stale presence rows (updated_at older than ~30s).
3. `traitor_games` uses a room-code system so players can join specific games.
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  avatar_url text,
  color_theme text NOT NULL DEFAULT 'blue',
  points integer NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ===== CHAT MESSAGES =====
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  content text,
  media_url text,
  media_type text,
  reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  deleted_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat" ON chat_messages;
CREATE POLICY "anon_update_chat" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages (created_at DESC);

-- ===== MEDIA VAULT =====
CREATE TABLE IF NOT EXISTS media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'image',
  caption text,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_media" ON media_items;
CREATE POLICY "anon_select_media" ON media_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_media" ON media_items;
CREATE POLICY "anon_insert_media" ON media_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_media" ON media_items;
CREATE POLICY "anon_update_media" ON media_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_media" ON media_items;
CREATE POLICY "anon_delete_media" ON media_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media_items (created_at DESC);

-- ===== REWARDS CATALOG =====
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  cost integer NOT NULL,
  icon text NOT NULL DEFAULT 'gift',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rewards" ON rewards;
CREATE POLICY "anon_select_rewards" ON rewards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rewards" ON rewards;
CREATE POLICY "anon_insert_rewards" ON rewards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rewards" ON rewards;
CREATE POLICY "anon_update_rewards" ON rewards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rewards" ON rewards;
CREATE POLICY "anon_delete_rewards" ON rewards FOR DELETE
  TO anon, authenticated USING (true);

-- ===== REWARD REDEMPTIONS =====
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reward_name text NOT NULL,
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_redemptions" ON reward_redemptions;
CREATE POLICY "anon_select_redemptions" ON reward_redemptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_redemptions" ON reward_redemptions;
CREATE POLICY "anon_insert_redemptions" ON reward_redemptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ===== GAME SCORES =====
CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  game text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scores" ON game_scores;
CREATE POLICY "anon_select_scores" ON game_scores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scores" ON game_scores;
CREATE POLICY "anon_insert_scores" ON game_scores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scores" ON game_scores;
CREATE POLICY "anon_update_scores" ON game_scores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores (game, score DESC);

-- ===== SKY BATTLE LIVE STATE =====
CREATE TABLE IF NOT EXISTS sky_battle_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  x double precision NOT NULL DEFAULT 100,
  y double precision NOT NULL DEFAULT 200,
  health integer NOT NULL DEFAULT 5,
  is_alive boolean NOT NULL DEFAULT true,
  kills integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sky_battle_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_skybattle" ON sky_battle_state;
CREATE POLICY "anon_select_skybattle" ON sky_battle_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_skybattle" ON sky_battle_state;
CREATE POLICY "anon_insert_skybattle" ON sky_battle_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_skybattle" ON sky_battle_state;
CREATE POLICY "anon_update_skybattle" ON sky_battle_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_skybattle" ON sky_battle_state;
CREATE POLICY "anon_delete_skybattle" ON sky_battle_state FOR DELETE
  TO anon, authenticated USING (true);

-- ===== TRAITOR GAMES =====
CREATE TABLE IF NOT EXISTS traitor_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  host_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting', -- waiting | playing | finished
  phase text NOT NULL DEFAULT 'lobby',    -- lobby | tasks | discussion | voting | result
  traitor_id uuid,
  round integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE traitor_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_traitor_games" ON traitor_games;
CREATE POLICY "anon_select_traitor_games" ON traitor_games FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_traitor_games" ON traitor_games;
CREATE POLICY "anon_insert_traitor_games" ON traitor_games FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_traitor_games" ON traitor_games;
CREATE POLICY "anon_update_traitor_games" ON traitor_games FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_traitor_games" ON traitor_games;
CREATE POLICY "anon_delete_traitor_games" ON traitor_games FOR DELETE
  TO anon, authenticated USING (true);

-- ===== TRAITOR PLAYERS =====
CREATE TABLE IF NOT EXISTS traitor_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES traitor_games(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  role text, -- crewmate | traitor
  is_alive boolean NOT NULL DEFAULT true,
  tasks_completed integer NOT NULL DEFAULT 0,
  total_tasks integer NOT NULL DEFAULT 3,
  voted_for uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, profile_id)
);
ALTER TABLE traitor_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_traitor_players" ON traitor_players;
CREATE POLICY "anon_select_traitor_players" ON traitor_players FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_traitor_players" ON traitor_players;
CREATE POLICY "anon_insert_traitor_players" ON traitor_players FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_traitor_players" ON traitor_players;
CREATE POLICY "anon_update_traitor_players" ON traitor_players FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_traitor_players" ON traitor_players;
CREATE POLICY "anon_delete_traitor_players" ON traitor_players FOR DELETE
  TO anon, authenticated USING (true);

-- ===== SEED REWARDS =====
INSERT INTO rewards (name, description, cost, icon)
VALUES
  ('VIP Lounge Access', 'Unlock the exclusive VIP chat room channel', 500, 'crown'),
  ('Custom Avatar Frame', 'Premium animated frame around your avatar', 300, 'sparkles'),
  ('Profile Boost', 'Pin your profile to the top of the members list for 24h', 200, 'trending-up'),
  ('Exclusive Color Theme', 'Unlock rare gradient color themes for your profile', 250, 'palette'),
  ('Name Glow Effect', 'Your name glows in chat with a custom color', 150, 'zap'),
  ('Double Points Booster', 'Earn 2x points on all activities for 1 hour', 400, 'rocket'),
  ('Custom Emoji Pack', 'Personal emoji set for chat', 350, 'smile'),
  ('Sky Battle Skin', 'Exclusive plane skin for Sky Battle', 600, 'plane')
ON CONFLICT DO NOTHING;

-- ===== STORAGE BUCKET =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('holylandians-media', 'holylandians-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_upload_media" ON storage.objects;
CREATE POLICY "anon_upload_media" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'holylandians-media');

DROP POLICY IF EXISTS "anon_read_media" ON storage.objects;
CREATE POLICY "anon_read_media" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'holylandians-media');

DROP POLICY IF EXISTS "anon_delete_media" ON storage.objects;
CREATE POLICY "anon_delete_media" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'holylandians-media');
