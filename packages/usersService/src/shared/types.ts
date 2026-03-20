export interface User {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  pronouns?: string;
  avatar_url?: string;
  status: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}
