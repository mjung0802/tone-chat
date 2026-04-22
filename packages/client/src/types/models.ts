export interface User {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
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
  customTones?: CustomToneDefinition[] | undefined;
  allowMemberInvites?: boolean | undefined;
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

export interface ServerInvitePayload {
  code: string;
  serverId: string;
  serverName: string;
}

export interface Message {
  _id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  attachmentIds: string[];
  editedAt?: string;
  reactions?: { emoji: string; userIds: string[] }[] | undefined;
  replyTo?: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
  mentions?: string[] | undefined;
  tone?: string | undefined;
  serverInvite?: ServerInvitePayload | undefined;
  createdAt: string;
}

export interface CustomToneDefinition {
  key: string;
  label: string;
  emoji: string;
  colorLight: string;
  colorDark: string;
  textStyle: 'normal' | 'italic' | 'medium';
  char?: 'bounce' | 'tilt' | 'lock' | 'sway' | 'wobble' | 'rise' | 'sink' | 'breathe' | 'jitter' | undefined;
  emojiSet?: string[] | undefined;
  driftDir?: 'UR' | 'U' | 'R' | 'F' | undefined;
  matchEmojis?: string[] | undefined;
}

export interface ServerMember {
  _id: string;
  serverId: string;
  userId: string;
  nickname?: string | undefined;
  role: string;
  mutedUntil?: string | null | undefined;
  joinedAt: string;
  username?: string | undefined;
  display_name?: string | null | undefined;
  avatar_url?: string | null | undefined;
}

export interface ServerBan {
  serverId: string;
  userId: string;
  reason?: string | undefined;
  bannedBy: string;
  bannedAt: string;
  username?: string | undefined;
  display_name?: string | null | undefined;
}

export type AuditAction = 'mute' | 'unmute' | 'kick' | 'ban' | 'unban' | 'promote' | 'demote';

export type AuditMetadata =
  | { duration: number }
  | { reason?: string | undefined }
  | { fromRole: string; toRole: string }
  | Record<string, never>;

export interface AuditLogEntry {
  _id: string;
  serverId: string;
  action: AuditAction;
  actorId: string;
  targetId: string;
  metadata: AuditMetadata;
  createdAt: string;
  actorUsername?: string | undefined;
  actorDisplayName?: string | null | undefined;
  targetUsername?: string | undefined;
  targetDisplayName?: string | null | undefined;
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

export interface FriendEntry {
  userId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  since: string;
}

export interface FriendRequest {
  userId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  direction: 'incoming' | 'outgoing';
  created_at: string;
}

export type FriendshipStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends';

export interface DirectConversation {
  _id: string;
  participantIds: [string, string];
  lastMessageAt: string | null;
  lastMessage: DirectMessage | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  _id: string;
  conversationId: string;
  authorId: string;
  content: string | null;
  attachmentIds: string[];
  replyTo?: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
  mentions: string[];
  reactions: { emoji: string; userIds: string[] }[];
  tone: string | null;
  editedAt: string | null;
  serverInvite?: ServerInvitePayload | undefined;
  createdAt: string;
}
