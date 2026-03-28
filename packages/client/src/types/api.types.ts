import type { User, Server, Channel, Message, ServerMember, ServerBan, Invite, Attachment, CustomToneDefinition, DirectConversation, DirectMessage, AuditLogEntry, FriendEntry, FriendRequest, FriendshipStatus } from './models';

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
  visibility?: 'public' | 'private' | undefined;
}

export interface UpdateServerRequest {
  name?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  visibility?: 'public' | 'private' | undefined;
}

export interface CreateChannelRequest {
  name: string;
  type?: 'text' | 'voice' | undefined;
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
  tone?: string | undefined;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface ToggleReactionRequest {
  emoji: string;
}

export interface UpdateMemberRequest {
  nickname?: string | undefined;
}

export interface MuteMemberRequest {
  duration: number;
}

export interface BanMemberRequest {
  reason?: string | undefined;
}

export interface TransferOwnershipRequest {
  userId: string;
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

export interface AddCustomToneRequest {
  key: string;
  label: string;
  emoji: string;
  colorLight: string;
  colorDark: string;
  textStyle?: 'normal' | 'italic' | 'medium' | undefined;
}

export interface CustomTonesResponse {
  customTones: CustomToneDefinition[];
}

export interface CustomToneResponse {
  customTone: CustomToneDefinition;
}

// Response wrappers
export interface UserResponse { user: User }
export interface ServerResponse { server: Server }
export interface ServersResponse { servers: Server[] }
export interface ChannelResponse { channel: Channel }
export interface ChannelsResponse { channels: Channel[] }
export interface MessageResponse { message: Message }
export interface MessagesResponse { messages: Message[] }
export interface MemberResponse { member: ServerMember }
export interface MembersResponse { members: ServerMember[] }
export interface InviteResponse { invite: Invite }
export interface InvitesResponse { invites: Invite[] }
export interface AttachmentResponse { attachment: Attachment }
export interface BansResponse { bans: ServerBan[] }
export interface AuditLogResponse { entries: AuditLogEntry[] }
export interface AuditLogQuery { limit?: number | undefined; before?: string | undefined }
export interface JoinInviteResponse { member: ServerMember; server: Server }

export interface SendDmRequest {
  content?: string | undefined;
  attachmentIds?: string[] | undefined;
  replyToId?: string | undefined;
  mentions?: string[] | undefined;
  tone?: string | undefined;
}

export interface UpdateDmRequest { content: string }
export interface ToggleDmReactionRequest { emoji: string }

export interface DirectConversationResponse { conversation: DirectConversation }
export interface DirectConversationsResponse { conversations: DirectConversation[] }
export interface DirectMessageResponse { message: DirectMessage }
export interface DirectMessagesResponse { messages: DirectMessage[] }
export interface BlockedIdsResponse { blockedIds: string[] }
export interface FriendsResponse { friends: FriendEntry[] }
export interface PendingRequestsResponse { requests: FriendRequest[] }
export interface FriendshipStatusResponse { status: FriendshipStatus }
export interface FriendRequestResponse { status: 'pending' | 'accepted' }
