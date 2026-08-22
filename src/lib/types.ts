export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  color_theme: string;
  points: number;
  is_admin: boolean;
  is_banned: boolean;
  last_seen: string;
  created_at: string;
  email: string | null;
  bio: string | null;
  gpa: string | null;
  grade: string | null;
  student_status: string | null;
  verified: boolean;
  verification_requested: boolean;
  name_locked: boolean;
}

export interface ChatMessage {
  id: string;
  profile_id: string | null;
  profile_name: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to: string | null;
  deleted_by_admin: boolean;
  created_at: string;
}

export interface MediaItem {
  id: string;
  profile_id: string | null;
  profile_name: string;
  url: string;
  type: string;
  caption: string | null;
  likes: number;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  profile_id: string | null;
  reward_name: string;
  cost: number;
  created_at: string;
}

export interface GameScore {
  id: string;
  profile_id: string | null;
  profile_name: string;
  game: string;
  score: number;
  created_at: string;
}

export interface SkyBattleState {
  id: string;
  profile_id: string;
  profile_name: string;
  x: number;
  y: number;
  health: number;
  is_alive: boolean;
  kills: number;
  updated_at: string;
}

export interface TraitorGame {
  id: string;
  code: string;
  host_id: string | null;
  host_name: string;
  status: string;
  phase: string;
  traitor_id: string | null;
  round: number;
  created_at: string;
}

export interface TraitorPlayer {
  id: string;
  game_id: string;
  profile_id: string;
  profile_name: string;
  role: string | null;
  is_alive: boolean;
  tasks_completed: number;
  total_tasks: number;
  voted_for: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  password: string | null;
  creator_id: string | null;
  creator_name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  profile_name: string;
  joined_at: string;
}

export interface GroupChatMessage {
  id: string;
  group_id: string;
  profile_id: string | null;
  profile_name: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to: string | null;
  deleted_by_admin: boolean;
  created_at: string;
}

export interface GroupMediaItem {
  id: string;
  group_id: string;
  profile_id: string | null;
  profile_name: string;
  url: string;
  type: string;
  caption: string | null;
  likes: number;
  created_at: string;
}

export interface GroupReward {
  id: string;
  group_id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string | null;
  seller_name: string;
  title: string;
  description: string | null;
  price: number;
  condition: string;
  category: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  read_at: string | null;
  created_at: string;
}

export interface FeedPost {
  id: string;
  profile_id: string | null;
  profile_name: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  likes: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  creator_id: string | null;
  creator_name: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  profile_id: string;
  profile_name: string;
  score: number;
  total_questions: number;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  profile_id: string;
  profile_name: string;
  status: string;
  payment_ref: string | null;
  created_at: string;
}
