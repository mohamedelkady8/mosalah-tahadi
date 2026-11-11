import type { GameType } from '@/lib/games/types';
import type { GameKind } from '@/lib/kinds';

export type UserRole = 'student' | 'admin' | 'support';
export type GameStatus = 'draft' | 'published';

export interface Grade {
  id: string;
  slug: string;
  name: string;
  label: string;
  subtitle: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface Track {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface GradeWithTracks extends Grade {
  trackIds: string[];
}

export interface Catalog {
  grades: GradeWithTracks[];
  tracks: Track[];
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  grade_id: string | null;
  track_id: string | null;
  role: UserRole;
  points: number;
  avatar_url: string | null;
  created_at: string;
}

export interface GameRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  content: unknown;
  settings: unknown;
  item_count: number;
  cover_url: string | null;
  topic: string | null;
  difficulty: number;
  status: GameStatus;
  kind: GameKind;
  starts_at: string | null;
  ends_at: string | null;
  prize: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type GameCard = Pick<
  GameRow,
  'id' | 'slug' | 'title' | 'description' | 'type' | 'item_count' | 'cover_url' | 'topic' | 'difficulty' | 'settings'
>;

export interface GameTarget {
  game_id: string;
  grade_id: string;
  track_id: string | null;
}

export interface Attempt {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_count: number;
  duration_ms: number;
  created_at: string;
}

export interface Quote {
  id: string;
  text: string;
  active: boolean;
  sort_order: number;
}

export interface Tip {
  id: string;
  body: string;
  grade_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  description: string;
  cover_url: string | null;
  grade_id: string | null;
  active: boolean;
  created_at: string;
}

export interface DailyQuestion {
  id: string;
  /** YYYY-MM-DD, Egypt's calendar. */
  day: string;
  grade_id: string | null;
  question: string;
  image_url: string | null;
  post_url: string | null;
  created_at: string;
}
