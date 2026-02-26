export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  status: string;
  bio: string | null;
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
