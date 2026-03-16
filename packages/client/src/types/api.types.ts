import type {
  User,
  Server,
  Channel,
  Message,
  ServerMember,
  Invite,
  Attachment,
} from "./models";

export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  display_name?: string | undefined;
  pronouns?: string | undefined;
  avatar_url?: string | undefined;
  bio?: string | undefined;
  status?: string | undefined;
}

export interface CreateServerRequest {
  name: string;
  description?: string | undefined;
  visibility?: "public" | "private" | undefined;
}

export interface UpdateServerRequest {
  name?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  visibility?: "public" | "private" | undefined;
}

export interface CreateChannelRequest {
  name: string;
  type?: "text" | "voice" | undefined;
  topic?: string | undefined;
}

export interface UpdateChannelRequest {
  name?: string | undefined;
  topic?: string | undefined;
  position?: number | undefined;
}

export interface SendMessageRequest {
  content: string;
  attachmentIds?: string[] | undefined;
  replyToId?: string | undefined;
  mentions?: string[] | undefined;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface ToggleReactionRequest {
  emoji: string;
}

export interface UpdateMemberRequest {
  nickname?: string | undefined;
  roles?: string[] | undefined;
}

export interface CreateInviteRequest {
  maxUses?: number | undefined;
  expiresIn?: number | undefined;
}

export interface MessagesQuery {
  limit?: number | undefined;
  before?: string | undefined;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// Response wrappers
export interface UserResponse {
  user: User;
}
export interface ServerResponse {
  server: Server;
}
export interface ServersResponse {
  servers: Server[];
}
export interface ChannelResponse {
  channel: Channel;
}
export interface ChannelsResponse {
  channels: Channel[];
}
export interface MessageResponse {
  message: Message;
}
export interface MessagesResponse {
  messages: Message[];
}
export interface MemberResponse {
  member: ServerMember;
}
export interface MembersResponse {
  members: ServerMember[];
}
export interface InviteResponse {
  invite: Invite;
}
export interface InvitesResponse {
  invites: Invite[];
}
export interface AttachmentResponse {
  attachment: Attachment;
}
export interface JoinInviteResponse {
  member: ServerMember;
  server: Server;
}
