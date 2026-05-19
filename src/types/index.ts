export type UserRole = 'user' | 'cartomante' | 'admin';

export type SubscriptionStatus = 'free' | 'premium' | 'pro' | 'vip';

export type EmotionalState = 'sad' | 'neutral' | 'good' | 'great';

export type LifeArea = 'love' | 'work' | 'money' | 'health' | 'spiritual' | 'study' | 'relations' | 'generale';

export type Urgency = 'past' | 'present' | 'future' | 'advice';

export type ReadingMode = 'quick' | 'deep' | 'daily';

export type DeckType = 'tre_carte' | 'celtic_cross' | 'sincronia' | 'sogni' | 'situazioni';

export interface DreamSymbol {
  symbol: string;
  meaning: string;
  category?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  role_completed: boolean;
  subscription_status: SubscriptionStatus;
  premium_expires_at: string | null;
  created_at: string;
  interesse_specifico: string | null;
  regione: string | null;
  is_public: boolean;
  notifications_enabled: boolean;
  birth_date?: string | null;
  birth_time?: string | null;
}

export interface UserPreferences {
  user_id: string;
  emotional_state: EmotionalState | null;
  life_area: LifeArea | null;
  urgency: Urgency | null;
  reading_mode: ReadingMode | null;
  updated_at: string;
}

export interface Cartomante {
  id: string;
  bio: string | null;
  specializzazioni: string[];
  genere: string | null;
  eta: number | null;
  regione: string | null;
  social_links: SocialLinks;
  verified_at: string | null;
  created_at: string;
  user?: User;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  tiktok?: string;
}

export interface TarotCard {
  id: string;
  name: string;
  name_it: string;
  arcana: 'major' | 'minor';
  suit?: string;
  number?: number;
  image?: number; // require() result — bundled local asset
  keywords: string[];
  reversed_keywords: string[];
  reversed: boolean;
  meaning_up?: string;
  meaning_rev?: string;
  desc?: string;
}

export interface Reading {
  id: string;
  user_id: string;
  deck_type: DeckType;
  cards: TarotCard[];
  question: string;
  ai_interpretation: string;
  summary: string;
  followups: Array<{ question: string; answer: string }>;
  context: ReadingContext;
  dream_text: string | null;
  preview_image_url: string | null;
  is_daily: boolean;
  created_at: string;
}

export interface FollowUp {
  question: string;
  answer: string;
  timestamp: string;
}

export interface ReadingContext {
  emotional_state: EmotionalState;
  life_area: LifeArea;
  urgency: Urgency;
  deck_type?: DeckType;
  free_context?: string;
  user_question?: string;
}

export interface DailyCard {
  id: string;
  user_id: string;
  date: string;
  card: TarotCard;
  ai_message: string;
  created_at: string;
}

export type NotificationType = 'ping' | 'daily_card' | 'profile_visit' | 'social_click';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  card_id: number | null;
  note: string | null;
  read: boolean;
  created_at: string;
  actor?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}
