import { Database } from '../../types/database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Poll = Tables<'polls'>;
export type PollOption = Tables<'poll_options'>;
export type Vote = Tables<'votes'>;
export type Profile = Tables<'profiles'>;

export interface PollWithOptions extends Poll {
  options: PollOption[];
  total_votes: number;
  has_voted?: boolean;
  user_vote?: string;
}

export interface PollResults extends Poll {
  options: Array<PollOption & { votes: number; percentage: number }>;
  total_votes: number;
}

export interface GlobalStats {
  total_polls: number;
  total_votes: number;
  total_users: number;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}