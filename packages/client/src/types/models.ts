export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  status: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Server {
  _id: string;
  name: string;
  ownerId: string;
  icon?: string;
  description?: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  _id: string;
  serverId: string;
  name: string;
  type: 'text' | 'voice';
  topic?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  attachmentIds: string[];
  editedAt?: string;
  createdAt: string;
}

export interface ServerMember {
  _id: string;
  serverId: string;
  userId: string;
  nickname?: string | undefined;
  roles: string[];
  joinedAt: string;
  username?: string | undefined;
  display_name?: string | null | undefined;
}

export interface Invite {
  _id: string;
  serverId: string;
  code: string;
  createdBy: string;
  maxUses?: number;
  uses: number;
  expiresAt?: string;
  revoked: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  uploader_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  status: 'processing' | 'ready' | 'failed';
  url: string | null;
  created_at: string;
}
